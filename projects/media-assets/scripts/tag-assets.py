#!/usr/bin/env python3
"""
tag-assets.py — AI-powered batch tagging for the Gatorpedia asset registry.

Reads registry JSONL files, sends each untagged asset to a local LLM,
and writes back tags from the controlled TAXONOMY.md vocabulary.

MODEL RECOMMENDATION:
  Default: ollama/qwen3.5:35b  — strong instruction-following, reliable JSON
                                  output, reasoning mode helps with ambiguous
                                  cases. Already running via Ollama, no extra
                                  server needed.
  Alternative: llamacpp/gemma4-31b — swap in via --model llamacpp if you have
                                      llama-server running.
  For videos (richer context): ollama/qwen2.5:72b-instruct-q4_K_M — slower
                                but better at nuanced multi-field analysis.

RULES (from PRD):
  - Tags MUST come from TAXONOMY.md — no invented tags
  - Tier 1 (format) tags are set automatically, not by AI
  - Tier 2 (topic) and Tier 3 (campaign) tags are the AI's job
  - Tier 4 (tone) tags are provisional — human review required
  - All AI-tagged assets get flagged_by="ai", flagged_at=<now>
  - Already-tagged assets are skipped unless --retag is passed

Usage:
    # Dry run — see what would be tagged
    python tag-assets.py --dry-run

    # Tag all tweets
    python tag-assets.py --input database/posts-migrated.jsonl --type tweet

    # Tag videos with 72B for better quality
    python tag-assets.py --input database/videos.jsonl --type video \\
        --model ollama/qwen2.5:72b-instruct-q4_K_M

    # Use gemma4-31b via llama.cpp (requires llama-server running on port 8080)
    python tag-assets.py --input database/posts-migrated.jsonl \\
        --model llamacpp/gemma4-31b

    # Re-tag everything (overwrite existing AI tags)
    python tag-assets.py --input database/posts-migrated.jsonl --retag

    # Limit to first N records (for testing)
    python tag-assets.py --input database/posts-migrated.jsonl --limit 10 --dry-run
"""

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import urllib.request
import urllib.error


# ---------------------------------------------------------------------------
# Model / provider config
# ---------------------------------------------------------------------------

# Default model — Qwen3.5 35B via Ollama
DEFAULT_MODEL = "ollama/qwen3.5:35b"

# Provider endpoint map
# Keys are provider prefixes used in --model flag (e.g. "ollama", "llamacpp")
PROVIDER_ENDPOINTS = {
    "ollama": {
        "base_url": "http://127.0.0.1:11434",
        "api": "ollama",  # Uses Ollama's native /api/chat endpoint
    },
    "llamacpp": {
        "base_url": "http://127.0.0.1:8080",
        "api": "openai",  # llama-server exposes OpenAI-compatible /v1/chat/completions
    },
}

# Per-request timeout (seconds) — local models can be slow for long prompts
REQUEST_TIMEOUT = 600

# Delay between requests (seconds) — prevents overwhelming local server
REQUEST_DELAY = 0.5


# ---------------------------------------------------------------------------
# Taxonomy loading
# ---------------------------------------------------------------------------

def load_taxonomy(taxonomy_path: Path) -> dict:
    """
    Parse TAXONOMY.md and return a structured dict:
    {
      "tier2": {"tag": "description", ...},
      "tier3": {"tag": "description", ...},
      "tier4": {"tag": "description", ...},
      "all":   {"tag": "description", ...},  # all tiers combined
    }
    """
    if not taxonomy_path.exists():
        print(f"WARNING: TAXONOMY.md not found at {taxonomy_path}. Using embedded fallback.", file=sys.stderr)
        return _embedded_taxonomy()

    content = taxonomy_path.read_text(encoding="utf-8")
    tiers = {"tier2": {}, "tier3": {}, "tier4": {}}
    current_tier = None

    for line in content.splitlines():
        line = line.strip()

        # Detect tier headers
        if "Tier 2" in line:
            current_tier = "tier2"
        elif "Tier 3" in line:
            current_tier = "tier3"
        elif "Tier 4" in line:
            current_tier = "tier4"
        elif "Tier 1" in line:
            current_tier = None  # Skip Tier 1 (format tags, set automatically)

        if not current_tier:
            continue

        # Parse table rows: | `tag` | description |
        if line.startswith("|") and "`" in line:
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if len(parts) >= 2:
                tag = parts[0].strip("`").strip()
                desc = parts[1].strip() if len(parts) > 1 else ""
                if tag and tag != "Tag":  # skip header row
                    tiers[current_tier][tag] = desc

        # Also parse bullet list format: - `tag` description
        elif line.startswith("- `"):
            m = re.match(r"- `([^`]+)`\s*(.*)", line)
            if m:
                tag, desc = m.group(1).strip(), m.group(2).strip()
                tiers[current_tier][tag] = desc

    all_tags = {}
    for tier_tags in tiers.values():
        all_tags.update(tier_tags)

    total = sum(len(t) for t in tiers.values())
    print(f"Loaded taxonomy: {len(tiers['tier2'])} topic tags, {len(tiers['tier3'])} campaign tags, {len(tiers['tier4'])} tone tags ({total} total)")

    return {**tiers, "all": all_tags}


