# The Vault — Instruction Plan for Build Agent

**Project:** the-vault  
**For:** Murphy (Ride Engineer) or any coding agent  
**Spec:** See `docs/SPEC.md` for full technical detail  

---

## Pre-Flight Checklist

Before starting any code:
1. Read `PROJECT.md` and `docs/SPEC.md` in full
2. Check `WORKSPACE.md` — set Status to ACTIVE
3. Create branch: `agent/the-vault/initial-build`
4. Verify Ollama is running: `curl http://localhost:11434/api/tags`
5. Verify the `qwen3.5:35b` model is available in the tags response

---

## Phase 1: Scaffold & Storage (Start Here)

**Goal:** Working database and data model. No Discord yet.

### Tasks:
1. Create `requirements.txt` (see SPEC §6)
2. Create `.env.example` (see SPEC §4)
3. Create `src/models.py` — VaultEntry dataclass with all fields from SPEC §1.1
4. Create `src/storage.py`:
   - `init_db(db_path)` — creates tables and FTS5 index (SPEC §1.1)
   - `save_entry(entry: VaultEntry)` — writes to SQLite
   - `write_markdown(entry, vault_dir)` — writes sidecar file (SPEC §1.2)
   - `get_by_url(url)` — returns entry or None (for dedup)
   - `get_by_id(id)` — returns entry or None
5. Create `setup.py` — initializes DB, creates `data/` and `vault/` dirs
6. Write a simple test: `python setup.py && python -c "from src.storage import init_db; init_db('data/vault.db'); print('OK')"`

**Commit:** `feat[the-vault] scaffold: models, storage, DB init`

---

## Phase 2: Fetcher

**Goal:** Given a URL, return clean article content.

### Tasks:
1. Create `src/fetcher.py`:
   - `fetch_url(url, timeout=15)` → `FetchResult(title, author, published, text, word_count, success, error)`
   - Primary: Trafilatura with config from SPEC §2.2
   - Fallback: httpx GET + BeautifulSoup for title/meta extraction if Trafilatura returns empty text
   - `extract_domain(url)` → hostname string
   - `estimate_read_time(word_count)` → int (words / 200)
2. Test manually with a few URLs:
   ```python
   python -c "from src.fetcher import fetch_url; r = fetch_url('https://anthropic.com/news/model-context-protocol'); print(r.title, len(r.text))"
   ```

**Commit:** `feat[the-vault] fetcher: trafilatura + fallback content extraction`

---

## Phase 3: AI Processor

**Goal:** Given fetched content, return summary, key points, tags, category.

### Tasks:
1. Create `src/processor.py`:
   - `process_entry(title, text, model="qwen3.5:35b")` → `ProcessedEntry(summary, key_points, tags, category)`
   - Build prompt exactly as shown in SPEC §2.3
   - Truncate text to `MAX_CONTENT_CHARS` (default 6000) before sending
   - Call Ollama API: `POST http://localhost:11434/api/generate` with `stream=false`
   - Parse response: try `json.loads()` first, then regex fallback for JSON embedded in markdown
   - On parse failure: return safe defaults (empty lists, "General" category, error note in summary)
   - Timeout: 120 seconds (35B model is slow, be patient)
2. Test:
   ```python
   python -c "
   from src.processor import process_entry
   r = process_entry('Test Article', 'Artificial intelligence is transforming how we build software...')
   print(r)
   "
   ```

**Commit:** `feat[the-vault] processor: ollama 35B summarization + tagging`

---

## Phase 4: Ingest Pipeline (CLI mode)

**Goal:** End-to-end pipeline runnable from the command line. No Discord yet.

### Tasks:
1. Create `src/ingest.py`:
   - `extract_urls(text)` → list of URLs (regex)
   - `vault_url(url, saved_by="cli", discord_msg=None)` → VaultEntry or error dict
     - Check dedup via `storage.get_by_url()`
     - Call `fetcher.fetch_url()`
     - Call `processor.process_entry()`
     - Generate nanoid for entry ID (`v_` prefix)
     - Call `storage.save_entry()` and `storage.write_markdown()`
     - Return completed VaultEntry
