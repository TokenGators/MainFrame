#!/usr/bin/env python3
"""
build-drive-manifest.py — Walk a mounted Google Drive folder and build a media manifest.

Recursively walks a Google Drive mount point, catalogues all media files (images,
videos, GIFs, documents), and writes metadata-only records to drive-manifest.jsonl.

NO files are copied. Only paths, sizes, and metadata are recorded.

The mount path should be the Google Drive Desktop sync folder on this Mac, typically:
  ~/Library/CloudStorage/GoogleDrive-<email>/My Drive/
  or ~/Google Drive/My Drive/

Recommended: restrict sync to only the TokenGators folders before running.
Also recommended: chmod -R a-w on the mounted folder to prevent accidental writes.

Output: projects/media-assets/database/drive-manifest.jsonl

Usage:
    python build-drive-manifest.py
    python build-drive-manifest.py --mount "~/Library/CloudStorage/GoogleDrive-you@example.com/My Drive"
    python build-drive-manifest.py --dry-run
    python build-drive-manifest.py --mount /path/to/drive --output /path/to/manifest.jsonl
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


# ---------------------------------------------------------------------------
# File type config
# ---------------------------------------------------------------------------

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".tiff", ".bmp"}
GIF_EXTENSIONS = {".gif"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".wmv", ".flv"}
DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".md", ".pages"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a"}

ALL_MEDIA_EXTENSIONS = (
    IMAGE_EXTENSIONS | GIF_EXTENSIONS | VIDEO_EXTENSIONS | DOCUMENT_EXTENSIONS | AUDIO_EXTENSIONS
)

# Folders to always skip
SKIP_FOLDERS = {".Trash", ".DS_Store", "__pycache__", ".git", "node_modules"}


# ---------------------------------------------------------------------------
# Schema helpers
# ---------------------------------------------------------------------------

def resolve_asset_type(ext: str) -> str:
    """Determine asset type from file extension."""
    ext = ext.lower()
    if ext in GIF_EXTENSIONS:
        return "gif"
    if ext in IMAGE_EXTENSIONS:
        return "image"
    if ext in VIDEO_EXTENSIONS:
        return "video"
    if ext in DOCUMENT_EXTENSIONS:
        return "article"
    if ext in AUDIO_EXTENSIONS:
        return "audio"
    return "unknown"


def stat_to_timestamp(ts: float) -> str:
    """Convert a filesystem timestamp (float) to ISO 8601."""
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def file_to_record(file_path: Path, mount_root: Path) -> dict:
    """
    Build a registry record for a single file.

    Uses a relative path from the mount root as the stable ID to avoid
    embedding absolute machine paths in the registry.
    """
    try:
        stat = file_path.stat()
    except OSError as e:
        raise RuntimeError(f"Cannot stat {file_path}: {e}")

    ext = file_path.suffix.lower()
    asset_type = resolve_asset_type(ext)

    # Relative path from mount root — used as stable identifier
    try:
        rel_path = file_path.relative_to(mount_root)
    except ValueError:
        rel_path = file_path

    # Build a slug ID from the relative path
    slug = str(rel_path).replace("/", "--").replace(" ", "-").replace("_", "-").lower()
    # Remove extension from slug
    slug = slug[:slug.rfind(".")] if "." in slug else slug
    asset_id = f"drive-{asset_type}-{slug}"[:200]  # cap length

    created_at = stat_to_timestamp(stat.st_birthtime if hasattr(stat, "st_birthtime") else stat.st_mtime)
    modified_at = stat_to_timestamp(stat.st_mtime)

    return {
        "id": asset_id,
        "type": asset_type,
        "created_at": created_at,
        "source_url": "",  # Google Drive doesn't expose stable public URLs without auth
        "tags": [],
        "collections": [],
        "flagged_by": None,
        "flagged_at": None,
        "linked_assets": [],
        "metadata": {
            "drive_source": "google_drive",
            "relative_path": str(rel_path),
            "filename": file_path.name,
            "extension": ext,
            "size_bytes": stat.st_size,
            "modified_at": modified_at,
            "mount_root": str(mount_root),
        },
        # Type-specific stubs (populated later via AI or manual entry)
        "filename": file_path.name,
        "format": ext.lstrip("."),
        "dimensions": "",        # Would require image load to detect
        "alt_text": "",
        "visual_summary": "",
        "featured_gators": [] if asset_type in ("image", "gif", "video") else None,
    }


# ---------------------------------------------------------------------------
# Walk
# ---------------------------------------------------------------------------

def walk_drive(mount_root: Path, extensions: set) -> list:
    """
    Recursively walk mount_root and collect media file records.
    Skips hidden folders and known noise directories.
    """
    records = []
    skipped = 0

    for dirpath, dirnames, filenames in os.walk(mount_root):
        # Prune skip folders in-place (modifies dirnames to prevent descent)
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIP_FOLDERS and not d.startswith(".")
        ]

        for filename in filenames:
            if filename.startswith("."):
                continue
            ext = Path(filename).suffix.lower()
            if ext not in extensions:
                skipped += 1
                continue

            file_path = Path(dirpath) / filename
            try:
                record = file_to_record(file_path, mount_root)
                records.append(record)
            except Exception as e:
                print(f"WARNING: Skipping {file_path}: {e}", file=sys.stderr)

    return records, skipped


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Build a media manifest from a mounted Google Drive folder.")
    parser.add_argument(
        "--mount",
        default=None,
        help="Path to mounted Google Drive folder (default: tries common macOS locations)",
    )
    parser.add_argument("--output", default=None, help="Output JSONL path")
    parser.add_argument(
        "--types",
        nargs="+",
        choices=["image", "gif", "video", "document", "audio", "all"],
        default=["all"],
        help="File types to include (default: all)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Walk and count files without writing output")
    args = parser.parse_args()

    # Resolve mount path
    if args.mount:
        mount_root = Path(args.mount).expanduser()
    else:
        # Try common macOS Google Drive Desktop locations
        candidates = [
            Path("~/Library/CloudStorage").expanduser(),
            Path("~/Google Drive").expanduser(),
            Path("/Volumes/GoogleDrive"),
        ]
        mount_root = None
        for candidate in candidates:
            if candidate.is_dir():
                # If it's the CloudStorage parent, look for a subdirectory
                if candidate.name == "CloudStorage":
                    subdirs = [d for d in candidate.iterdir() if d.is_dir() and "GoogleDrive" in d.name]
                    if subdirs:
                        mount_root = subdirs[0]
                        break
                else:
                    mount_root = candidate
                    break

        if not mount_root:
            print(
                "ERROR: Could not find Google Drive mount. "
                "Use --mount to specify the path explicitly.",
                file=sys.stderr,
            )
            sys.exit(1)

    if not mount_root.exists():
        print(f"ERROR: Mount path does not exist: {mount_root}", file=sys.stderr)
        sys.exit(1)

    print(f"Walking: {mount_root}")

    # Resolve extensions to scan
    if "all" in args.types:
        extensions = ALL_MEDIA_EXTENSIONS
    else:
        extensions = set()
        for t in args.types:
            if t == "image":
                extensions |= IMAGE_EXTENSIONS
            elif t == "gif":
                extensions |= GIF_EXTENSIONS
            elif t == "video":
                extensions |= VIDEO_EXTENSIONS
            elif t == "document":
                extensions |= DOCUMENT_EXTENSIONS
            elif t == "audio":
                extensions |= AUDIO_EXTENSIONS

    records, skipped = walk_drive(mount_root, extensions)
    print(f"Found {len(records)} media files ({skipped} non-media files skipped)")

    script_dir = Path(__file__).parent
    db_dir = script_dir.parent / "database"
    output_path = Path(args.output) if args.output else db_dir / "drive-manifest.jsonl"

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