def _embedded_taxonomy() -> dict:
    """Fallback taxonomy in case TAXONOMY.md is not found."""
    tier2 = {
        "wearables": "Clothing, fashion drops, merch",
        "gameday": "Otherside gameday events",
        "lore": "Narrative, world-building, story content",
        "characters": "Specific gator characters, personality content",
        "community": "GM/GN posts, fan engagement, community moments",
        "partnerships": "Collabs with other brands or projects",
        "announcements": "Drops, launches, product reveals",
        "nft": "NFT-specific content",
        "token": "$TG token, crypto/DeFi content",
        "otherside": "Otherside/metaverse content",
        "swamp-life": "Swamp lore, environment, aesthetic",
        "humor": "Memes, jokes, comedy content",
        "satire": "Parody, mock-ads",
        "brand-campaigns": "Named campaign content",
        "foam-o": "FOAM-O product universe",
        "gator-blaster": "Gator Blaster 67 product universe",
        "pixel-pals": "Pixel Pals / Swap Shrinkers content",
        "delegators": "DeleGators / Spotlight voting content",
        "gtv": "GTV channel content",
        "art": "Digital art, NFT artwork showcases",
        "nft-collection": "Content about the NFT collection itself",
        "gator-character": "Content featuring a specific named/numbered gator",
        "music": "Death Roll band, music content",
        "gaming": "Game-related content",
        "education": "Informational, how-to content",
        "behind-the-scenes": "Production content, making-of",
    }
    tier3 = {
        "spring-2026": "Spring 2026 season",
        "halloween-2024": "Halloween 2024 campaign",
        "return-to-swamp": "Return to Swamp launch",
        "spotlight-s2": "Spotlight Season 2",
        "fourth-of-july": "Independence Day content",
        "mothers-day": "Mother's Day content",
        "christmas": "Christmas / holiday content",
    }
    tier4 = {
        "lore-storytelling": "High narrative/character value",
        "product-gameday": "Product or event promotion",
        "marketing-noise": "Promos, allowlists, generic drops (low signal)",
        "cinematic": "High production value visual content",
        "playful": "Light, fun, casual",
        "confident": "Bold, declarative, power content",
        "authentic": "Raw, unfiltered, community-feel",
        "viral-potential": "High engagement, shareable",
    }
    all_tags = {**tier2, **tier3, **tier4}
    return {"tier2": tier2, "tier3": tier3, "tier4": tier4, "all": all_tags}


