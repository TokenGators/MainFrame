#!/usr/bin/env python3
"""
migrate-videos.py — Migrate per-video analysis JSONs to the unified Gatorpedia video schema.

Reads individual JSON files from /Users/operator/Media/media-processor/analysis/
(one file per video, produced by the media-processor pipeline) and maps each to
the unified video schema defined in the Gatorpedia Asset Registry PRD.

Key mapping:
  - brand_lore_tags  → platform_tags  (NOT registry tags; for YouTube/Giphy upload use)
  - visual_summary, transcript, tone_and_energy, brand_signals preserved as-is
  - featured_gators initialized to [] (populated later via AI pass + human audit)

Output: projects/media-assets/database/videos.jsonl

Usage:
    python migrate-videos.py
    python migrate-videos.py --dry-run
    python migrate-videos.py --input /path/to/analysis/ --output /path/to/videos.jsonl
"""

import argparse
import json
import re
import sys
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


def slugify(name: str) -> str:
    """Convert a filename (without extension) to a slug-safe asset ID."""
    name = re.sub(r"[^\w\s-]", "", name)
    name = re.sub(r"[\s_]+", "-", name).strip("-")
    return name


def migrate_video(analysis: dict, source_file: Path) -> dict:
    """
    Map a video analysis JSON to the unified video schema.

    The analysis JSON structure varies slightly between runs of the
    media-processor, so we handle multiple possible field names.
    """
    filename = analysis.get("filename") or analysis.get("file") or source_file.stem + ".mp4"
    stem = Path(filename).stem
    asset_id = f"video-{slugify(stem)}"

    created_at = analysis.get("created_at") or analysis.get("date") or ""
    source_url = analysis.get("source_url") or analysis.get("url") or ""

    record = build_base(asset_id, "video", created_at, source_url)

    # Video-specific fields
    brand_signals_raw = analysis.get("brand_signals") or {}
    record.update({
        "filename": filename,
        "duration_seconds": analysis.get("duration_seconds") or analysis.get("duration") or 0,
        "resolution": analysis.get("resolution") or "",
        "tools_used": analysis.get("tools_used") or [],
        "transcript": analysis.get("transcript") or "",
        "visual_summary": analysis.get("visual_summary") or analysis.get("summary") or "",
        "tone_and_energy": analysis.get("tone_and_energy") or analysis.get("tone") or "",
        "brand_signals": {
            "values": brand_signals_raw.get("values") or [],
            "themes": brand_signals_raw.get("themes") or [],
            "language_patterns": brand_signals_raw.get("language_patterns") or [],
        },
        "memorable_moments": analysis.get("memorable_moments") or [],
        "aesthetic_notes": normalize_aesthetic(analysis.get("aesthetic_notes") or {}),
        # brand_lore_tags from media-processor → stored as platform_tags
        # These are NOT registry tags; they are for platform upload (YouTube, Giphy, Tenor)
        "platform_tags": (
            analysis.get("brand_lore_tags")
            or analysis.get("platform_tags")
            or []
        ),
        # Populated later via AI-assisted pass + human audit
        "featured_gators": [],
    })

    return record


def normalize_aesthetic(raw: dict) -> dict:
    """Normalize aesthetic_notes to the expected schema fields."""
    return {
        "color_palette": raw.get("color_palette") or "",
        "editing_style": raw.get("editing_style") or "",
        "production_quality": raw.get("production_quality") or "",
        "music_or_sound": raw.get("music_or_sound") or raw.get("music") or "",
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Migrate video analysis JSONs to unified Gatorpedia schema.")
    parser.add_argument("--input", default=None, help="Path to analysis/ folder containing per-video JSONs")
    parser.add_argument("--output", default=None, help="Path to output videos.jsonl")
    parser.add_argument("--dry-run", action="store_true", help="Preview migration without writing output")
    args = parser.parse_args()

    script_dir = Path(__file__).parent
    db_dir = script_dir.parent / "database"

    input_dir = Path(args.input) if args.input else Path("/Users/operator/Media/media-processor/analysis")
    output_path = Path(args.output) if args.output else db_dir / "videos.jsonl"

    if not input_dir.exists():
        print(f"ERROR: Analysis directory not found: {input_dir}", file=sys.stderr)
        sys.exit(1)

    json_files = sorted(input_dir.glob("*.json"))
    if not json_files:
        print(f"No JSON files found in {input_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(json_files)} analysis files in {input_dir}")

    migrated = []
    errors = 0
    for json_file in json_files:
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                analysis = json.load(f)
            if isinstance(analysis, list):
                for item in analysis:
                    migrated.append(migrate_video(item, json_file))
            else:
                migrated.append(migrate_video(analysis, json_file))
        except Exception as e:
            print(f"WARNING: Failed to migrate {json_file.name}: {e}", file=sys.stderr)
            errors += 1

    print(f"Migrated {len(migrated)} video records ({errors} errors)")

    if args.dry_run:
        print("\n-- DRY RUN: first 2 records --")
        for rec in migrated[:2]:
            print(json.dumps(rec, indent=2))
        print(f"\nWould write {len(migrated)} records to {output_path}")
        return

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for rec in migrated:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"Written to {output_path}")


if __name__ == "__main__":
    main()
