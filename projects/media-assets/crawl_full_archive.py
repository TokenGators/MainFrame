"""
TokenGators Full Archive Scraper
=================================
Uses X API v2  /2/tweets/search/all  (full archive, pay-as-you-go)
Collects every original post, retweet, and quote tweet from @TokenGators
dating back to their first post (2023-03-14).

- Captures every metadata field the API exposes
- Append-only writes — safe to kill and resume at any time
- Deduplicates by tweet ID so re-runs never double-count
- Checkpoints after every page so a crash loses at most one batch

Requirements:
    No external packages needed — stdlib only (Python 3.9+)

Usage:
    # Token is loaded from ~/.openclaw/.env automatically
    python3 crawl_full_archive.py

    # Or pass token explicitly:
    X_BEARER_TOKEN=xxx python3 crawl_full_archive.py
"""

import os
import json
import time
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from datetime import datetime, timezone

# ── Load .env from ~/.openclaw/.env if token not already in environment ────────
_env_path = Path.home() / ".openclaw" / ".env"
if _env_path.exists() and not os.environ.get("X_BEARER_TOKEN"):
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

# ── Config ─────────────────────────────────────────────────────────────────────

BEARER_TOKEN = os.environ.get("X_BEARER_TOKEN", "")
if not BEARER_TOKEN:
    raise SystemExit("ERROR: X_BEARER_TOKEN not set. Add it to ~/.openclaw/.env")

TARGET_USER   = os.environ.get("X_TARGET_USER", "TokenGators")
START_DATE    = "2023-03-14T00:00:00Z"   # First TokenGators post
MAX_PER_PAGE  = 500                        # Max allowed for search/all — minimises API cost
PAGE_DELAY    = 1.5                        # Seconds between requests (be a good citizen)

BASE_DIR   = Path(__file__).parent
POSTS_FILE = BASE_DIR / "database" / "posts.jsonl"
ASSETS_FILE= BASE_DIR / "database" / "assets.jsonl"
STATE_FILE = BASE_DIR / "database" / ".crawl_state_full.json"

# ── Every field the API exposes ────────────────────────────────────────────────

TWEET_FIELDS = ",".join([
    "id", "text", "created_at", "author_id", "conversation_id",
    "in_reply_to_user_id", "referenced_tweets", "attachments",
    "geo", "entities", "public_metrics",
    "possibly_sensitive",
    "lang", "source", "withheld", "edit_controls",
    "edit_history_tweet_ids", "note_tweet",
])

USER_FIELDS = ",".join([
    "id", "name", "username", "created_at", "description",
    "entities", "location", "pinned_tweet_id", "profile_image_url",
    "protected", "public_metrics", "url", "verified", "withheld",
])

MEDIA_FIELDS = ",".join([
    "media_key", "type", "url", "preview_image_url",
    "width", "height", "alt_text", "duration_ms",
    "public_metrics", "variants",
])

PLACE_FIELDS = ",".join([
    "full_name", "id", "contained_within", "country",
    "country_code", "geo", "name", "place_type",
])

POLL_FIELDS = ",".join([
    "id", "options", "duration_minutes", "end_datetime", "voting_status",
])

EXPANSIONS = ",".join([
    "author_id",
    "referenced_tweets.id",
    "referenced_tweets.id.author_id",
    "in_reply_to_user_id",
    "attachments.media_keys",
    "attachments.poll_ids",
    "geo.place_id",
    "entities.mentions.username",
])

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "User-Agent":    "TokenGators-Archiver/2.0",
}

# ── File helpers ───────────────────────────────────────────────────────────────

def ensure_dirs():
    POSTS_FILE.parent.mkdir(parents=True, exist_ok=True)

def load_existing_ids() -> set:
    ids = set()
    if POSTS_FILE.exists():
        for line in POSTS_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                try:
                    ids.add(json.loads(line)["id"])
                except (json.JSONDecodeError, KeyError):
                    pass
    return ids

def load_existing_asset_keys() -> set:
    keys = set()
    if ASSETS_FILE.exists():
        for line in ASSETS_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                try:
                    keys.add(json.loads(line)["media_key"])
                except (json.JSONDecodeError, KeyError):
                    pass
    return keys

