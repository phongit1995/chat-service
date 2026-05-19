#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-phongit1995/chat-service}"
TAG="${1:-latest}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/share/chat-app}"
BIN_DIR="${BIN_DIR:-$HOME/.local/bin}"
VERSION_FILE="$INSTALL_DIR/.version"

echo "Chat Desktop Installer / Updater for Linux"
echo "==========================================="

API_BASE="https://api.github.com/repos/$REPO"

if [ "$TAG" = "latest" ]; then
    RELEASE=$(curl -fsSL "$API_BASE/releases/latest")
else
    RELEASE=$(curl -fsSL "$API_BASE/releases/tags/$TAG")
fi

NEW_VERSION=$(echo "$RELEASE" | python3 -c "import sys,json; print(json.load(sys.stdin)['tag_name'])")
DOWNLOAD_URL=$(echo "$RELEASE" | python3 -c "
import sys, json, re
assets = json.load(sys.stdin)['assets']
pat = re.compile(r'Chat-.*\.AppImage$')
match = next((a['browser_download_url'] for a in assets if pat.search(a['name'])), None)
if not match:
    sys.exit(1)
print(match)
")

if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: no AppImage asset found in release $NEW_VERSION"
    exit 1
fi

if [ -f "$VERSION_FILE" ]; then
    CURRENT_VERSION=$(cat "$VERSION_FILE")
    if [ "$CURRENT_VERSION" = "$NEW_VERSION" ]; then
        echo "Already up to date: $CURRENT_VERSION"
        exit 0
    fi
    echo "Update available: $CURRENT_VERSION -> $NEW_VERSION"
else
    echo "Installing version: $NEW_VERSION"
fi

mkdir -p "$INSTALL_DIR" "$BIN_DIR"

APP_IMAGE="$INSTALL_DIR/Chat.AppImage"
echo "Downloading $(basename "$DOWNLOAD_URL")..."
curl -fSL --progress-bar "$DOWNLOAD_URL" -o "$APP_IMAGE"
chmod +x "$APP_IMAGE"

ln -sf "$APP_IMAGE" "$BIN_DIR/chat"

echo "$NEW_VERSION" > "$VERSION_FILE"

echo ""
echo "Done! Version $NEW_VERSION installed."
echo "Run: chat   (or $APP_IMAGE)"
echo "Make sure $BIN_DIR is in your PATH."
