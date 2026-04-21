#!/usr/bin/env bash
# sync-pipeline.sh — incremental holder sync + activity rebuild
#
# Runs:
#   1. sync-holders.py --resume   (fetch new Transfer events only)
#   2. enrich-sales.py            (price + marketplace for new txs)
#   3. build-activity.py          (rebuild activity.jsonl from cache)
#   4. compute-holding-since.py   (recompute holding streaks)
#   5. enrich-ens.py              (ENS names for new wallets)
#   6. enrich-opensea.py          (OpenSea profiles for new wallets)
#
# Usage:
#   bash scripts/sync-pipeline.sh            # normal incremental run
#   bash scripts/sync-pipeline.sh --full     # wipe caches, full re-fetch

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$SCRIPT_DIR/.."
LOG_DIR="$HOME/.openclaw/logs"
mkdir -p "$LOG_DIR"

LOG="$LOG_DIR/holders-sync-$(date +%Y%m%d-%H%M%S).log"
PYTHON="python3"

echo "=== TokenGators Holder Sync ===" | tee -a "$LOG"
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" | tee -a "$LOG"
echo "" | tee -a "$LOG"

RESUME_FLAG="--resume"
if [[ "${1:-}" == "--full" ]]; then
    RESUME_FLAG=""
    echo "Full sync — wiping cached events" | tee -a "$LOG"
fi

# ── 1. Sync holders ────────────────────────────────────────────────────────────
echo "[1/3] Syncing holder events..." | tee -a "$LOG"
cd "$PROJECT"
$PYTHON scripts/sync-holders.py $RESUME_FLAG 2>&1 | tee -a "$LOG"

# ── 2. Enrich sales data ──────────────────────────────────────────────────────
echo "" | tee -a "$LOG"
echo "[2/4] Enriching sales (price + marketplace)..." | tee -a "$LOG"
$PYTHON scripts/enrich-sales.py 2>&1 | tee -a "$LOG"

# ── 3. Build activity ──────────────────────────────────────────────────────────
echo "" | tee -a "$LOG"
echo "[3/4] Building activity log..." | tee -a "$LOG"
$PYTHON scripts/build-activity.py 2>&1 | tee -a "$LOG"

# ── 4. Compute holding streaks ────────────────────────────────────────────────
echo "" | tee -a "$LOG"
echo "[4/6] Computing holding streaks..." | tee -a "$LOG"
$PYTHON scripts/compute-holding-since.py 2>&1 | tee -a "$LOG"

# ── 5. Enrich ENS names (incremental — only new wallets) ─────────────────────
echo "" | tee -a "$LOG"
echo "[5/6] Enriching ENS names (new wallets only)..." | tee -a "$LOG"
$PYTHON scripts/enrich-ens.py 2>&1 | tee -a "$LOG"

# ── 6. Enrich OpenSea profiles (incremental — only new wallets) ──────────────
echo "" | tee -a "$LOG"
echo "[6/7] Enriching OpenSea profiles (new wallets only)..." | tee -a "$LOG"
$PYTHON scripts/enrich-opensea.py 2>&1 | tee -a "$LOG"

# ── 7. Sync active listings (ETH + APE via OpenSea API) ──────────────────────
echo "" | tee -a "$LOG"
echo "[7/7] Syncing active listings (OpenSea)..." | tee -a "$LOG"
$PYTHON scripts/sync-listings.py 2>&1 | tee -a "$LOG" || echo "(listings sync failed — continuing)" | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "✓ Pipeline complete — $(date -u '+%Y-%m-%dT%H:%M:%SZ')" | tee -a "$LOG"
echo "  Log: $LOG"

# Keep only last 14 log files
ls -t "$LOG_DIR"/holders-sync-*.log 2>/dev/null | tail -n +15 | xargs rm -f
