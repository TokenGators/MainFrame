#!/bin/bash
# Gatorpedia startup — builds UI if needed, then starts Express server.
# Sets PATH explicitly so npm/vite/node resolve correctly under launchd.

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

BASE="/Users/operator/repos/MainFrame/projects/media-assets"

if [ ! -d "$BASE/ui/dist" ]; then
  echo "[gatorpedia] Building UI..."
  cd "$BASE/ui" && /opt/homebrew/bin/npm run build
fi

cd "$BASE"
exec /opt/homebrew/bin/node src/server.js
