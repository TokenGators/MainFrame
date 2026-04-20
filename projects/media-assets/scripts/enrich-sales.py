#!/usr/bin/env python3
"""
enrich-sales.py

For every non-mint, non-bridge transfer in the events cache,
batch-fetch the transaction receipt + value to detect:
  - marketplace  ("OpenSea", "Blur", "LooksRare", "X2Y2", "transfer")
  - price_eth    (total ETH/WETH or APE/WAPE paid by the buyer)

ETH:  uses Alchemy RPC
APE:  uses public rpc.apechain.com

Caches to:
  database/.holders-cache/eth-tx-enrichment.json
  database/.holders-cache/ape-tx-enrichment.json

Re-running only fetches transactions not yet cached (incremental).

Usage:
    python3 scripts/enrich-sales.py [--dry-run]
"""

from __future__ import annotations
import json
import sys
import time
import requests
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

PROJECT_ROOT    = Path(__file__).parent.parent
CACHE_DIR       = PROJECT_ROOT / "database" / ".holders-cache"
ETH_CACHE       = CACHE_DIR / "eth-events.json"
APE_CACHE       = CACHE_DIR / "ape-events.json"
ETH_ENRICH      = CACHE_DIR / "eth-tx-enrichment.json"
APE_ENRICH      = CACHE_DIR / "ape-tx-enrichment.json"

ZERO        = "0x0000000000000000000000000000000000000000"
ETH_BRIDGE  = "0x57e56ce08ae6f0aea6668fd898c52011fe853dc2"
APE_BRIDGE  = "0x75f7dbe5e4ee8e424a759f71ad725f8cdd0ff2d1"

WETH  = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"  # ETH chain
WAPE  = "0x48b62137edfa95a428d35c09e44256a739f6b557"  # ApeChain

APE_RPC = "https://rpc.apechain.com"

# ERC-20 Transfer topic
TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

# Seaport OrderFulfilled — same topic on both chains
SEAPORT_ORDER_FULFILLED = "0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31"

# Known marketplace event topics → name
MARKETPLACE_TOPICS = {
    SEAPORT_ORDER_FULFILLED:                                                   "OpenSea",
    "0x7dc5c0699ac8dd5250cbe368a2fc3b4a2daadb120ad07f6cccea29f83482686e":     "Blur",
    "0x1d5e12b51dee5e4d34434576c3fb99714a85f57b0fd7d045b83af6b5fcb9197d":     "Blur",
    "0x9aaa45d6db2ef74ead0751ea9113263d1dec1b50cea05f0ca2002cb8063564a4":     "LooksRare",
    "0x3ee3de4684413690dee6fff1a0a4f92916a1b97d1c5a83cdf24671844306b2e3":     "LooksRare",
    "0x3cbb63f144840e5b1b0a38a7c19211d2e89de4d7c5faf8b2d3c1776c302d1d33":     "X2Y2",
}

