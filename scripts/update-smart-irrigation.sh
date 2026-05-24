#!/bin/bash

set -Eeuo pipefail

REPO_OWNER="padenj"
REPO_NAME="smart-irrigation"
INSTALL_DIR="/opt/smart-irrigation"
SERVICE_NAME="smart-irrigation"
UPDATE_SERVICE_NAME="smart-irrigation-update.service"
UPDATE_SCRIPT_PATH="/usr/local/bin/update-smart-irrigation.sh"
UPDATE_LOG_PATH="/var/log/smart-irrigation-update.log"
STATUS_FILE="$INSTALL_DIR/db/updateStatus.json"
STATUS_LOCK_FILE="/run/lock/smart-irrigation-update-status.lock"
RUN_LOCK_FILE="/run/lock/smart-irrigation-update.lock"
SELF_RUNNER_DIR="/run/smart-irrigation"
SELF_RUNNER_PATH="$SELF_RUNNER_DIR/update-smart-irrigation.sh"
SERVICE_UNIT_SOURCE_REL="scripts/smart-irrigation-update.service"
UPDATER_SCRIPT_SOURCE_REL="scripts/update-smart-irrigation.sh"
SERVICE_UNIT_TARGET="/etc/systemd/system/$UPDATE_SERVICE_NAME"
GITHUB_RELEASE_URL="https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest"
APP_VERSION_URL="http://localhost:3000/api/version"
STAGING_DIR="${INSTALL_DIR}.staging"
BACKUP_DIR="${INSTALL_DIR}.previous"

log() {
  printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*"
}

ensure_self_runner() {
  if [ "${SMART_IRRIGATION_UPDATE_RUNNER:-0}" = "1" ]; then
    return
  fi

  mkdir -p "$SELF_RUNNER_DIR"
  cp "$0" "$SELF_RUNNER_PATH"
  chmod +x "$SELF_RUNNER_PATH"
  export SMART_IRRIGATION_UPDATE_RUNNER=1
  exec "$SELF_RUNNER_PATH" "$@"
}

ensure_logging() {
  mkdir -p "$(dirname "$UPDATE_LOG_PATH")"
  touch "$UPDATE_LOG_PATH"
  exec >>"$UPDATE_LOG_PATH" 2>&1
}

ensure_paths() {
  for dir in /usr/local/bin /usr/bin /bin; do
    if [[ ":$PATH:" != *":$dir:"* ]]; then
      PATH="$PATH:$dir"
    fi
  done
  export PATH
}

current_version() {
  if [ -f "$INSTALL_DIR/.version" ]; then
    tr -d '\n' < "$INSTALL_DIR/.version"
    return
  fi

  if [ -f "$INSTALL_DIR/build/dist/version.txt" ]; then
    tr -d '\n' < "$INSTALL_DIR/build/dist/version.txt"
    return
  fi

  printf ''
}

write_status_patch() {
  local patch_json="$1"
  mkdir -p "$(dirname "$STATUS_FILE")" "$(dirname "$STATUS_LOCK_FILE")"

  (
    flock -x 8
    PATCH_JSON="$patch_json" STATUS_FILE="$STATUS_FILE" node --input-type=module <<'NODE'
import fs from 'fs/promises';
import path from 'path';

const statusFile = process.env.STATUS_FILE;
const patch = JSON.parse(process.env.PATCH_JSON ?? '{}');
const defaults = {
  schemaVersion: 1,
  state: 'idle',
  message: null,
  error: null,
  currentVersion: null,
  latestVersion: null,
  targetVersion: null,
  updateAvailable: null,
  serviceAvailable: true,
  lastCheckedAt: null,
  lastStartedAt: null,
  lastCompletedAt: null,
  lastHeartbeatAt: null,
  logPath: '/var/log/smart-irrigation-update.log',
};

let current = {};
try {
  current = JSON.parse(await fs.readFile(statusFile, 'utf8'));
} catch {
  current = {};
}

const next = {
  ...defaults,
  ...current,
  ...patch,
  schemaVersion: 1,
  logPath: patch.logPath ?? current.logPath ?? defaults.logPath,
};

if (next.latestVersion && next.currentVersion) {
  next.updateAvailable = next.latestVersion !== next.currentVersion;
}

await fs.mkdir(path.dirname(statusFile), { recursive: true });
const tempPath = `${statusFile}.${process.pid}.tmp`;
await fs.writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
await fs.rename(tempPath, statusFile);
NODE
  ) 8>"$STATUS_LOCK_FILE"
}

