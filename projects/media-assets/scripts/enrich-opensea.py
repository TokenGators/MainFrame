#!/usr/bin/env python3
"""
enrich-opensea.py — Fetch OpenSea profiles for all holders.

Writes twitter_username, discord, opensea_username, website to
~/.openclaw/holders-identity.jsonl  (private identity store).
Never overwrites fields that already have values.

Usage:
    python3 scripts/enrich-opensea.py

Reads OpenSea API key from macOS Keychain (service: "opensea-api-key").
"""

from __future__ import annotations
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

# ── Config ─────────────────────────────────────────────────────────────────────

PROJECT_ROOT   = Path(__file__).parent.parent
HOLDERS_FILE   = PROJECT_ROOT / "database" / "holders.jsonl"
IDENTITY_FILE  = Path.home() / ".openclaw" / "holders-identity.jsonl"

OPENSEA_BASE   = "https://api.opensea.io/api/v2"
REQUEST_DELAY  = 0.35   # ~3 req/sec — well under the 4/sec limit
BATCH_PROGRESS = 25     # print progress every N wallets

# ── Keychain ───────────────────────────────────────────────────────────────────

def get_opensea_key() -> str:
    try:
        result = subprocess.run(
            ["security", "find-generic-password", "-s", "opensea-api-key", "-w"],
            capture_output=True, text=True, check=True,
        )
        key = result.stdout.strip()
        if key:
            return key
    except subprocess.CalledProcessError:
        pass

    # Fallback: ~/.openclaw/.env
    env_path = Path.home() / ".openclaw" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("OPENSEA_API_KEY="):
                return line.split("=", 1)[1].strip()

    return ""

# ── File helpers ───────────────────────────────────────────────────────────────

def load_holders() -> list[dict]:
    if not HOLDERS_FILE.exists():
        print(f"ERROR: {HOLDERS_FILE} not found.")
        sys.exit(1)
    records = []
    with open(HOLDERS_FILE) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def load_identity() -> dict:
    """Load identity file → {wallet_lower: record}"""
    identity = {}
    if not IDENTITY_FILE.exists():
        return identity
    with open(IDENTITY_FILE) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    rec = json.loads(line)
                    if rec.get("wallet"):
                        identity[rec["wallet"].lower()] = rec
                except json.JSONDecodeError:
                    pass
    return identity


def save_identity(identity: dict):
    """Merge-write: re-read file, overlay our changes, write back atomically."""
    IDENTITY_FILE.parent.mkdir(parents=True, exist_ok=True)
    # Re-read current file to pick up any changes from other processes
    on_disk = {}
    if IDENTITY_FILE.exists():
        with open(IDENTITY_FILE) as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        r = json.loads(line)
                        if r.get("wallet"):
                            on_disk[r["wallet"].lower()] = r
                    except json.JSONDecodeError:
                        pass
    # Overlay our in-memory changes on top
    on_disk.update(identity)
    tmp = IDENTITY_FILE.with_suffix(".tmp")
    with open(tmp, "w") as f:
        for rec in on_disk.values():
            f.write(json.dumps(rec) + "\n")
    tmp.replace(IDENTITY_FILE)

# ── OpenSea fetch ──────────────────────────────────────────────────────────────

def fetch_opensea_profile(wallet: str, api_key: str) -> dict | None:
    """
    GET /api/v2/accounts/{address}
    Returns a dict of fields we care about, or None on failure.
    """
    url = f"{OPENSEA_BASE}/accounts/{wallet}"
    headers = {
        "accept":    "application/json",
        "x-api-key": api_key,
    }
    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code == 404:
            return {}   # No OpenSea profile — not an error
        if r.status_code == 429:
            print("  ⚠ Rate limited — sleeping 10s")
            time.sleep(10)
            return None  # Retry signal
        r.raise_for_status()
        data = r.json()

        result = {}

        # Username
        username = data.get("username") or ""
        if username and not username.startswith("0x"):
            result["opensea_username"] = username

        # Social accounts (array of {platform, username})
        for social in data.get("social_media_accounts") or []:
            platform = (social.get("platform") or "").lower()
            handle   = (social.get("username") or "").strip()
            if not handle:
                continue
            if platform == "twitter":
                result["twitter"] = handle.lstrip("@")
            elif platform == "discord":
                result["discord"] = handle
            elif platform in ("instagram", "youtube", "tiktok", "website"):
                result[platform] = handle

        return result

    except requests.RequestException as e:
        print(f"  Network error for {wallet[:10]}…: {e}")
        return None

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    api_key = get_opensea_key()
    if not api_key:
        print("ERROR: No OpenSea API key found.")
        print("  Run: security add-generic-password -s 'opensea-api-key' -a '$USER' -w 'YOUR_KEY'")
        sys.exit(1)

    print("OpenSea Holder Enrichment")
    print("=" * 40)

    holders  = load_holders()
    identity = load_identity()

    print(f"Loaded {len(holders)} holders, {len(identity)} existing identity records")

    # Only process wallets that don't yet have an opensea_username field
    # (meaning we haven't run this enrichment before, OR it came back empty)
    to_process = [
        h["wallet"] for h in holders
        if not identity.get(h["wallet"].lower(), {}).get("_opensea_checked")
    ]

    print(f"  {len(holders) - len(to_process)} already checked, {len(to_process)} to process")
    if not to_process:
        print("All wallets already processed.")
        return

    new_twitter  = 0
    new_discord  = 0
    new_username = 0
    errors       = 0
    checked      = 0

    for i, wallet in enumerate(to_process):
        wl = wallet.lower()
        if wl not in identity:
            identity[wl] = {"wallet": wallet}

        rec = identity[wl]

        # Retry loop for rate limiting
        for attempt in range(3):
            profile = fetch_opensea_profile(wallet, api_key)
            if profile is not None:
                break
            time.sleep(5 * (attempt + 1))
        else:
            errors += 1
            continue

        # Mark as checked regardless of results
        rec["_opensea_checked"] = True

        # Merge — never overwrite existing non-null values; track source
        if profile.get("opensea_username") and not rec.get("opensea_username"):
            rec["opensea_username"] = profile["opensea_username"]
            rec.setdefault("_sources", {})["opensea_username"] = "opensea"
            new_username += 1

        if profile.get("twitter") and not rec.get("twitter"):
            rec["twitter"] = profile["twitter"]
            rec.setdefault("_sources", {})["twitter"] = "opensea"
            new_twitter += 1

        if profile.get("discord") and not rec.get("discord"):
            rec["discord"] = profile["discord"]
            rec.setdefault("_sources", {})["discord"] = "opensea"
            new_discord += 1

        rec["updated_at"] = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        identity[wl] = rec

        checked += 1
        if checked % BATCH_PROGRESS == 0:
            pct = checked / len(to_process) * 100
            print(f"  [{checked}/{len(to_process)}] {pct:.0f}% — "
                  f"+{new_twitter} Twitter, +{new_discord} Discord, +{new_username} OpenSea usernames")
            save_identity(identity)   # Checkpoint every BATCH_PROGRESS wallets

        time.sleep(REQUEST_DELAY)

    save_identity(identity)

    print(f"\n✓ Done")
    print(f"  Checked:              {checked}")
    print(f"  Errors:               {errors}")
    print(f"  New Twitter handles:  {new_twitter}")
    print(f"  New Discord handles:  {new_discord}")
    print(f"  New OpenSea usernames:{new_username}")
    print(f"\nSaved → {IDENTITY_FILE}")


if __name__ == "__main__":
    main()
