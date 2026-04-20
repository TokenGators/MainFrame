#!/usr/bin/env python3
"""
sync-holders.py — TokenGators Holder Registry
Pulls Transfer events from ETH and ApeChain, reconstructs holder state,
writes database/holders.jsonl.

Usage:
    python3 scripts/sync-holders.py           # full sync
    python3 scripts/sync-holders.py --resume  # skip already-fetched events

Requires ALCHEMY_API_KEY in ~/.openclaw/.env
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict

import requests

# ── Config ────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).parent.parent
DB_DIR = PROJECT_ROOT / "database"
CACHE_DIR = DB_DIR / ".holders-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

HOLDERS_FILE = DB_DIR / "holders.jsonl"

ETH_CONTRACT  = "0x4fb7363cF6d0a546CC0ed8cc0a6c99069170a623"
APE_CONTRACT  = "0xd33edeC311f8769c71f132A77F0c0796c22AF1c5"
ETH_BRIDGE    = "0x57E56CE08Ae6f0aea6668FD898C52011FE853Dc2"
APE_BRIDGE    = "0x75f7dBE5e4EE8E424A759F71AD725f8cdD0ff2d1"
ZERO_ADDRESS  = "0x0000000000000000000000000000000000000000"

APE_RPC       = "https://rpc.apechain.com"
APE_CHUNK     = 10_000    # blocks per eth_getLogs request
APE_START     = 4_318_900 # first Transfer event is at block 4,318,921

TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

# ── Env ───────────────────────────────────────────────────────────────────────

def load_env():
    env_path = Path.home() / ".openclaw" / ".env"
    if not env_path.exists():
        return {}
    env = {}
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env

ENV = load_env()
ALCHEMY_KEY = ENV.get("ALCHEMY_API_KEY", "")

# ── Helpers ───────────────────────────────────────────────────────────────────

def checksum(addr: str) -> str:
    """Return EIP-55 checksummed address."""
    from web3 import Web3
    return Web3.to_checksum_address(addr)

def topic_to_address(topic: str) -> str:
    """Convert a 32-byte topic to a checksummed address."""
    return checksum("0x" + topic[-40:])

def hex_to_int(h: str) -> int:
    return int(h, 16)

def ts_to_iso(ts: int) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def rpc_post(url: str, payload: dict, retries=5) -> dict:
    for attempt in range(retries):
        try:
            r = requests.post(url, json=payload, timeout=30)
            r.raise_for_status()
            data = r.json()
            if "error" in data:
                raise RuntimeError(f"RPC error: {data['error']}")
            return data
        except Exception as e:
            if attempt == retries - 1:
                raise
            wait = 2 ** attempt
            print(f"    retrying in {wait}s ({e})")
            time.sleep(wait)

# ── ETH fetch via Alchemy ─────────────────────────────────────────────────────

def fetch_eth_transfers(cache_file: Path, resume: bool) -> list:
    """Fetch all ERC-721 Transfer events from the ETH contract via Alchemy."""
    if not ALCHEMY_KEY:
        print("⚠️  No ALCHEMY_API_KEY found in ~/.openclaw/.env — skipping ETH chain.")
        print("   Add your key to sync ETH holders.")
        return []

    url = f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_KEY}"

    # load cached events
    events = []
    page_key = None
    from_block = "0x0"

    if resume and cache_file.exists():
        with open(cache_file) as f:
            cached = json.load(f)
        events = cached.get("events", [])
        page_key = cached.get("next_page_key")

        if page_key:
            # Mid-pagination resume — continue from cursor
            print(f"  Resuming ETH mid-page (have {len(events)} events cached)")
        else:
            # Prior fetch fully completed — start from last known block
            last_block = cached.get("last_block")
            if last_block:
                from_block = hex(last_block)
                # De-dup existing events at that boundary (some may overlap)
                existing_keys = {(e["tx_hash"], e["token_id"]) for e in events}
                print(f"  Resuming ETH from block {last_block:,} (have {len(events)} events cached)")
            else:
                # Legacy cache without last_block — fall back to full re-fetch
                print(f"  No last_block in ETH cache — full re-fetch")
                events = []
                cache_file.unlink(missing_ok=True)
    else:
        cache_file.unlink(missing_ok=True)
        existing_keys = set()

    # Track existing keys for dedup on incremental fetch
    if not resume or (resume and not page_key):
        existing_keys = {(e["tx_hash"], e["token_id"]) for e in events}

    new_events = 0
    page = 0
    while True:
        params = {
            "fromBlock": from_block,
            "toBlock": "latest",
            "contractAddresses": [ETH_CONTRACT],
            "category": ["erc721"],
            "withMetadata": True,
            "excludeZeroValue": False,
            "maxCount": "0x3e8",
            "order": "asc",
        }
        if page_key:
            params["pageKey"] = page_key

        resp = rpc_post(url, {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "alchemy_getAssetTransfers",
            "params": [params],
        })

        transfers = resp["result"].get("transfers", [])
        page_key = resp["result"].get("pageKey")

        # normalise to our internal format, deduplicate
        for t in transfers:
            token_id = int(t["tokenId"], 16) if t.get("tokenId") else None
            key = (t["hash"], token_id)
            if key in existing_keys:
                continue
            existing_keys.add(key)
            events.append({
                "chain":     "eth",
                "tx_hash":   t["hash"],
                "block_num": hex_to_int(t["blockNum"]),
                "timestamp": t["metadata"]["blockTimestamp"],  # ISO string
                "from":      (t["from"] or ZERO_ADDRESS).lower(),
                "to":        (t["to"]   or ZERO_ADDRESS).lower(),
                "token_id":  token_id,
            })
            new_events += 1

        page += 1
        print(f"  ETH page {page}: +{len(transfers)} raw ({new_events} new, {len(events)} total)")

        # cache progress — store last_block so next --resume is truly incremental
        max_block = max((e["block_num"] for e in events), default=0)
        with open(cache_file, "w") as f:
            json.dump({"events": events, "next_page_key": page_key, "last_block": max_block}, f)

        if not page_key:
            break
        time.sleep(0.1)   # be gentle with the API

    print(f"  ETH done: {len(events)} transfer events ({new_events} new this run)")
    return events

# ── APE fetch via public RPC ──────────────────────────────────────────────────

def fetch_ape_transfers(cache_file: Path, resume: bool) -> list:
    """Fetch all ERC-721 Transfer events from the APE contract via eth_getLogs."""
    url = APE_RPC

    # get latest block
    resp = rpc_post(url, {"jsonrpc": "2.0", "id": 1, "method": "eth_blockNumber", "params": []})
    latest_block = hex_to_int(resp["result"])

    events = []
    start_block = APE_START

    if resume and cache_file.exists():
        with open(cache_file) as f:
            cached = json.load(f)
        events = cached.get("events", [])
        start_block = cached.get("next_block", APE_START)
        print(f"  Resuming ApeChain from block {start_block:,} (have {len(events)} events cached)")

    chunk = APE_CHUNK
    block = start_block
    chunk_count = 0

    while block <= latest_block:
        to_block = min(block + chunk - 1, latest_block)
        try:
            resp = rpc_post(url, {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "eth_getLogs",
                "params": [{
                    "address": APE_CONTRACT,
                    "topics": [TRANSFER_TOPIC],
                    "fromBlock": hex(block),
                    "toBlock":   hex(to_block),
                }],
            })
            logs = resp.get("result", [])
        except RuntimeError as e:
            if "block range" in str(e).lower() or "limit" in str(e).lower():
                chunk = chunk // 2
                print(f"  Reducing chunk to {chunk:,} blocks")
                continue
            raise

        for log in logs:
            if len(log["topics"]) < 3:
                continue
            events.append({
                "chain":     "ape",
                "tx_hash":   log["transactionHash"],
                "block_num": hex_to_int(log["blockNumber"]),
                "timestamp": None,   # fetched in bulk below
                "from":      topic_to_address(log["topics"][1]).lower(),
                "to":        topic_to_address(log["topics"][2]).lower(),
                "token_id":  hex_to_int(log["topics"][3]) if len(log["topics"]) > 3 else hex_to_int(log["data"]),
            })

        chunk_count += 1
        if chunk_count % 50 == 0:
            pct = (block / latest_block) * 100
            print(f"  ApeChain: block {block:,}/{latest_block:,} ({pct:.1f}%) — {len(events)} events")
            # save progress
            with open(cache_file, "w") as f:
                json.dump({"events": events, "next_block": block}, f)

        block = to_block + 1
        time.sleep(0.02)

    # final cache save
    with open(cache_file, "w") as f:
        json.dump({"events": events, "next_block": block}, f)

    # enrich timestamps for APE events via batch block queries
    print(f"  ApeChain done: {len(events)} events — fetching block timestamps...")
    events = enrich_ape_timestamps(events, url)

    return events

def enrich_ape_timestamps(events: list, url: str) -> list:
    """Batch-fetch block timestamps for APE events (grouped by unique block)."""
    blocks_needed = sorted({e["block_num"] for e in events if e["timestamp"] is None})
    block_ts = {}

    batch_size = 100
    for i in range(0, len(blocks_needed), batch_size):
        batch = blocks_needed[i:i + batch_size]
        payload = [
            {"jsonrpc": "2.0", "id": bn, "method": "eth_getBlockByNumber",
             "params": [hex(bn), False]}
            for bn in batch
        ]
        resp = requests.post(url, json=payload, timeout=30).json()
        for item in resp:
            bn = item["id"]
            if item.get("result"):
                block_ts[bn] = hex_to_int(item["result"]["timestamp"])

        if i % 1000 == 0 and i > 0:
            print(f"    timestamps: {i}/{len(blocks_needed)}")
        time.sleep(0.05)

    for e in events:
        if e["timestamp"] is None and e["block_num"] in block_ts:
            e["timestamp"] = ts_to_iso(block_ts[e["block_num"]])

    return events

# ── Build holder registry ──────────────────────────────────────────────────────

def build_registry(eth_events: list, ape_events: list) -> list:
    """
    From raw Transfer events, reconstruct per-wallet holder state.
    Bridge logic:
      - ETH token owned by ETH_BRIDGE → active on ApeChain
      - APE token owned by APE_BRIDGE → active on ETH
    """
    all_events = eth_events + ape_events
    # sort by chain then block
    all_events.sort(key=lambda e: (e["chain"], e["block_num"], e.get("tx_hash", "")))

    # Per-token state (keyed by token_id)
    token_eth_owner = {}   # token_id → current owner on ETH
    token_ape_owner = {}   # token_id → current owner on ApeChain
    token_history   = defaultdict(list)   # token_id → [{from, to, ts, chain}]

    for e in all_events:
        tid = e["token_id"]
        if tid is None:
            continue
        frm = e["from"].lower()
        to  = e["to"].lower()
        ts  = e["timestamp"]
        chain = e["chain"]

        token_history[tid].append({
            "chain":     chain,
            "from":      frm,
            "to":        to,
            "timestamp": ts,
            "block_num": e["block_num"],
            "tx_hash":   e["tx_hash"],
        })

        if chain == "eth":
            token_eth_owner[tid] = to
        else:
            token_ape_owner[tid] = to

    # Determine active holder per token
    def active_holder_and_chain(tid):
        eth_owner = token_eth_owner.get(tid, "").lower()
        ape_owner = token_ape_owner.get(tid, "").lower()
        if eth_owner == ETH_BRIDGE.lower():
            # locked on ETH → active on ApeChain
            return ape_owner, "ape"
        elif eth_owner:
            return eth_owner, "eth"
        elif ape_owner == APE_BRIDGE.lower():
            # locked on APE → active on ETH (shouldn't normally happen)
            return eth_owner, "eth"
        elif ape_owner:
            return ape_owner, "ape"
        return None, None

    # Per-wallet aggregation
    wallets = defaultdict(lambda: {
        "current_tokens":   [],
        "current_chain_by_token": {},
        "minted_tokens":    [],
        "ever_held_tokens": set(),
        "first_acquired":   None,
        "last_activity":    None,
        "total_sold":       0,
    })

    bridge_wallets = {ETH_BRIDGE.lower(), APE_BRIDGE.lower()}

    for tid, events in token_history.items():
        active_wallet, active_chain = active_holder_and_chain(tid)

        for ev in events:
            frm = ev["from"]
            to  = ev["to"]
            ts  = ev["timestamp"]

            # track mint
            if frm == ZERO_ADDRESS:
                # minter is `to`
                if to not in bridge_wallets:
                    wallets[to]["minted_tokens"].append(tid)

            # track ever_held (skip zero addr and bridge wallets)
            if to not in bridge_wallets and to != ZERO_ADDRESS:
                wallets[to]["ever_held_tokens"].add(tid)
                if ts:
                    prev = wallets[to]["first_acquired"]
                    wallets[to]["first_acquired"] = ts if not prev else min(prev, ts)
                    prev_la = wallets[to]["last_activity"]
                    wallets[to]["last_activity"] = ts if not prev_la else max(prev_la, ts)

            # track sells
            if frm not in bridge_wallets and frm != ZERO_ADDRESS:
                wallets[frm]["ever_held_tokens"].add(tid)
                # count as a sell if `from` no longer holds this token
                # (we'll recalculate after determining current holders)
                if ts:
                    prev_la = wallets[frm]["last_activity"]
                    wallets[frm]["last_activity"] = ts if not prev_la else max(prev_la, ts)

        # assign current token to active holder
        if active_wallet and active_wallet not in bridge_wallets and active_wallet != ZERO_ADDRESS:
            wallets[active_wallet]["current_tokens"].append(tid)
            wallets[active_wallet]["current_chain_by_token"][str(tid)] = active_chain

    # compute total_sold per wallet = ever_held - currently_held
    records = []
    for wallet, data in wallets.items():
        ever = data["ever_held_tokens"]
        current_set = set(data["current_tokens"])
        sold = len(ever - current_set)

        records.append({
            "wallet":                wallet,
            "ens":                   None,   # filled by enrich-ens.py
            "current_tokens":        sorted(data["current_tokens"]),
            "current_chain_by_token": data["current_chain_by_token"],
            "minted_tokens":         sorted(set(data["minted_tokens"])),
            "ever_held_tokens":      sorted(ever),
            "first_acquired":        data["first_acquired"],
            "last_activity":         data["last_activity"],
            "still_holding":         len(data["current_tokens"]) > 0,
            "total_ever_held":       len(ever),
            "total_sold":            sold,
            "updated_at":            datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })

    records.sort(key=lambda r: (-len(r["current_tokens"]), r["wallet"]))
    return records

# ── Write output ───────────────────────────────────────────────────────────────

def write_holders(records: list):
    with open(HOLDERS_FILE, "w") as f:
        for rec in records:
            f.write(json.dumps(rec) + "\n")
    print(f"\n✓ Wrote {len(records)} wallet records to {HOLDERS_FILE}")

def print_summary(records: list):
    current = [r for r in records if r["still_holding"]]
    minters = [r for r in records if r["minted_tokens"]]
    total_tokens = sum(len(r["current_tokens"]) for r in records)
    eth_active = sum(
        sum(1 for c in r["current_chain_by_token"].values() if c == "eth")
        for r in records
    )
    ape_active = sum(
        sum(1 for c in r["current_chain_by_token"].values() if c == "ape")
        for r in records
    )
    print("\n── Summary ───────────────────────────────────────────")
    print(f"  Total unique wallets ever:  {len(records):,}")
    print(f"  Current holders:            {len(current):,}")
    print(f"  Minters:                    {len(minters):,}")
    print(f"  Active tokens accounted:    {total_tokens:,}")
    print(f"    → on ETH:                 {eth_active:,}")
    print(f"    → on ApeChain:            {ape_active:,}")

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Sync TokenGators holder registry")
    parser.add_argument("--resume", action="store_true",
                        help="Resume from cached events instead of re-fetching")
    parser.add_argument("--eth-only", action="store_true")
    parser.add_argument("--ape-only", action="store_true")
    args = parser.parse_args()

    resume = args.resume

    print("TokenGators Holder Registry Sync")
    print("=" * 40)

    eth_events = []
    ape_events = []

    if not args.ape_only:
        print("\n[1/2] Fetching ETH transfers...")
        eth_events = fetch_eth_transfers(CACHE_DIR / "eth-events.json", resume)

    if not args.eth_only:
        print("\n[2/2] Fetching ApeChain transfers...")
        ape_events = fetch_ape_transfers(CACHE_DIR / "ape-events.json", resume)

    print("\n[3/3] Building holder registry...")
    records = build_registry(eth_events, ape_events)

    write_holders(records)
    print_summary(records)
    print("\nNext step: python3 scripts/enrich-ens.py")

if __name__ == "__main__":
    main()
