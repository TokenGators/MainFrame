#!/bin/bash
# Add new asset to MAM system

ASSETS_DIR="$(dirname "$0")/../assets"
DB_DIR="$(dirname "$0")/../database"

# Parse arguments
FILE=""
TYPE=""
CAMPAIGN=""
CREATOR=""
TAGS=""
DESCRIPTION=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --file)
      FILE="$2"
      shift 2
      ;;
    --type)
      TYPE="$2"
      shift 2
      ;;
    --campaign)
      CAMPAIGN="$2"
      shift 2
      ;;
    --creator)
      CREATOR="$2"
      shift 2
      ;;
    --tags)
      TAGS="$2"
      shift 2
      ;;
    --description)
      DESCRIPTION="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate file exists
if [[ ! -f "$FILE" ]]; then
  echo "Error: File not found: $FILE"
  exit 1
fi

# Generate asset ID
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
ID="asset_${TIMESTAMP}"

# Get file info
FILENAME=$(basename "$FILE")
SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null)
EXT="${FILENAME##*.}"

# Determine MIME type
if command -v file &> /dev/null; then
  MIME=$(file -b --mime-type "$FILE")
else
  MIME="unknown/$(echo $EXT | tr '[:upper:]' '[:lower:]')"
fi

# Get dimensions for images/video
DIMENSIONS="null"
DURATION="null"

if [[ "$MIME" == image/* ]] && command -v identify &> /dev/null; then
  DIMENSIONS=$(identify -format "%wx%h" "$FILE" 2>/dev/null || echo "null")
elif [[ "$MIME" == video/* ]] && command -v ffprobe &> /dev/null; then
  DIMENSIONS=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$FILE" 2>/dev/null || echo "null")
fi

# Calculate MD5 checksum
CHECKSUM=$(md5sum "$FILE" 2>/dev/null | cut -d' ' -f1 || md5 -q "$FILE" 2>/dev/null)

# Copy to assets directory
case $TYPE in
  image)
    DEST="$ASSETS_DIR/images/"
    ;;
  video)
    DEST="$ASSETS_DIR/video/"
    ;;
  audio)
    DEST="$ASSETS_DIR/audio/"
    ;;
  raw)
    DEST="$ASSETS_DIR/raw/"
    ;;
  *)
    DEST="$ASSETS_DIR/raw/"
    ;;
esac

mkdir -p "$DEST"
NEW_PATH="$DEST$FILENAME"
cp "$FILE" "$NEW_PATH"

# Create JSON record
JSON=$(cat <<EOF
{"id":"$ID","filename":"$FILENAME","file_type":"$MIME","extension":"$EXT","file_size_bytes":$SIZE,"dimensions":"$DIMENSIONS","duration_seconds":$DURATION,"created_at":"$(date -u +"%Y-%m-%dT%H:%M:%SZ")","created_by":"${CREATOR:-unknown}","campaign":"${CAMPAIGN:-none}","tags":[$(echo "$TAGS" | tr ',' '\n' | awk '{printf "\"%s\",", $0}' | sed 's/,$//')],"status":"draft","description":"${DESCRIPTION:-}","source_file":"$NEW_PATH","checksum_md5":"$CHECKSUM"}
EOF
)

# Append to database
echo "$JSON" >> "$DB_DIR/assets.jsonl"

echo "Asset added: $ID"
echo "File: $NEW_PATH"
echo "Size: ${SIZE} bytes"
echo "MD5: $CHECKSUM"
echo ""
echo "Next steps:"
echo "  1. Review: cat $DB_DIR/assets.jsonl | grep \"$ID\""
echo "  2. Track post: ./scripts/post-track.sh --asset-id $ID --platform x --url ..."