# Known marketplace contracts → name (fallback if topic not matched)
MARKETPLACE_CONTRACTS = {
    "0x0000000000000068f116a894984e2db1123eb395": "OpenSea",   # Seaport 1.6 (ETH + APE)
    "0x00000000000000adc04c56bf30ac9d3c0aaf14dc": "OpenSea",   # Seaport 1.5
    "0x00000003cf2c206e1fda7fd032b2f9bde12ec6cc": "OpenSea",   # Seaport on ApeChain
    "0x000000000000ad05ccc4f10045630fb830b95127": "Blur",
    "0x0000000000a39bb272e79075ade125fd351887ac": "Blur",
    "0x0000000000e655fae4d56241588680f86e3b2377": "LooksRare",
    "0x74312363e45dcaba76c59ec49a7aa8a65a67eed":  "X2Y2",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_env() -> dict:
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


def load_events(path: Path) -> list:
    with open(path) as f:
        data = json.load(f)
    return data.get("events", data) if isinstance(data, dict) else data


def load_enrich_cache(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def save_enrich_cache(path: Path, data: dict):
    with open(path, "w") as f:
        json.dump(data, f)


def rpc_batch(url: str, payload: list, retries=3) -> list:
    for attempt in range(retries):
        try:
            r = requests.post(url, json=payload, timeout=30)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt)
    return []


def detect_marketplace(logs: list) -> str:
    for log in logs:
        t0   = (log.get("topics") or [""])[0].lower()
        addr = log.get("address", "").lower()
        if t0 in MARKETPLACE_TOPICS:
            return MARKETPLACE_TOPICS[t0]
        if addr in MARKETPLACE_CONTRACTS:
            return MARKETPLACE_CONTRACTS[addr]
    return "transfer"


def extract_price(logs: list, tx_value_wei: int, wrapped_token: str) -> tuple:
    """Returns (price_native, currency_label)."""
    if tx_value_wei > 0:
        return tx_value_wei / 1e18, "native"

    total = 0
    for log in logs:
        if (log.get("address", "").lower() == wrapped_token and
                (log.get("topics") or [""])[0] == TRANSFER_TOPIC):
            data = log.get("data", "0x")
            if data and data != "0x":
                total += int(data, 16)

    if total > 0:
        return total / 1e18, "wrapped"

    return None, "unknown"


def enrich_chain(label: str, events_path: Path, enrich_path: Path,
                 rpc_url: str, wrapped_token: str, batch_size: int,
                 dry_run: bool) -> dict:
    """Fetch + cache enrichment for one chain. Returns the updated cache."""
    events = load_events(events_path)
    skip   = {ZERO, ETH_BRIDGE.lower(), APE_BRIDGE.lower()}

    transfers  = [e for e in events if e["from"].lower() not in skip
                                    and e["to"].lower() not in skip]
    unique_txs = list(dict.fromkeys(e["tx_hash"] for e in transfers))

    existing  = load_enrich_cache(enrich_path)
    to_fetch  = [tx for tx in unique_txs if tx not in existing]

    print(f"\n── {label} ──")
    print(f"  Transfer events:  {len(transfers)}")
    print(f"  Unique tx hashes: {len(unique_txs)}")
    print(f"  Already cached:   {len(existing)}")
    print(f"  To fetch:         {len(to_fetch)}")

    if not to_fetch or dry_run:
        if dry_run and to_fetch:
            print(f"  (dry run — skipping {len(to_fetch)} fetches)")
        return existing

    enriched = dict(existing)

    for i in range(0, len(to_fetch), batch_size):
        batch_txs = to_fetch[i:i + batch_size]

        payload = []
        for j, tx in enumerate(batch_txs):
            payload.append({"jsonrpc":"2.0","id":j*2,   "method":"eth_getTransactionReceipt","params":[tx]})
            payload.append({"jsonrpc":"2.0","id":j*2+1, "method":"eth_getTransactionByHash", "params":[tx]})

        try:
            results = rpc_batch(rpc_url, payload)
        except Exception as e:
            print(f"  Batch error at {i}: {e}")
            time.sleep(3)
            continue

        by_id = {item["id"]: item.get("result") for item in results}

        for j, tx_hash in enumerate(batch_txs):
            receipt  = by_id.get(j * 2)  or {}
            tx_data  = by_id.get(j * 2+1) or {}
            logs     = receipt.get("logs", [])
            val_hex  = tx_data.get("value", "0x0") or "0x0"
            val_wei  = int(val_hex, 16)

            marketplace      = detect_marketplace(logs)
            price, currency  = extract_price(logs, val_wei, wrapped_token)

            enriched[tx_hash] = {
                "marketplace": marketplace,
                "price_eth":   round(price, 8) if price is not None else None,
                "currency":    currency,
            }

        done = min(i + batch_size, len(to_fetch))
        if done % (batch_size * 5) == 0 or done == len(to_fetch):
            print(f"  Fetched {done}/{len(to_fetch)}…")
            save_enrich_cache(enrich_path, enriched)

        time.sleep(0.2)

    save_enrich_cache(enrich_path, enriched)
    return enriched


def print_stats(label: str, enriched: dict):
    sales     = {k: v for k, v in enriched.items() if v["marketplace"] != "transfer"}
    by_market: dict[str, list] = {}
    for v in sales.values():
        by_market.setdefault(v["marketplace"], []).append(v["price_eth"])

    print(f"\n  {label} results:")
    print(f"    Total enriched:   {len(enriched)}")
    print(f"    Marketplace sales:{len(sales)}")
    for m, prices in sorted(by_market.items(), key=lambda x: -len(x[1])):
        known = [p for p in prices if p is not None]
        avg   = sum(known) / len(known) if known else 0
        total = sum(known)
        print(f"      {m}: {len(prices)} sales  avg={avg:.4f}  total={total:.3f}")
    print(f"    Plain transfers:  {len(enriched) - len(sales)}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv

    env = load_env()
    alchemy_key = env.get("ALCHEMY_API_KEY", "")
    if not alchemy_key:
        print("ERROR: ALCHEMY_API_KEY not found in ~/.openclaw/.env")
        sys.exit(1)

    eth_rpc = f"https://eth-mainnet.g.alchemy.com/v2/{alchemy_key}"

    print("Sales Enrichment")
    print("=" * 40)
    if dry_run:
        print("DRY RUN — no writes")

    eth_enriched = enrich_chain(
        label        = "ETH",
        events_path  = ETH_CACHE,
        enrich_path  = ETH_ENRICH,
        rpc_url      = eth_rpc,
        wrapped_token= WETH,
        batch_size   = 50,
        dry_run      = dry_run,
    )

    ape_enriched = enrich_chain(
        label        = "ApeChain",
        events_path  = APE_CACHE,
        enrich_path  = APE_ENRICH,
        rpc_url      = APE_RPC,
        wrapped_token= WAPE,
        batch_size   = 30,   # gentler on public RPC
        dry_run      = dry_run,
    )

    print("\n── Summary ──")
    print_stats("ETH",      eth_enriched)
    print_stats("ApeChain", ape_enriched)

    if dry_run:
        print("\n(Dry run — no changes written)")


if __name__ == "__main__":
    main()
