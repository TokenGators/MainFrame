#!/usr/bin/env python3
"""
match-nfts.py — Visual NFT matching for Gatorpedia image assets.

For each image/gif asset this script does THREE things in one pass:

  1. PERCEPTUAL HASH  — Cheap, instant. Downloads the image, computes a
                        perceptual hash, compares against all 4000 NFT hashes.
                        Exact and near-exact matches are linked automatically
                        with high confidence. No model needed.

  2. VISUAL SUMMARY  — Passes the image to a multimodal LLM (gemma4:31b) and
                        asks it to describe the content. Saved to visual_summary
                        so the main tagger can later apply taxonomy tags.

  3. TRAIT MATCHING  — If the image looks like it could contain a TokenGator
                       character, the model attempts to classify traits against
                       the known NFT vocabulary (Skin/Eyes/Mouth/Outfit/Hat).
                       Matching NFTs are linked if confidence is high enough.

Results are written back to assets.jsonl after every record (atomic rename),
so you can kill and resume at any time without losing progress.

USAGE:
    # Full run — all unprocessed images
    python match-nfts.py

    # Dry run — see what would happen, no writes
    python match-nfts.py --dry-run

    # Limit to N images (testing)
    python match-nfts.py --limit 20

    # Re-process already-processed images
    python match-nfts.py --reprocess

    # Hash-only pass (no model calls) — fast first sweep
    python match-nfts.py --hash-only

    # Different model
    python match-nfts.py --model ollama/gemma4:26b

REQUIREMENTS:
    pip install Pillow imagehash requests
"""

import argparse
import base64
import gc
import io
import json
import os
import re
import sys
import time
import threading
import urllib.request
import urllib.error
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

try:
    from PIL import Image
    import imagehash
    import requests
