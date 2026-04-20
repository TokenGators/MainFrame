#!/usr/bin/env python3
"""
import-spreadsheet.py — One-time CSV → identity file merger
Reads your spreadsheet export, tries to match each row to a known wallet
from holders.jsonl, extracts useful identity fields, and merges them into
~/.openclaw/holders-identity.jsonl.

Usage:
    python3 scripts/import-spreadsheet.py your-export.csv
    python3 scripts/import-spreadsheet.py your-export.csv --dry-run

The script is deliberately fuzzy:
  - Matches on wallet address (exact, case-insensitive)
  - Also tries to match on ENS name (if holders.jsonl has ENS)
  - For unmatched rows, still imports them with a "unmatched" flag
    so identity data isn't lost

Output:
  ~/.openclaw/holders-identity.jsonl  — private identity layer
  (never stored in the repo, never read by cloud AI)

Column detection is automatic — the script scans headers for anything that
looks like: wallet/address, twitter/x handle, discord, name, notes, etc.
"""

import csv
import json
import sys
import re
import argparse
from datetime import datetime, timezone
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).parent.parent
HOLDERS_FILE = PROJECT_ROOT / "database" / "holders.jsonl"
IDENTITY_FILE = Path.home() / ".openclaw" / "holders-identity.jsonl"
IDENTITY_FILE.parent.mkdir(parents=True, exist_ok=True)

# Column header patterns (case-insensitive substring match)
COLUMN_PATTERNS = {
    "wallet":    ["wallet", "address", "addr", "0x"],
    "twitter":   ["twitter", "x handle", "x.com", "tweet", "@"],
    "discord":   ["discord"],
    "name":      ["name", "alias", "username", "handle"],
    "notes":     ["notes", "comment", "misc", "other", "info"],
    "email":     ["email", "mail"],
    "telegram":  ["telegram", "tg"],
    "ens":       ["ens", ".eth"],
}

WALLET_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")
ENS_RE    = re.compile(r"\.eth$", re.IGNORECASE)

# ── Helpers ───────────────────────────────────────────────────────────────────

def detect_columns(headers: list[str]) -> dict:
    """Map field names to column indices."""
    mapping = {}
    for field, patterns in COLUMN_PATTERNS.items():
        for i, h in enumerate(headers):
            h_lower = h.lower().strip()
            if any(p in h_lower for p in patterns):
                if field not in mapping:
                    mapping[field] = i
    return mapping

def load_holders() -> tuple[dict, dict]:
    """
    Load holders.jsonl.
    Returns (wallet_map, ens_map) where:
      wallet_map: {wallet_lower: record}
      ens_map:    {ens_name_lower: record}
    """
    wallet_map = {}
    ens_map = {}
    if not HOLDERS_FILE.exists():
        return wallet_map, ens_map
    with open(HOLDERS_FILE) as f:
        for line in f:
            line = line.strip()
            if line:
                rec = json.loads(line)
                wallet_map[rec["wallet"].lower()] = rec
                if rec.get("ens"):
                    ens_map[rec["ens"].lower()] = rec
    return wallet_map, ens_map

def load_existing_identity() -> dict:
    """Load existing identity records keyed by wallet."""
    records = {}
    if IDENTITY_FILE.exists():
        with open(IDENTITY_FILE) as f:
            for line in f:
                line = line.strip()
                if line:
                    rec = json.loads(line)
                    records[rec["wallet"].lower()] = rec
    return records

def match_row(row: list, col_map: dict, wallet_map: dict, ens_map: dict):
    """
    Try to match a spreadsheet row to a known wallet.
    Returns (wallet_address or None, match_method or None).
    """
    # Try direct wallet address match
    if "wallet" in col_map:
        val = row[col_map["wallet"]].strip()
        if WALLET_RE.match(val):
            wl = val.lower()
            if wl in wallet_map:
                return wl, "address"
            return wl, "address_unmatched"

    # Try ENS match
    if "ens" in col_map:
        val = row[col_map["ens"]].strip().lower()
        if val and val in ens_map:
            return ens_map[val]["wallet"].lower(), "ens"

    # Try name column for ENS
    if "name" in col_map:
        val = row[col_map["name"]].strip().lower()
        if ENS_RE.search(val) and val in ens_map:
            return ens_map[val]["wallet"].lower(), "ens_from_name"

    # Try scanning all columns for a wallet address
    for cell in row:
        cell = cell.strip()
        if WALLET_RE.match(cell):
            wl = cell.lower()
            if wl in wallet_map:
                return wl, "address_found"
            return wl, "address_unmatched"

    return None, None