write_status() {
  local state="$1"
  local message="$2"
  local error_message="$3"
  local latest_version="$4"
  local target_version="$5"
  local now
  now="$(date --iso-8601=seconds)"
  local current
  current="$(current_version)"

  local completed_at='null'
  if [ "$state" = "failed" ] || [ "$state" = "succeeded" ] || [ "$state" = "up-to-date" ]; then
    completed_at="\"$now\""
  fi

  local started_at='null'
  if [ "$state" = "checking" ] || [ "$state" = "updating" ]; then
    started_at="\"$now\""
  fi

  write_status_patch "$(cat <<EOF
{
  "state": "$state",
  "message": $(printf '%s' "$message" | jq -Rs .),
  "error": $(printf '%s' "$error_message" | jq -Rs .),
  "currentVersion": $(printf '%s' "$current" | jq -Rs 'if length == 0 then null else . end'),
  "latestVersion": $(printf '%s' "$latest_version" | jq -Rs 'if length == 0 then null else . end'),
  "targetVersion": $(printf '%s' "$target_version" | jq -Rs 'if length == 0 then null else . end'),
  "serviceAvailable": true,
  "lastHeartbeatAt": "$now",
  "lastStartedAt": $started_at,
  "lastCompletedAt": $completed_at,
  "logPath": "$UPDATE_LOG_PATH"
}
EOF
)"
}

heartbeat_pid=""
start_heartbeat() {
  (
    while true; do
      write_status_patch "{\"state\":\"updating\",\"lastHeartbeatAt\":\"$(date --iso-8601=seconds)\",\"serviceAvailable\":true,\"logPath\":\"$UPDATE_LOG_PATH\"}"
      sleep 15
    done
  ) &
  heartbeat_pid="$!"
}

stop_heartbeat() {
  if [ -n "$heartbeat_pid" ] && kill -0 "$heartbeat_pid" 2>/dev/null; then
    kill "$heartbeat_pid" 2>/dev/null || true
    wait "$heartbeat_pid" 2>/dev/null || true
  fi
  heartbeat_pid=""
}

cleanup_paths() {
  rm -f "$SELF_RUNNER_PATH" 2>/dev/null || true
  rmdir "$SELF_RUNNER_DIR" 2>/dev/null || true
  rm -rf "$STAGING_DIR" 2>/dev/null || true
}

backup_restored=0
handle_failure() {
  local exit_code="$1"
  stop_heartbeat

  if [ "$exit_code" -eq 0 ]; then
    cleanup_paths
    return
  fi

  log "Update failed with exit code $exit_code"

  if [ -d "$BACKUP_DIR" ]; then
    log "Attempting rollback to previous install"
    systemctl stop "$SERVICE_NAME" >/dev/null 2>&1 || true

    if [ -d "$INSTALL_DIR/db" ] && [ ! -d "$BACKUP_DIR/db" ]; then
      mv "$INSTALL_DIR/db" "$BACKUP_DIR/db" 2>/dev/null || true
    fi

    rm -rf "$INSTALL_DIR" 2>/dev/null || true
    mv "$BACKUP_DIR" "$INSTALL_DIR"
    backup_restored=1
    systemctl daemon-reload >/dev/null 2>&1 || true
    systemctl restart "$SERVICE_NAME" >/dev/null 2>&1 || true
  fi

  write_status "failed" "Update failed. Previous version has been restored if possible." "See $UPDATE_LOG_PATH for details." "$(current_version)" ""
  cleanup_paths
  exit "$exit_code"
}

trap 'handle_failure $?' EXIT

install_canonical_assets() {
  local source_dir="$1"
  local source_script="$source_dir/$UPDATER_SCRIPT_SOURCE_REL"
  local source_unit="$source_dir/$SERVICE_UNIT_SOURCE_REL"

  if [ ! -f "$source_script" ]; then
    log "Missing updater script in staged release: $source_script"
    return 1
  fi

  if [ ! -f "$source_unit" ]; then
    log "Missing updater service unit in staged release: $source_unit"
    return 1
  fi

  install -m 755 "$source_script" "${UPDATE_SCRIPT_PATH}.tmp"
  mv "${UPDATE_SCRIPT_PATH}.tmp" "$UPDATE_SCRIPT_PATH"

  install -m 644 "$source_unit" "${SERVICE_UNIT_TARGET}.tmp"
  mv "${SERVICE_UNIT_TARGET}.tmp" "$SERVICE_UNIT_TARGET"

  systemctl daemon-reload
}