except ImportError:
    print("ERROR: Missing dependencies. Run: pip install Pillow imagehash requests", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DEFAULT_MODEL = "ollama/gemma4:31b"
OLLAMA_BASE   = "http://127.0.0.1:11434"
REQUEST_TIMEOUT = 600   # seconds per model call (31B vision model can be slow)
DOWNLOAD_TIMEOUT = 30   # seconds per image download
REQUEST_DELAY   = 0.3   # seconds between model calls
PHASH_SIZE          = 16  # 256-bit phash — needed to distinguish visually similar NFTs in the collection
# Thresholds are calibrated for 256-bit (hash_size=16) phash.
# Empirical data on known-good tweet→NFT pairs: most at distance 0–4, max ~16.
HASH_THRESHOLD      = 25  # hamming distance — used in full mode (AI confirms weak matches)
HASH_ONLY_THRESHOLD = 10  # hash-only mode: accept near-exact matches without AI
HASH_AUTO_LINK_MAX  = 5   # in full mode, skip AI if best hash distance is <= this (near-certain match)
TRAIT_MIN_MATCH = 4     # minimum traits that must match to auto-link (5 total traits)

DB_DIR    = Path(__file__).parent.parent / "database"
ASSETS_FILE = DB_DIR / "assets.jsonl"
NFTS_FILE   = DB_DIR / "nfts.jsonl"
NFT_LOCAL_MAP_FILE = DB_DIR / "nft-local-map.json"
NFT_LOCAL_IMAGE_DIR = Path("/Users/operator/Media/nft-images/TG_Final_4K")
TWEET_IMAGE_CACHE_DIR = Path("/Users/operator/Media/tweet-images")

# ---------------------------------------------------------------------------
# NFT database loading
# ---------------------------------------------------------------------------

def load_nfts():
    """Load all NFTs into memory. Returns list and trait index."""
    nfts = []
    with open(NFTS_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                nfts.append(json.loads(line))
    print(f"Loaded {len(nfts)} NFTs")
    return nfts


def build_trait_index(nfts):
    """
    Build a reverse index: {trait_type: {value: [nft_id, ...]}}
    Used to efficiently find NFTs matching a set of traits.
    """
    index = defaultdict(lambda: defaultdict(list))
    for nft in nfts:
        for t in nft.get("traits", []):
            index[t["trait_type"]][t["value"]].append(nft["id"])
    return index


def build_trait_vocab(nfts):
    """Return {trait_type: [sorted list of values]} for prompting."""
    vocab = defaultdict(set)
    for nft in nfts:
        for t in nft.get("traits", []):
            vocab[t["trait_type"]].add(t["value"])
    return {k: sorted(v) for k, v in vocab.items()}


# ---------------------------------------------------------------------------
# Perceptual hashing
# ---------------------------------------------------------------------------

def _load_nft_local_map() -> dict:
    """Load token_id → local filename stem mapping. Returns {} if file missing."""
    if NFT_LOCAL_MAP_FILE.exists():
        return json.loads(NFT_LOCAL_MAP_FILE.read_text())
    return {}


def compute_nft_hashes(nfts, cache_path: Path):
    """
    Hash all NFT images. Uses local files when available (fast, no network),
    falls back to downloading via gateway_image_url for any missing local files.
    Incrementally cached to disk — new NFTs are hashed and appended on each run.
    Returns {nft_id: imagehash}
    """
    # Load existing cache (may be partial)
    hashes_raw = {}
    if cache_path.exists():
        print(f"Loading NFT hash cache from {cache_path}...")
        hashes_raw = json.loads(cache_path.read_text())

    hashes = {k: imagehash.hex_to_hash(v) for k, v in hashes_raw.items()}

    # Find NFTs not yet cached
    missing = [nft for nft in nfts if nft["id"] not in hashes]
    if not missing:
        print(f"NFT hashes ready: {len(hashes)} (all cached)")
        return hashes

    local_map = _load_nft_local_map()  # {str(token_id): hash_stem}
    local_count = 0
    download_count = 0

    print(f"NFT hashes ready: {len(hashes)} cached, hashing {len(missing)} new NFTs...")
    errors = 0
    completed = 0
    BATCH = 50  # process in small batches to bound memory

    def _read_hash(nft):
        """Returns (nft_id, hash_or_None). Uses local file when available."""
        token_id = nft.get("token_id")
        hash_stem = local_map.get(str(token_id)) if token_id is not None else None
        if hash_stem:
            local_path = NFT_LOCAL_IMAGE_DIR / f"{hash_stem}.png"
            if local_path.exists():
                try:
                    img = Image.open(local_path).convert("RGB")
                    h = imagehash.phash(img, hash_size=PHASH_SIZE)
                    del img
                    return (nft["id"], h, "local")
                except Exception:
                    pass  # fall through to download

        # Fallback: download from gateway
        url = nft.get("gateway_image_url")
        if not url:
            return (nft["id"], None, "missing")
        img = download_image(url)
        if img is None:
            return (nft["id"], None, "download_failed")
        h = imagehash.phash(img, hash_size=PHASH_SIZE)
        del img
        return (nft["id"], h, "downloaded")

    for batch_start in range(0, len(missing), BATCH):
        batch = missing[batch_start:batch_start + BATCH]
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(_read_hash, batch))
        gc.collect()
        for nft_id, h, source in results:
            if h is not None:
                hashes[nft_id] = h
                if source == "local":
                    local_count += 1
                else:
                    download_count += 1
            else:
                errors += 1
        completed += len(batch)
        if completed % 200 == 0 or batch_start + BATCH >= len(missing):
            pct = 100 * completed // len(missing)
            print(f"  {completed}/{len(missing)} ({pct}%) — {len(hashes)} hashed "
                  f"({local_count} local, {download_count} downloaded, {errors} failed)...")
            cache_path.write_text(json.dumps({k: str(v) for k, v in hashes.items()}))

    cache_path.write_text(json.dumps({k: str(v) for k, v in hashes.items()}))
    print(f"NFT hash cache saved ({len(hashes)} total: {local_count} local, "
          f"{download_count} downloaded, {errors} errors)")
    return hashes


def find_hash_matches(asset_img: Image.Image, nft_hashes: dict, threshold: int):
    """
    Compare asset image against all NFT hashes.
    Returns only the best match(es): the closest hit, plus any ties within 1 hamming
    distance of the best. This avoids false-positive floods in NFT collections where
    many tokens share similar perceptual hashes (same base character, slight trait diffs).
    Returns list of (nft_id, distance) sorted by distance ascending.
    """
    asset_hash = imagehash.phash(asset_img, hash_size=PHASH_SIZE)
    matches = []
    for nft_id, nft_hash in nft_hashes.items():
        dist = asset_hash - nft_hash
        if dist <= threshold:
            matches.append((nft_id, dist))
    if not matches:
        return []
    matches.sort(key=lambda x: x[1])
    # Keep only the cluster closest to the best: best_dist and best_dist+1
    best_dist = matches[0][1]
    return [(nft_id, dist) for nft_id, dist in matches if dist <= best_dist + 1]


# ---------------------------------------------------------------------------
# Image downloading
# ---------------------------------------------------------------------------

_IPFS_GATEWAYS = [
    "https://gateway.pinata.cloud/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://ipfs.io/ipfs/",
]

def _extract_ipfs_hash(url: str):
    """Extract the IPFS CID from a gateway URL. Returns None if not an IPFS URL."""
    for prefix in _IPFS_GATEWAYS:
        if url.startswith(prefix):
            return url[len(prefix):]
    if "/ipfs/" in url:
        return url.split("/ipfs/", 1)[1]
    return None


def download_image(url: str):
    """Download image from URL and return PIL Image, or None on failure.
    For IPFS URLs, tries multiple gateways on failure.
    Uses stream=True + explicit close to prevent response body accumulation."""
    def _try(u):
        try:
            with requests.get(u, timeout=DOWNLOAD_TIMEOUT, stream=True) as resp:
                resp.raise_for_status()
                ct = resp.headers.get("content-type", "")
                if "image" not in ct and "octet-stream" not in ct:
                    return None  # gateway returned HTML/JSON error page
                data = resp.raw.read(decode_content=True)
            # Parse image outside the 'with' block so connection is already closed
            img = Image.open(io.BytesIO(data)).convert("RGB")
            del data
            return img
        except Exception:
            return None

    img = _try(url)
    if img is not None:
        return img

    # Try alternate gateways for IPFS URLs
    cid = _extract_ipfs_hash(url)
    if cid:
        for gw in _IPFS_GATEWAYS:
            alt = gw + cid
            if alt == url:
                continue
            img = _try(alt)
            if img is not None:
                return img
    return None


def image_to_base64(img: Image.Image, max_size: int = 512) -> str:
    """Resize and encode image as base64 JPEG for the model."""
    # Resize to max_size on longest side to keep tokens manageable
    w, h = img.size
    if max(w, h) > max_size:
        scale = max_size / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ---------------------------------------------------------------------------
# Model calls
# ---------------------------------------------------------------------------

def _http_post(url: str, payload: dict, timeout: int) -> dict:
    """POST JSON payload, return parsed response. Uses requests for reliable large-response handling."""
    resp = requests.post(url, json=payload, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def call_ollama_vision(model_id: str, prompt: str, image_b64: str) -> str:
    """Call Ollama multimodal chat with an image."""
    payload = {
        "model": model_id,
        "messages": [{
            "role": "user",
            "content": prompt,
            "images": [image_b64],
        }],
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 2048,
        },
    }
    data = _http_post(f"{OLLAMA_BASE}/api/chat", payload, REQUEST_TIMEOUT)
    return data.get("message", {}).get("content", "")


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

def build_vision_prompt(trait_vocab: dict) -> str:
    """
    Single prompt that asks the model to:
    1. Describe the image (visual summary)
    2. Decide if it contains a TokenGator NFT character
    3. If yes, classify each visible trait against the known vocabulary
    """
    trait_lines = []
    for trait_type, values in trait_vocab.items():
        trait_lines.append(f'  "{trait_type}": {json.dumps(values)}')
    traits_block = "\n".join(trait_lines)

    return f"""You are analyzing images for the TokenGators NFT collection.

TokenGators are cartoon alligator/crocodile characters used as NFT profile pictures. They appear in many contexts: as standalone PFP artwork, composited into custom backgrounds or scenes, cropped, or remixed. If you can see a cartoon alligator character anywhere in the image — even partially, in a background, or stylized — set contains_gator to true.

Each TokenGator has these traits with EXACT allowed values:
{traits_block}

SKIN — the body/scale color or texture. Use EXACTLY one of these values:

  GREEN FAMILY (use the closest match — don't just say "green" for all):
  - "Green" = plain flat green skin, no special effect (most common)
  - "Radioactive" = bright yellow-green with glowing radiation aura / toxic glow effect
  - "Alien" = unusual alien green, may have a slightly slimy or extraterrestrial look

  BLUE FAMILY:
  - "Blue" = solid flat blue skin
  - "Ice" = pale icy blue / crystalline / frozen texture, frost effect
  - "Gamer" = neon/screen-glow aesthetic, often blue-purple with digital/pixel feel

  PURPLE FAMILY:
  - "Purple" = solid purple skin (no glow)
  (note: "Gamer" can appear purple-tinted)

  WHITE / PALE FAMILY:
  - "Albino" = pure white / very pale white skin
  - "Spirit" = translucent / ghostly / ethereal, semi-transparent white

  DARK / BLACK FAMILY:
  - "Shadow" = deep black / dark shadowy skin
  - "Bot" = metallic robot plating / mechanical gray-silver
  - "Monster" = dark monstrous skin, rough dark texture

  WARM / FIRE FAMILY:
  - "Lava" = orange-red lava / fire / magma texture, molten look
  - "Dragon" = dragon scales (can be red, orange, or dark multi-color)

  BROWN / EARTH / PATTERNED:
  - "Fur" = furry / fluffy texture, brown or tan
  - '"Cheetah"' = cheetah spots / big cat print pattern on skin
  - "Rock" = stone / rocky / granite texture

  OTHER:
  - "Tropical" = floral or tropical PATTERN printed on the skin (not just a solid color)
  - "Pink" = solid pink skin
  - "Gold" = golden / metallic gold skin

HAT — look at the head carefully. First decide which CATEGORY applies, then pick the exact value:

CATEGORY 1 — ACTUAL HATS (a physical hat sitting on the head):
- "Cowboy Hat" = wide-brim western / stetson hat
- "Bucket Hat" = soft brim drooping down all around
- "Knitted Cap" = beanie / snug knit winter hat (NO brim)
- "Fedora" = formal felt hat with pinched crown and brim
- "Captain's Hat" = naval officer / captain's peaked cap
- "Golf Hat" = golf visor or golf cap
- "Foam Hat" = oversized foam novelty hat
- "Merch Hat" = branded flat-brim snapback / merch cap
- "Pirate Hat" = tricorn / pirate bicorn hat
- "Roadster" = racing helmet or driving cap
- "Pilot Helmet" = aviation flight helmet
- "Bonk" = hat with "BONK" text on it
- "Dapper" = top hat / gentleman's hat
- "Hunter" = hunter's cap / deerstalker
- "Crown" = royal crown / king's crown (ornate, sits on top of head)
- "Tiara" = princess tiara (small decorative crown)

CATEGORY 2 — HAIRSTYLES (no hat, just a distinctive hair style):
- "Mullet" = SHORT on top/sides, LONG flowing in the back
- "Pompadour" = hair swept UPWARD and BACK from forehead, very voluminous at front
- "Mohawk" = strip of hair down the center, shaved sides
- "Windblown" = hair blowing sideways in the wind
- "Pulled Back" = hair tied back / bun / ponytail
- "Blond Hair" = flowing blond/yellow hair
- "Clown Hair" = colorful clown wig or poofy afro
- "Fire Hair" = hair that is literally ON FIRE / flaming
- "Vampire Hair" = widow's peak / slicked-back dark hair
- "Mohawk" = central strip, shaved sides
- "Pigtails" = two pigtails / twin tails
- "Comb Over" = hair combed over to one side
- "Styled" = neat styled hair (no strong defining feature)

CATEGORY 3 — FANTASY / NOVELTY HEAD ACCESSORIES:
- "Bunny Ears" = two tall rabbit ears on top of head
- "Unicorn" = single horn on forehead
- "Halo" = glowing ring floating above head
- "Horns" = devil horns / animal horns
- "Giga Brain" = enormous oversized exposed brain
- "Goblin" = goblin ears
- "Dragon" = dragon head/horns
- "Love Struck" = hearts / love-struck effect
- "Wizard" = tall pointed wizard hat

OUTFIT — the clothing/body covering:
- "Vacation" = Hawaiian / tropical / aloha floral shirt
- "White Suit" = white formal suit jacket
- "Royal" = king/queen royal robes (ornate, regal)
- "Gown" = plain robe / wizard robe / long flowing gown
- "Puffer Jacket" = puffy quilted down jacket
- "Puffy Shirt" = puffy/billowy loose shirt (not a jacket)
- "Festival" = colorful festival / rave outfit
- "Tuxedo" = black formal tuxedo
- "Letterman Jacket" = varsity/letterman sports jacket
- "Cowboy" = cowboy vest/shirt/western outfit
- "Swashbuckler" = pirate open shirt / cape
- "Tier1 Mech" or "Mech" = full robot/mech armor suit
- "Space Suit" = astronaut suit
- "Scuba" = scuba diving suit
- "Rain Slicker" = raincoat
- "Grass Skirt" = hula/grass skirt
- "Cardio" = athletic/gym wear
- "Adventurer" = adventure gear
- "Explorer" = explorer outfit
- "Ranger" = ranger/scout outfit
- "Navigator" = navigator uniform
- "Knight" = knight armor
- "Barbarian" = barbarian furs/leather
- "Pirate" = pirate outfit
- "Overalls" = dungaree overalls
- "Ripped Jeans" = torn jeans
- "Shark Fin" = shark fin on back
- "Saddle" = horse saddle on back
- "Lifeguard" = lifeguard gear
- "Office Worker" = office/business casual
- "Party Animal" = party outfit
- "Brawler" = fighter/brawler gear
- "Daredevil" = daredevil stunt outfit

Look at this image and respond with ONLY a JSON object:
{{
  "visual_summary": "2-3 sentence description of what is shown",
  "contains_gator": true or false,
  "gator_confidence": "high" | "medium" | "low",
  "traits": {{
    "Skin": "exact value from list or null",
    "Eyes": "exact value from list or null",
    "Mouth": "exact value from list or null",
    "Outfit": "exact value from list or null",
    "Hat": "exact value from list or null"
  }},
  "trait_confidence": "high" | "medium" | "low",
  "reasoning": "brief note on what you see and how you matched the traits"
}}

IMPORTANT:
- Use ONLY the exact trait values from the lists above (case-sensitive)
- Set a trait to null only if it is genuinely not visible
- If the gator is composited into a scene or background, still identify its traits
- contains_gator = true if ANY cartoon alligator character is visible anywhere in the image"""


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------

def parse_vision_response(response: str, trait_vocab: dict) -> dict:
    """
    Parse model JSON response. Returns clean dict with:
    visual_summary, contains_gator, traits, confidences.
    """
    # Strip think blocks and fences
    response = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL).strip()
    response = re.sub(r"```(?:json)?\s*", "", response).strip()
    response = response.rstrip("`").strip()

    try:
        data = json.loads(response)
    except json.JSONDecodeError:
        # Try to extract just the JSON object
        m = re.search(r'\{.*\}', response, re.DOTALL)
        if m:
            try:
                data = json.loads(m.group())
            except json.JSONDecodeError:
                return {"visual_summary": response[:200], "contains_gator": False, "traits": {}}
        else:
            return {"visual_summary": response[:200], "contains_gator": False, "traits": {}}

    # Validate and clean traits against vocabulary
    raw_traits = data.get("traits") or {}
    clean_traits = {}
    for trait_type, value in raw_traits.items():
        if value is None:
            continue
        allowed = trait_vocab.get(trait_type, [])
        if value in allowed:
            clean_traits[trait_type] = value
        else:
            # Try case-insensitive match
            lower_map = {v.lower(): v for v in allowed}
            if str(value).lower() in lower_map:
                clean_traits[trait_type] = lower_map[str(value).lower()]
            # else drop it — wrong value

    return {
        "visual_summary":    data.get("visual_summary", ""),
        "contains_gator":    bool(data.get("contains_gator", False)),
        "gator_confidence":  data.get("gator_confidence", "low"),
        "traits":            clean_traits,
        "trait_confidence":  data.get("trait_confidence", "low"),
        "reasoning":         data.get("reasoning", ""),
    }


