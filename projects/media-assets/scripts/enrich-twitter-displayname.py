#!/usr/bin/env python3
"""
enrich-twitter-displayname.py — Fetch X/Twitter display names for all holders
with a known twitter handle.

Stores twitter_display_name in ~/.openclaw/holders-identity.jsonl.

Uses Twitter API v2: GET /2/users/by?usernames=...&user.fields=name
Bearer token from macOS Keychain (security find-generic-password -s "x-bearer-token" -w).

Usage:
    python3 scripts/enrich-twitter-displayname.py [--dry-run]
"""

import json
import subprocess
import sys
import time
from pathlib import Path

import urllib.request
import urllib.error
import urllib.parse

IDENTITY_FILE = Path.home() / ".openclaw" / "holders-identity.jsonl"
BATCH_SIZE = 100   # Twitter API limit
CHECKPOINT_EVERY = 5  # batches


def get_bearer() -> str:
    result = subprocess.run(
        ["security", "find-generic-password", "-s", "x-bearer-token", "-w"],
        capture_output=True, text=True,
    )
    token = result.stdout.strip()
    if not token:
        raise RuntimeError("x-bearer-token not found in Keychain")
    return token


def load_identity() -> dict:
    records = {}
    if not IDENTITY_FILE.exists():
        return records
    with open(IDENTITY_FILE) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    r = json.loads(line)
                    if r.get("wallet"):
                        records[r["wallet"].lower()] = r
                except json.JSONDecodeError:
                    pass
    return records


def save_identity(in_memory: dict):
    """Merge-write: re-read disk, overlay in-memory changes, write atomically."""
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
    on_disk.update(in_memory)
    tmp = IDENTITY_FILE.with_suffix(".tmp")
    with open(tmp, "w") as f:
        for rec in on_disk.values():
            f.write(json.dumps(rec) + "\n")
    tmp.replace(IDENTITY_FILE)


import re
VALID_HANDLE = re.compile(r'^[A-Za-z0-9_]{1,15}$')


def is_valid_handle(h: str) -> bool:
    return bool(VALID_HANDLE.match(h))


def _call_api(handles: list[str], bearer: str) -> dict[str, str]:
    """Single API call, no retry logic. Returns {} on any error."""
    usernames = ",".join(handles)
    url = f"https://api.twitter.com/2/users/by?usernames={urllib.parse.quote(usernames)}&user.fields=name"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {bearer}"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        result = {}
        for user in data.get("data", []):
            result[user["username"].lower()] = user["name"]
        return result
    except urllib.error.HTTPError as e:
        if e.code == 429:
            raise  # let caller handle rate limits
        return {}
    except Exception:
        return {}


def fetch_display_names(handles: list[str], bearer: str, attempt: int = 1) -> dict[str, str]:
    """Returns {handle_lower: display_name}. Pre-filters invalid handles; falls back to
    individual lookups when a batch 400s (one bad handle contaminates the whole batch)."""

    valid   = [h for h in handles if is_valid_handle(h)]
    invalid = [h for h in handles if not is_valid_handle(h)]
    if invalid:
        print(f"  Skipping {len(invalid)} invalid handle(s): {', '.join(invalid[:5])}", flush=True)

    if not valid:
        return {}

    try:
        result = _call_api(valid, bearer)
    except urllib.error.HTTPError as e:
        if e.code == 429 and attempt <= 4:
            wait = 60 * attempt
            print(f"  Rate limited — waiting {wait}s (attempt {attempt})", flush=True)
            time.sleep(wait)
            return fetch_display_names(handles, bearer, attempt + 1)
        result = {}

    # If batch returned nothing for >5 valid handles, fall back one-by-one to
    # surface any handle that causes a silent 400
    if len(result) == 0 and len(valid) > 5:
        print(f"  Batch returned 0 for {len(valid)} handles — falling back to individual lookups", flush=True)
        result = {}
        for h in valid:
            single = _call_api([h], bearer)
            result.update(single)
            time.sleep(0.3)

    return result


def main():
    dry_run = "--dry-run" in sys.argv

    print("Twitter Display Name Enrichment", flush=True)
    print("=" * 40, flush=True)
    if dry_run:
        print("DRY RUN — no writes", flush=True)

    bearer = get_bearer()
    identity = load_identity()

    # Collect wallets that have twitter but no display name yet
    targets = {
        wallet: rec
        for wallet, rec in identity.items()
        if rec.get("twitter") and not rec.get("twitter_display_name")
    }
    print(f"Wallets to enrich: {len(targets)}", flush=True)

    # Build handle → [wallets] mapping (multiple wallets can share a handle)
    handle_to_wallets: dict[str, list[str]] = {}
    for wallet, rec in targets.items():
        h = rec["twitter"].lstrip("@").lower()
        handle_to_wallets.setdefault(h, []).append(wallet)

    unique_handles = sorted(handle_to_wallets.keys())
    print(f"Unique handles to look up: {len(unique_handles)}", flush=True)
    print(f"Batches of {BATCH_SIZE}: {len(unique_handles) // BATCH_SIZE + 1}", flush=True)

    updated = 0
    not_found = 0
    dirty: dict[str, dict] = {}  # wallet → rec, accumulated for checkpoint

    for batch_num, i in enumerate(range(0, len(unique_handles), BATCH_SIZE), 1):
        batch = unique_handles[i:i + BATCH_SIZE]
        print(f"\nBatch {batch_num}: {len(batch)} handles", flush=True)

        if not dry_run:
            display_names = fetch_display_names(batch, bearer)
            time.sleep(2)  # gentle pacing
        else:
            display_names = {h: f"[DRY:{h}]" for h in batch[:3]}  # fake first 3

        for handle in batch:
            wallets = handle_to_wallets[handle]
            dname = display_names.get(handle)
            if dname:
                for w in wallets:
                    identity[w]["twitter_display_name"] = dname
                    dirty[w] = identity[w]
                    updated += 1
                print(f"  @{handle} → {dname!r}  ({len(wallets)} wallet(s))", flush=True)
            else:
                not_found += 1

        # Checkpoint every N batches
        if not dry_run and dirty and batch_num % CHECKPOINT_EVERY == 0:
            save_identity(dirty)
            dirty.clear()
            print(f"  [checkpoint saved]", flush=True)

    # Final save
    if not dry_run and dirty:
        save_identity(dirty)
        print("\n[final save]", flush=True)

    print(f"\n✓ Done", flush=True)
    print(f"  Display names fetched: {updated}", flush=True)
    print(f"  Handles not found:     {not_found}", flush=True)


if __name__ == "__main__":
    main()