def append_jsonl(path: Path, records: list):
    with path.open("a", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

# ── Checkpoint ─────────────────────────────────────────────────────────────────

def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {"next_token": None, "total_fetched": 0, "completed": False}

def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")

# ── Post type detection ────────────────────────────────────────────────────────

def get_post_type(tweet: dict) -> str:
    refs = tweet.get("referenced_tweets", [])
    if not refs:
        return "original"
    types = {r.get("type") for r in refs}
    if "retweeted" in types:
        return "retweet"
    if "quoted" in types:
        return "quote_tweet"
    return "original"

# ── Record builders ────────────────────────────────────────────────────────────

def build_post_record(tweet: dict) -> dict:
    m   = tweet.get("public_metrics", {})
    org = tweet.get("organic_metrics", {})
    prm = tweet.get("promoted_metrics", {})
    ent = tweet.get("entities", {})
    att = tweet.get("attachments", {})

    return {
        # Core identity
        "id":                     tweet["id"],
        "conversation_id":        tweet.get("conversation_id"),
        "author_id":              tweet.get("author_id"),
        "created_at":             tweet.get("created_at"),
        "crawled_at":             datetime.now(timezone.utc).isoformat(),

        # Content
        "text":                   tweet.get("text"),
        "lang":                   tweet.get("lang"),
        "source":                 tweet.get("source"),
        "possibly_sensitive":     tweet.get("possibly_sensitive"),
        "post_type":              get_post_type(tweet),

        # Long-form (new API)
        "note_tweet":             tweet.get("note_tweet"),

        # Reply info
        "in_reply_to_user_id":    tweet.get("in_reply_to_user_id"),

        # References
        "referenced_tweets":      tweet.get("referenced_tweets", []),
        "edit_history_tweet_ids": tweet.get("edit_history_tweet_ids", []),
        "edit_controls":          tweet.get("edit_controls"),

        # Attachments
        "media_keys":             att.get("media_keys", []),
        "poll_ids":               att.get("poll_ids", []),

        # Geo
        "geo":                    tweet.get("geo"),

        # Entities
        "hashtags":    [h.get("tag", "") for h in ent.get("hashtags", [])],
        "mentions":    [m_.get("username", "") for m_ in ent.get("mentions", [])],
        "urls":        [
            {
                "url":          u.get("url"),
                "expanded_url": u.get("expanded_url"),
                "display_url":  u.get("display_url"),
                "title":        u.get("title"),
                "description":  u.get("description"),
                "unwound_url":  u.get("unwound_url"),
                "images":       u.get("images", []),
            }
            for u in ent.get("urls", [])
        ],
        "cashtags":    [c.get("tag", "") for c in ent.get("cashtags", [])],
        "annotations": ent.get("annotations", []),

        # Metrics
        "public_metrics": {
            "like_count":        m.get("like_count", 0),
            "retweet_count":     m.get("retweet_count", 0),
            "reply_count":       m.get("reply_count", 0),
            "quote_count":       m.get("quote_count", 0),
            "impression_count":  m.get("impression_count", 0),
            "bookmark_count":    m.get("bookmark_count", 0),
        },
        # organic_metrics / promoted_metrics omitted — require OAuth owner access, not available via bearer token

        # Moderation
        "withheld": tweet.get("withheld"),
    }

def build_asset_records(includes: dict, known_keys: set) -> list:
    records = []
    for media in includes.get("media", []):
        key = media.get("media_key")
        if not key or key in known_keys:
            continue
        records.append({
            "media_key":        key,
            "type":             media.get("type"),
            "url":              media.get("url") or media.get("preview_image_url"),
            "preview_image_url":media.get("preview_image_url"),
            "width":            media.get("width"),
            "height":           media.get("height"),
            "alt_text":         media.get("alt_text"),
            "duration_ms":      media.get("duration_ms"),
            "public_metrics":   media.get("public_metrics"),
            # Video variants (different quality streams)
            "variants": [
                {
                    "bit_rate":     v.get("bit_rate"),
                    "content_type": v.get("content_type"),
                    "url":          v.get("url"),
                }
                for v in media.get("variants", [])
            ],
            "crawled_at": datetime.now(timezone.utc).isoformat(),
        })
        known_keys.add(key)
    return records

def build_user_records(includes: dict) -> dict:
    """Returns a dict of user_id → user record for reference."""
    users = {}
    for user in includes.get("users", []):
        uid = user.get("id")
        if uid:
            users[uid] = {
                "id":                uid,
                "name":              user.get("name"),
                "username":          user.get("username"),
                "created_at":        user.get("created_at"),
                "description":       user.get("description"),
                "location":          user.get("location"),
                "url":               user.get("url"),
                "profile_image_url": user.get("profile_image_url"),
                "protected":         user.get("protected"),
                "verified":          user.get("verified"),
                "public_metrics":    user.get("public_metrics"),
                "entities":          user.get("entities"),
            }
    return users

# ── X API ──────────────────────────────────────────────────────────────────────

def api_get(url: str, params: dict) -> dict:
    """Make an authenticated GET request with retry on rate limit."""
    qs  = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{url}?{qs}", headers=HEADERS)

    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))

        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")

            if e.code == 429:
                reset = int(e.headers.get("x-rate-limit-reset", 0))
                wait  = max(reset - int(time.time()), 15) + 5
                print(f"  ⏳ Rate limited — waiting {wait}s ...", flush=True)
                time.sleep(wait)
                continue

            if e.code in (500, 502, 503, 504):
                wait = 30 * (attempt + 1)
                print(f"  ⚠️  Server error {e.code} — retrying in {wait}s ...", flush=True)
                time.sleep(wait)
                continue

            raise SystemExit(f"API error {e.code}: {body}")

        except Exception as e:
            wait = 10 * (attempt + 1)
            print(f"  ⚠️  Network error: {e} — retrying in {wait}s ...", flush=True)
            time.sleep(wait)

    raise SystemExit("Max retries exceeded")

