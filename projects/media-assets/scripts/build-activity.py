#!/usr/bin/env python3
"""
build-activity.py

Reads the cached transfer events + sales enrichment cache and writes
database/activity.jsonl — a chronological log of every token movement:

  mint        — from 0x0 → real wallet
  sale        — marketplace sale (OpenSea, Blur, etc.) with price data
  transfer    — wallet-to-wallet move (gift, self-transfer)
  bridge_out  — wallet → ETH bridge (moving to ApeChain)
  bridge_in   — APE bridge → wallet (arriving on ApeChain)

Usage:
    python3 scripts/build-activity.py
"""

from __future__ import annotations
import json
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

PROJECT_ROOT  = Path(__file__).parent.parent
CACHE_DIR     = PROJECT_ROOT / "database" / ".holders-cache"
ACTIVITY_FILE = PROJECT_ROOT / "database" / "activity.jsonl"
APE_TS_CACHE  = CACHE_DIR / "ape-block-timestamps.json"
ETH_ENRICH    = CACHE_DIR / "eth-tx-enrichment.json"
APE_ENRICH    = CACHE_DIR / "ape-tx-enrichment.json"

ZERO       = "0x0000000000000000000000000000000000000000"
ETH_BRIDGE = "0x57e56ce08ae6f0aea6668fd898c52011fe853dc2"
APE_BRIDGE = "0x75f7dbe5e4ee8e424a759f71ad725f8cdd0ff2d1"

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_events(path: Path) -> list:
    with open(path) as f:
        data = json.load(f)
    return data.get("events", data) if isinstance(data, dict) else data


def load_ape_timestamps() -> dict:
    if not APE_TS_CACHE.exists():
        return {}
    with open(APE_TS_CACHE) as f:
        return {int(k): v for k, v in json.load(f).items()}


def load_enrichment() -> tuple[dict, dict]:
    """Returns (eth_enrichment, ape_enrichment) dicts keyed by tx_hash."""
    eth = {}
    ape = {}
    if ETH_ENRICH.exists():
        with open(ETH_ENRICH) as f:
            eth = json.load(f)
    if APE_ENRICH.exists():
        with open(APE_ENRICH) as f:
            ape = json.load(f)
    return eth, ape


def classify(frm: str, to: str, chain: str,
             eth_enrich: dict, ape_enrich: dict,
             tx_hash: str) -> tuple[str, str | None, float | None, str | None]:
    """
    Returns (event_type, marketplace, price_native, price_currency).
    event_type: mint / sale / transfer / bridge_out / bridge_in / bridge_internal
    """
    frm = frm.lower()
    to  = to.lower()

    if frm == ZERO:
        return "mint", None, None, None
    if to == ETH_BRIDGE.lower():
        return "bridge_out", None, None, None
    if frm == APE_BRIDGE.lower():
        return "bridge_in", None, None, None
    if frm == ETH_BRIDGE.lower() or to == APE_BRIDGE.lower():
        return "bridge_internal", None, None, None

    enrich = eth_enrich if chain == "eth" else ape_enrich
    if tx_hash in enrich:
        info        = enrich[tx_hash]
        marketplace = info.get("marketplace", "transfer")
        price       = info.get("price_eth")
        currency    = "ETH" if chain == "eth" else "APE"
        if marketplace != "transfer":
            return "sale", marketplace, price, currency

    return "transfer", None, None, None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Building activity.jsonl...")

    # Load events
    eth_events  = load_events(CACHE_DIR / "eth-events.json")
    ape_events  = load_events(CACHE_DIR / "ape-events.json")
    ape_ts      = load_ape_timestamps()
    eth_enrich, ape_enrich = load_enrichment()

    print(f"  ETH events:       {len(eth_events)}")
    print(f"  APE events:       {len(ape_events)}")
    print(f"  ETH enriched txs: {len(eth_enrich)}")
    print(f"  APE enriched txs: {len(ape_enrich)}")

    # Enrich APE timestamps
    for e in ape_events:
        if not e.get("timestamp"):
            ts = ape_ts.get(e["block_num"])
            if ts:
                e["timestamp"] = ts

    all_events = eth_events + ape_events

    # Filter + classify
    records = []
    seen = set()

    for e in all_events:
        if not e.get("timestamp") or e.get("token_id") is None:
            continue

        # De-dup: same tx + token
        key = e["tx_hash"] + str(e["token_id"])
        if key in seen:
            continue
        seen.add(key)

        chain    = e.get("chain", "eth")
        tx_hash  = e["tx_hash"]
        etype, marketplace, price_native, price_currency = classify(
            e["from"], e["to"], chain, eth_enrich, ape_enrich, tx_hash
        )

        if etype == "bridge_internal":
            continue

        explorer_url = (f"https://etherscan.io/tx/{tx_hash}" if chain == "eth"
                        else f"https://apescan.io/tx/{tx_hash}")

        record = {
            "type":         etype,
            "token_id":     e["token_id"],
            "from":         e["from"].lower(),
            "to":           e["to"].lower(),
            "timestamp":    e["timestamp"],
            "chain":        chain,
            "tx_hash":      tx_hash,
            "explorer_url": explorer_url,
        }
        if marketplace:
            record["marketplace"] = marketplace
        if price_native is not None:
            record["price_native"]   = round(price_native, 4)
            record["price_currency"] = price_currency

        records.append(record)

    # Sort newest first
    records.sort(key=lambda r: r["timestamp"], reverse=True)

    with open(ACTIVITY_FILE, "w") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")

    mints     = sum(1 for r in records if r["type"] == "mint")
    sales     = sum(1 for r in records if r["type"] == "sale")
    transfers = sum(1 for r in records if r["type"] == "transfer")
    bridges   = sum(1 for r in records if r["type"].startswith("bridge"))

    eth_prices = [r["price_native"] for r in records if r.get("price_native") and r.get("price_currency") == "ETH"]
    ape_prices = [r["price_native"] for r in records if r.get("price_native") and r.get("price_currency") == "APE"]

    print(f"  Total events: {len(records)}")
    print(f"    mints:      {mints}")
    print(f"    sales:      {sales}")
    if eth_prices:
        print(f"      ETH sales: {len(eth_prices)}  avg={sum(eth_prices)/len(eth_prices):.4f} ETH  total={sum(eth_prices):.3f} ETH")
    if ape_prices:
        print(f"      APE sales: {len(ape_prices)}  avg={sum(ape_prices)/len(ape_prices):.1f} APE  total={sum(ape_prices):,.0f} APE")
    print(f"    transfers:  {transfers}")
    print(f"    bridges:    {bridges}")
    print(f"  Wrote → {ACTIVITY_FILE}")


if __name__ == "__main__":
    main()