# ---------------------------------------------------------------------------
# NFT matching from traits
# ---------------------------------------------------------------------------

# Color-based skin buckets: when the AI detects a color name, also search
# related skins that look visually similar but have non-obvious names.
# Key = what the AI might report; value = all NFT Skin values in that color family.
SKIN_COLOR_BUCKETS: dict[str, list[str]] = {
    # Green family — plain green, glowing yellow-green, alien green
    "Green":       ["Green", "Radioactive", "Alien"],
    "Radioactive": ["Green", "Radioactive", "Alien"],
    "Alien":       ["Green", "Radioactive", "Alien"],
    # Blue family — solid blue, icy pale blue, Gamer neon blue
    "Blue":        ["Blue", "Ice", "Gamer"],
    "Ice":         ["Blue", "Ice", "Gamer"],
    "Gamer":       ["Blue", "Ice", "Gamer", "Purple"],  # gamer screens can look purple-tinted too
    # Purple family
    "Purple":      ["Purple", "Gamer"],
    # White / pale family
    "Albino":      ["Albino", "Spirit"],
    "Spirit":      ["Albino", "Spirit"],
    # Dark / black family
    "Shadow":      ["Shadow", "Bot", "Monster"],
    "Bot":         ["Shadow", "Bot", "Monster"],
    "Monster":     ["Shadow", "Bot", "Monster"],
    # Warm / fire family
    "Lava":        ["Lava", "Dragon"],
    "Dragon":      ["Lava", "Dragon"],
    # Brown / earth / patterned family
    "Fur":         ["Fur", "Cheetah", "Rock"],
    "Cheetah":     ["Fur", "Cheetah", "Rock"],
    '"Cheetah"':   ["Fur", "Cheetah", "Rock"],  # handle the quoted JSON name
    "Rock":        ["Fur", "Cheetah", "Rock"],
    # Tropical stands alone (floral print pattern)
    "Tropical":    ["Tropical"],
    # Pink stands alone
    "Pink":        ["Pink"],
    # Gold stands alone
    "Gold":        ["Gold"],
}


