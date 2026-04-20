#!/usr/bin/env python3
"""
compute-holding-since.py

Compute `holding_since` for each holder: the date they last went from
0 tokens to >0 tokens — i.e., the start of their current continuous
holding streak.

At the cluster level (wallets sharing the same Twitter/Discord/Farcaster
identity), intra-cluster transfers are excluded so moving tokens from one
personal wallet to another doesn't reset the streak.

Writes `holding_since` to database/holders.jsonl.

Usage:
    python3 scripts/compute-holding-since.py [--dry-run]
"""

from __future__ import annotations
import json
import sys
import time
import requests
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

PROJECT_ROOT  = Path(__file__).parent.parent
CACHE_DIR     = PROJECT_ROOT / "database" / ".holders-cache"
HOLDERS_FILE  = PROJECT_ROOT / "database" / "holders.jsonl"
IDENTITY_FILE = Path.home() / ".openclaw" / "holders-identity.jsonl"
APE_TS_CACHE  = CACHE_DIR / "ape-block-timestamps.json"

APE_RPC   = "https://rpc.apechain.com"
ZERO      = "0x0000000000000000000000000000000000000000"
ETH_BRIDGE = "0x57e56ce08ae6f0aea6668fd898c52011fe853dc2"
APE_BRIDGE = "0x75f7dbe5e4ee8e424a759f71ad725f8cdd0ff2d1"
SKIP_WALLETS = {ZERO, ETH_BRIDGE, APE_BRIDGE}

TRUSTED_TWITTER_SOURCES = {None, "opensea", "farcaster_hub"}

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_events(path: Path) -> list:
    with open(path) as f:
        data = json.load(f)
    events = data.get("events", data) if isinstance(data, dict) else data
    return events


