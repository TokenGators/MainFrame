#!/usr/bin/env python3
"""
export-to-obsidian.py — Export the Gatorpedia registry to Obsidian-compatible markdown notes.

Reads all registry JSONL files (posts.jsonl, videos.jsonl, nfts.jsonl, memes.jsonl,
drive-manifest.jsonl) and generates one Obsidian markdown note per asset.

Notes are organized into type-based subfolders:
  <vault>/Assets/Tweets/
  <vault>/Assets/Videos/
  <vault>/Assets/NFTs/
  <vault>/Assets/Images/
  <vault>/Assets/GIFs/
  <vault>/Assets/Articles/
  <vault>/Assets/Audio/

Tags are rendered as Obsidian #tags.
linked_assets are rendered as [[wikilinks]] to the target note's ID.
featured_gators (on videos/images) are rendered as [[wikilinks]] to NFT notes.

IMPORTANT: Obsidian is DOWNSTREAM — never edit notes there. They are regenerated
from the registry. The registry (JSONL files) is the source of truth.

Usage:
    python export-to-obsidian.py
    python export-to-obsidian.py --vault /Users/operator/Vault
    python export-to-obsidian.py --dry-run
    python export-to-obsidian.py --type tweets   # Export only one type
"""

import argparse
import json
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DEFAULT_VAULT = Path("/Users/operator/Vault")
ASSETS_SUBDIR = "Assets"

TYPE_TO_FOLDER = {
    "tweet": "Tweets",
    "video": "Videos",
    "gator-nft": "NFTs",
    "image": "Images",
    "gif": "GIFs",
    "article": "Articles",
    "audio": "Audio",
    "unknown": "Other",
}

# Map of JSONL filename → asset type (for registry files that contain mixed types)
REGISTRY_FILES = [
    "posts.jsonl",
    "posts-migrated.jsonl",
    "videos.jsonl",
    "nfts.jsonl",
    "memes.jsonl",
    "drive-manifest.jsonl",
    "assets.jsonl",
]


# ---------------------------------------------------------------------------
# Note rendering
# ---------------------------------------------------------------------------

def tags_to_obsidian(tags: list) -> str:
    """Render a list of tag strings as Obsidian inline tags."""
    if not tags:
        return ""
    return " ".join(f"#{t}" for t in tags)


def asset_id_to_wikilink(asset_id: str) -> str:
    """Convert an asset ID to an Obsidian [[wikilink]]."""
    return f"[[{asset_id}]]"


def render_tweet(record: dict) -> str:
    """Render a tweet record as an Obsidian note."""
    lines = []
    lines.append(f"# {record.get('id', 'Tweet')}")
    lines.append("")

    tags_str = tags_to_obsidian(record.get("tags") or [])
    if tags_str:
        lines.append(tags_str)
        lines.append("")

    lines.append(f"**Author:** @{record.get('author_handle', '')}")
    lines.append(f"**Date:** {record.get('created_at', '')}")
    lines.append(f"**Type:** {record.get('post_type', 'original')}")
    if record.get("source_url"):
        lines.append(f"**URL:** {record['source_url']}")
    lines.append("")

    text = record.get("text", "")
    if text:
        lines.append("## Text")
        lines.append(f"> {text}")
        lines.append("")

    stats = record.get("stats") or {}
    if any(stats.values()):
        lines.append("## Stats")
        lines.append(f"- Likes: {stats.get('likes', 0)}")
        lines.append(f"- Retweets: {stats.get('retweets', 0)}")
        lines.append(f"- Replies: {stats.get('replies', 0)}")
        lines.append(f"- Impressions: {stats.get('impressions', 0)}")
        lines.append("")

    linked = record.get("linked_assets") or []
    if linked:
        lines.append("## Linked Assets")
        for a in linked:
            lines.append(f"- {asset_id_to_wikilink(a)}")
        lines.append("")

    hashtags = record.get("hashtags") or []
    if hashtags:
        lines.append(f"**Hashtags:** {', '.join('#' + h for h in hashtags)}")

    return "\n".join(lines)