def expand_skin(detected_skin: str) -> list[str]:
    """
    Return all NFT Skin values that visually match the detected skin color.
    Falls back to [detected_skin] if no bucket defined.
    """
    return SKIN_COLOR_BUCKETS.get(detected_skin, [detected_skin])


def find_trait_matches(clean_traits: dict, trait_index: dict, nfts_by_id: dict, min_match: int):
    """
    Given a dict of {trait_type: value}, find NFTs that match >= min_match traits.
    Returns list of (nft_id, matched_count, total_traits) sorted by match count desc.
    """
    if not clean_traits:
        return []

    # Score each NFT
    scores = defaultdict(int)
    for trait_type, value in clean_traits.items():
        for nft_id in trait_index.get(trait_type, {}).get(value, []):
            scores[nft_id] += 1

    results = []
    for nft_id, count in scores.items():
        if count >= min_match:
            nft = nfts_by_id.get(nft_id)
            total = len(nft.get("traits", [])) if nft else 0
            results.append((nft_id, count, total))

    results.sort(key=lambda x: x[1], reverse=True)
    return results


# ---------------------------------------------------------------------------
# Main processing loop
# ---------------------------------------------------------------------------

def should_process(record: dict, reprocess: bool) -> bool:
    """Decide whether to process this asset."""
    if record.get("type") not in ("image", "gif"):
        return False
    if not reprocess and record.get("_nft_match_done"):
        return False
    url = record.get("url") or record.get("preview_image_url")
    return bool(url)


def _cached_image_path(record: dict) -> Path:
    """Return the local cache path for this asset's image."""
    media_key = record.get("media_key") or record.get("id", "unknown")
    # Sanitize for use as filename
    safe = re.sub(r"[^A-Za-z0-9_\-]", "_", media_key)
    ext = ".jpg"
    url = record.get("url") or record.get("preview_image_url") or ""
    if url.lower().endswith(".png"):
        ext = ".png"
    elif url.lower().endswith(".gif"):
        ext = ".gif"
    return TWEET_IMAGE_CACHE_DIR / f"{safe}{ext}"


def load_asset_image(record: dict) -> "Image.Image | None":
    """
    Load asset image, using local cache when available.
    On first fetch, saves the image to TWEET_IMAGE_CACHE_DIR for future runs.
    """
    cache_path = _cached_image_path(record)
    if cache_path.exists():
        try:
            return Image.open(cache_path).convert("RGB")
        except Exception:
            cache_path.unlink(missing_ok=True)  # corrupt cache entry, re-fetch

    url = record.get("url") or record.get("preview_image_url")
    if not url:
        return None
    img = download_image(url)
    if img is None:
        return None

    # Save to cache (best-effort)
    TWEET_IMAGE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        fmt = "PNG" if cache_path.suffix == ".png" else "GIF" if cache_path.suffix == ".gif" else "JPEG"
        img.save(cache_path, format=fmt)
    except Exception:
        pass  # cache write failure is non-fatal

    return img


def _encode_image(img: "Image.Image", max_size: int = 384) -> str:
    """Encode a PIL image to base64 JPEG, resized to max_size on longest side."""
    img = img.copy()
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode()


def _visual_match_one(tweet_img: "Image.Image", nft_img: "Image.Image",
                      nft_id: str, nft_traits: dict, model_id: str) -> "tuple[bool, str, str]":
    """
    Ask model: does this NFT match the gator in the tweet image?
    Sends exactly 2 images (tweet + NFT).
    Returns (is_match, confidence, reasoning).
    """
    trait_desc = ", ".join(f"{k}: {v}" for k, v in nft_traits.items()) if nft_traits else "unknown"
    prompt = (
        f"The FIRST image is a tweet showing a TokenGator character "
        f"(may be reimagined/remixed, possibly in a custom scene or background).\n"
        f"The SECOND image is a TokenGator NFT with these traits: {trait_desc}.\n\n"
        f"Does the gator character in the first image match the NFT in the second image? "
        f"Focus on skin color, hat/hairstyle, and outfit — ignore background and artistic style.\n\n"
        f'Reply with ONLY JSON: {{"match": true | false, "confidence": "high" | "medium" | "low", '
        f'"reasoning": "one sentence"}}'
    )
    tweet_b64 = _encode_image(tweet_img)
    nft_b64 = _encode_image(nft_img)
    payload = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt, "images": [tweet_b64, nft_b64]}],
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 512},
    }
    try:
        data = _http_post(f"{OLLAMA_BASE}/api/chat", payload, REQUEST_TIMEOUT)
        response = data.get("message", {}).get("content", "")
        if not response:
            return False, "low", "empty response"
        response = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL).strip()
        response = re.sub(r"```(?:json)?\s*", "", response).strip().rstrip("`")
        result = json.loads(response)
        is_match = bool(result.get("match", False))
        confidence = result.get("confidence", "low")
        reasoning = result.get("reasoning", "")
        return is_match, confidence, reasoning
    except Exception as e:
        return False, "low", str(e)