def fetch_ape_timestamps(events: list) -> dict:
    """
    Fetch block timestamps for APE events that have null timestamps.
    Caches to APE_TS_CACHE to avoid re-fetching.
    Returns {block_num: iso_timestamp_string}.
    """
    # Load existing cache
    cached = {}
    if APE_TS_CACHE.exists():
        with open(APE_TS_CACHE) as f:
            cached = json.load(f)
        # Keys might be strings from JSON — convert to int
        cached = {int(k): v for k, v in cached.items()}

    # Find blocks we still need
    needed = sorted({e["block_num"] for e in events if not e.get("timestamp")
                     and e["block_num"] not in cached})

    if not needed:
        print(f"  APE timestamps: all {len(cached)} already cached")
        return cached

    print(f"  APE timestamps: {len(cached)} cached, fetching {len(needed)} new blocks...")

    BATCH = 100
    for i in range(0, len(needed), BATCH):
        batch = needed[i:i + BATCH]
        payload = [
            {"jsonrpc": "2.0", "id": bn, "method": "eth_getBlockByNumber",
             "params": [hex(bn), False]}
            for bn in batch
        ]
        try:
            r = requests.post(APE_RPC, json=payload, timeout=30)
            r.raise_for_status()
            for item in r.json():
                bn = item.get("id")
                result = item.get("result")
                if bn and result and result.get("timestamp"):
                    ts_int = int(result["timestamp"], 16)
                    cached[bn] = datetime.fromtimestamp(ts_int, tz=timezone.utc).strftime(
                        "%Y-%m-%dT%H:%M:%SZ"
                    )
        except Exception as e:
            print(f"  Warning: batch {i//BATCH + 1} failed: {e}")

        if (i // BATCH) % 10 == 0 and i > 0:
            print(f"    {i}/{len(needed)} blocks fetched")
        time.sleep(0.05)

    # Save updated cache
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(APE_TS_CACHE, "w") as f:
        json.dump({str(k): v for k, v in cached.items()}, f)

    print(f"  APE timestamps: {len(cached)} total cached")
    return cached


def load_identity() -> dict:
    identity = {}
    if not IDENTITY_FILE.exists():
        return identity
    with open(IDENTITY_FILE) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    r = json.loads(line)
                    if r.get("wallet"):
                        identity[r["wallet"].lower()] = r
                except json.JSONDecodeError:
                    pass
    return identity


def build_clusters(holders: list, identity: dict) -> dict:
    """
    Returns {wallet_lower: cluster_id} groupings.
    Mirrors the logic in src/routes/holders.js.
    """
    groups: dict[str, list[str]] = {}

    for h in holders:
        wl = h["wallet"].lower()
        rec = identity.get(wl, {})
        sources = rec.get("_sources", {})

        twitter = rec.get("twitter")
        if twitter and sources.get("twitter") in TRUSTED_TWITTER_SOURCES:
            key = f"tw:{twitter.lower()}"
            groups.setdefault(key, []).append(wl)

        discord = rec.get("discord")
        if discord:
            key = f"dc:{discord.lower()}"
            groups.setdefault(key, []).append(wl)

        farcaster = rec.get("farcaster_username")
        if farcaster:
            key = f"fc:{farcaster.lower()}"
            groups.setdefault(key, []).append(wl)

    cluster_id_map: dict[str, int] = {}  # wallet_lower -> cluster_id
    cid = 0
    for key, wallets in groups.items():
        if len(wallets) < 2:
            continue
        cid += 1
        # Wallets may already be in a cluster from another signal — keep first assignment
        for w in wallets:
            if w not in cluster_id_map:
                cluster_id_map[w] = cid

    return cluster_id_map  # wallet_lower -> cluster_id


def compute_holding_since(
    wallet_events: dict[str, list[dict]],  # wallet_lower -> sorted events [{acquired, timestamp}]
    cluster_wallets: set[str],             # all wallets in this cluster (may be empty for solo)
) -> str | None:
    """
    Given all events for a set of wallets (with intra-cluster events already
    excluded), compute the timestamp of the last 0→>0 transition.

    wallet_events:  {wallet: [(timestamp_iso, delta)]} where delta is +1 (acquired) or -1 (released)
    Returns ISO timestamp string or None if never acquired.
    """
    # Flatten all events into [(timestamp, delta)]
    all_events: list[tuple[str, int]] = []
    for events in wallet_events.values():
        all_events.extend(events)

    if not all_events:
        return None

    # Sort by timestamp
    all_events.sort(key=lambda x: x[0])

    balance = 0
    holding_since = None

    for ts, delta in all_events:
        if delta == 0:
            continue
        old = balance
        balance += delta
        balance = max(0, balance)  # shouldn't go negative, but be safe
        if old == 0 and balance > 0:
            holding_since = ts  # reset streak each time we come back from 0

    return holding_since


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv
    print("Compute Holding Since")
    print("=" * 40)
    if dry_run:
        print("DRY RUN — no changes will be written")

    # Load transfer events
    print("\n[1/5] Loading transfer events...")
    eth_events = load_events(CACHE_DIR / "eth-events.json")
    ape_events = load_events(CACHE_DIR / "ape-events.json")
    print(f"  ETH: {len(eth_events)} events")
    print(f"  APE: {len(ape_events)} events")

    # Fetch APE timestamps
    print("\n[2/5] Resolving APE block timestamps...")
    ape_ts = fetch_ape_timestamps(ape_events)

    # Enrich APE events with timestamps
    null_count = 0
    for e in ape_events:
        if not e.get("timestamp"):
            ts = ape_ts.get(e["block_num"])
            if ts:
                e["timestamp"] = ts
            else:
                null_count += 1

    if null_count:
        print(f"  Warning: {null_count} APE events still have no timestamp — will skip")

    all_events = [e for e in (eth_events + ape_events) if e.get("timestamp")]
    all_events.sort(key=lambda e: (e["timestamp"], e["block_num"]))
    print(f"  Total events with timestamps: {len(all_events)}")

    # Load holders and identity
    print("\n[3/5] Loading holders and identity data...")
    with open(HOLDERS_FILE) as f:
        holders = [json.loads(l) for l in f if l.strip()]
    print(f"  Holders: {len(holders)}")

    identity = load_identity()
    print(f"  Identity records: {len(identity)}")

    # Build clusters
    cluster_map = build_clusters(holders, identity)  # wallet_lower -> cluster_id
    # Invert: cluster_id -> set of wallet_lower
    cluster_members: dict[int, set[str]] = defaultdict(set)
    for w, cid in cluster_map.items():
        cluster_members[cid].add(w)
    print(f"  Clusters: {len(cluster_members)} (covering {len(cluster_map)} wallets)")

    # Build per-wallet timeline: wallet_lower -> [(ts, +1/-1)]
    print("\n[4/5] Building wallet timelines...")
    wallet_timeline: dict[str, list[tuple[str, int]]] = defaultdict(list)

    for e in all_events:
        frm = e["from"].lower()
        to  = e["to"].lower()
        ts  = e["timestamp"]

        if frm not in SKIP_WALLETS:
            wallet_timeline[frm].append((ts, -1))  # released
        if to not in SKIP_WALLETS:
            wallet_timeline[to].append((ts, +1))   # acquired

    # Sort each wallet's timeline
    for events in wallet_timeline.values():
        events.sort(key=lambda x: x[0])

    # Compute holding_since per wallet and per cluster
    print("\n[5/5] Computing holding_since...")

    holding_since_by_wallet: dict[str, str | None] = {}

    # Solo wallets (not in any cluster)
    solo_wallets = {h["wallet"].lower() for h in holders if h["wallet"].lower() not in cluster_map}
    for wl in solo_wallets:
        events = wallet_timeline.get(wl, [])
        result = compute_holding_since({wl: events}, set())
        holding_since_by_wallet[wl] = result

    # Clustered wallets — compute cluster-level holding_since
    cluster_holding_since: dict[int, str | None] = {}
    for cid, members in cluster_members.items():
        # Exclude intra-cluster transfers: events where BOTH from AND to are cluster members
        cluster_events: dict[str, list[tuple[str, int]]] = {}

        for wl in members:
            filtered: list[tuple[str, int]] = []
            raw = wallet_timeline.get(wl, [])
            # We can't easily check the other party here since timeline is already split
            # Instead, we rebuild from all_events for cluster members
            cluster_events[wl] = []  # will fill below

        # Rebuild from raw events, excluding intra-cluster transfers
        intra_events_set: set[str] = set()  # tx_hash of intra-cluster events
        for e in all_events:
            frm = e["from"].lower()
            to  = e["to"].lower()
            if frm in members and to in members:
                intra_events_set.add(e["tx_hash"])

        # Now build filtered timelines for cluster members
        for e in all_events:
            if e["tx_hash"] in intra_events_set:
                continue
            frm = e["from"].lower()
            to  = e["to"].lower()
            ts  = e["timestamp"]

            if frm in members and frm not in SKIP_WALLETS:
                cluster_events[frm].append((ts, -1))
            if to in members and to not in SKIP_WALLETS:
                cluster_events[to].append((ts, +1))

        # Sort each
        for wl in cluster_events:
            cluster_events[wl].sort(key=lambda x: x[0])

        hs = compute_holding_since(cluster_events, members)
        cluster_holding_since[cid] = hs

        # Assign to all cluster members
        for wl in members:
            holding_since_by_wallet[wl] = hs

    # Stats
    computed = sum(1 for v in holding_since_by_wallet.values() if v)
    not_holding = sum(1 for h in holders if not h["still_holding"])
    print(f"  holding_since computed: {computed}/{len(holders)}")
    print(f"  (not_holding wallets: {not_holding})")

    # Sample output
    for wl, hs in list(holding_since_by_wallet.items())[:5]:
        print(f"  {wl[:10]}… → {hs}")

    if dry_run:
        print("\n(Dry run — no changes written)")
        return

    # Update holders.jsonl
    updated_count = 0
    tmp = HOLDERS_FILE.with_suffix(".tmp")
    with open(tmp, "w") as f:
        for h in holders:
            wl = h["wallet"].lower()
            new_hs = holding_since_by_wallet.get(wl)
            if h.get("holding_since") != new_hs:
                h["holding_since"] = new_hs
                updated_count += 1
            f.write(json.dumps(h) + "\n")
    tmp.replace(HOLDERS_FILE)

    print(f"\n✓ Done — updated {updated_count} records")
    print(f"  Wrote → {HOLDERS_FILE}")


if __name__ == "__main__":
    main()
