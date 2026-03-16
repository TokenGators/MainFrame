#!/bin/bash
# Track a post for an asset

DB_DIR="$(dirname "$0")/../database"

ASSET_ID=""
PLATFORM=""
URL=""
CAPTION=""
HASHTAGS=""
POSTED_BY=""
IS_PAID="false"
BUDGET=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --asset-id)
      ASSET_ID="$2"
      shift 2
      ;;
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    --url)
      URL="$2"
      shift 2
      ;;
    --caption)
      CAPTION="$2"
      shift 2
      ;;
    --hashtags)
      HASHTAGS="$2"
      shift 2
      ;;
    --posted-by)
      POSTED_BY="$2"
      shift 2
      ;;
    --paid)
      IS_PAID="true"
      shift
      ;;
    --budget)
      BUDGET="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate
if [[ -z "$ASSET_ID" ]] || [[ -z "$PLATFORM" ]]; then
  echo "Usage: $0 --asset-id <id> --platform <platform> --url <url>"
  exit 1
fi

# Check asset exists
if ! grep -q "\"id\":\"$ASSET_ID\"" "$DB_DIR/assets.jsonl"; then
  echo "Error: Asset not found: $ASSET_ID"
  exit 1
fi

# Generate post ID
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
POST_ID="post_${TIMESTAMP}"
PLATFORM_POST_ID=$(echo "$URL" | grep -oE '[0-9]+$' || echo "null")

# Format hashtags
HASHTAG_ARRAY=""
if [[ -n "$HASHTAGS" ]]; then
  HASHTAG_ARRAY=$(echo "$HASHTAGS" | tr ',' '\n' | sed 's/^/#/' | awk '{printf "\"%s\",", $0}' | sed 's/,$//')
fi

# Create JSON record
JSON=$(cat <<EOF
{"post_id":"$POST_ID","asset_id":"$ASSET_ID","platform":"$PLATFORM","platform_post_id":"$PLATFORM_POST_ID","post_url":"$URL","posted_at":"$(date -u +"%Y-%m-%dT%H:%M:%SZ")","posted_by":"${POSTED_BY:-unknown}","caption":"${CAPTION:-}","hashtags":[$HASHTAG_ARRAY],"is_paid":$IS_PAID,"budget_usd":${BUDGET:-null},"target_audience":"community"}
EOF
)

# Append to database
echo "$JSON" >> "$DB_DIR/posts.jsonl"

# Update asset status to "posted"
# (This would need a proper JSON manipulation tool or temp file approach)
tmp=$(mktemp)
while IFS= read -r line; do
  if echo "$line" | grep -q "\"id\":\"$ASSET_ID\""; then
    line=$(echo "$line" | sed 's/"status":"[^"]*"/"status":"posted"/')
  fi
  echo "$line" >> "$tmp"
done < "$DB_DIR/assets.jsonl"
mv "$tmp" "$DB_DIR/assets.jsonl"

echo "Post tracked: $POST_ID"
echo "Asset: $ASSET_ID"
echo "Platform: $PLATFORM"
echo "URL: $URL"
echo ""
echo "To pull analytics later:"
echo "  ./scripts/analytics-pull.sh --post-id $POST_ID"