def taxonomy_to_prompt_block(taxonomy: dict) -> str:
    """Format taxonomy as a compact block for the system prompt."""
    lines = ["ALLOWED TAGS (use ONLY these — no others):"]
    lines.append("")
    lines.append("## Topic/Product Tags (Tier 2)")
    for tag, desc in taxonomy["tier2"].items():
        lines.append(f"  {tag}: {desc}")
    lines.append("")
    lines.append("## Campaign/Season Tags (Tier 3)")
    for tag, desc in taxonomy["tier3"].items():
        lines.append(f"  {tag}: {desc}")
    lines.append("")
    lines.append("## Tone Tags (Tier 4 — provisional, human review required)")
    for tag, desc in taxonomy["tier4"].items():
        lines.append(f"  {tag}: {desc}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Prompt builders per asset type
# ---------------------------------------------------------------------------

def build_tweet_prompt(record: dict, taxonomy_block: str) -> str:
    """Build a tagging prompt for a tweet record."""
    text = record.get("text") or ""
    hashtags = record.get("hashtags") or []
    post_type = record.get("post_type") or "original"

    context_parts = [f"Tweet text: {text}"]
    if hashtags:
        context_parts.append(f"Hashtags: #{' #'.join(hashtags)}")
    context_parts.append(f"Post type: {post_type}")

    return f"""You are tagging a tweet from TokenGators, an NFT/Web3 brand known for:
- Alligator/swamp themed NFTs and characters
- A universe with products like FOAM-O, Gator Blaster 67, Pixel Pals, GTV (Gator TV)
- Otherside metaverse integration
- Community engagement, memes, lore, and humor

{taxonomy_block}

TWEET TO TAG:
{chr(10).join(context_parts)}

INSTRUCTIONS:
- Select 2-6 tags that best describe this tweet's content and tone
- Only use tags from the ALLOWED TAGS list above — never invent new ones
- Tier 1 format tags (tweet/video/image/etc.) are already set — do NOT include them
- If a campaign/season tag clearly applies, include it
- For tone tags, only apply if they clearly fit (1-2 max)
- If the tweet is generic filler (GM/GN with no substance), use: community, marketing-noise

Respond with ONLY a JSON object in this exact format:
{{"tags": ["tag1", "tag2", "tag3"], "reasoning": "brief explanation"}}"""


def build_video_prompt(record: dict, taxonomy_block: str) -> str:
    """Build a tagging prompt for a video record."""
    summary = record.get("visual_summary") or record.get("metadata", {}).get("summary") or ""
    transcript = record.get("transcript") or ""
    tone = record.get("tone_and_energy") or ""
    brand = record.get("brand_signals") or {}
    themes = brand.get("themes") or []
    filename = record.get("filename") or ""

    context_parts = [f"Filename: {filename}"]
    if summary:
        context_parts.append(f"Visual summary: {summary}")
    if tone:
        context_parts.append(f"Tone/energy: {tone}")
    if themes:
        context_parts.append(f"Themes: {', '.join(themes)}")
    if transcript:
        # Truncate long transcripts
        t = transcript[:800] + ("..." if len(transcript) > 800 else "")
        context_parts.append(f"Transcript excerpt: {t}")

    return f"""You are tagging a TokenGators video asset. TokenGators is an NFT/Web3 brand
known for alligator/swamp themed characters, the Otherside metaverse, products like
FOAM-O, Gator Blaster 67, Pixel Pals, GTV (Gator TV), and community-driven content.

{taxonomy_block}

VIDEO TO TAG:
{chr(10).join(context_parts)}

INSTRUCTIONS:
- Select 3-8 tags that best describe this video's content and tone
- Only use tags from the ALLOWED TAGS list — never invent new ones
- Tier 1 format tags (tweet/video/etc.) are already set — do NOT include them
- For high-production cinematic content, include the "cinematic" tone tag
- For campaign-specific content, include the relevant Tier 3 campaign tag
- For tone tags (Tier 4), include 1-3 that clearly fit

Respond with ONLY a JSON object in this exact format:
{{"tags": ["tag1", "tag2", "tag3"], "reasoning": "brief explanation"}}"""


def build_image_prompt(record: dict, taxonomy_block: str) -> str:
    """Build a tagging prompt for an image/gif record."""
    summary = record.get("visual_summary") or ""
    alt_text = record.get("alt_text") or ""
    filename = record.get("filename") or ""
    fmt = record.get("format") or ""

    context_parts = [f"Filename: {filename}", f"Format: {fmt}"]
    if alt_text:
        context_parts.append(f"Alt text: {alt_text}")
    if summary:
        context_parts.append(f"Visual summary: {summary}")

    if not summary and not alt_text:
        # Nothing useful to tag from — return minimal tags
        return None

    return f"""You are tagging a TokenGators image/GIF asset. TokenGators is an NFT/Web3 brand
known for alligator/swamp themed characters and community-driven content.

{taxonomy_block}

IMAGE/GIF TO TAG:
{chr(10).join(context_parts)}

INSTRUCTIONS:
- Select 2-5 tags based on available context
- Only use tags from the ALLOWED TAGS list — never invent new ones
- If there is insufficient context to tag confidently, return just 1-2 broad tags

Respond with ONLY a JSON object in this exact format:
{{"tags": ["tag1", "tag2"], "reasoning": "brief explanation"}}"""


PROMPT_BUILDERS = {
    "tweet": build_tweet_prompt,
    "video": build_video_prompt,
    "image": build_image_prompt,
    "gif": build_image_prompt,
}


# ---------------------------------------------------------------------------
# LLM API calls
# ---------------------------------------------------------------------------

def parse_provider_model(model_str: str) -> tuple:
    """Split 'provider/model-id' into (provider, model_id)."""
    if "/" in model_str:
        provider, model_id = model_str.split("/", 1)
        return provider, model_id
    return "ollama", model_str


def _http_post(url: str, payload: dict, timeout: int) -> dict:
    """Minimal HTTP POST using stdlib urllib — no external dependencies."""
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def call_ollama(model_id: str, prompt: str, base_url: str) -> str:
    """Call Ollama's native chat API."""
    url = f"{base_url}/api/chat"
    payload = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "think": False,  # Disable thinking mode for qwen3/qwen3.5 — not needed for JSON extraction
        "options": {
            "temperature": 0.1,
            "num_predict": 512,
        },
    }
    data = _http_post(url, payload, REQUEST_TIMEOUT)
    return data.get("message", {}).get("content", "")