fetch_latest_release() {
  local headers_file body_file http_status
  headers_file="$(mktemp)"
  body_file="$(mktemp)"

  http_status="$(curl -sSL -D "$headers_file" -o "$body_file" -w "%{http_code}" \
    -H 'Accept: application/vnd.github+json' \
    -H 'User-Agent: smart-irrigation-updater' \
    "$GITHUB_RELEASE_URL")"

  if [ "$http_status" -ge 400 ]; then
    if grep -iq '^x-ratelimit-remaining: 0' "$headers_file"; then
      log "GitHub API rate limit exceeded"
    else
      log "GitHub release request failed with status $http_status"
    fi
    rm -f "$headers_file" "$body_file"
    return 1
  fi

  local latest_version zip_url
  latest_version="$(jq -r '.tag_name // empty' "$body_file")"
  zip_url="$(jq -r '[.assets[]? | select(.name != null and (.name | endswith(".zip")))] | .[0].browser_download_url // empty' "$body_file")"

  rm -f "$headers_file" "$body_file"

  if [ -z "$latest_version" ] || [ -z "$zip_url" ]; then
    log "Latest release response did not include a tag or zip asset"
    return 1
  fi

  printf '%s\n%s\n' "$latest_version" "$zip_url"
}

health_check() {
  local expected_version="$1"
  local attempt

  for attempt in $(seq 1 30); do
    if curl -fsS "$APP_VERSION_URL" >/tmp/smart-irrigation-version-check.json 2>/dev/null; then
      if jq -e --arg version "$expected_version" '.version == $version' /tmp/smart-irrigation-version-check.json >/dev/null 2>&1; then
        rm -f /tmp/smart-irrigation-version-check.json
        return 0
      fi
    fi
    sleep 2
  done

  rm -f /tmp/smart-irrigation-version-check.json
  return 1
}

main() {
  ensure_self_runner "$@"
  ensure_logging
  ensure_paths

  log "Starting smart irrigation update run"

  mkdir -p "$(dirname "$RUN_LOCK_FILE")"
  exec 9>"$RUN_LOCK_FILE"
  if ! flock -n 9; then
    log "Another update is already running"
    exit 0
  fi

  local latest_release zip_url current staged_env
  current="$(current_version)"

  write_status "checking" "Checking for a new release..." "" "" ""

  mapfile -t release_info < <(fetch_latest_release)
  latest_release="${release_info[0]:-}"
  zip_url="${release_info[1]:-}"

  if [ -z "$latest_release" ] || [ -z "$zip_url" ]; then
    write_status "failed" "Unable to determine the latest release." "GitHub release metadata was incomplete." "" ""
    return 1
  fi

  if [ "$latest_release" = "$current" ] && [ -n "$current" ]; then
    write_status "up-to-date" "No new release found. Current version: $current" "" "$latest_release" ""
    log "Already on latest version $current"
    return 0
  fi

  write_status "updating" "Downloading release $latest_release..." "" "$latest_release" "$latest_release"
  start_heartbeat

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

  install_canonical_assets "$STAGING_DIR"

  log "Running npm ci in staged install"
  (
    cd "$STAGING_DIR"
    npm ci --omit=dev
  )

  if [ ! -f "$STAGING_DIR/build/server/index.js" ]; then
    log "Staged release is missing build/server/index.js"
    return 1
  fi

  stop_heartbeat
  write_status_patch "{\"state\":\"updating\",\"message\":\"Swapping staged release into place...\",\"latestVersion\":\"$latest_release\",\"targetVersion\":\"$latest_release\",\"lastHeartbeatAt\":\"$(date --iso-8601=seconds)\",\"serviceAvailable\":true}"

  systemctl stop "$SERVICE_NAME" >/dev/null 2>&1 || true
  mv "$INSTALL_DIR" "$BACKUP_DIR"
  mv "$STAGING_DIR" "$INSTALL_DIR"

  if [ -d "$BACKUP_DIR/db" ]; then
    mv "$BACKUP_DIR/db" "$INSTALL_DIR/db"
  fi

  install_canonical_assets "$INSTALL_DIR"

  systemctl restart "$SERVICE_NAME"

  if ! health_check "$latest_release"; then
    log "Health check failed after update to $latest_release"
    return 1
  fi

  rm -rf "$BACKUP_DIR"
  write_status "succeeded" "Updated successfully to $latest_release." "" "$latest_release" "$latest_release"
  log "Update completed successfully to $latest_release"
}

main "$@"
