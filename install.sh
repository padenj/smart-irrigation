#!/bin/bash

# Variables
REPO_OWNER="padenj"
REPO_NAME="smart-irrigation"
INSTALL_DIR="/opt/smart-irrigation"
SERVICE_NAME="smart-irrigation"
UPDATE_SCRIPT_PATH="/usr/local/bin/update-smart-irrigation.sh"

# Step 1: Ensure the user has root privileges
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root."
  exit 1
fi

# Step 2: Install Node.js and npm
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
  echo "Node.js and npm not found. Installing..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - # Change Node.js version if needed
  apt install -y nodejs
fi

# Step 2: Install necessary dependencies
apt update && apt install -y jq unzip curl wget

# Step 3: Create a directory for the application
mkdir -p "$INSTALL_DIR"

# Step 4: Download the latest release and extract it
LATEST_RELEASE=$(curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest" | jq -r '.tag_name')
ZIP_URL=$(curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest" | jq -r '.assets[0].browser_download_url')

echo "Downloading the latest release ($LATEST_RELEASE)..."
curl -L -o /tmp/release-package.zip "$ZIP_URL"
find "$INSTALL_DIR" -mindepth 1 -not -path "$INSTALL_DIR/db/*" -delete
unzip /tmp/release-package.zip -d "$INSTALL_DIR"
echo "$LATEST_RELEASE" > "$INSTALL_DIR/.version"

# Run npm ci
cd "$INSTALL_DIR"
npm ci --omit=dev

# Step 5: Create the systemd service file
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
 
# Step 6: Set up the update script
cat <<EOF > "$UPDATE_SCRIPT_PATH"
#!/bin/bash
 
LATEST_RELEASE=\$(curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest" | jq -r '.tag_name')
ZIP_URL=\$(curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest" | jq -r '.assets[0].browser_download_url')
CURRENT_VERSION=\$(cat $INSTALL_DIR/.version 2>/dev/null)

if [ "\$LATEST_RELEASE" != "\$CURRENT_VERSION" ]; then
  echo "New release detected: \$LATEST_RELEASE. Updating application..."
  curl -L -o /tmp/release-package.zip "\$ZIP_URL"
  find "$INSTALL_DIR" -mindepth 1 -not -path "$INSTALL_DIR/db/*" -delete
  unzip /tmp/release-package.zip -d "$INSTALL_DIR"
  echo "Running npm install"
  cd "$INSTALL_DIR"
  npm ci --omit=dev
  echo "\$LATEST_RELEASE" > "$INSTALL_DIR/.version"
  systemctl restart "$SERVICE_NAME"
  echo "Update complete!"
else
  echo "No new release found. Current version: \$CURRENT_VERSION"
fi
EOF
chmod +x "$UPDATE_SCRIPT_PATH"

# Step 7: Schedule update automation with cron
echo "Setting up automatic updates..."
if ! crontab -l 2>/dev/null | grep -q "$UPDATE_SCRIPT_PATH"; then
    (crontab -l 2>/dev/null; echo "0 * * * * $UPDATE_SCRIPT_PATH") | crontab -
else
    echo "Crontab entry for automatic updates already exists. Skipping..."
fi

# Step 8: Enable and start the service
echo "Starting the systemd service..."
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

echo "Installation and setup complete!"