def compare_to_candidates(tweet_img: "Image.Image", candidate_ids: list,
                          model_id: str, nfts_by_id: dict = None) -> "tuple[str|None, str]":
    """
    Stage 2: visually compare tweet image against 2-4 candidate NFT images.
    Compares ONE candidate at a time (2 images per call) to avoid model timeouts.
    Returns (winning_nft_id_or_None, confidence).
    """
    local_map = _load_nft_local_map()
    if nfts_by_id is None:
        nfts_by_id = {}

    # Load candidate images (skip any missing local files)
    loaded = []
    for nft_id in candidate_ids[:4]:
        token_id = nft_id.replace("gator-nft-", "")
        stem = local_map.get(token_id)
        if not stem:
            continue
        path = NFT_LOCAL_IMAGE_DIR / f"{stem}.png"
        if not path.exists():
            continue
        try:
            img = Image.open(path).convert("RGB")
            nft_traits = {t["trait_type"]: t["value"]
                          for t in nfts_by_id.get(nft_id, {}).get("traits", [])}
            loaded.append((nft_id, img, nft_traits))
        except Exception:
            continue

    if not loaded:
        return None, "low"

    # Compare tweet image against each candidate one at a time
    results = []
    for nft_id, nft_img, nft_traits in loaded:
        is_match, confidence, reasoning = _visual_match_one(
            tweet_img, nft_img, nft_id, nft_traits, model_id
        )
        conf_score = {"high": 3, "medium": 2, "low": 1}.get(confidence, 1)
        match_score = 1 if is_match else 0
        results.append((nft_id, match_score, conf_score, reasoning))
        print(f"  🖼  {nft_id}: match={is_match} ({confidence}) — {reasoning[:70]}")

    # Pick the candidate with the most confident "true" match
    matches = [(nid, cscore, r) for nid, mscore, cscore, r in results if mscore]
    if not matches:
        print(f"  · Visual comparison: no candidate matched")
        return None, "low"

    # Sort by confidence score
    matches.sort(key=lambda x: -x[1])
    if len(matches) == 1 or matches[0][1] > matches[1][1]:
        winner_id, conf_score, reasoning = matches[0]
        conf_label = {3: "high", 2: "medium", 1: "low"}[conf_score]
        print(f"  ✓ Visual winner: {winner_id} ({conf_label})")
        return winner_id, conf_label

    # Multiple matches at same confidence — inconclusive
    print(f"  · Visual comparison inconclusive: {[m[0] for m in matches]} all matched")
    return None, "low"


# Max candidates to pass to visual comparison; above this, flag for manual review
VISUAL_COMPARE_MAX = 4


