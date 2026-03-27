#!/bin/bash
# Install the InstantSOP Basecamp native messaging host for Chrome (macOS)
#
# Usage:
#   1. Load the extension in chrome://extensions (Developer mode)
#   2. Copy the extension ID from the card
#   3. Run: ./install-basecamp-host.sh <extension-id>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_SCRIPT="$SCRIPT_DIR/basecamp_host.py"
MANIFEST_TEMPLATE="$SCRIPT_DIR/basecamp_host_manifest.json"
HOST_NAME="instantsop_basecamp"

# Chrome native messaging hosts directory (macOS)
CHROME_NMH_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <chrome-extension-id>"
  echo ""
  echo "Find your extension ID at chrome://extensions (enable Developer mode)"
  exit 1
fi

EXT_ID="$1"

# Ensure the host script is executable
chmod +x "$HOST_SCRIPT"

# Create the NMH directory if needed
mkdir -p "$CHROME_NMH_DIR"

# Build the manifest with the correct extension origin
cat > "$CHROME_NMH_DIR/$HOST_NAME.json" <<EOF
{
  "name": "$HOST_NAME",
  "description": "InstantSOP — Basecamp CLI Bridge",
  "path": "$HOST_SCRIPT",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXT_ID/"
  ]
}
EOF

echo "Installed native messaging host: $HOST_NAME"
echo "  Manifest: $CHROME_NMH_DIR/$HOST_NAME.json"
echo "  Host:     $HOST_SCRIPT"
echo "  Extension: $EXT_ID"
echo ""
echo "Reload the extension in chrome://extensions to pick up the change."
