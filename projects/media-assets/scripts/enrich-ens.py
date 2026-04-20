#!/usr/bin/env python3
"""
enrich-ens.py — Add ENS names to holders.jsonl
Resolves ENS reverse records via Alchemy RPC + Multicall3 batching.

Usage:
    python3 scripts/enrich-ens.py

Requires ALCHEMY_API_KEY in ~/.openclaw/.env
"""

from __future__ import annotations
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from web3 import Web3

# ── Config ────────────────────────────────────────────────────────────────────

PROJECT_ROOT  = Path(__file__).parent.parent
HOLDERS_FILE  = PROJECT_ROOT / "database" / "holders.jsonl"
CACHE_DIR     = PROJECT_ROOT / "database" / ".holders-cache"
ENS_CACHE     = CACHE_DIR / "ens-checked.json"   # wallets already queried (set)

# ENS Registry on ETH mainnet
ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
# Multicall3 — available on ETH mainnet
MULTICALL3   = "0xcA11bde05977b3631167028862bE2a173976CA11"

# ABI fragments we need
ENS_REGISTRY_ABI = [{
    "name": "resolver",
    "type": "function",
    "inputs": [{"name": "node", "type": "bytes32"}],
    "outputs": [{"name": "", "type": "address"}],
}]

RESOLVER_ABI = [{
    "name": "name",
    "type": "function",
    "inputs": [{"name": "node", "type": "bytes32"}],
    "outputs": [{"name": "", "type": "string"}],
}]

MULTICALL3_ABI = [{
    "name": "aggregate3",
    "type": "function",
    "inputs": [{
        "components": [
            {"name": "target",       "type": "address"},
            {"name": "allowFailure", "type": "bool"},
            {"name": "callData",     "type": "bytes"},
        ],
        "name": "calls",
        "type": "tuple[]",
    }],
    "outputs": [{
        "components": [
            {"name": "success",    "type": "bool"},
            {"name": "returnData", "type": "bytes"},
        ],
        "name": "returnData",
        "type": "tuple[]",
    }],
}]

# ── Env ───────────────────────────────────────────────────────────────────────

def load_env():
    env_path = Path.home() / ".openclaw" / ".env"
    env = {}
    if not env_path.exists():
        return env
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env

ENV = load_env()
ALCHEMY_KEY = ENV.get("ALCHEMY_API_KEY", "")

# ── ENS namehash ──────────────────────────────────────────────────────────────

def namehash(name: str) -> bytes:
    """EIP-137 namehash."""
    node = b"\x00" * 32
    if name == "":
        return node
    for label in reversed(name.split(".")):
        label_hash = Web3.keccak(text=label)
        node = Web3.keccak(node + label_hash)
    return node

def reverse_node(addr: str) -> bytes:
    """Compute the ENS reverse node for a wallet address."""
    # <lowercase_addr_without_0x>.addr.reverse
    label = addr[2:].lower()
    return namehash(f"{label}.addr.reverse")

# ── Multicall3 batching ───────────────────────────────────────────────────────

def multicall_batch(w3, calls: list, batch_size=200) -> list:
    """
    Execute calls via Multicall3. Each call is (target_addr, calldata_hex).
    Returns list of (success: bool, return_data: bytes) matching input order.
    """
    mc = w3.eth.contract(
        address=Web3.to_checksum_address(MULTICALL3),
        abi=MULTICALL3_ABI,
    )
    results = []
    for i in range(0, len(calls), batch_size):
        batch = calls[i:i + batch_size]
        mc_calls = [
            (Web3.to_checksum_address(target), True, calldata)
            for target, calldata in batch
        ]
        try:
            raw = mc.functions.aggregate3(mc_calls).call()
            results.extend(raw)
        except Exception as e:
            print(f"  Multicall batch error: {e}")
            # fallback: mark all as failed
            results.extend([(False, b"")] * len(batch))
        time.sleep(0.05)
    return results

# ── ENS resolution ────────────────────────────────────────────────────────────

