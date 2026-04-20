#!/usr/bin/env python3
"""
enrich-twitter-from-handles.py

For holders that have an OpenSea username or Farcaster handle but no Twitter/X
account yet, check if that same handle exists on X.

Strategy:
  - Collect all unique handles (opensea_username, farcaster_username) for wallets
    that have no twitter field yet.
  - Batch-lookup via Twitter API v2: GET /2/users/by?usernames={...}
  - If the handle exists on X, record it with source = "opensea_handle_match"
    or "farcaster_handle_match" so you can audit/verify.
  - Never overwrites an existing twitter field.

Requirements:
  X bearer token in macOS Keychain (service: "x-bearer-token")
  or ~/.openclaw/.env as X_BEARER_TOKEN

Usage:
    python3 scripts/enrich-twitter-from-handles.py [--dry-run]
"""

import json
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

TWITTER_API    = "https://api.twitter.com/2/users/by"
BATCH_SIZE     = 100   # Twitter API max per request
REQUEST_DELAY  = 1.1   # stay under 15 req/15min on free tier

# ── Keychain / env ─────────────────────────────────────────────────────────────

def get_bearer_token() -> str:
    try:
        r = subprocess.run(
            ["security", "find-generic-password", "-s", "x-bearer-token", "-w"],
            capture_output=True, text=True, check=True,
        )
        token = r.stdout.strip()
        if token:
            return token
    except subprocess.CalledProcessError:
        pass

    env_path = Path.home() / ".openclaw" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("X_BEARER_TOKEN="):
                return line.split("=", 1)[1].strip()
    return ""

# ── File helpers ───────────────────────────────────────────────────────────────

def load_holders() -> list[dict]:
    records = []
    with open(HOLDERS_FILE) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def load_identity() -> dict:
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
    on_disk.update(identity)
    tmp = IDENTITY_FILE.with_suffix(".tmp")
    with open(tmp, "w") as f:
        for rec in on_disk.values():
            f.write(json.dumps(rec) + "\n")
    tmp.replace(IDENTITY_FILE)

# ── Twitter batch lookup ───────────────────────────────────────────────────────

import re
VALID_HANDLE = re.compile(r'^[A-Za-z0-9_]{1,15}$')

def is_valid_handle(h: str) -> bool:
    return bool(VALID_HANDLE.match(h))


def _call_twitter(handles: list[str], bearer: str) -> dict[str, dict]:
    """Single API call, no retry. Returns {} on error."""
    params = {
        "usernames": ",".join(handles[:BATCH_SIZE]),
        "user.fields": "name,username",
    }
    headers = {"Authorization": f"Bearer {bearer}"}
    try:
        r = requests.get(TWITTER_API, params=params, headers=headers, timeout=15)
        if r.status_code == 429:
            raise Exception("rate_limited")
        if not r.ok:
            return {}
        data = r.json().get("data") or []
        return {u["username"].lower(): u for u in data}
    except Exception:
        return {}