def extract_identity(row: list, col_map: dict, wallet: str, method: str, raw_headers: list) -> dict:
    """Build an identity record from the spreadsheet row."""
    identity = {
        "wallet": wallet,
        "source": "spreadsheet",
        "match_method": method,
        "imported_at": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    field_order = ["twitter", "discord", "name", "email", "telegram", "ens", "notes"]
    for field in field_order:
        if field in col_map:
            val = row[col_map[field]].strip()
            if val:
                identity[field] = val

    # Dump any unmapped columns into a raw dict so nothing is lost
    mapped_indices = set(col_map.values())
    raw = {}
    for i, cell in enumerate(row):
        if i not in mapped_indices and cell.strip():
            raw[raw_headers[i]] = cell.strip()
    if raw:
        identity["raw_fields"] = raw

    return identity

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Import spreadsheet into identity file")
    parser.add_argument("csv_file", help="Path to CSV export")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be imported without writing")
    parser.add_argument("--delimiter", default=",", help="CSV delimiter (default: ,)")
    args = parser.parse_args()

    csv_path = Path(args.csv_file)
    if not csv_path.exists():
        print(f"File not found: {csv_path}")
        sys.exit(1)

    print("Spreadsheet Import")
    print("=" * 40)

    wallet_map, ens_map = load_holders()
    print(f"Loaded {len(wallet_map)} wallets from holders.jsonl")

    existing_identity = load_existing_identity()
    print(f"Loaded {len(existing_identity)} existing identity records")

    rows = []
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=args.delimiter)
        headers = next(reader)
        rows = list(reader)

    print(f"Spreadsheet: {len(rows)} rows, {len(headers)} columns")
    print(f"Headers: {headers}")

    col_map = detect_columns(headers)
    print(f"\nDetected columns:")
    for field, idx in col_map.items():
        print(f"  {field:12s} → column {idx}: '{headers[idx]}'")

    if not col_map:
        print("\n⚠️  Could not detect any recognizable columns.")
        print("Check that your CSV has headers like: wallet, twitter, discord, name, notes")
        sys.exit(1)

    # Process rows
    imported = []
    unmatched = []
    skipped_empty = 0

    for row in rows:
        # pad short rows
        while len(row) < len(headers):
            row.append("")

        # skip fully empty rows
        if not any(cell.strip() for cell in row):
            skipped_empty += 1
            continue

        wallet, method = match_row(row, col_map, wallet_map, ens_map)

        if wallet is None:
            # No wallet found at all — still try to save what we can
            unmatched.append({
                "source": "spreadsheet",
                "match_method": "none",
                "imported_at": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "raw_fields": {headers[i]: row[i].strip() for i in range(len(headers)) if row[i].strip()},
            })
            continue

        identity = extract_identity(row, col_map, wallet, method, headers)

        # merge with existing (spreadsheet wins for non-empty fields)
        if wallet in existing_identity:
            merged = {**existing_identity[wallet], **{k: v for k, v in identity.items() if v}}
            identity = merged

        imported.append(identity)

    print(f"\nResults:")
    print(f"  Matched to known wallet:  {sum(1 for i in imported if 'address' in i.get('match_method','') or 'ens' in i.get('match_method',''))}")
    print(f"  Total import records:     {len(imported)}")
    print(f"  Unmatched (no wallet):    {len(unmatched)}")
    print(f"  Skipped (empty rows):     {skipped_empty}")

    if args.dry_run:
        print("\n── Dry run — first 5 records ──")
        for rec in imported[:5]:
            print(json.dumps(rec, indent=2))
        print(f"\n[dry run] Would write {len(imported)} records to {IDENTITY_FILE}")
        if unmatched:
            unmatched_path = IDENTITY_FILE.parent / "holders-identity-unmatched.jsonl"
            print(f"[dry run] Would write {len(unmatched)} unmatched rows to {unmatched_path}")
        return

    # Merge into existing identity records
    final = {**existing_identity}
    for rec in imported:
        final[rec["wallet"].lower()] = rec

    with open(IDENTITY_FILE, "w") as f:
        for rec in final.values():
            f.write(json.dumps(rec) + "\n")

    print(f"\n✓ Wrote {len(final)} identity records to {IDENTITY_FILE}")

    if unmatched:
        unmatched_path = IDENTITY_FILE.parent / "holders-identity-unmatched.jsonl"
        with open(unmatched_path, "w") as f:
            for rec in unmatched:
                f.write(json.dumps(rec) + "\n")
        print(f"✓ Wrote {len(unmatched)} unmatched rows to {unmatched_path}")
        print("  Review these manually — they had no wallet address found.")

    print("\nSpreadsheet import complete.")
    print("You can now archive or delete the original spreadsheet.")

if __name__ == "__main__":
    main()