def call_openai_compat(model_id: str, prompt: str, base_url: str) -> str:
    """Call an OpenAI-compatible endpoint (llama-server, etc.)."""
    url = f"{base_url}/v1/chat/completions"
    payload = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 256,
    }
    data = _http_post(url, payload, REQUEST_TIMEOUT)
    return data["choices"][0]["message"]["content"]


def call_model(model_str: str, prompt: str) -> str:
    """Dispatch to the correct API based on model string prefix."""
    provider, model_id = parse_provider_model(model_str)
    config = PROVIDER_ENDPOINTS.get(provider)

    if not config:
        raise ValueError(f"Unknown provider '{provider}'. Supported: {list(PROVIDER_ENDPOINTS.keys())}")

    base_url = config["base_url"]
    api = config["api"]

    if api == "ollama":
        return call_ollama(model_id, prompt, base_url)
    elif api == "openai":
        return call_openai_compat(model_id, prompt, base_url)
    else:
        raise ValueError(f"Unknown API type '{api}' for provider '{provider}'")


def parse_tags_from_response(response: str, allowed_tags: set) -> tuple:
    """
    Extract tags list and reasoning from model response.
    Returns (tags: list, reasoning: str).

    Handles:
    - Clean JSON: {"tags": [...], "reasoning": "..."}
    - JSON embedded in markdown code fences
    - Malformed output with fallback regex extraction
    """
    # Strip <think>...</think> blocks (qwen3/qwen3.5 thinking mode output)
    response = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL).strip()
    # Strip markdown code fences if present
    response = re.sub(r"```(?:json)?\s*", "", response).strip()

    # Try JSON parse
    try:
        data = json.loads(response)
        raw_tags = data.get("tags") or []
        reasoning = data.get("reasoning") or ""
    except json.JSONDecodeError:
        # Fallback: extract anything that looks like a tag list
        tag_matches = re.findall(r'"([a-z][a-z0-9-]+)"', response)
        raw_tags = tag_matches
        reasoning = "(parse fallback)"

    # Filter to only allowed tags — strict compliance
    valid_tags = [t for t in raw_tags if t in allowed_tags]
    invalid_tags = [t for t in raw_tags if t not in allowed_tags]

    if invalid_tags:
        print(f"  ⚠ Filtered out non-taxonomy tags: {invalid_tags}", file=sys.stderr)

    return valid_tags, reasoning


# ---------------------------------------------------------------------------
# Main tagging loop
# ---------------------------------------------------------------------------

def should_tag(record: dict, retag: bool) -> bool:
    """Decide whether to tag this record."""
    existing_tags = record.get("tags") or []
    if existing_tags and not retag:
        return False  # Already tagged, skip
    asset_type = record.get("type", "")
    if asset_type not in PROMPT_BUILDERS:
        return False  # No prompt builder for this type
    return True


