#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-phongit1995/chat-service}"
TAG="${1:-latest}"
INSTALL_DIR="/Applications"
VERSION_FILE="$HOME/.local/share/chat-app/.version"

echo "Chat App Installer / Updater for macOS"
echo "========================================"

API_BASE="https://api.github.com/repos/$REPO"

if [ "$TAG" = "latest" ]; then
    RELEASE=$(curl -fsSL "$API_BASE/releases/latest")
else
    RELEASE=$(curl -fsSL "$API_BASE/releases/tags/$TAG")
fi

NEW_VERSION=$(echo "$RELEASE" | python3 -c "import sys,json; print(json.load(sys.stdin)['tag_name'])")
DOWNLOAD_URL=$(echo "$RELEASE" | python3 -c "
import sys, json
assets = json.load(sys.stdin)['assets']
match = next((a['browser_download_url'] for a in assets if a['name'] == 'chat_app-macos.zip'), None)
if not match:
    sys.exit(1)
print(match)
")

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

TMP_ZIP=$(mktemp /tmp/chat_app-macos.XXXXXX.zip)
echo "Downloading chat_app-macos.zip..."
curl -fSL --progress-bar "$DOWNLOAD_URL" -o "$TMP_ZIP"

TMP_DIR=$(mktemp -d)
echo "Extracting..."
unzip -q "$TMP_ZIP" -d "$TMP_DIR"
rm "$TMP_ZIP"

APP=$(find "$TMP_DIR" -name "*.app" -maxdepth 1 | head -1)
if [ -z "$APP" ]; then
    echo "Error: no .app bundle found after extraction"
    rm -rf "$TMP_DIR"
    exit 1
fi

APP_NAME=$(basename "$APP")
DEST="$INSTALL_DIR/$APP_NAME"

if [ -d "$DEST" ]; then
    echo "Removing previous installation..."
    rm -rf "$DEST"
fi

echo "Installing $APP_NAME to $INSTALL_DIR..."
cp -r "$APP" "$DEST"
rm -rf "$TMP_DIR"

mkdir -p "$(dirname "$VERSION_FILE")"
echo "$NEW_VERSION" > "$VERSION_FILE"

echo ""
echo "Done! Version $NEW_VERSION installed."
echo "Installed to: $DEST"
echo "Open from Applications or run: open \"$DEST\""
