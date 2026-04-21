#!/bin/bash
# install-services.sh — Install and load all TokenGators launchd services
set -e

LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
REPO="/Users/operator/repos/MainFrame"

PLISTS=(
  "$REPO/projects/media-assets/launchd/com.tokengators.gatorpedia.plist"
  "$REPO/projects/media-assets/launchd/com.tokengators.holders-sync.plist"
  "$REPO/projects/media-assets/launchd/com.tokengators.holders-sync-full.plist"
  "$REPO/projects/media-assets/launchd/com.tokengators.discord-notify.plist"
  "$REPO/projects/gatorrr/launchd/com.tokengators.gatorrr.plist"
  "$REPO/projects/space-n-gators/launchd/com.tokengators.space-n-gators.plist"
  "$REPO/swampos/launchd/com.tokengators.swampos.plist"
)

LABELS=(
  "com.tokengators.gatorpedia"
  "com.tokengators.holders-sync"
  "com.tokengators.holders-sync-full"
  "com.tokengators.discord-notify"
  "com.tokengators.gatorrr"
  "com.tokengators.space-n-gators"
  "com.tokengators.swampos"
)

URLS=(
  "http://localhost:3001"
  "(cron: 60s fast sync)"
  "(cron: 6h full sync)"
  "(daemon)"
  "http://localhost:8081"
  "http://localhost:8082"
  "http://localhost:4000"
)

# Discord webhooks for the notify daemon — loaded from ~/.openclaw/.env if present.
if [ -f "$HOME/.openclaw/.env" ]; then
  # shellcheck disable=SC1091
  set -a
  . "$HOME/.openclaw/.env"
  set +a
fi
NOTIFY_PLIST="$REPO/projects/media-assets/launchd/com.tokengators.discord-notify.plist"
if [ -f "$NOTIFY_PLIST" ] && command -v plutil >/dev/null 2>&1; then
  plutil -replace EnvironmentVariables.DISCORD_SALES_WEBHOOK    -string "${DISCORD_SALES_WEBHOOK:-}"    "$NOTIFY_PLIST" || true
  plutil -replace EnvironmentVariables.DISCORD_LISTINGS_WEBHOOK -string "${DISCORD_LISTINGS_WEBHOOK:-}" "$NOTIFY_PLIST" || true
  plutil -replace EnvironmentVariables.MIN_SALE_ETH             -string "${MIN_SALE_ETH:-0}"           "$NOTIFY_PLIST" || true
  plutil -replace EnvironmentVariables.MIN_SALE_APE             -string "${MIN_SALE_APE:-0}"           "$NOTIFY_PLIST" || true
fi

echo "==> Creating LaunchAgents directory..."
mkdir -p "$LAUNCH_AGENTS"

echo "==> Copying plists to $LAUNCH_AGENTS..."
for plist in "${PLISTS[@]}"; do
  name=$(basename "$plist")
  dest="$LAUNCH_AGENTS/$name"
  if [ -e "$dest" ]; then
    echo "    [skip] $name already exists — removing old copy"
    rm -f "$dest"
  fi
  cp "$plist" "$dest"
  echo "    [ok]   $name"
done

echo ""
echo "==> Loading services..."
for i in "${!PLISTS[@]}"; do
  plist="${PLISTS[$i]}"
  label="${LABELS[$i]}"
  name=$(basename "$plist")
  dest="$LAUNCH_AGENTS/$name"

  # Unload first if already loaded (ignore errors)
  launchctl unload -w "$dest" 2>/dev/null || true

  if launchctl load -w "$dest" 2>/dev/null; then
    echo "    [ok]   $label loaded"
  else
    echo "    [warn] $label — launchctl load returned non-zero (may already be running)"
  fi
done

echo ""
echo "==> Service status:"
launchctl list | grep tokengators || echo "    (none found — services may take a moment to start)"

echo ""
echo "==> Service URLs:"
for i in "${!LABELS[@]}"; do
  printf "    %-30s %s\n" "${LABELS[$i]}" "${URLS[$i]}"
done

echo ""
echo "==> Done. SwampOS dashboard: http://localhost:4000"
