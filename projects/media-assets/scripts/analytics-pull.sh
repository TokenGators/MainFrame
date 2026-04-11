#!/bin/bash
# Pull analytics for a post (manual entry for now, API later)

DB_DIR="$(dirname "$0")/../database"

POST_ID=""
ASSET_ID=""
PLATFORM=""

# Analytics fields
IMPRESSIONS=""
REACH=""
ENGAGEMENTS=""
LIKES=""
REPOSTS=""
COMMENTS=""
BOOKMARKS=""
CLICKS=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --post-id)
      POST_ID="$2"
      shift 2
      ;;
    --asset-id)
      ASSET_ID="$2"
      shift 2
      ;;
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    --impressions)
      IMPRESSIONS="$2"
      shift 2
      ;;
    --reach)
      REACH="$2"
      shift 2
      ;;
    --engagements)
      ENGAGEMENTS="$2"
      shift 2
      ;;
    --likes)
      LIKES="$2"
      shift 2
      ;;
    --reposts)
      REPOSTS="$2"
      shift 2
      ;;
    --comments)
      COMMENTS="$2"
      shift 2
      ;;
    --bookmarks)
      BOOKMARKS="$2"
      shift 2
      ;;
    --clicks)
      CLICKS="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Create JSON record
JSON=$(cat <<EOF
{"asset_id":"${ASSET_ID:-null}","post_id":"${POST_ID:-null}","platform":"$PLATFORM","collected_at":"$(date -u +"%Y-%m-%dT%H:%M:%SZ")","impressions":${IMPRESSIONS:-0},"reach":${REACH:-0},"engagements":${ENGAGEMENTS:-0},"likes":${LIKES:-0},"reposts":${REPOSTS:-0},"quotes":0,"replies":${COMMENTS:-0},"bookmarks":${BOOKMARKS:-0},"clicks":${CLICKS:-0},"ctr_percent":0.0,"engagement_rate_percent":0.0}
EOF
)

# Append to database
echo "$JSON" >> "$DB_DIR/analytics.jsonl"

echo "Analytics recorded for: ${POST_ID:-$ASSET_ID}"

# Generate CTR