def process_asset(record: dict, model_id: str, trait_vocab: dict,
                  trait_index: dict, nfts_by_id: dict,
                  nft_hashes: dict, dry_run: bool, hash_only: bool,
                  threshold: int = HASH_THRESHOLD) -> dict:
    """
    Full processing pipeline for one image asset.
    Returns updated record dict.
    """
    url = record.get("url") or record.get("preview_image_url")
    asset_id = record.get("id", "?")

    # --- Step 1: Load image (from local cache if available, else download + cache) ---
    img = load_asset_image(record)
    if img is None:
        print(f"  ✗ Could not load image: {url[:60]}", file=sys.stderr)
        return record

    # --- Step 2: Perceptual hash matching ---
    hash_matches = find_hash_matches(img, nft_hashes, threshold)
    if hash_matches:
        best_id, best_dist = hash_matches[0]
        confidence = "exact" if best_dist == 0 else "near-exact" if best_dist <= 3 else "possible"
        print(f"  🔍 Hash match: {best_id} (distance={best_dist}, {confidence})")
    else:
        print(f"  · No hash match")

    # --- Step 3: Build new linked_assets set ---
    # Start from non-NFT links only (preserve manual links, tweet links, etc.)
    # NFT links are always recomputed fresh so stale matches get cleared.
    # Only take the single best hash match — multiple NFTs can share the same
    # perceptual hash (identical artwork), so we pick the top-ranked one only.
    existing_links = record.get("linked_assets") or []
    non_nft_links = {l for l in existing_links if not l.startswith("gator-nft-")}
    best_nft = {hash_matches[0][0]} if hash_matches else set()
    new_links = non_nft_links | best_nft

    if dry_run:
        if best_nft:
            print(f"  [DRY RUN] Would link: {best_nft}")
        return record

    if hash_only:
        record["linked_assets"] = sorted(new_links)
        record["_nft_match_done"] = True
        record["_nft_match_at"] = datetime.now(tz=timezone.utc).isoformat()
        return record

    # --- Step 4: Skip AI if hash match is already high-confidence ---
    # Only skip AI when the best hash distance is very tight (HASH_AUTO_LINK_MAX=5 for 256-bit hash).
    # Distances calibrated empirically: known-good tweet→NFT pairs land at 0–4, max ~16.
    if hash_matches and hash_matches[0][1] <= HASH_AUTO_LINK_MAX:
        best_id, best_dist = hash_matches[0]
        label = "exact" if best_dist == 0 else "near-exact"
        print(f"  ✓ Skipping AI — {label} hash match (distance={best_dist})")
        record["linked_assets"] = sorted(new_links)
        record["_nft_match_done"] = True
        record["_nft_match_at"] = datetime.now(tz=timezone.utc).isoformat()
        return record

    # --- Step 5: Vision model call (only for no-match or low-confidence hash) ---
    image_b64 = image_to_base64(img)
    prompt = build_vision_prompt(trait_vocab)

    parsed = None
    try:
        response = call_ollama_vision(model_id, prompt, image_b64)
        parsed = parse_vision_response(response, trait_vocab)
    except Exception as e:
        print(f"  ✗ Model error: {e}", file=sys.stderr)

    # Even on model failure, persist hash matches and mark done so we don't retry endlessly
    if parsed is None:
        record["linked_assets"] = sorted(new_links)
        record["_nft_match_done"] = True
        record["_nft_match_at"] = datetime.now(tz=timezone.utc).isoformat()
        return record

    summary = parsed.get("visual_summary", "")
    contains_gator = parsed.get("contains_gator", False)
    clean_traits = parsed.get("traits", {})
    gator_conf = parsed.get("gator_confidence", "low")
    trait_conf = parsed.get("trait_confidence", "low")
    reasoning = parsed.get("reasoning", "")

    if summary:
        print(f"  📝 {summary[:100]}")
    if contains_gator:
        print(f"  🐊 Gator detected ({gator_conf} confidence), traits: {clean_traits}")

    # --- Step 6: Two-stage trait + visual matching ---
    #
    # PRIMARY filter (cascading — use tightest that yields results):
    #   1. Skin(bucket) + Hat + Outfit  (all 3 must match)
    #   2. Skin(bucket) + Hat           (both must match)
    #   3. Skin(bucket) only
    #   4. Any 3 detected traits (last resort)
    #
    # Skin bucket expands "Green" → [Green, Radioactive, Alien] etc. so visually similar
    # skins (with non-obvious names) are included in the candidate pool.
    #
    # BONUS scoring: Eyes and Mouth matches on top of primary.
    #   Hat is already in primary filter — NOT counted again.
    #   Outfit is already in tier-1 filter — NOT counted again in bonus to avoid double-count.
    #   Exact skin match (e.g. detected "Green" vs NFT "Green") gets +1 bonus to prefer
    #   exact over bucket siblings.
    #
    # Then: 1 top candidate → auto-link; 2-VISUAL_COMPARE_MAX → visual comparison;
    #       more → flagged for manual review.
    # Always store top 3 candidates on the record for UI review.
    trait_matches = []
    if contains_gator and clean_traits and trait_conf in ("high", "medium"):
        skin_val   = clean_traits.get("Skin")
        hat_val    = clean_traits.get("Hat")
        outfit_val = clean_traits.get("Outfit")

        # Expand skin to color-bucket siblings (e.g. "Green" → ["Green","Radioactive","Alien"])
        skin_bucket = expand_skin(skin_val) if skin_val else []
        skin_expanded = len(skin_bucket) > 1

        def _bucket_find(filter_dict: dict, min_match: int) -> list:
            """Run find_trait_matches for each skin in the bucket, deduped & sorted."""
            seen: set = set()
            result: list = []
            for s in (skin_bucket if skin_val else [None]):
                q = {**filter_dict}
                if s is not None:
                    q["Skin"] = s
                for item in find_trait_matches(q, trait_index, nfts_by_id, min_match=min_match):
                    if item[0] not in seen:
                        seen.add(item[0])
                        result.append(item)
            result.sort(key=lambda x: -x[1])
            return result

        candidates = []
        primary_label = ""

        # Tier 1: Skin(bucket) + Hat + Outfit — tightest
        if skin_val and hat_val and outfit_val:
            candidates = _bucket_find({"Hat": hat_val, "Outfit": outfit_val}, min_match=3)
            if candidates:
                bucket_note = f" (bucket: {skin_bucket})" if skin_expanded else ""
                print(f"  🎯 Skin+Hat+Outfit filter → {len(candidates)} candidates{bucket_note}")
                primary_label = "Skin+Hat+Outfit"

        # Tier 2: Skin(bucket) + Hat
        if not candidates and skin_val and hat_val:
            candidates = _bucket_find({"Hat": hat_val}, min_match=2)
            if candidates:
                bucket_note = f" (bucket: {skin_bucket})" if skin_expanded else ""
                print(f"  🎯 Skin+Hat filter → {len(candidates)} candidates{bucket_note}")
                primary_label = "Skin+Hat"

        # Tier 3: Skin(bucket) only
        if not candidates and skin_val:
            candidates = _bucket_find({}, min_match=1)
            if candidates:
                bucket_note = f" (bucket: {skin_bucket})" if skin_expanded else ""
                print(f"  🎯 Skin-only filter → {len(candidates)} candidates{bucket_note}")
                primary_label = "Skin-only"

        # Tier 4: any 3 detected traits (last resort, no bucket expansion)
        if not candidates:
            candidates = find_trait_matches(clean_traits, trait_index, nfts_by_id, min_match=3)
            if candidates:
                print(f"  🎯 Broad trait filter → {len(candidates)} candidates")
                primary_label = "broad"

        if candidates:
            # Bonus: Eyes and Mouth only (Hat+Outfit+Skin already in primary filter)
            # Also give +1 for exact skin match vs bucket sibling
            scored = []
            for nft_id, base_count, total in candidates:
                nft_traits = {t["trait_type"]: t["value"]
                              for t in nfts_by_id.get(nft_id, {}).get("traits", [])}
                bonus = 0
                # Exact skin match beats bucket siblings
                if skin_val and nft_traits.get("Skin") == skin_val:
                    bonus += 1
                # Secondary traits not already in primary filter
                secondary = ["Eyes", "Mouth"]
                if primary_label not in ("Skin+Hat+Outfit", "broad"):
                    secondary.append("Outfit")  # Outfit not yet used in filter
                bonus += sum(1 for k in secondary
                             if clean_traits.get(k) and clean_traits[k] == nft_traits.get(k))
                scored.append((nft_id, base_count + bonus, total))
            scored.sort(key=lambda x: -x[1])

            top_score = scored[0][1]
            top_tier = [m for m in scored if m[1] >= top_score]

            # Store top 3 for UI review
            record["_nft_candidates"] = [m[0] for m in scored[:3]]

            print(f"  🎯 Top tier: {len(top_tier)} at score {top_score} (primary: {primary_label})")

            if len(top_tier) == 1:
                print(f"  ✓ Auto-link: {top_tier[0][0]} (score {top_score})")
                new_links.add(top_tier[0][0])
                trait_matches = top_tier[:1]

            elif 2 <= len(top_tier) <= VISUAL_COMPARE_MAX:
                print(f"  🔎 Running visual comparison on {len(top_tier)} candidates...")
                winner, conf = compare_to_candidates(
                    img, [m[0] for m in top_tier], model_id, nfts_by_id
                )
                if winner:
                    new_links.add(winner)
                    trait_matches = [(winner, top_score, 5)]
                else:
                    print(f"  · No confident visual match — flagged for review")

            else:
                print(f"  · Too many candidates ({len(top_tier)}) — flagged for review")
        else:
            print(f"  · No trait matches")

    # --- Step 7: Write all updates to record ---
    record["visual_summary"] = summary
    record["linked_assets"] = sorted(new_links)
    record["_nft_match_done"] = True
    record["_nft_match_at"] = datetime.now(tz=timezone.utc).isoformat()

    if clean_traits:
        record["detected_traits"] = {k: str(v) for k, v in clean_traits.items()}  # ensure JSON-safe

    if contains_gator and gator_conf in ("high", "medium"):
        tags = list(record.get("tags") or [])
        if "nft-collection" not in tags:
            tags.append("nft-collection")
        record["tags"] = tags
        record["flagged_by"] = "ai"
        record["flagged_at"] = datetime.now(tz=timezone.utc).isoformat()

    if reasoning:
        print(f"    ({reasoning[:120]})")

    return record


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="NFT visual matching for Gatorpedia image assets.")
    parser.add_argument("--model", default=DEFAULT_MODEL,
                        help=f"Model (default: {DEFAULT_MODEL})")
    parser.add_argument("--limit", type=int, default=None,
                        help="Only process first N images (for testing)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Download images and show what would happen, no writes")
    parser.add_argument("--reprocess", action="store_true",
                        help="Re-process images already marked as done")
    parser.add_argument("--hash-only", action="store_true",
                        help="Only run perceptual hash matching, no model calls")
    parser.add_argument("--hash-threshold", type=int, default=None,
                        help=f"Perceptual hash distance threshold (default: {HASH_THRESHOLD}, "
                             f"or {HASH_ONLY_THRESHOLD} in --hash-only mode)")
    parser.add_argument("--min-traits", type=int, default=TRAIT_MIN_MATCH,
                        help=f"Minimum trait matches to auto-link (default: {TRAIT_MIN_MATCH})")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY,
                        help=f"Delay between model calls in seconds (default: {REQUEST_DELAY})")
    parser.add_argument("--ids", type=str, default=None,
                        help="Comma-separated asset IDs (or @file with one ID per line) to process; implies --reprocess")
    args = parser.parse_args()

    # --ids implies --reprocess
    if args.ids:
        args.reprocess = True

    # Apply default threshold: hash-only mode uses tighter value to avoid false positives
    if args.hash_threshold is None:
        args.hash_threshold = HASH_ONLY_THRESHOLD if args.hash_only else HASH_THRESHOLD

    # Parse model string
    provider, model_id = args.model.split("/", 1) if "/" in args.model else ("ollama", args.model)
    if provider != "ollama":
        print("ERROR: Only ollama provider supported for vision tasks", file=sys.stderr)
        sys.exit(1)

    # Load NFTs
    nfts = load_nfts()
    nfts_by_id = {n["id"]: n for n in nfts}
    trait_index = build_trait_index(nfts)
    trait_vocab  = build_trait_vocab(nfts)

    print(f"Trait vocabulary: {', '.join(f'{k} ({len(v)} values)' for k, v in trait_vocab.items())}")

    # Build / load NFT hash cache
    cache_path = DB_DIR / ".nft_hashes.json"
    nft_hashes = compute_nft_hashes(nfts, cache_path)
    print(f"NFT hashes ready: {len(nft_hashes)}")

    # ---------------------------------------------------------------------------
    # Load image assets
    # ---------------------------------------------------------------------------
    records = []
    with open(ASSETS_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    pass

    print(f"Loaded {len(records)} asset records")

    # ---------------------------------------------------------------------------
    # Load tweets and build media_key → tweet lookup
    # Every asset record came from a tweet attachment; we use this to propagate
    # NFT links to the parent tweet (and back to the NFT) instead of keeping
    # the link only on the intermediate image record.
    # ---------------------------------------------------------------------------
    POSTS_FILE = DB_DIR / "posts-migrated.jsonl"
    posts = []
    if POSTS_FILE.exists():
        with open(POSTS_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        posts.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
    posts_by_id = {p.get("id"): p for p in posts}

    # media_key → tweet_id  (assets have media_key = e.g. "3_2031668771031838721")
    media_key_to_tweet_id: dict = {}
    for post in posts:
        for m in (post.get("media") or []):
            mk = m.get("media_key")
            if mk:
                media_key_to_tweet_id[mk] = post["id"]

    print(f"Loaded {len(posts)} tweets, {len(media_key_to_tweet_id)} media_key mappings")

    # ---------------------------------------------------------------------------
    # Build sets of new links to propagate (accumulated across all images)
    # tweet_nft_links[tweet_id] = set of nft_ids to add
    # nft_tweet_links[nft_id]   = set of tweet_ids to add
    # ---------------------------------------------------------------------------
    tweet_nft_links: dict = {}   # tweet_id → {nft_id, ...}
    nft_tweet_links: dict = {}   # nft_id → {tweet_id, ...}

    to_process = [r for r in records if should_process(r, args.reprocess)]
    print(f"Images/GIFs to process: {len(to_process)}")

    # --ids filter: restrict to specific asset IDs
    if args.ids:
        if args.ids.startswith("@"):
            id_file = Path(args.ids[1:])
            target_ids = set(id_file.read_text().splitlines())
        else:
            target_ids = set(args.ids.split(","))
        target_ids = {s.strip() for s in target_ids if s.strip()}
        to_process = [r for r in to_process if r.get("id") in target_ids]
        print(f"Filtered to {len(to_process)} records matching --ids ({len(target_ids)} requested)")

    if args.limit:
        to_process = to_process[:args.limit]
        print(f"Limited to {args.limit}")

    if args.dry_run:
        print("DRY RUN — no writes\n")

    print(f"Model: {model_id}")
    if args.hash_only:
        print("Hash-only mode — no model calls")

    records_by_id = {r.get("id"): r for r in records}

    def flush_assets():
        """Write assets.jsonl atomically."""
        tmp = str(ASSETS_FILE) + ".tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                for rec in records:
                    current = records_by_id.get(rec.get("id"), rec)
                    try:
                        line = json.dumps(current, ensure_ascii=False)
                    except (TypeError, ValueError) as e:
                        print(f"  ✗ json error on {current.get('id','?')}: {e}", file=sys.stderr)
                        line = json.dumps(rec, ensure_ascii=False)
                    f.write(line + "\n")
            os.replace(tmp, ASSETS_FILE)
        except Exception as e:
            print(f"  ✗ flush_assets failed: {e}", file=sys.stderr)
            if os.path.exists(tmp):
                os.remove(tmp)

    def flush_posts():
        """Write posts-migrated.jsonl atomically, merging with current on-disk state."""
        if not posts:
            return
        # Re-read current disk state to avoid clobbering concurrent server patches
        disk_by_id: dict = {}
        if POSTS_FILE.exists():
            with open(POSTS_FILE, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                        if rec.get("id"):
                            disk_by_id[rec["id"]] = rec
                    except json.JSONDecodeError:
                        pass

        # Apply accumulated tweet→NFT links.
        # Strategy: keep non-NFT linked_assets intact; REPLACE all NFT links with the
        # freshly computed set so re-runs correct false positives from prior runs.
        # Also clear stale NFT links from tweets not seen in this run.
        changed = 0
        all_processed_tweet_ids = {
            media_key_to_tweet_id[r.get("media_key")]
            for r in to_process
            if r.get("media_key") and r.get("media_key") in media_key_to_tweet_id
        }
        # Touch every tweet that either has existing NFT links OR got new matches this run
        tweets_to_update = (
            {tid for tid, base in disk_by_id.items()
             if any(l.startswith("gator-nft-") for l in (base.get("linked_assets") or []))}
            | set(tweet_nft_links.keys())
        )
        for tweet_id in tweets_to_update:
            base = disk_by_id.get(tweet_id)
            if not base:
                continue
            existing = set(base.get("linked_assets") or [])
            non_nft = {l for l in existing if not l.startswith("gator-nft-")}
            if tweet_id in tweet_nft_links:
                # Tweet matched this run — use fresh NFT set
                new_set = non_nft | tweet_nft_links[tweet_id]
            elif tweet_id in all_processed_tweet_ids:
                # Tweet was processed but got NO matches — clear stale NFT links
                new_set = non_nft
            else:
                continue  # not processed this run, leave alone
            merged = sorted(new_set)
            if merged != sorted(existing):
                base = dict(base)
                base["linked_assets"] = merged
                disk_by_id[tweet_id] = base
                changed += 1

        if changed == 0:
            return

        tmp = str(POSTS_FILE) + ".tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                for rec in posts:
                    current = disk_by_id.get(rec.get("id"), rec)
                    f.write(json.dumps(current, ensure_ascii=False) + "\n")
                # Append any records on disk not in our original list
                seen = {r.get("id") for r in posts}
                for rid, rec in disk_by_id.items():
                    if rid not in seen:
                        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            os.replace(tmp, POSTS_FILE)
            print(f"  → linked {changed} tweet(s) to NFTs in posts-migrated.jsonl")
        except Exception as e:
            print(f"  ✗ flush_posts failed: {e}", file=sys.stderr)
            if os.path.exists(tmp):
                os.remove(tmp)

    def flush_nfts():
        """Write nfts.jsonl — adds tweet links to matched NFT records."""
        if not nft_tweet_links:
            return
        nfts_file = DB_DIR / "nfts.jsonl"
        if not nfts_file.exists():
            return

        # Read current state
        nft_records = []
        with open(nfts_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        nft_records.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass

        changed = 0
        nft_by_id = {r.get("id"): r for r in nft_records}

        # NFTs that were candidates in this run.
        # In a full run (no --ids), every NFT in the hash cache was evaluated, so we can
        # safely clear stale tweet links from unmatched NFTs.
        # In a filtered run (--ids), we only evaluated a subset of images, so we must NOT
        # clear tweet links from NFTs that simply weren't in scope.
        is_filtered_run = bool(args.ids)
        evaluated_nft_ids = set() if is_filtered_run else set(nft_hashes.keys())

        for rec in nft_records:
            nft_id = rec.get("id")
            if not nft_id:
                continue
            existing = set(rec.get("linked_assets") or [])
            tweet_links = {lid for lid in existing if lid.startswith("tweet-")}
            if not tweet_links and nft_id not in nft_tweet_links:
                continue  # nothing to update
            non_tweet = existing - tweet_links
            if nft_id in nft_tweet_links:
                new_set = non_tweet | nft_tweet_links[nft_id]
            elif nft_id in evaluated_nft_ids:
                # Was evaluated this run but got no tweet matches — clear stale tweet links
                new_set = non_tweet
            else:
                continue  # not evaluated (or filtered run), leave alone
            merged = sorted(new_set)
            if merged != sorted(existing):
                rec = dict(rec)
                rec["linked_assets"] = merged
                nft_by_id[nft_id] = rec
                changed += 1

        if changed == 0:
            return

        tmp = str(nfts_file) + ".tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                for rec in nft_records:
                    current = nft_by_id.get(rec.get("id"), rec)
                    f.write(json.dumps(current, ensure_ascii=False) + "\n")
            os.replace(tmp, nfts_file)
            print(f"  → linked {changed} NFT record(s) to tweets in nfts.jsonl")
        except Exception as e:
            print(f"  ✗ flush_nfts failed: {e}", file=sys.stderr)
            if os.path.exists(tmp):
                os.remove(tmp)

    hash_matched = 0
    start = time.time()

    for i, record in enumerate(to_process, 1):
        asset_id = record.get("id", "?")
        url = record.get("url") or record.get("preview_image_url") or ""
        print(f"[{i}/{len(to_process)}] {asset_id} ({url[35:70]}...)")

        prev_links = set(record.get("linked_assets") or [])

        updated = process_asset(
            record, model_id, trait_vocab, trait_index, nfts_by_id,
            nft_hashes, args.dry_run, args.hash_only,
            threshold=args.hash_threshold,
        )

        if updated is not None:
            records_by_id[record.get("id")] = updated
            # Use full current NFT set (not just delta) so reprocessing correctly
            # re-propagates links even when the NFT was already in stale linked_assets.
            current_nft_ids = {l for l in (updated.get("linked_assets") or [])
                               if l.startswith("gator-nft-")}
            if current_nft_ids:
                hash_matched += 1


                # Find parent tweet via media_key and register bidirectional links
                media_key = record.get("media_key")
                tweet_id = media_key_to_tweet_id.get(media_key) if media_key else None

                if tweet_id:
                    if tweet_id not in tweet_nft_links:
                        tweet_nft_links[tweet_id] = set()
                    tweet_nft_links[tweet_id] |= current_nft_ids

                    for nft_id in current_nft_ids:
                        if nft_id not in nft_tweet_links:
                            nft_tweet_links[nft_id] = set()
                        nft_tweet_links[nft_id].add(tweet_id)

                    if args.dry_run:
                        print(f"  [DRY RUN] Would link tweet {tweet_id} ↔ {current_nft_ids}")
                    else:
                        print(f"  🔗 tweet {tweet_id} ↔ {current_nft_ids}")
                else:
                    print(f"  ⚠ No parent tweet found for media_key={media_key}")

        if not args.dry_run:
            flush_assets()
            # Flush posts/NFTs every 10 images so the UI sees results in near-realtime
            if i % 10 == 0:
                flush_posts()
                flush_nfts()

        if not args.dry_run and i < len(to_process):
            time.sleep(args.delay)

    # Final flush to catch anything remaining
    if not args.dry_run:
        flush_posts()
        flush_nfts()

    elapsed = time.time() - start
    print(f"\nDone: {len(to_process)} images in {elapsed:.1f}s")
    print(f"  Images matched to NFTs: {hash_matched}")
    print(f"  Tweet→NFT links written: {sum(len(v) for v in tweet_nft_links.values())}")
    print(f"  NFT→Tweet links written: {sum(len(v) for v in nft_tweet_links.values())}")
    if args.dry_run:
        print("(dry run — nothing written)")
    else:
        print(f"Written to {ASSETS_FILE}")


if __name__ == "__main__":
    main()
