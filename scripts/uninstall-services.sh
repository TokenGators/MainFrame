#!/bin/bash
# uninstall-services.sh — Unload and remove all TokenGators launchd services
set -e

LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
REPO="/Users/operator/repos/MainFrame"

PLISTS=(
  "$REPO/projects/media-assets/launchd/com.tokengators.gatorpedia.plist"
  "$REPO/projects/gatorrr/launchd/com.tokengators.gatorrr.plist"
  "$REPO/projects/space-n-gators/launchd/com.tokengators.space-n-gators.plist"
  "$REPO/swampos/launchd/com.tokengators.swampos.plist"
)

LABELS=(
  "com.tokengators.gatorpedia"
  "com.tokengators.gatorrr"
  "com.tokengators.space-n-gators"
  "com.tokengators.swampos"
)

echo "==> Unloading services..."
for i in "${!PLISTS[@]}"; do
  label="${LABELS[$i]}"
  name=$(basename "${PLISTS[$i]}")
  dest="$LAUNCH_AGENTS/$name"

  if [ -f "$dest" ]; then
    if launchctl unload -w "$dest" 2>/dev/null; then
      echo "    [ok]   $label unloaded"
    else
      echo "    [warn] $label — launchctl unload returned non-zero (may not have been loaded)"
    fi
  else
    echo "    [skip] $label — plist not found at $dest"
  fi
done

echo ""
echo "==> Removing plists from $LAUNCH_AGENTS..."
for plist in "${PLISTS[@]}"; do
  name=$(basename "$plist")
  dest="$LAUNCH_AGENTS/$name"
  if [ -f "$dest" ]; then
    rm -f "$dest"
    echo "    [ok]   removed $name"
  else
    echo "    [skip] $name not found"
  fi
done

echo ""
echo "==> Remaining tokengators services in launchctl:"
launchctl list | grep tokengators || echo "    (none)"

echo ""
echo "==> Done."