2. Create a CLI runner at the bottom of `ingest.py`:
   ```python
   if __name__ == '__main__':
       import sys
       url = sys.argv[1]
       result = vault_url(url, saved_by="cli")
       print(f"Vaulted: {result.title}")
       print(f"Summary: {result.summary}")
       print(f"Tags: {result.tags}")
   ```
3. Test full pipeline:
   ```
   python src/ingest.py https://anthropic.com/news/model-context-protocol
   ```
   Expected: title printed, summary printed, markdown file created in vault/

**Commit:** `feat[the-vault] ingest: full pipeline CLI mode working`

---

## Phase 5: Search

**Goal:** FTS5 search that returns ranked results.

### Tasks:
1. Create `src/search.py`:
   - `search(query, db_path, limit=5)` → list of VaultEntry (ranked by FTS score)
   - `list_by_tag(tag, db_path, limit=20)` → list of VaultEntry
   - `list_recent(n, db_path)` → list of VaultEntry
   - Update FTS index trigger in `storage.py`: after every `save_entry()`, also insert into `entries_fts`
2. Test:
   ```python
   python -c "from src.search import search; results = search('mcp tools'); [print(r.title) for r in results]"
   ```

**Commit:** `feat[the-vault] search: FTS5 full-text search + tag/recent queries`

---

## Phase 6: Discord Bot

**Goal:** Live bot that watches a channel and responds to commands.

### Tasks:
1. Create `src/bot.py`:
   - Load config from `.env`
   - On message in `DISCORD_VAULT_CHANNEL_ID`: extract URLs, call `vault_url()` for each
   - Format and send the vault card (see SPEC §2.5 for card format)
   - Register commands: `!vault <url>`, `!vault search <q>`, `!vault tag <t>`, `!vault recent [n]`, `!vault show <id>`
   - Handle all error cases from SPEC §3.3
   - On startup: verify Ollama is reachable, log to console
2. Create `.env` from `.env.example`, fill in bot token and channel ID
3. Test: run `python src/bot.py`, drop a link in the vault channel

**Commit:** `feat[the-vault] discord bot: channel watcher + commands`

---

## Phase 7: README & Polish

1. Write `README.md`:
   - What it does
   - Setup steps (install deps, copy .env, init DB, run bot)
   - Available commands
   - How to run with: `python src/bot.py`
2. Add `.gitignore` entries: `data/`, `vault/`, `.env`
3. Add `data/` and `vault/` to `.gitignore` (they're local, not committed)
4. Set `WORKSPACE.md` Status back to IDLE
5. Open PR targeting `dev`

**Commit:** `docs[the-vault] README, gitignore, WORKSPACE idle`

---

## Acceptance Criteria

The build is done when:

- [ ] `python setup.py` runs without errors and creates `data/vault.db`
- [ ] `python src/ingest.py <url>` processes a real URL end-to-end
- [ ] A markdown file appears in `vault/YYYY-MM/`
- [ ] `!vault search mcp` in Discord returns results
- [ ] Dropping a URL in `#the-vault` posts a formatted card back
- [ ] Duplicate URLs are caught and reported
- [ ] Bot handles a dead URL gracefully (no crash)

---

## X.com / Twitter Links

X.com is JS-rendered and login-gated — Trafilatura returns nothing. Do NOT attempt to scrape x.com directly.

In `fetcher.py`, detect x.com/twitter.com URLs before calling Trafilatura and route them to `fetch_tweet()` instead:
- API: `GET https://api.fxtwitter.com/<username>/status/<tweet_id>`
- No API key, no auth required
- Handles single tweets, threads (join thread tweets with double newline), quote tweets
- Test: `python src/ingest.py https://x.com/karpathy/status/1835009222655815873`

---

## Known Gotchas

- Ollama 35B is slow (~30-90s per request). The bot must send a "⏳ processing..." message immediately, then edit it with the result. Do not let Discord time out.
- Trafilatura sometimes returns `None` for JS-heavy SPAs. The fallback must handle this gracefully.
- FTS5 triggers: SQLite FTS5 requires manual sync — insert into `entries_fts` after every `entries` insert.
- nanoid: use `nanoid.generate(size=7)` with `v_` prefix.
- Discord token: never commit `.env`. The `.env.example` has placeholder values only.