def resolve_user_id(username: str) -> str:
    data = api_get(
        f"https://api.twitter.com/2/users/by/username/{username}",
        {"user.fields": "id,name,username"}
    )
    if "errors" in data and "data" not in data:
        raise SystemExit(f"Could not resolve @{username}: {data['errors']}")
    return data["data"]["id"]

def search_page(query: str, next_token: str | None) -> dict:
    params = {
        "query":         query,
        "max_results":   MAX_PER_PAGE,
        "start_time":    START_DATE,
        "tweet.fields":  TWEET_FIELDS,
        "user.fields":   USER_FIELDS,
        "media.fields":  MEDIA_FIELDS,
        "place.fields":  PLACE_FIELDS,
        "poll.fields":   POLL_FIELDS,
        "expansions":    EXPANSIONS,
        # sort_order omitted — default is recency for search/all; explicit value breaks start_time filter
    }
    if next_token:
        params["next_token"] = next_token

    return api_get("https://api.twitter.com/2/tweets/search/all", params)

# ── Main ───────────────────────────────────────────────────────────────────────

def crawl():
    ensure_dirs()

    state = load_state()
    if state.get("completed"):
        print(f"✓ Archive already complete ({state['total_fetched']} posts).")
        print("  Delete database/.crawl_state_full.json to re-crawl from scratch.")
        return

    existing_ids  = load_existing_ids()
    existing_keys = load_existing_asset_keys()
    total         = state["total_fetched"]
    next_token    = state["next_token"]

    query = f"from:{TARGET_USER} -is:reply"

    print(f"\n{'='*60}")
    print(f"  TokenGators Full Archive Crawler")
    print(f"  Query:  {query}")
    print(f"  Since:  {START_DATE}")
    print(f"  Posts file:  {POSTS_FILE}")
    print(f"  Assets file: {ASSETS_FILE}")
    print(f"{'='*60}")

    if next_token or total:
        print(f"  Resuming — {total} posts already fetched, {len(existing_ids)} in DB\n")
    else:
        print(f"  Starting fresh — {len(existing_ids)} posts already in DB (will skip dupes)\n")

    page = 0
    start_ts = time.time()

    while True:
        page += 1
        print(f"  Page {page:>4} | fetching ...", end="", flush=True)

        data     = search_page(query, next_token)
        tweets   = data.get("data", [])
        includes = data.get("includes", {})
        meta     = data.get("meta", {})

        if not tweets:
            print(" (no results — archive exhausted)")
            break

        # ── Posts ──────────────────────────────────────────────────────────────
        new_posts = []
        for t in tweets:
            if t["id"] not in existing_ids:
                new_posts.append(build_post_record(t))
                existing_ids.add(t["id"])

        if new_posts:
            append_jsonl(POSTS_FILE, new_posts)

        # ── Assets ─────────────────────────────────────────────────────────────
        new_assets = build_asset_records(includes, existing_keys)
        if new_assets:
            append_jsonl(ASSETS_FILE, new_assets)

        total      += len(new_posts)
        next_token  = meta.get("next_token")

        elapsed = int(time.time() - start_ts)
        print(
            f" {len(tweets):>3} fetched"
            f" | {len(new_posts):>3} new"
            f" | {len(new_assets):>2} assets"
            f" | total: {total:>5}"
            f" | {elapsed}s elapsed",
            flush=True,
        )

        # Checkpoint after every page
        save_state({"next_token": next_token, "total_fetched": total, "completed": False})

        if not next_token:
            print("\n  ✓ Reached end of archive.")
            break

        time.sleep(PAGE_DELAY)

    # Mark complete
    save_state({"next_token": None, "total_fetched": total, "completed": True})

    elapsed = int(time.time() - start_ts)
    print(f"\n{'='*60}")
    print(f"  DONE in {elapsed}s")
    print(f"  {POSTS_FILE}: {total} posts")
    print(f"  {ASSETS_FILE}: {len(existing_keys)} media assets")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    crawl()