def render_video(record: dict) -> str:
    """Render a video record as an Obsidian note."""
    lines = []
    lines.append(f"# {record.get('filename', record.get('id', 'Video'))}")
    lines.append("")

    tags_str = tags_to_obsidian(record.get("tags") or [])
    if tags_str:
        lines.append(tags_str)
        lines.append("")

    lines.append(f"**File:** {record.get('filename', '')}")
    lines.append(f"**Date:** {record.get('created_at', '')}")
    lines.append(f"**Duration:** {record.get('duration_seconds', 0)}s")
    lines.append(f"**Resolution:** {record.get('resolution', '')}")
    if record.get("source_url"):
        lines.append(f"**URL:** {record['source_url']}")
    lines.append("")

    if record.get("visual_summary"):
        lines.append("## Summary")
        lines.append(record["visual_summary"])
        lines.append("")

    if record.get("tone_and_energy"):
        lines.append(f"**Tone:** {record['tone_and_energy']}")
        lines.append("")

    if record.get("transcript"):
        lines.append("## Transcript")
        lines.append(record["transcript"])
        lines.append("")

    brand = record.get("brand_signals") or {}
    if any(brand.values()):
        lines.append("## Brand Signals")
        if brand.get("values"):
            lines.append(f"- **Values:** {', '.join(brand['values'])}")
        if brand.get("themes"):
            lines.append(f"- **Themes:** {', '.join(brand['themes'])}")
        if brand.get("language_patterns"):
            lines.append(f"- **Language:** {', '.join(brand['language_patterns'])}")
        lines.append("")

    moments = record.get("memorable_moments") or []
    if moments:
        lines.append("## Memorable Moments")
        for m in moments:
            if isinstance(m, dict):
                lines.append(f"- `{m.get('timestamp', '')}` — {m.get('description', '')}")
            else:
                lines.append(f"- {m}")
        lines.append("")

    aesthetic = record.get("aesthetic_notes") or {}
    if any(aesthetic.values()):
        lines.append("## Aesthetic Notes")
        for k, v in aesthetic.items():
            if v:
                lines.append(f"- **{k.replace('_', ' ').title()}:** {v}")
        lines.append("")

    featured = record.get("featured_gators") or []
    if featured:
        lines.append("## Featured Gators")
        for g in featured:
            lines.append(f"- {asset_id_to_wikilink(g)}")
        lines.append("")

    platform_tags = record.get("platform_tags") or []
    if platform_tags:
        lines.append("## Platform Tags")
        lines.append("*(For YouTube/Giphy/Tenor upload — not registry tags)*")
        lines.append(", ".join(platform_tags))
        lines.append("")

    linked = record.get("linked_assets") or []
    if linked:
        lines.append("## Linked Assets")
        for a in linked:
            lines.append(f"- {asset_id_to_wikilink(a)}")
        lines.append("")

    return "\n".join(lines)


def render_nft(record: dict) -> str:
    """Render a Gator NFT record as an Obsidian note."""
    lines = []
    name = record.get("name") or f"TokenGator #{record.get('token_id', '?')}"
    lines.append(f"# {name}")
    lines.append("")

    tags_str = tags_to_obsidian(record.get("tags") or [])
    if tags_str:
        lines.append(tags_str)
        lines.append("")

    lines.append(f"**Token ID:** #{record.get('token_id', '')}")
    if record.get("gateway_image_url"):
        lines.append(f"**Image:** {record['gateway_image_url']}")
    if record.get("ipfs_metadata_uri"):
        lines.append(f"**IPFS Metadata:** {record['ipfs_metadata_uri']}")
    if record.get("rarity_rank"):
        lines.append(f"**Rarity Rank:** #{record['rarity_rank']}")
    lines.append("")

    traits = record.get("traits") or []
    if traits:
        lines.append("## Traits")
        for t in traits:
            if isinstance(t, dict):
                lines.append(f"- **{t.get('trait_type', '')}:** {t.get('value', '')}")
        lines.append("")

    appearances = record.get("gator_appearances") or []
    if appearances:
        lines.append("## Appearances")
        for a in appearances:
            lines.append(f"- {asset_id_to_wikilink(a)}")
        lines.append("")

    return "\n".join(lines)


def render_image(record: dict) -> str:
    """Render an image/gif record as an Obsidian note."""
    lines = []
    lines.append(f"# {record.get('filename', record.get('id', 'Image'))}")
    lines.append("")

    tags_str = tags_to_obsidian(record.get("tags") or [])
    if tags_str:
        lines.append(tags_str)
        lines.append("")

    lines.append(f"**File:** {record.get('filename', '')}")
    lines.append(f"**Format:** {record.get('format', '')}")
    lines.append(f"**Dimensions:** {record.get('dimensions', '')}")
    lines.append(f"**Date:** {record.get('created_at', '')}")
    if record.get("source_url"):
        lines.append(f"**URL:** {record['source_url']}")
    lines.append("")

    if record.get("alt_text"):
        lines.append(f"**Alt Text:** {record['alt_text']}")
        lines.append("")

    if record.get("visual_summary"):
        lines.append("## Summary")
        lines.append(record["visual_summary"])
        lines.append("")

    featured = record.get("featured_gators") or []
    if featured:
        lines.append("## Featured Gators")
        for g in featured:
            lines.append(f"- {asset_id_to_wikilink(g)}")
        lines.append("")

    linked = record.get("linked_assets") or []
    if linked:
        lines.append("## Linked Assets")
        for a in linked:
            lines.append(f"- {asset_id_to_wikilink(a)}")
        lines.append("")

    return "\n".join(lines)


