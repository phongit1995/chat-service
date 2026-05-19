#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-phongit1995/chat-service}"
TAG="${1:-latest}"
INSTALL_DIR="/Applications"
VERSION_FILE="$HOME/.local/share/chat-app/.version"

echo "Chat Desktop Installer / Updater for macOS"
echo "==========================================="

ARCH=$(uname -m)
case "$ARCH" in
  arm64) ASSET_ARCH="arm64" ;;
  x86_64) ASSET_ARCH="x64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

API_BASE="https://api.github.com/repos/$REPO"

if [ "$TAG" = "latest" ]; then
    RELEASE=$(curl -fsSL "$API_BASE/releases/latest")
else
    RELEASE=$(curl -fsSL "$API_BASE/releases/tags/$TAG")
fi

NEW_VERSION=$(echo "$RELEASE" | python3 -c "import sys,json; print(json.load(sys.stdin)['tag_name'])")
DOWNLOAD_URL=$(echo "$RELEASE" | python3 -c "
import sys, json, re
arch = '$ASSET_ARCH'
assets = json.load(sys.stdin)['assets']
pat = re.compile(rf'Chat-.*-mac-{arch}\.dmg$')
match = next((a['browser_download_url'] for a in assets if pat.search(a['name'])), None)
if not match:
    sys.exit(1)
print(match)
")

if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: no DMG asset found for $ASSET_ARCH in release $NEW_VERSION"
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

TMP_DMG=$(mktemp /tmp/chat-desktop.XXXXXX.dmg)
echo "Downloading $(basename "$DOWNLOAD_URL")..."
curl -fSL --progress-bar "$DOWNLOAD_URL" -o "$TMP_DMG"

MOUNT_POINT=$(mktemp -d /tmp/chat-mount.XXXXXX)
echo "Mounting DMG..."
hdiutil attach "$TMP_DMG" -nobrowse -quiet -mountpoint "$MOUNT_POINT"

APP=$(find "$MOUNT_POINT" -maxdepth 2 -name "*.app" | head -1)
if [ -z "$APP" ]; then
    echo "Error: no .app bundle found in DMG"
    hdiutil detach "$MOUNT_POINT" -quiet
    rm "$TMP_DMG"
    exit 1
fi

APP_NAME=$(basename "$APP")
DEST="$INSTALL_DIR/$APP_NAME"

if [ -d "$DEST" ]; then
    echo "Removing previous installation..."
    rm -rf "$DEST"
fi

echo "Installing $APP_NAME to $INSTALL_DIR..."
cp -R "$APP" "$DEST"

hdiutil detach "$MOUNT_POINT" -quiet
rm "$TMP_DMG"

# Clear quarantine attr so user doesn't get "unidentified developer" warning
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

mkdir -p "$(dirname "$VERSION_FILE")"
echo "$NEW_VERSION" > "$VERSION_FILE"

echo ""
echo "Done! Version $NEW_VERSION installed."
echo "Installed to: $DEST"
echo "Open from Applications or run: open \"$DEST\""