def lookup_handles(handles: list[str], bearer: str) -> dict[str, dict]:
    """
    Batch-lookup up to 100 handles.
    Returns {username_lower: {id, name, username}} for handles that exist.
    Pre-filters invalid handles; falls back to one-at-a-time if batch returns empty.
    """
    if not handles:
        return {}

    valid   = [h for h in handles if is_valid_handle(h)]
    invalid = [h for h in handles if not is_valid_handle(h)]
    if invalid:
        print(f"  Skipping {len(invalid)} invalid handle(s): {', '.join(invalid[:5])}", flush=True)
    if not valid:
        return {}

    result = _call_twitter(valid, bearer)

    # Zero results for a real batch is suspicious — fall back one-at-a-time
    if len(result) == 0 and len(valid) > 5:
        print(f"  Batch returned 0 for {len(valid)} — falling back to individual lookups", flush=True)
        result = {}
        for h in valid:
            result.update(_call_twitter([h], bearer))
            time.sleep(0.3)

    return result

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv
    print("Twitter Handle Enrichment (from OpenSea / Farcaster handles)")
    if dry_run:
        print("DRY RUN — no changes will be written")
    print("=" * 55)

    bearer = get_bearer_token()
    if not bearer:
        print("ERROR: No X bearer token found.")
        print("  security add-generic-password -s 'x-bearer-token' -a \"$USER\" -w 'TOKEN'")
        sys.exit(1)

    holders  = load_holders()
    identity = load_identity()
    print(f"Loaded {len(holders)} holders, {len(identity)} identity records")

    # Build candidate list: wallet → (handle, source_label)
    # Only for wallets without a twitter field yet
    candidates: list[tuple[str, str, str]] = []  # (wallet, handle, source)
    seen_handles: set[str] = set()

    for h in holders:
        wl  = h["wallet"].lower()
        rec = identity.get(wl, {})

        if rec.get("twitter"):
            continue  # already have twitter, skip

        for field, source_label in [
            ("opensea_username",    "opensea_handle_match"),
            ("farcaster_username",  "farcaster_handle_match"),
        ]:
            handle = rec.get(field, "").strip().lstrip("@")
            if handle and handle.lower() not in seen_handles:
                candidates.append((h["wallet"], handle, source_label))
                seen_handles.add(handle.lower())

    print(f"  Wallets with OpenSea/Farcaster handle but no Twitter: {len(candidates)}")
    if not candidates:
        print("Nothing to check.")
        return

    # De-duplicate handles (a handle might match multiple wallets — unlikely but possible)
    handle_to_entries: dict[str, list[tuple[str, str]]] = {}
    for wallet, handle, source in candidates:
        handle_to_entries.setdefault(handle.lower(), []).append((wallet, source))

    unique_handles = list(handle_to_entries.keys())
    print(f"  Unique handles to check on X: {len(unique_handles)}")
    print()

    # Batch lookup
    matched     = 0
    not_found   = 0
    total_done  = 0

    ts = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    for i in range(0, len(unique_handles), BATCH_SIZE):
        batch = unique_handles[i:i + BATCH_SIZE]
        results = lookup_handles(batch, bearer)

        for handle_lower in batch:
            total_done += 1
            user_data  = results.get(handle_lower)
            entries    = handle_to_entries[handle_lower]

            if user_data:
                matched += 1
                confirmed_handle = user_data["username"]
                name             = user_data.get("name", "")
                print(f"  ✓ @{confirmed_handle} ({name}) exists on X")

                if not dry_run:
                    for wallet, source_label in entries:
                        wl = wallet.lower()
                        if wl not in identity:
                            identity[wl] = {"wallet": wallet}
                        rec = identity[wl]

                        if not rec.get("twitter"):
                            rec["twitter"] = confirmed_handle
                            rec.setdefault("_sources", {})["twitter"] = source_label
                            if name and not rec.get("name"):
                                rec["name"] = name
                                rec.setdefault("_sources", {})["name"] = source_label
                            rec["updated_at"] = ts
                            identity[wl] = rec
            else:
                not_found += 1

        pct = total_done / len(unique_handles) * 100
        if (i // BATCH_SIZE) % 5 == 0:
            print(f"  [{total_done}/{len(unique_handles)}] {pct:.0f}% — "
                  f"{matched} matched, {not_found} not on X")
            if not dry_run:
                save_identity(identity)

        time.sleep(REQUEST_DELAY)

    if not dry_run:
        save_identity(identity)

    print(f"\n✓ Done")
    print(f"  Handles checked:   {total_done}")
    print(f"  Matched on X:      {matched}")
    print(f"  Not found on X:    {not_found}")
    if dry_run:
        print("\n(Dry run — no changes written. Re-run without --dry-run to apply.)")
    else:
        print(f"\nSaved → {IDENTITY_FILE}")
        print()
        print("These matches are tagged with source 'opensea_handle_match' or")
        print("'farcaster_handle_match' in _sources — review any you're unsure about:")
        print("  python3 -c \"import json; [print(r['wallet'][:12], r.get('twitter'), r.get('_sources',{}).get('twitter')) for r in (json.loads(l) for l in open('/Users/operator/.openclaw/holders-identity.jsonl') if l.strip()) if r.get('_sources',{}).get('twitter') in ('opensea_handle_match','farcaster_handle_match')]\"")


if __name__ == "__main__":
    main()
