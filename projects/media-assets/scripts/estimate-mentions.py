#!/usr/bin/env python3
"""
estimate-mentions.py — Use X API v2 counts/all endpoint to estimate how many
tweets match a query before committing to a full scrape.

Usage:
    python3 scripts/estimate-mentions.py
    python3 scripts/estimate-mentions.py --query "@tokengators has:media -is:retweet"

Set BEARER_TOKEN env var (or add to .env file):
    export BEARER_TOKEN="your_bearer_token_here"
"""

import os
import sys
import json
import argparse
import datetime
import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

COUNTS_URL = "https://api.twitter.com/2/tweets/counts/all"

# Cost estimate: $0.005 per tweet read via search/all
COST_PER_1K = 5.00  # dollars per 1,000 tweets

QUERIES = {
    "all_mentions":        "@tokengators",
    "no_retweets":         "@tokengators -is:retweet",
    "media_only":          "@tokengators has:media -is:retweet",
    "media_no_replies":    "@tokengators has:media -is:retweet -is:reply",
}


def get_bearer_token() -> str:
    # 1. Environment variable (CI / explicit override)
    token = os.environ.get("BEARER_TOKEN") or os.environ.get("X_BEARER_TOKEN")
    if token:
        return token

    # 2. macOS Keychain (preferred — keeps secret out of files)
    try:
        import subprocess
        result = subprocess.run(
            ["security", "find-generic-password", "-s", "x-bearer-token",
             "-a", os.environ.get("USER", ""), "-w"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass

    # 3. Project .env (non-sensitive keys only — .openclaw is off-limits)
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_path):
        for line in open(env_path):
            line = line.strip()
            if line.startswith("BEARER_TOKEN=") or line.startswith("X_BEARER_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")

    print("ERROR: No bearer token found.")
    print("Store it with: security add-generic-password -s x-bearer-token -a $USER -w YOUR_TOKEN")
    sys.exit(1)


def count_query(query: str, token: str, granularity: str = "day") -> dict:
    """
    Call /2/tweets/counts/all for the given query.
    Returns the full response dict.
    """
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "query": query,
        "granularity": granularity,
        # No start_time = full archive back to 2006
    }
    resp = requests.get(COUNTS_URL, headers=headers, params=params, timeout=30)
    if resp.status_code == 403:
        print(f"  403 Forbidden — your token may not have access to /counts/all (full archive).")
        print(f"  Try with --recent to use /counts/recent (last 7 days only) instead.")
        return {}
    resp.raise_for_status()
    return resp.json()


def format_cost(count: int) -> str:
    cost = (count / 1000) * COST_PER_1K
    if cost < 1:
        return f"~${cost:.2f}"
    return f"~${cost:,.0f}"


def print_yearly_breakdown(data: dict):
    """Print tweet counts grouped by year."""
    buckets = data.get("data", [])
    if not buckets:
        return

    by_year = {}
    for b in buckets:
        year = b["start"][:4]
        by_year[year] = by_year.get(year, 0) + b["tweet_count"]

    print("    Year breakdown:")
    for year in sorted(by_year.keys()):
        print(f"      {year}: {by_year[year]:,}")


def main():
    parser = argparse.ArgumentParser(description="Estimate X API mention scrape cost")
    parser.add_argument("--query", help="Single query to count (instead of running all presets)")
    parser.add_argument("--recent", action="store_true",
                        help="Use /counts/recent (last 7 days) instead of full archive")
    parser.add_argument("--breakdown", action="store_true",
                        help="Show yearly tweet volume breakdown")
    args = parser.parse_args()

    token = get_bearer_token()

    url = "https://api.twitter.com/2/tweets/counts/recent" if args.recent else COUNTS_URL
    period = "last 7 days" if args.recent else "full archive"
    print(f"X API Tweet Counts  ({period})")
    print(f"Cost per 1,000 tweets fetched: ${COST_PER_1K:.2f}")
    print()

    queries = {"custom": args.query} if args.query else QUERIES

    for label, query in queries.items():
        print(f"  [{label}]")
        print(f"  Query: {query}")
        try:
            resp_url = f"https://api.twitter.com/2/tweets/counts/{'recent' if args.recent else 'all'}"
            headers = {"Authorization": f"Bearer {token}"}
            params = {"query": query, "granularity": "day"}
            resp = requests.get(resp_url, headers=headers, params=params, timeout=30)

            if resp.status_code == 403:
                print(f"  ⚠ 403 Forbidden — counts/all may require higher access. Try --recent.")
                print()
                continue
            resp.raise_for_status()
            data = resp.json()

            total = data.get("meta", {}).get("total_tweet_count", 0)
            print(f"  Total tweets: {total:,}")
            print(f"  Fetch cost:   {format_cost(total)}")

            if args.breakdown:
                print_yearly_breakdown(data)

            print()

        except requests.HTTPError as e:
            print(f"  ✗ HTTP {e.response.status_code}: {e.response.text[:200]}")
            print()
        except Exception as e:
            print(f"  ✗ Error: {e}")
            print()

    if not args.query:
        print("Recommendation:")
        print("  '@tokengators has:media -is:retweet' gives the cleanest set —")
        print("  original posts with images, no retweet duplicates, no reply chatter.")
        print()
        print("  Add --breakdown to see volume by year.")


if __name__ == "__main__":
    main()
