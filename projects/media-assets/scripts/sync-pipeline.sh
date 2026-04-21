#!/usr/bin/env bash
# sync-pipeline.sh — holder sync + activity + listings rebuild
#
# Modes:
#   (default / --fast)   Fast loop — safe to run every ~60s:
#                        1. sync-holders (incremental)
#                        2. enrich-sales (incremental, new txs only)
#                        3. build-activity
#                        4. sync-listings (OpenSea active listings)
#
#   --full               Everything above, plus the slow identity +
#                        streak enrichment (run on a slower schedule):
#                        5. compute-holding-since
#                        6. enrich-ens
#                        7. enrich-opensea
#                        (also wipes block cursors for a true full re-fetch)
#
# Usage:
#   bash scripts/sync-pipeline.sh            # fast loop
#   bash scripts/sync-pipeline.sh --fast     # fast loop (explicit)
#   bash scripts/sync-pipeline.sh --full     # full re-fetch + enrichment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$SCRIPT_DIR/.."
LOG_DIR="$HOME/.openclaw/logs"
mkdir -p "$LOG_DIR"

LOG="$LOG_DIR/holders-sync-$(date +%Y%m%d-%H%M%S).log"
PYTHON="python3"

MODE="fast"
RESUME_FLAG="--resume"
case "${1:-}" in
    --full) MODE="full"; RESUME_FLAG="" ;;
    --fast|"") MODE="fast" ;;
    *) echo "Unknown flag: $1 (use --fast or --full)"; exit 2 ;;
esac

echo "=== TokenGators Holder Sync (${MODE}) ===" | tee -a "$LOG"
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" | tee -a "$LOG"
echo "" | tee -a "$LOG"

cd "$PROJECT"

# ── Fast steps (always run) ───────────────────────────────────────────────────

echo "[1] sync-holders" | tee -a "$LOG"
$PYTHON scripts/sync-holders.py $RESUME_FLAG 2>&1 | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "[2] enrich-sales" | tee -a "$LOG"
$PYTHON scripts/enrich-sales.py 2>&1 | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "[3] build-activity" | tee -a "$LOG"
$PYTHON scripts/build-activity.py 2>&1 | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "[4] sync-listings" | tee -a "$LOG"
$PYTHON scripts/sync-listings.py 2>&1 | tee -a "$LOG" || echo "(listings sync failed — continuing)" | tee -a "$LOG"

# ── Slow identity enrichment (full mode only) ─────────────────────────────────

if [[ "$MODE" == "full" ]]; then
    echo "" | tee -a "$LOG"
    echo "[5] compute-holding-since" | tee -a "$LOG"
    $PYTHON scripts/compute-holding-since.py 2>&1 | tee -a "$LOG"

    echo "" | tee -a "$LOG"
    echo "[6] enrich-ens (new wallets only)" | tee -a "$LOG"
    $PYTHON scripts/enrich-ens.py 2>&1 | tee -a "$LOG"

    echo "" | tee -a "$LOG"
    echo "[7] enrich-opensea (new wallets only)" | tee -a "$LOG"
    $PYTHON scripts/enrich-opensea.py 2>&1 | tee -a "$LOG"
fi

echo "" | tee -a "$LOG"
echo "✓ Pipeline complete (${MODE}) — $(date -u '+%Y-%m-%dT%H:%M:%SZ')" | tee -a "$LOG"

# Keep only last 14 log files
ls -t "$LOG_DIR"/holders-sync-*.log 2>/dev/null | tail -n +15 | xargs rm -f
