#!/usr/bin/env python3
"""
ingest-memes.py — Ingest memes/GIFs from Supabase public storage into the Gatorpedia registry.

Fetches the manifest of objects from the TokenGators Supabase public storage bucket,
maps each file to the unified image/gif schema from the PRD, and writes records to
projects/media-assets/database/memes.jsonl.

The Supabase bucket is public — no auth required. We use the REST storage API to
list objects, then build public CDN URLs for each.

Supabase project ref: xohizqpolnhemdvjvgro
Public storage base: https://xohizqpolnhemdvjvgro.supabase.co/storage/v1

Usage:
    python ingest-memes.py
    python ingest-memes.py --dry-run
    python ingest-memes.py --bucket memes --output /path/to/memes.jsonl
    python ingest-memes.py --list-buckets   # list available public buckets
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' is required. Install with: pip install requests", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SUPABASE_URL = "https://xohizqpolnhemdvjvgro.supabase.co"
STORAGE_API = f"{SUPABASE_URL}/storage/v1"
# Default bucket name — update if bucket is named differently
DEFAULT_BUCKET = "memes"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
GIF_EXTENSIONS = {".gif"}


# ---------------------------------------------------------------------------
# Supabase storage helpers
# ---------------------------------------------------------------------------

def list_bucket_objects(bucket: str, prefix: str = "", limit: int = 1000) -> list:
    """
    List all objects in a public Supabase storage bucket using the REST API.
    Returns a list of object metadata dicts.
    """
    url = f"{STORAGE_API}/object/list/{bucket}"
    payload = {
        "limit": limit,
        "offset": 0,
        "prefix": prefix,
        "sortBy": {"column": "name", "order": "asc"},
    }
    headers = {"Content-Type": "application/json"}

    all_objects = []
    offset = 0

    while True:
        payload["offset"] = offset
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=30)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"ERROR: Failed to list bucket '{bucket}': {e}", file=sys.stderr)
            sys.exit(1)

        batch = resp.json()
        if not batch:
            break

        all_objects.extend(batch)
        if len(batch) < limit:
            break
        offset += limit

    return all_objects


def public_url(bucket: str, object_name: str) -> str:
    """Build the public CDN URL for a Supabase storage object."""
    return f"{STORAGE_API}/object/public/{bucket}/{object_name}"


def list_buckets() -> list:
    """Attempt to list available public buckets (may require anon key)."""
    url = f"{STORAGE_API}/bucket"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        print(f"WARNING: Could not list buckets: {e}", file=sys.stderr)
        return []


# ---------------------------------------------------------------------------
# Schema helpers
# ---------------------------------------------------------------------------

def build_base(record_id: str, asset_type: str, created_at: str, source_url: str) -> dict:
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


def object_to_record(obj: dict, bucket: str) -> dict:
    """Map a Supabase storage object to a unified image/gif registry record."""
    name = obj.get("name") or ""
    ext = Path(name).suffix.lower()
    stem = Path(name).stem

    # Determine asset type from extension
    if ext in GIF_EXTENSIONS:
        asset_type = "gif"
    else:
        asset_type = "image"

    # Use the object name as a stable slug ID
    safe_stem = stem.replace(" ", "-").replace("_", "-").lower()
    asset_id = f"{asset_type}-{safe_stem}"

    # Timestamps from object metadata
    created_at = obj.get("created_at") or obj.get("updated_at") or ""

    cdn_url = public_url(bucket, name)

    record = build_base(asset_id, asset_type, created_at, cdn_url)

    # Image/gif-specific fields
    metadata = obj.get("metadata") or {}
    record.update({
        "filename": name,
        "dimensions": "",  # Not available from storage API; would need image download to detect
        "format": ext.lstrip(".") if ext else "",
        "alt_text": "",  # To be filled manually or via vision model pass
        "visual_summary": "",  # To be filled via AI tagging pass
        "featured_gators": [],  # Populated later
        # Preserve raw Supabase metadata for reference
        "metadata": {
            "supabase_id": obj.get("id") or "",
            "size": metadata.get("size") or obj.get("metadata", {}).get("size") or 0,
            "mimetype": metadata.get("mimetype") or obj.get("metadata", {}).get("mimetype") or "",
            "bucket": bucket,
        },
    })

    return record


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Ingest Supabase memes/GIFs into Gatorpedia registry.")
    parser.add_argument("--bucket", default=DEFAULT_BUCKET, help=f"Supabase bucket name (default: {DEFAULT_BUCKET})")
    parser.add_argument("--prefix", default="", help="Object name prefix filter (optional)")
    parser.add_argument("--output", default=None, help="Output JSONL file path")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing output")
    parser.add_argument("--list-buckets", action="store_true", help="List available buckets and exit")
    args = parser.parse_args()

    if args.list_buckets:
        buckets = list_buckets()
        if buckets:
            print("Available buckets:")
            for b in buckets:
                print(f"  {b.get('id') or b.get('name')} (public={b.get('public')})")
        else:
            print("Could not retrieve bucket list (may require auth).")
        return

    script_dir = Path(__file__).parent
    db_dir = script_dir.parent / "database"
    output_path = Path(args.output) if args.output else db_dir / "memes.jsonl"

    print(f"Fetching objects from bucket '{args.bucket}'...")
    objects = list_bucket_objects(args.bucket, prefix=args.prefix)
    print(f"Found {len(objects)} objects")

    records = []
    for obj in objects:
        name = obj.get("name") or ""
        ext = Path(name).suffix.lower()
        # Skip non-media files (folders, etc.)
        if not ext or ext not in (IMAGE_EXTENSIONS | GIF_EXTENSIONS):
            continue
        records.append(object_to_record(obj, args.bucket))

    print(f"Mapped {len(records)} media records")

    if args.dry_run:
        print("\n-- DRY RUN: first 3 records --")
        for rec in records[:3]:
            print(json.dumps(rec, indent=2))
        print(f"\nWould write {len(records)} records to {output_path}")
        return

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"Written to {output_path}")


if __name__ == "__main__":
    main()
