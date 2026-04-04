#!/usr/bin/env python3
"""
migrate-posts.py — Migrate posts.jsonl to the unified Gatorpedia base schema.

Reads projects/media-assets/database/posts.jsonl (raw tweet archive) and
maps each record to the unified base + tweet type-specific schema defined
in the Gatorpedia Asset Registry PRD.

Output: projects/media-assets/database/posts-migrated.jsonl

Usage:
    python migrate-posts.py
    python migrate-posts.py --dry-run
    python migrate-posts.py --input path/to/posts.jsonl --output path/to/out.jsonl
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


# ---------------------------------------------------------------------------
# Schema helpers
# ---------------------------------------------------------------------------

def build_base(record_id: str, asset_type: str, created_at: str, source_url: str) -> dict:
    """Build the common base schema fields shared by all asset types."""
    return {
        "id": record_id,
        "type": asset_type,
        "created_at": created_at,
        "source_url": source_url,
        "tags": [],
        "collections": [],
        "flagged_by": None,
        "flagged_at": None,
        "linked_assets": [],
        "metadata": {},
    }


def migrate_tweet(raw: dict) -> dict:
    """
    Map a raw tweet record to the unified tweet schema.

    Raw record fields vary — we handle common keys from the existing
    posts.jsonl export format and fall back gracefully for missing fields.
    """
    # Resolve the platform post ID — handles Twitter API v1, v2, and custom formats
    platform_post_id = (
        raw.get("id_str")
        or str(raw.get("id") or "")
        or raw.get("platform_post_id")
        or raw.get("tweet_id")
        or ""
    )
    platform_post_id = str(platform_post_id)

    asset_id = f"tweet-{platform_post_id}" if platform_post_id else f"tweet-unknown-{hash(json.dumps(raw, sort_keys=True)) & 0xFFFFFF}"

    # Timestamps — try ISO string first, then epoch ms
    created_raw = raw.get("created_at") or raw.get("timestamp") or ""
    created_at = normalize_timestamp(created_raw)

    # Source URL — Twitter API v2 doesn't include author handle directly,
    # but we can build a reasonable URL from the tweet ID
    author = (
        raw.get("author_handle")
        or (raw.get("user", {}).get("screen_name", "") if isinstance(raw.get("user"), dict) else "")
        or "TokenGators"  # fallback for v2 API records without author info
    )
    source_url = raw.get("source_url") or raw.get("url") or (
        f"https://x.com/{author}/status/{platform_post_id}" if platform_post_id else ""
    )

    record = build_base(asset_id, "tweet", created_at, source_url)

    # Stats — Twitter API v2 nests these under public_metrics
    public_metrics = raw.get("public_metrics") or {}
    record.update({
        "text": raw.get("full_text") or raw.get("text") or "",
        "platform_post_id": platform_post_id,
        "author_handle": author,
        "stats": {
            "likes": int(public_metrics.get("like_count") or raw.get("favorite_count") or raw.get("likes") or 0),
            "retweets": int(public_metrics.get("retweet_count") or raw.get("retweet_count") or raw.get("retweets") or 0),
            "replies": int(public_metrics.get("reply_count") or raw.get("reply_count") or raw.get("replies") or 0),
            "impressions": int(public_metrics.get("impression_count") or raw.get("impression_count") or raw.get("impressions") or 0),
        },
        "hashtags": extract_hashtags(raw),
        "mentions": extract_mentions(raw),
        "media_urls": extract_media_urls(raw),
        "post_type": resolve_post_type(raw),
    })

    return record


# ---------------------------------------------------------------------------
# Field extraction helpers
# ---------------------------------------------------------------------------

def normalize_timestamp(value: str) -> str:
    """Convert various timestamp formats to ISO 8601."""
    if not value:
        return ""
    # Already ISO-ish
    if "T" in str(value) or "-" in str(value)[:10]:
        return str(value)
    # Twitter's default format: "Mon Jan 01 00:00:00 +0000 2024"
    try:
        dt = datetime.strptime(str(value), "%a %b %d %H:%M:%S %z %Y")
        return dt.isoformat()
    except ValueError:
        pass
    # Epoch seconds / ms
    try:
        ts = float(value)
        if ts > 1e10:
            ts /= 1000  # ms → s
        return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
    except (ValueError, TypeError):
        pass
    return str(value)


def extract_hashtags(raw: dict) -> list:
    """Pull hashtag strings from raw tweet record."""
    # Direct field
    if "hashtags" in raw and isinstance(raw["hashtags"], list):
        return [str(h).lstrip("#") for h in raw["hashtags"]]
    # Twitter API v1 entities
    entities = raw.get("entities") or {}
    ht = entities.get("hashtags") or []
    if ht and isinstance(ht[0], dict):
        return [h.get("text", "") for h in ht]
    return [str(h) for h in ht]


def extract_mentions(raw: dict) -> list:
    """Pull @mention strings from raw tweet record."""
    if "mentions" in raw and isinstance(raw["mentions"], list):
        return [str(m).lstrip("@") for m in raw["mentions"]]
    entities = raw.get("entities") or {}
    um = entities.get("user_mentions") or []
    if um and isinstance(um[0], dict):
        return [m.get("screen_name", "") for m in um]
    return [str(m) for m in um]


def extract_media_urls(raw: dict) -> list:
    """Pull media URLs from raw tweet record."""
    if "media_urls" in raw and isinstance(raw["media_urls"], list):
        return raw["media_urls"]
    # Twitter API v1 extended_entities
    ext = raw.get("extended_entities") or raw.get("entities") or {}
    media = ext.get("media") or []
    if media:
        return [m.get("media_url_https") or m.get("media_url", "") for m in media if isinstance(m, dict)]
    # Twitter API v2: media URLs appear in urls[] with expanded_url pointing to pic.x.com or video
    # Use `or ""` (not default arg) to handle expanded_url: null in source data
    urls = raw.get("urls") or []
    return [
        u.get("expanded_url") or ""
        for u in urls
        if isinstance(u, dict) and (
            "pic.x.com" in (u.get("expanded_url") or "") or
            "/photo/" in (u.get("expanded_url") or "") or
            "/video/" in (u.get("expanded_url") or "")
        )
    ]


def resolve_post_type(raw: dict) -> str:
    """Determine tweet type: original, retweet, or reply."""
    if raw.get("post_type"):
        return raw["post_type"]
    if raw.get("retweeted_status") or str(raw.get("full_text", raw.get("text", ""))).startswith("RT @"):
        return "retweet"
    if raw.get("in_reply_to_status_id") or raw.get("in_reply_to_status_id_str"):
        return "reply"
    return "original"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Migrate posts.jsonl to unified Gatorpedia schema.")
    parser.add_argument("--input", default=None, help="Path to input posts.jsonl")
    parser.add_argument("--output", default=None, help="Path to output JSONL file")
    parser.add_argument("--dry-run", action="store_true", help="Preview migration without writing output")
    args = parser.parse_args()

    # Resolve paths relative to script location (projects/media-assets/scripts/)
    script_dir = Path(__file__).parent
    db_dir = script_dir.parent / "database"

    input_path = Path(args.input) if args.input else db_dir / "posts.jsonl"
    output_path = Path(args.output) if args.output else db_dir / "posts-migrated.jsonl"

    if not input_path.exists():
        print(f"ERROR: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    # Read
    raw_records = []
    with open(input_path, "r", encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                raw_records.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"WARNING: Skipping line {lineno} (JSON error: {e})", file=sys.stderr)

    print(f"Read {len(raw_records)} records from {input_path}")

    # Migrate
    migrated = []
    errors = 0
    for i, raw in enumerate(raw_records):
        try:
            migrated.append(migrate_tweet(raw))
        except Exception as e:
            print(f"WARNING: Failed to migrate record {i}: {e}", file=sys.stderr)
            errors += 1

    print(f"Migrated {len(migrated)} records ({errors} errors)")

    if args.dry_run:
        print("\n-- DRY RUN: first 3 records --")
        for rec in migrated[:3]:
            print(json.dumps(rec, indent=2))
        print(f"\nWould write {len(migrated)} records to {output_path}")
        return

    # Write
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for rec in migrated:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"Written to {output_path}")


if __name__ == "__main__":
    main()
