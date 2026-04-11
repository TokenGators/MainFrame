#!/bin/bash
# Generate reports from MAM database

DB_DIR="$(dirname "$0")/../database"
REPORTS_DIR="$(dirname "$0")/../reports"

mkdir -p "$REPORTS_DIR"

MODE=""
FILTER=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --assets)
      MODE="assets"
      shift
      ;;
    --posts)
      MODE="posts"
      shift
      ;;
    --campaign)
      MODE="campaign"
      FILTER="$2"
      shift 2
      ;;
    --platform)
      MODE="platform"
      FILTER="$2"
      shift 2
      ;;
    *)
      echo "Usage: $0 [--assets|--posts|--campaign <name>|--platform <name>]"
      exit 1
      ;;
  esac
done

case $MODE in
  assets)
    echo "# Media Asset Report"
    echo "Generated: $(date)"
    echo ""
    echo "| ID | Filename | Type | Size | Campaign | Status |"
    echo "|----|----------|------|------|----------|--------|"
    if [[ -f "$DB_DIR/assets.jsonl" ]]; then
      while IFS= read -r line; do
        ID=$(echo "$line" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        FILE=$(echo "$line" | grep -o '"filename":"[^"]*"' | cut -d'"' -f4)
        TYPE=$(echo "$line" | grep -o '"file_type":"[^"]*"' | cut -d'"' -f4)
        SIZE=$(echo "$line" | grep -o '"file_size_bytes":[0-9]*' | cut -d':' -f2)
        CAMP=$(echo "$line" | grep -o '"campaign":"[^"]*"' | cut -d'"' -f4)
        STATUS=$(echo "$line" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        echo "| $ID | $FILE | $TYPE | ${SIZE:-0} | $CAMP | $STATUS |"
      done < "$DB_DIR/assets.jsonl"
    fi
    ;;
  
  posts)
    echo "# Post Report"
    echo "Generated: $(date)"
    echo ""
    echo "| Post ID | Asset | Platform | Posted | URL |"
    echo "|---------|-------|----------|--------|-----|"
    if [[ -f "$DB_DIR/posts.jsonl" ]]; then
      while IFS= read -r line; do
        PID=$(echo "$line" | grep -o '"post_id":"[^"]*"' | cut -d'"' -f4)
        AID=$(echo "$line" | grep -o '"asset_id":"[^"]*"' | cut -d'"' -f4)
        PLAT=$(echo "$line" | grep -o '"platform":"[^"]*"' | cut -d'"' -f4)
        DATE=$(echo "$line" | grep -o '"posted_at":"[^"]*"' | cut -d'"' -f4)
        URL=$(echo "$line" | grep -o '"post_url":"[^"]*"' | cut -d'"' -f4)
        echo "| $PID | $AID | $PLAT | $DATE | $URL |"
      done < "$DB_DIR/posts.jsonl"
    fi
    ;;
  
  campaign)
    echo "# Campaign Report: $FILTER"
    echo "Generated: $(date)"
    echo ""
    echo "## Assets in Campaign"
    echo ""
    COUNT=0
    if [[ -f "$DB_DIR/assets.jsonl" ]]; then
      while IFS= read -r line; do
        if echo "$line" | grep -q "\"campaign\":\"$FILTER\""; then
          ID=$(echo "$line" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
          FILE=$(echo "$line" | grep -o '"filename":"[^"]*"' | cut -d'"' -f4)
          STATUS=$(echo "$line" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
          echo "- $ID: $FILE ($STATUS)"
          ((COUNT++))
        fi
      done < "$DB_DIR/assets.jsonl"
    fi
    echo ""
    echo "Total: $COUNT assets"
    ;;
  
  platform)
    echo "# Platform Report: $FILTER"
    echo "Generated: $(date)"
    echo ""
    echo "## Posts on $FILTER"
    echo ""
    COUNT=0
    if [[ -f "$DB_DIR/posts.jsonl" ]]; then
      while IFS= read -r line; do
        if echo "$line" | grep -q "\"platform\":\"$FILTER\""; then
          PID=$(echo "$line" | grep -o '"post_id":"[^"]*"' | cut -d'"' -f4)
          AID=$(echo "$line" | grep -o '"asset_id":"[^"]*"' | cut -d'"' -f4)
          echo "- $PID (asset: $AID)"
          ((COUNT++))
        fi
      done < "$DB_DIR/posts.jsonl"
    fi
    echo ""
    echo "Total: $COUNT posts"
    ;;
  
  *)
    echo "Usage: $0 [--assets|--posts|--campaign <name>|--platform <name>]"
    exit 1
    ;;
esac

echo ""
echo "---"
echo "Next: ./scripts/analytics-pull.sh --post-id <id> --impressions <n> ..."