def tag_record(record: dict, taxonomy: dict, model_str: str, dry_run: bool) -> dict:
    """
    Tag a single record. Returns the updated record dict.
    On dry_run, prints the prompt but doesn't call the model.
    """
    asset_type = record.get("type", "")
    prompt_builder = PROMPT_BUILDERS.get(asset_type)
    if not prompt_builder:
        return record

    taxonomy_block = taxonomy_to_prompt_block(taxonomy)
    prompt = prompt_builder(record, taxonomy_block)

    if prompt is None:
        # Insufficient context (e.g. image with no summary)
        print(f"  ↷ Skipping {record['id']} — insufficient context for tagging")
        return record

    if dry_run:
        print(f"\n  --- PROMPT PREVIEW for {record['id']} ---")
        print(prompt[:600] + ("..." if len(prompt) > 600 else ""))
        print("  --- END PREVIEW ---")
        return record

    try:
        response = call_model(model_str, prompt)
        tags, reasoning = parse_tags_from_response(response, set(taxonomy["all"].keys()))

        print(f"  ✓ {record['id']} → {tags}")
        if reasoning:
            print(f"    ({reasoning})")

        # Update record
        record["tags"] = tags
        record["flagged_by"] = "ai"
        record["flagged_at"] = datetime.now(tz=timezone.utc).isoformat()

    except (urllib.error.URLError, OSError) as e:
        print(f"  ✗ {record['id']} — API error: {e}", file=sys.stderr)
        return record  # Return original unchanged on error
    except Exception as e:
        print(f"  ✗ {record['id']} — Error: {e}", file=sys.stderr)

    return record


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="AI-powered batch tagging for Gatorpedia assets.")
    parser.add_argument("--input", required=True, help="Input JSONL file (e.g. database/posts-migrated.jsonl)")
    parser.add_argument("--output", default=None, help="Output JSONL file (default: overwrites input)")
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Model to use as 'provider/model-id' (default: {DEFAULT_MODEL}). "
             "Examples: ollama/qwen3.5:35b, ollama/qwen2.5:72b-instruct-q4_K_M, llamacpp/gemma4-31b",
    )
    parser.add_argument("--taxonomy", default=None, help="Path to TAXONOMY.md (default: auto-detected)")
    parser.add_argument("--type", dest="only_type", default=None,
                        help="Only tag assets of this type (tweet/video/image/gif)")
    parser.add_argument("--limit", type=int, default=None, help="Only process first N records (for testing)")
    parser.add_argument("--retag", action="store_true", help="Re-tag records that already have AI tags")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show prompts without calling the model or writing output")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY,
                        help=f"Delay between requests in seconds (default: {REQUEST_DELAY})")
    args = parser.parse_args()

    input_path = Path(args.input).expanduser()
    output_path = Path(args.output).expanduser() if args.output else input_path

    if not input_path.exists():
        print(f"ERROR: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    # Load taxonomy
    script_dir = Path(__file__).parent
    taxonomy_path = Path(args.taxonomy) if args.taxonomy else script_dir.parent / "TAXONOMY.md"
    taxonomy = load_taxonomy(taxonomy_path)

    if not taxonomy["all"]:
        print("ERROR: No tags loaded from taxonomy. Cannot proceed.", file=sys.stderr)
        sys.exit(1)

    # Read records
    records = []
    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError as e:
                    print(f"WARNING: Skipping malformed line: {e}", file=sys.stderr)

    print(f"Loaded {len(records)} records from {input_path}")

    # Filter by type
    if args.only_type:
        to_process = [r for r in records if r.get("type") == args.only_type]
        print(f"Filtered to {len(to_process)} records of type '{args.only_type}'")
    else:
        to_process = records

    # Filter already-tagged
    if not args.retag:
        taggable = [r for r in to_process if should_tag(r, retag=False)]
        skipped = len(to_process) - len(taggable)
        if skipped:
            print(f"Skipping {skipped} already-tagged records (use --retag to overwrite)")
        to_process = taggable

    # Apply limit
    if args.limit:
        to_process = to_process[:args.limit]

    print(f"Records to tag: {len(to_process)}")
    print(f"Model: {args.model}")
    if args.dry_run:
        print("DRY RUN — no API calls will be made\n")

    # Build a lookup for in-place update
    records_by_id = {r.get("id"): r for r in records}

    tagged = 0
    errors = 0
    start_time = time.time()

    def flush_to_disk():
        """Write all records (updated + original) to output file atomically."""
        tmp_path = str(output_path) + ".tmp"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(tmp_path, "w", encoding="utf-8") as f:
            for rec in records:
                current = records_by_id.get(rec.get("id"), rec)
                f.write(json.dumps(current, ensure_ascii=False) + "\n")
        import os
        os.replace(tmp_path, output_path)  # atomic rename

    for i, record in enumerate(to_process, 1):
        print(f"[{i}/{len(to_process)}] {record.get('id', '?')} ({record.get('type', '?')})")
        updated = tag_record(record, taxonomy, args.model, args.dry_run)
        if updated is not None:
            records_by_id[record.get("id")] = updated
        tagged += 1

        # Write to disk after every record so progress is never lost
        if not args.dry_run:
            flush_to_disk()

        if not args.dry_run and i < len(to_process):
            time.sleep(args.delay)

    elapsed = time.time() - start_time
    print(f"\nDone: {tagged} processed in {elapsed:.1f}s")

    if args.dry_run:
        print("(dry run — nothing written)")
        return

    print(f"Written to {output_path}")


if __name__ == "__main__":
    main()
