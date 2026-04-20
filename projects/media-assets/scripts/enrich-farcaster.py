#!/usr/bin/env python3
"""
enrich-farcaster.py — Fetch Farcaster profiles for all holders.

Uses hub.pinata.cloud (public Farcaster Hub HTTP API — no API key needed).
Runs 8 concurrent workers. Saves progress every 100 wallets.
Safe to kill and re-run — resumes from checkpoint.

Usage:
    python3 scripts/enrich-farcaster.py

Limitation: only finds wallets used as the FC *custody* address at registration.
Verified-address links require a Neynar key:
  security add-generic-password -s 'neynar-api-key' -a "$USER" -w 'YOUR_KEY'
"""

import json
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import requests

# ── Config ─────────────────────────────────────────────────────────────────────

PROJECT_ROOT   = Path(__file__).parent.parent
HOLDERS_FILE   = PROJECT_ROOT / "database" / "holders.jsonl"
IDENTITY_FILE  = Path.home() / ".openclaw" / "holders-identity.jsonl"

HUB_BASE       = "https://hub.pinata.cloud"
WORKERS        = 8
BATCH_PROGRESS = 100   # checkpoint every N completed wallets

# ── File helpers ───────────────────────────────────────────────────────────────

def load_holders() -> list[dict]:
    if not HOLDERS_FILE.exists():
        print(f"ERROR: {HOLDERS_FILE} not found.", flush=True)
        sys.exit(1)
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

# ── Farcaster lookup ───────────────────────────────────────────────────────────

def get_fid(wallet: str) -> int | None:
    url = f"{HUB_BASE}/v1/onChainIdRegistryEventByAddress"
    try:
        r = requests.get(url, params={"address": wallet.lower()}, timeout=20)
        if r.status_code == 400:
            return None
        if r.status_code == 429:
            time.sleep(15)
            return get_fid(wallet)
        if not r.ok:
            return None
        fid = r.json().get("fid")
        return int(fid) if fid else None
    except requests.RequestException:
        return None


def get_user_data(fid: int) -> dict:
    url = f"{HUB_BASE}/v1/userDataByFid"
    try:
        r = requests.get(url, params={"fid": fid}, timeout=20)
        if not r.ok:
            return {}
        result = {}
        TYPE_MAP = {
            "USER_DATA_TYPE_USERNAME": "username",
            "USER_DATA_TYPE_DISPLAY":  "display_name",
            "USER_DATA_TYPE_BIO":      "bio",
        }
        for msg in r.json().get("messages", []):
            body = msg.get("data", {}).get("userDataBody", {})
            key  = TYPE_MAP.get(body.get("type"))
            if key and body.get("value"):
                result[key] = body["value"]
        return result
    except requests.RequestException:
        return {}


def fetch_farcaster_profile(wallet: str) -> dict | None:
    """Returns profile dict, {} (no account), or None (give up after retries)."""
    for attempt in range(3):
        try:
            fid = get_fid(wallet)
            if fid is None:
                return {}
            user_data = get_user_data(fid)
            result = {"farcaster_fid": fid}
            if user_data.get("username"):
                result["farcaster_username"] = user_data["username"]
                result["farcaster_url"]      = f"https://warpcast.com/{user_data['username']}"
            if user_data.get("display_name"):
                result["farcaster_display_name"] = user_data["display_name"]
            if user_data.get("bio"):
                result["farcaster_bio"] = user_data["bio"]
            return result
        except Exception as e:
            if attempt < 2:
                time.sleep(5 * (attempt + 1))
            else:
                return None
    return None

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("Farcaster Holder Enrichment", flush=True)
    print(f"Hub: {HUB_BASE}  Workers: {WORKERS}", flush=True)
    print("=" * 45, flush=True)

    holders  = load_holders()
    identity = load_identity()

    print(f"Loaded {len(holders)} holders, {len(identity)} existing identity records", flush=True)

    to_process = [
        h["wallet"] for h in holders
        if not identity.get(h["wallet"].lower(), {}).get("_farcaster_checked")
    ]

    print(f"  {len(holders) - len(to_process)} already checked, {len(to_process)} to process", flush=True)
    if not to_process:
        print("All wallets already checked.", flush=True)
        return

    new_accounts = 0
    errors       = 0
    checked      = 0
    lock         = threading.Lock()
    ts           = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Submit in chunks to avoid overwhelming the queue
    CHUNK = 200

    for chunk_start in range(0, len(to_process), CHUNK):
        chunk = to_process[chunk_start:chunk_start + CHUNK]

        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            futures = {pool.submit(fetch_farcaster_profile, w): w for w in chunk}

            for future in as_completed(futures):
                wallet  = futures[future]
                wl      = wallet.lower()

                try:
                    profile = future.result()
                except Exception as e:
                    profile = None
                    print(f"  ERROR {wallet[:12]}…: {e}", flush=True)

                with lock:
                    if wl not in identity:
                        identity[wl] = {"wallet": wallet}
                    rec = identity[wl]
                    rec["_farcaster_checked"] = True

                    if profile is None:
                        errors += 1
                    elif profile:
                        for field in ("farcaster_username", "farcaster_display_name",
                                      "farcaster_fid", "farcaster_url", "farcaster_bio"):
                            if profile.get(field) and not rec.get(field):
                                rec[field] = profile[field]
                                # Track source
                                rec.setdefault("_sources", {})[field] = "farcaster_hub"

                        if profile.get("farcaster_display_name") and not rec.get("name"):
                            rec["name"] = profile["farcaster_display_name"]
                            rec.setdefault("_sources", {})["name"] = "farcaster_hub"

                        if profile.get("farcaster_fid"):
                            new_accounts += 1
                            uname = profile.get("farcaster_username",
                                                f"fid:{profile['farcaster_fid']}")
                            print(f"  ✓ {wallet[:12]}… → @{uname}", flush=True)

                    rec["updated_at"] = ts
                    identity[wl] = rec
                    checked += 1

                    if checked % BATCH_PROGRESS == 0:
                        total_done = chunk_start + checked
                        pct = total_done / len(to_process) * 100
                        print(f"  [{total_done}/{len(to_process)}] {pct:.0f}% — "
                              f"{new_accounts} FC accounts found", flush=True)
                        save_identity(identity)

        # Save at end of each chunk
        with lock:
            save_identity(identity)

    save_identity(identity)

    print(f"\n✓ Done", flush=True)
    print(f"  Checked:                {checked}", flush=True)
    print(f"  Errors:                 {errors}", flush=True)
    print(f"  New Farcaster accounts: {new_accounts}", flush=True)
    print(f"\nSaved → {IDENTITY_FILE}", flush=True)


if __name__ == "__main__":
    main()