def resolve_ens_names(wallets: list, w3) -> dict:
    """
    Batch-resolve ENS reverse records for all wallets.
    Returns {wallet_lower: ens_name or None}
    """
    registry = w3.eth.contract(
        address=Web3.to_checksum_address(ENS_REGISTRY),
        abi=ENS_REGISTRY_ABI,
    )

    # Step 1: compute reverse nodes and batch-call registry.resolver(node)
    nodes = {w.lower(): reverse_node(w) for w in wallets}
    resolver_calls = [
        (ENS_REGISTRY, registry.encode_abi("resolver", args=[nodes[w.lower()]]))
        for w in wallets
    ]

    print(f"  Step 1/2: resolving ENS resolver contracts ({len(wallets)} wallets)...")
    resolver_results = multicall_batch(w3, resolver_calls)

    # Decode resolver addresses
    wallet_resolver = {}
    zero = "0x" + "0" * 40
    for i, wallet in enumerate(wallets):
        success, data = resolver_results[i]
        if success and data and len(data) >= 32:
            addr = "0x" + data[-20:].hex()
            if addr.lower() != zero:
                wallet_resolver[wallet.lower()] = addr

    print(f"  {len(wallet_resolver)} wallets have an ENS resolver")

    if not wallet_resolver:
        return {w.lower(): None for w in wallets}

    # Step 2: for wallets with resolvers, batch-call resolver.name(node)
    # We need a generic ABI encode since resolvers may differ
    # Use a dummy contract just for ABI encoding
    dummy_resolver = w3.eth.contract(abi=RESOLVER_ABI)
    name_calls = []
    resolver_wallet_order = []

    for wallet, resolver_addr in wallet_resolver.items():
        node = nodes[wallet]
        calldata = dummy_resolver.encode_abi("name", args=[node])
        name_calls.append((resolver_addr, calldata))
        resolver_wallet_order.append(wallet)

    print(f"  Step 2/2: fetching ENS names ({len(name_calls)} calls)...")
    name_results = multicall_batch(w3, name_calls)

    # Decode names
    ens_map = {w.lower(): None for w in wallets}
    for i, wallet in enumerate(resolver_wallet_order):
        success, data = name_results[i]
        if success and data:
            try:
                # ABI-decode string: skip 32-byte offset + 32-byte length, then UTF-8
                decoded = w3.codec.decode(["string"], data)
                name = decoded[0]
                if name:
                    ens_map[wallet] = name
            except Exception:
                pass

    return ens_map

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    if not HOLDERS_FILE.exists():
        print(f"holders.jsonl not found. Run sync-holders.py first.")
        return

    if not ALCHEMY_KEY:
        print("No ALCHEMY_API_KEY in ~/.openclaw/.env — cannot resolve ENS.")
        return

    print("ENS Enrichment Pass")
    print("=" * 40)

    records = []
    with open(HOLDERS_FILE) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))

    print(f"Loaded {len(records)} wallet records")

    # Load the "already checked" cache (wallets queried on previous runs, even if null result)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    checked_cache: set[str] = set()
    if ENS_CACHE.exists():
        with open(ENS_CACHE) as f:
            checked_cache = set(json.load(f))

    # Only query wallets that: (a) don't already have a name AND (b) haven't been checked before
    already_named = [r for r in records if r.get("ens")]
    to_resolve    = [r["wallet"] for r in records
                     if not r.get("ens") and r["wallet"].lower() not in checked_cache]

    print(f"  {len(already_named)} already have ENS names")
    print(f"  {len(checked_cache)} checked before (no result)")
    print(f"  {len(to_resolve)} new wallets to query")

    if not to_resolve:
        print("All wallets already resolved or checked.")
        return

    url = f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_KEY}"
    w3 = Web3(Web3.HTTPProvider(url))

    ens_map = resolve_ens_names(to_resolve, w3)

    resolved = sum(1 for v in ens_map.values() if v)
    print(f"  Resolved {resolved}/{len(to_resolve)} wallets to ENS names")

    # Update holders.jsonl with any found names
    for rec in records:
        wallet = rec["wallet"].lower()
        if wallet in ens_map and ens_map[wallet]:
            rec["ens"] = ens_map[wallet]
        rec["updated_at"] = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(HOLDERS_FILE, "w") as f:
        for rec in records:
            f.write(json.dumps(rec) + "\n")

    # Save all newly checked wallets into the cache (so we don't re-query nulls)
    checked_cache.update(w.lower() for w in to_resolve)
    with open(ENS_CACHE, "w") as f:
        json.dump(list(checked_cache), f)

    print(f"\n✓ Updated {HOLDERS_FILE}")
    print(f"✓ ENS cache now has {len(checked_cache)} checked wallets")
    print(f"  {resolved} wallets now have ENS names")
    if resolved > 0:
        examples = [(w, n) for w, n in ens_map.items() if n][:5]
        print("  Examples:")
        for w, n in examples:
            print(f"    {w[:10]}… → {n}")
    print("\nNext step: python3 scripts/import-spreadsheet.py <your-export.csv>")

if __name__ == "__main__":
    main()
