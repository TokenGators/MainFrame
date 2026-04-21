#!/usr/bin/env python3
"""
sync-listings.py — Fetch active OpenSea listings for TokenGators on ETH + APE.

Writes:
  database/listings.jsonl          — one record per token currently listed (cheapest active)
  database/listings-history.jsonl  — append-only log of every listing snapshot
                                      (used to detect bot spam / relist churn)

Listings record shape:
  {
    "token_id":       1234,
    "chain":          "eth" | "ape",
    "lister":         "0x...",
    "price_native":   0.05,
    "price_currency": "ETH" | "APE",
    "marketplace":    "OpenSea",
    "listed_at":      ISO8601,           (order creation / start time)
    "expires_at":     ISO8601 or null,
    "seen_at":        ISO8601,           (when this sync observed it)
    "order_hash":     "0x..."            (unique id of the order)
  }

Reads OpenSea API key from macOS keychain (service "opensea-api-key"),
falling back to ~/.openclaw/.env.

Usage:
    python3 scripts/sync-listings.py
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

# ── Config ────────────────────────────────────────────────────────────────────

PROJECT_ROOT      = Path(__file__).parent.parent
LISTINGS_FILE     = PROJECT_ROOT / "database" / "listings.jsonl"
HISTORY_FILE      = PROJECT_ROOT / "database" / "listings-history.jsonl"

ETH_CONTRACT = "0x4fb7363cf6d0a546cc0ed8cc0a6c99069170a623"
APE_CONTRACT = "0xd33edec311f8769c71f132a77f0c0796c22af1c5"

# OpenSea collection slugs
COLLECTION_SLUG = {"eth": "tokengators", "ape": "tokengators-ape"}
CONTRACT        = {"eth": ETH_CONTRACT,   "ape": APE_CONTRACT}
PAGE_LIMIT = 100       # max per OpenSea page
REQUEST_DELAY = 0.35   # ~3 req/sec, under the 4/sec rate limit

OS_API = "https://api.opensea.io/api/v2"

# ── Keychain ──────────────────────────────────────────────────────────────────

def get_opensea_key() -> str:
    try:
        r = subprocess.run(
            ["security", "find-generic-password", "-s", "opensea-api-key", "-w"],
            capture_output=True, text=True, check=True,
        )
        key = r.stdout.strip()
        if key:
            return key
    except subprocess.CalledProcessError:
        pass
    env_path = Path.home() / ".openclaw" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("OPENSEA_API_KEY="):
                return line.split("=", 1)[1].strip()
    return ""


# ── OpenSea fetch ─────────────────────────────────────────────────────────────

def fetch_listings(chain: str, key: str) -> list[dict]:
    """Fetch *all* active listings for the given collection slug on a chain."""
    slug = COLLECTION_SLUG[chain]
    url  = f"{OS_API}/listings/collection/{slug}/all"
    params = {"limit": PAGE_LIMIT}
    headers = {"accept": "application/json", "x-api-key": key}

    all_orders: list[dict] = []
    cursor = None
    page = 0

    while True:
        if cursor:
            params["cursor"] = cursor
        else:
            params.pop("cursor", None)

        try:
            r = requests.get(url, params=params, headers=headers, timeout=30)
        except Exception as e:
            print(f"    [{chain}] request error: {e}")
            break

        if r.status_code == 429:
            print(f"    [{chain}] rate limited — sleeping 5s")
            time.sleep(5)
            continue
        if r.status_code != 200:
            print(f"    [{chain}] error {r.status_code}: {r.text[:200]}")
            break

        body = r.json() or {}
        orders = body.get("listings", body.get("orders", [])) or []
        all_orders.extend(orders)
        page += 1
        print(f"    [{chain}] page {page}: {len(orders)} orders (total {len(all_orders)})")

        cursor = body.get("next")
        if not cursor or not orders:
            break
        time.sleep(REQUEST_DELAY)

    return all_orders


# ── Parsing ───────────────────────────────────────────────────────────────────

def _iso_from_ts(ts) -> str | None:
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()
    except Exception:
        return None


def order_to_record(order: dict, chain: str) -> dict | None:
    """Extract the fields we care about from a /listings/collection listing."""
    contract = CONTRACT[chain]
    proto  = order.get("protocol_data") or {}
    params = proto.get("parameters") or {}

    # token_id lives in offer[0].identifierOrCriteria
    offer = params.get("offer") or []
    if not offer:
        return None
    o0 = offer[0]
    if (o0.get("token") or "").lower() != contract.lower():
        return None  # criteria order — skip
    try:
        token_id = int(o0.get("identifierOrCriteria"))
    except Exception:
        return None

    # Prefer the price block — it handles decimals for us
    price_block = order.get("price") or {}
    current     = price_block.get("current") or {}
    currency_sym = (current.get("currency") or "").upper() or ("ETH" if chain == "eth" else "APE")
    try:
        decimals = int(current.get("decimals", 18))
        raw      = int(current.get("value", "0"))
    except Exception:
        decimals, raw = 18, 0

    if raw == 0:
        # fallback: sum consideration amounts
        for c in (params.get("consideration") or []):
            try: raw += int(c.get("startAmount", "0"))
            except Exception: pass
        decimals = 18

    if raw == 0:
        return None

    price_native = raw / (10 ** decimals)

    lister = (params.get("offerer") or "").lower()
    listed_at  = _iso_from_ts(params.get("startTime"))
    expires_at = _iso_from_ts(params.get("endTime"))

    return {
        "token_id":       token_id,
        "chain":          chain,
        "lister":         lister,
        "price_native":   round(price_native, 6),
        "price_currency": currency_sym,
        "marketplace":    "OpenSea",
        "listed_at":      listed_at,
        "expires_at":     expires_at,
        "order_hash":     order.get("order_hash") or "",
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    key = get_opensea_key()
    if not key:
        print("ERROR: OpenSea API key not found (keychain service 'opensea-api-key' or ~/.openclaw/.env)")
        sys.exit(1)

    now_iso = datetime.now(tz=timezone.utc).isoformat()

    print("Listings sync")
    print("=" * 40)

    all_records: list[dict] = []
    for chain in ("eth", "ape"):
        print(f"  Fetching {chain.upper()} listings…")
        orders = fetch_listings(chain, key)
        parsed = []
        for o in orders:
            rec = order_to_record(o, chain)
            if rec:
                rec["seen_at"] = now_iso
                parsed.append(rec)
        print(f"  {chain.upper()}: {len(parsed)} parsed listings")
        all_records.extend(parsed)

    # Collapse to cheapest-active-per-token (token, chain) composite key
    by_key: dict[tuple[int, str], dict] = {}
    for rec in all_records:
        k = (rec["token_id"], rec["chain"])
        prev = by_key.get(k)
        if prev is None or rec["price_native"] < prev["price_native"]:
            by_key[k] = rec

    active = list(by_key.values())
    active.sort(key=lambda r: (r["chain"], r["token_id"]))

    # Write current listings snapshot (overwrite)
    LISTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LISTINGS_FILE, "w") as f:
        for rec in active:
            f.write(json.dumps(rec) + "\n")

    # Append history entries for *all* observed listings (for spam detection)
    with open(HISTORY_FILE, "a") as f:
        for rec in all_records:
            f.write(json.dumps(rec) + "\n")

    print(f"\n✓ {len(active)} active listings  (eth: "
          f"{sum(1 for r in active if r['chain'] == 'eth')}  "
          f"ape: {sum(1 for r in active if r['chain'] == 'ape')})")
    print(f"  wrote {LISTINGS_FILE}")
    print(f"  appended {len(all_records)} rows to {HISTORY_FILE.name}")


if __name__ == "__main__":
    main()
