#!/usr/bin/env bash
set -euo pipefail

USB_PATH="${USB_PATH:-/media/prisadmin/HASSAN}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
BUNDLE="$USB_PATH/leads-chatbot-$STAMP.bundle"

cd "$REPO_DIR"

echo "==> Leads Chatbot backup"

# 1. Commit any pending changes
if git status --porcelain | grep -q .; then
  git add -A
  git commit -m "auto-backup $STAMP"
  echo "==> Committed changes at $STAMP"
else
  echo "==> No changes to commit"
fi

# 2. Make sure the USB is mounted
if [ ! -d "$USB_PATH" ]; then
  echo "ERROR: USB not found at $USB_PATH" >&2
  echo "Mount it or set USB_PATH=/path/to/usb" >&2
  exit 1
fi

# 3. Bundle the full history to USB
git bundle create "$BUNDLE" --all
echo "==> Bundle written: $BUNDLE"

# 4. Verify the bundle is valid
git bundle verify "$BUNDLE" >/dev/null
echo "==> Bundle verified OK"

# 5. Keep only the 5 most recent bundles on the USB
ls -1t "$USB_PATH"/leads-chatbot-*.bundle 2>/dev/null | tail -n +6 | xargs -r rm -f

echo "==> Backup complete"