#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-phongit1995/chat-service}"
TAG="${1:-latest}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/share/chat-app}"
BIN_DIR="${BIN_DIR:-$HOME/.local/bin}"
VERSION_FILE="$INSTALL_DIR/.version"

echo "Chat App Installer / Updater for Linux"
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
match = next((a['browser_download_url'] for a in assets if a['name'] == 'chat_app-linux.tar.gz'), None)
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

TMP_TAR=$(mktemp /tmp/chat_app-linux.XXXXXX.tar.gz)
echo "Downloading chat_app-linux.tar.gz..."
curl -fSL --progress-bar "$DOWNLOAD_URL" -o "$TMP_TAR"

if [ -d "$INSTALL_DIR" ]; then
    echo "Removing previous installation..."
    rm -rf "$INSTALL_DIR"
fi
mkdir -p "$INSTALL_DIR"

echo "Extracting to $INSTALL_DIR..."
tar -xzf "$TMP_TAR" -C "$INSTALL_DIR"
rm "$TMP_TAR"

echo "$NEW_VERSION" > "$VERSION_FILE"

EXECUTABLE=$(find "$INSTALL_DIR" -maxdepth 1 -type f -executable | head -1)
if [ -z "$EXECUTABLE" ]; then
    echo "Error: no executable found after extraction"
    exit 1
fi

mkdir -p "$BIN_DIR"
ln -sf "$EXECUTABLE" "$BIN_DIR/chat-app"

DESKTOP_DIR="$HOME/.local/share/applications"
mkdir -p "$DESKTOP_DIR"
cat > "$DESKTOP_DIR/chat-app.desktop" << EOF
[Desktop Entry]
Name=Chat App
Exec=$EXECUTABLE
Type=Application
Categories=Network;InstantMessaging;
EOF

echo ""
echo "Done! Version $NEW_VERSION installed."
echo "Installed to: $INSTALL_DIR"
echo "Symlink: $BIN_DIR/chat-app"
