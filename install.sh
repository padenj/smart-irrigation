#!/bin/bash

set -Eeuo pipefail

REPO_OWNER="padenj"
REPO_NAME="smart-irrigation"
INSTALL_DIR="/opt/smart-irrigation"
SERVICE_NAME="smart-irrigation"
UPDATE_SERVICE_NAME="smart-irrigation-update.service"
UPDATE_SCRIPT_PATH="/usr/local/bin/update-smart-irrigation.sh"
UPDATE_SERVICE_PATH="/etc/systemd/system/$UPDATE_SERVICE_NAME"
JOURNALD_OVERRIDE_DIR="/etc/systemd/journald.conf.d"
JOURNALD_OVERRIDE_FILE="$JOURNALD_OVERRIDE_DIR/smart-irrigation.conf"
GITHUB_RELEASE_URL="https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest"
STAGING_DIR="${INSTALL_DIR}.staging"
BACKUP_DIR="${INSTALL_DIR}.previous"
CRON_COMMAND="/bin/systemctl --no-block start $UPDATE_SERVICE_NAME"

log() {
  printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*"
}

if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root."
  exit 1
fi

install_system_dependencies() {
  apt update
  apt install -y jq unzip curl wget util-linux ca-certificates gnupg
  ensure_node_24
}

ensure_node_24() {
  local current_major=""

  if command -v node >/dev/null 2>&1; then
    current_major="$(node -p 'process.versions.node.split(".")[0]')"
  fi

  if [ "$current_major" != "24" ]; then
    log "Installing or upgrading Node.js 24..."
    apt update
    apt install -y ca-certificates curl gnupg
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt install -y nodejs
  fi

  local installed_major
  installed_major="$(node -p 'process.versions.node.split(".")[0]')"

  if [ "$installed_major" != "24" ]; then
    log "Node.js 24 installation failed"
    exit 1
  fi
}

configure_journal_limits() {
  mkdir -p "$JOURNALD_OVERRIDE_DIR"
  cat <<EOF > "$JOURNALD_OVERRIDE_FILE"
[Journal]
SystemMaxUse=200M
SystemMaxFileSize=50M
EOF
  systemctl restart systemd-journald
  journalctl --vacuum-size=200M || true
}

fetch_latest_release() {
  local release_file
  release_file="$(mktemp)"

  curl -fsSL \
    -H 'Accept: application/vnd.github+json' \
    -H 'User-Agent: smart-irrigation-installer' \
    "$GITHUB_RELEASE_URL" \
    -o "$release_file"

  local latest_release zip_url
  latest_release="$(jq -r '.tag_name // empty' "$release_file")"
  zip_url="$(jq -r '[.assets[]? | select(.name != null and (.name | endswith(".zip")))] | .[0].browser_download_url // empty' "$release_file")"
  rm -f "$release_file"

  if [ -z "$latest_release" ] || [ -z "$zip_url" ]; then
    echo "Could not determine the latest release asset."
    exit 1
  fi

  printf '%s\n%s\n' "$latest_release" "$zip_url"
}

write_app_service() {
  cat <<EOF > "/etc/systemd/system/$SERVICE_NAME.service"
[Unit]
Description=Smart Irrigation System
After=network.target

[Service]
ExecStart=/usr/bin/node $INSTALL_DIR/build/server/index.js
WorkingDirectory=$INSTALL_DIR
Restart=always
RestartSec=10
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
}

install_update_assets() {
  local source_dir="$1"
  install -m 755 "$source_dir/scripts/update-smart-irrigation.sh" "${UPDATE_SCRIPT_PATH}.tmp"
  mv "${UPDATE_SCRIPT_PATH}.tmp" "$UPDATE_SCRIPT_PATH"

  install -m 644 "$source_dir/scripts/smart-irrigation-update.service" "${UPDATE_SERVICE_PATH}.tmp"
  mv "${UPDATE_SERVICE_PATH}.tmp" "$UPDATE_SERVICE_PATH"
}

configure_update_cron() {
  local current_crontab filtered_file
  current_crontab="$(mktemp)"
  filtered_file="$(mktemp)"

  crontab -l 2>/dev/null > "$current_crontab" || true
  grep -v -F "/usr/local/bin/update-smart-irrigation.sh" "$current_crontab" | \
    grep -v -F "$UPDATE_SERVICE_NAME" > "$filtered_file" || true

  if ! grep -q -F "$CRON_COMMAND" "$filtered_file"; then
    printf '0 * * * * %s\n' "$CRON_COMMAND" >> "$filtered_file"
  fi

  crontab "$filtered_file"
  rm -f "$current_crontab" "$filtered_file"
}

main() {
  install_system_dependencies
  configure_journal_limits

  mkdir -p "$(dirname "$INSTALL_DIR")"

  mapfile -t release_info < <(fetch_latest_release)
  local latest_release="${release_info[0]}"
  local zip_url="${release_info[1]}"

  log "Downloading the latest release ($latest_release)..."

  rm -rf "$STAGING_DIR" "$BACKUP_DIR"
  mkdir -p "$STAGING_DIR"

  local zip_file
  zip_file="$(mktemp /tmp/smart-irrigation-release.XXXXXX.zip)"
  curl -fsSL -o "$zip_file" "$zip_url"
  unzip -oq "$zip_file" -d "$STAGING_DIR"
  rm -f "$zip_file"

  if [ -f "$INSTALL_DIR/.env.local" ]; then
    cp "$INSTALL_DIR/.env.local" "$STAGING_DIR/.env.local"
  fi

  echo "$latest_release" > "$STAGING_DIR/.version"

  (
    cd "$STAGING_DIR"
    npm ci --omit=dev
  )

  if [ ! -f "$STAGING_DIR/build/server/index.js" ]; then
    echo "The release package is missing build/server/index.js"
    exit 1
  fi

  write_app_service
  install_update_assets "$STAGING_DIR"

  if [ -d "$INSTALL_DIR" ]; then
    systemctl stop "$SERVICE_NAME" >/dev/null 2>&1 || true
    mv "$INSTALL_DIR" "$BACKUP_DIR"
  fi

  mv "$STAGING_DIR" "$INSTALL_DIR"

  if [ -d "$BACKUP_DIR/db" ]; then
    mv "$BACKUP_DIR/db" "$INSTALL_DIR/db"
  fi

  rm -rf "$BACKUP_DIR"

  systemctl daemon-reload
  configure_update_cron

  systemctl enable "$SERVICE_NAME"
  systemctl restart "$SERVICE_NAME"

  log "Installation and setup complete!"
}

main "$@"