def render_generic(record: dict) -> str:
    """Fallback renderer for article, audio, and unknown types."""
    lines = []
    lines.append(f"# {record.get('id', 'Asset')}")
    lines.append("")
    lines.append(f"**Type:** {record.get('type', '')}")
    lines.append(f"**Date:** {record.get('created_at', '')}")
    if record.get("source_url"):
        lines.append(f"**URL:** {record['source_url']}")
    lines.append("")

    tags_str = tags_to_obsidian(record.get("tags") or [])
    if tags_str:
        lines.append(tags_str)
        lines.append("")

    # Dump remaining fields as a simple list
    skip = {"id", "type", "created_at", "source_url", "tags", "collections",
            "flagged_by", "flagged_at", "linked_assets", "metadata"}
    for k, v in record.items():
        if k not in skip and v:
            lines.append(f"**{k.replace('_', ' ').title()}:** {v}")

    linked = record.get("linked_assets") or []
    if linked:
        lines.append("")
        lines.append("## Linked Assets")
        for a in linked:
            lines.append(f"- {asset_id_to_wikilink(a)}")

    return "\n".join(lines)


RENDERERS = {
    "tweet": render_tweet,
    "video": render_video,
    "gator-nft": render_nft,
    "image": render_image,
    "gif": render_image,  # same renderer
    "article": render_generic,
    "audio": render_generic,
}


def render_record(record: dict) -> str:
    """Dispatch to the correct renderer for this asset type."""
    asset_type = record.get("type", "unknown")
    renderer = RENDERERS.get(asset_type, render_generic)
    return renderer(record)


def note_filename(record: dict) -> str:
    """Generate a clean filename for the note (no path, just filename.md)."""
    asset_id = record.get("id") or "unknown"
    # Sanitize for filesystem
    safe = asset_id.replace("/", "-").replace(":", "-").replace(" ", "-")
    return f"{safe}.md"


def type_folder(record: dict, vault_assets: Path) -> Path:
    """Return the target folder Path for a record."""
    asset_type = record.get("type", "unknown")
    folder_name = TYPE_TO_FOLDER.get(asset_type, "Other")
    return vault_assets / folder_name


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Export Gatorpedia registry to Obsidian notes.")
    parser.add_argument("--vault", default=str(DEFAULT_VAULT), help=f"Vault root path (default: {DEFAULT_VAULT})")
    parser.add_argument("--db", default=None, help="Path to database directory (default: auto-detected)")
    parser.add_argument("--type", dest="only_type", default=None,
                        help="Export only this asset type (tweet/video/gator-nft/image/gif/article/audio)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing any files")
    args = parser.parse_args()

    vault_root = Path(args.vault).expanduser()
    vault_assets = vault_root / ASSETS_SUBDIR

    script_dir = Path(__file__).parent
    db_dir = Path(args.db) if args.db else script_dir.parent / "database"

    if not db_dir.exists():
        print(f"ERROR: Database directory not found: {db_dir}", file=sys.stderr)
        sys.exit(1)

    # Load all records from all registry files
    all_records = []
    for filename in REGISTRY_FILES:
        jsonl_path = db_dir / filename
        if not jsonl_path.exists():
            continue
        count = 0
        with open(jsonl_path, "r", encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                    all_records.append(rec)
                    count += 1
                except json.JSONDecodeError as e:
                    print(f"WARNING: {filename}:{lineno} — {e}", file=sys.stderr)
        print(f"Loaded {count} records from {filename}")

    print(f"Total records: {len(all_records)}")

    # Filter by type if requested
    if args.only_type:
        all_records = [r for r in all_records if r.get("type") == args.only_type]
        print(f"Filtered to {len(all_records)} records of type '{args.only_type}'")

    if args.dry_run:
        print("\n-- DRY RUN: first 3 notes --")
        for rec in all_records[:3]:
            folder = type_folder(rec, vault_assets)
            fname = note_filename(rec)
            note_path = folder / fname
            print(f"\n=== {note_path} ===")
            print(render_record(rec)[:500])
            print("...")
        print(f"\nWould write {len(all_records)} notes under {vault_assets}")
        return

    # Write notes
    written = 0
    errors = 0
    for rec in all_records:
        try:
            folder = type_folder(rec, vault_assets)
            folder.mkdir(parents=True, exist_ok=True)
            note_path = folder / note_filename(rec)
            note_content = render_record(rec)
            note_path.write_text(note_content, encoding="utf-8")
            written += 1
        except Exception as e:
            print(f"WARNING: Failed to write note for {rec.get('id')}: {e}", file=sys.stderr)
            errors += 1

    print(f"Written {written} notes to {vault_assets} ({errors} errors)")


if __name__ == "__main__":
    main()
