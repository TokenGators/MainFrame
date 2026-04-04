#!/usr/bin/env python3
"""
ingest-nft-collection.py
Ingests local TokenGators Ethereum NFT JSON metadata files into the registry.

Source: /Users/operator/Media/Ethereum/{id}.json
Output: projects/media-assets/database/nfts.jsonl

Each output record follows the gator-nft schema from GATORPEDIA-ASSET-REGISTRY-PRD.md.
"""

import json
import os
from pathlib import Path
from datetime import datetime, timezone

# --- Config ---
SOURCE_DIR = Path("/Users/operator/Media/Ethereum")
OUTPUT_FILE = Path(__file__).parent.parent / "database" / "nfts.jsonl"
COLLECTION_SIZE = 4000  # Total supply

def load_token(token_id: int) -> dict | None:
    path = SOURCE_DIR / f"{token_id}.json"
    if not path.exists():
        return None
    try:
        with open(path) as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"  WARN: Could not read {path}: {e}")
        return None

def to_registry_record(token_id: int, raw: dict) -> dict:
    """Map raw NFT metadata to the gator-nft registry schema."""
    return {
        "id": f"gator-nft-{token_id}",
        "type": "gator-nft",
        "created_at": None,  # Mint date unknown without chain data
        "source_url": f"https://tokengators.com/explorer?id={token_id}",
        "tags": ["nft", "nft-collection", "gator-character"],
        "collections": ["ethereum-collection"],
        "flagged_by": "ai",
        "flagged_at": datetime.now(timezone.utc).isoformat(),
        "linked_assets": [],
        "metadata": {},
        # gator-nft type-specific fields
        "token_id": token_id,
        "name": raw.get("name", f"TokenGator #{token_id}"),
        "ipfs_metadata_uri": f"ipfs://QmCollection/{token_id}",  # placeholder; base CID unknown
        "ipfs_image_uri": raw.get("image", "").replace("https://gateway.pinata.cloud/ipfs/", "ipfs://"),
        "gateway_image_url": raw.get("image", ""),
        "mml_url": raw.get("mml", ""),
        "traits": raw.get("attributes", []),
        "rarity_rank": None,  # To be populated later
        "gator_appearances": []  # Populated during content linking phase
    }

def main():
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    print(f"Ingesting TokenGators NFT collection ({COLLECTION_SIZE} tokens)...")
    print(f"  Source: {SOURCE_DIR}")
    print(f"  Output: {OUTPUT_FILE}")
    print()

    found = 0
    missing = []

    with open(OUTPUT_FILE, "w") as out:
        for token_id in range(0, COLLECTION_SIZE):
            raw = load_token(token_id)
            if raw is None:
                missing.append(token_id)
                continue
            record = to_registry_record(token_id, raw)
            out.write(json.dumps(record) + "\n")
            found += 1
            if found % 500 == 0:
                print(f"  ... {found} tokens ingested")

    print()
    print(f"✅ Done: {found} tokens written to {OUTPUT_FILE}")
    if missing:
        print(f"⚠️  Missing token IDs ({len(missing)}): {missing[:20]}{'...' if len(missing) > 20 else ''}")

    # Summary stats
    print()
    print("Collecting trait summary...")
    trait_counts: dict[str, dict[str, int]] = {}
    with open(OUTPUT_FILE) as f:
        for line in f:
            record = json.loads(line)
            for trait in record.get("traits", []):
                tt = trait.get("trait_type", "Unknown")
                tv = trait.get("value", "Unknown")
                trait_counts.setdefault(tt, {})
                trait_counts[tt][tv] = trait_counts[tt].get(tv, 0) + 1

    print(f"\nTrait types found: {list(trait_counts.keys())}")
    for trait_type, values in trait_counts.items():
        print(f"  {trait_type}: {len(values)} unique values")

if __name__ == "__main__":
    main()
