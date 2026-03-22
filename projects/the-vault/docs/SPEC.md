# The Vault — Full Technical Specification

**Version:** 1.0  
**Date:** 2026-03-18  
**Authored by:** Park Operator  

---

## 1. Data Models

### 1.1 VaultEntry (SQLite)

```sql
CREATE TABLE entries (
    id          TEXT PRIMARY KEY,          -- nanoid, e.g. "v_k3j9xp"
    url         TEXT NOT NULL UNIQUE,
    title       TEXT,
    domain      TEXT,                      -- extracted hostname
    summary     TEXT,                      -- AI-generated, 3-5 sentences
    key_points  TEXT,                      -- JSON array of bullet strings
    tags        TEXT,                      -- JSON array, AI-generated
    category    TEXT,                      -- AI-classified: AI/Dev/Crypto/Design/General/etc
    author      TEXT,
    published   TEXT,                      -- ISO date string if detectable
    saved_at    TEXT NOT NULL,             -- ISO timestamp
    saved_by    TEXT,                      -- Discord username who dropped the link
    word_count  INTEGER,
    read_time   INTEGER,                   -- estimated minutes
    raw_content TEXT,                      -- full extracted text (for re-processing)
    discord_msg TEXT                       -- Discord message ID for reference
);

-- Full-text search index
CREATE VIRTUAL TABLE entries_fts USING fts5(
    title, summary, key_points, tags, raw_content,
    content='entries', content_rowid='rowid'
);
```

### 1.2 Markdown Sidecar

Every entry also writes a markdown file:
```
projects/the-vault/vault/<YYYY-MM>/<id>-<slug>.md
```

Format:
```markdown
---
id: v_k3j9xp
url: https://example.com/article
title: Article Title
category: AI
tags: [mcp, llm, tools]
saved_at: 2026-03-18T14:22:00Z
saved_by: kthings
read_time: 4 min
---

# Article Title

> 3-5 sentence summary from the AI

## Key Points
- Point one
- Point two
- Point three

## Source
https://example.com/article
```

---

## 2. Pipeline Architecture

### 2.1 Ingest Stage

**Trigger:** Discord message in `#the-vault` channel containing a URL  
**Also accepts:** `!vault <url>` command in any channel  

```
ingest.py
├── parse_message(msg) → extract URL(s)
├── deduplicate: check if URL already in DB
└── queue entry for processing
```

**Duplicate handling:** If URL exists, bot replies: "Already in the vault → [title]" with a link to the existing entry.

### 2.2 Fetch Stage

```
fetcher.py
├── fetch_url(url) → raw content
│   ├── Route: detect URL type first
│   │   ├── x.com / twitter.com → fetch_tweet() via fxtwitter API
│   │   └── everything else → fetch_article() via Trafilatura
│   ├── fetch_article(url): Trafilatura primary, httpx+BS4 fallback
│   ├── fetch_tweet(url): fxtwitter API (no auth, no API key)
│   └── Returns: { title, author, published, text, word_count }
└── extract_domain(url) → hostname
```

**Trafilatura config (articles):**
- `include_comments=False`
- `include_tables=True`
- `no_fallback=False` (allow fallback)
- Timeout: 15s

**X.com / Twitter handler (no API key required):**

X.com is JavaScript-rendered and login-gated — Trafilatura returns nothing useful.
Instead, use the fxtwitter unofficial API:

```python
def fetch_tweet(url):
    # Extract tweet ID from URL
    # Handles: x.com/user/status/123, twitter.com/user/status/123
    match = re.search(r'(?:x|twitter)\.com/(\w+)/status/(\d+)', url)
    username, tweet_id = match.group(1), match.group(2)

    api_url = f"https://api.fxtwitter.com/{username}/status/{tweet_id}"
    response = httpx.get(api_url, timeout=15)
    data = response.json()

    tweet = data['tweet']
    # Build readable text: handle threads by joining all thread tweets
    text = tweet['text']
    if 'thread' in tweet:
        thread_texts = [t['text'] for t in tweet['thread']['tweets']]
        text = '\n\n'.join([text] + thread_texts)

    return FetchResult(
        title=f"@{username}: {tweet['text'][:80]}...",
        author=tweet.get('author', {}).get('name', username),
        published=tweet.get('created_at'),
        text=text,
        word_count=len(text.split()),
        success=True
    )
```

fxtwitter API: `https://api.fxtwitter.com` — no key, no auth, handles threads,
quotes, and media alt-text. Reasonable rate limits for manual-save workflow.

### 2.3 AI Processing Stage

```
processor.py
└── process_entry(content) → ProcessedEntry
    ├── build_prompt(title, text) → prompt string
    ├── call_ollama(prompt, model="qwen3.5:35b") → raw response
    └── parse_response(raw) → { summary, key_points, tags, category }
```

**Ollama API call:**
```python
POST http://localhost:11434/api/generate
{
  "model": "qwen3.5:35b",
  "prompt": <prompt>,
  "stream": False,
  "options": { "temperature": 0.3, "num_ctx": 8192 }
}
```

**Prompt template:**
```
You are a research assistant cataloging articles for a team knowledge base.

Article title: {title}
Content:
{text[:6000]}  # truncate to ~6k chars to fit context

Respond in this exact JSON format (no other text):
{{
  "summary": "3-5 sentence summary of what this article is about and why it matters",
  "key_points": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "tags": ["tag1", "tag2", "tag3"],
  "category": "one of: AI | Dev | Crypto | Design | Business | Culture | General"
}}
```

**Response parsing:** JSON.parse with fallback to regex extraction if model wraps in markdown code blocks.

### 2.4 Storage Stage

```
storage.py
├── save_entry(entry) → writes to SQLite + markdown sidecar
├── update_fts(entry) → updates FTS5 index
└── get_entry(id_or_url) → VaultEntry
```

### 2.5 Discord Response Stage

After processing, bot posts a formatted card back to the channel:

```
📥 Vaulted: **Article Title**
🔗 example.com · AI · 4 min read · saved by @kthings

> 3-5 sentence summary here.

**Key Points:**
• Point one
• Point two
• Point three

🏷️ `mcp` `llm` `tools`
🆔 v_k3j9xp
```

---

## 3. Discord Interface

### 3.1 Channels & Triggers

| Trigger | Behavior |
|---------|----------|
| URL posted in `#the-vault` | Auto-process |
| `!vault <url>` in any channel | Process + reply in-thread |
| `!vault search <query>` | FTS search, return top 5 |
| `!vault tag <tag>` | List entries with that tag |
| `!vault recent [n]` | Show last n entries (default 10) |
| `!vault show <id>` | Show full entry card |

### 3.2 Search Response Format

```
🔍 Search: "mcp tools"  →  3 results

1. **Model Context Protocol Explained** · AI · 2026-03-15
   > Summary snippet...
   🆔 v_k3j9xp  🔗 https://...

2. **Building MCP Servers** · Dev · 2026-03-10
   ...
```

### 3.3 Error Handling

- URL unreachable → "⚠️ Couldn't fetch that URL. Try again or paste article text."
- Model timeout → "⏳ Processing taking longer than expected, I'll update this message when done."
- Parsing fails → Log error, store with raw content only, notify with partial card.

---

## 4. Configuration (`.env`)

```env
DISCORD_BOT_TOKEN=<token>
DISCORD_VAULT_CHANNEL_ID=<channel-id>
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3.5:35b
DB_PATH=./data/vault.db
VAULT_DIR=./vault
MAX_CONTENT_CHARS=6000
REQUEST_TIMEOUT=15
```

---

## 5. Project File Structure

```
projects/the-vault/
├── PROJECT.md
├── WORKSPACE.md
├── docs/
│   └── SPEC.md               ← this file
├── src/
│   ├── bot.py                ← Discord bot entry point
│   ├── ingest.py             ← URL extraction + dedup
│   ├── fetcher.py            ← Content fetching (Trafilatura)
│   ├── processor.py          ← Ollama AI processing
│   ├── storage.py            ← SQLite + markdown write
│   ├── search.py             ← FTS5 query interface
│   └── models.py             ← VaultEntry dataclass
├── data/
│   └── vault.db              ← SQLite database (gitignored)
├── vault/                    ← Markdown sidecars (gitignored, or committed)
│   └── 2026-03/
│       └── v_k3j9xp-article-title.md
├── requirements.txt
├── .env.example
├── setup.py                  ← DB init script
└── README.md
```

---

## 6. Dependencies (`requirements.txt`)

```
discord.py>=2.3.0
trafilatura>=1.8.0
httpx>=0.27.0
beautifulsoup4>=4.12.0
nanoid>=2.0.0
python-dotenv>=1.0.0
```

No external AI API dependencies — Ollama runs locally.

---

## 7. State Management & Edge Cases

| Scenario | Handling |
|----------|----------|
| Duplicate URL | Detect pre-fetch, reply with existing entry |
| Bot offline, URL missed | No auto-recovery in v1; user can repost |
| Ollama model not loaded | Check on startup, warn in Discord; retry once |
| Article behind paywall | Fetch what's available, note "partial content" in summary |
| X.com / Twitter URL | Use fxtwitter API handler — no Trafilatura, no API key needed |
| Non-article URL (YouTube, GitHub) | Fetch meta only, flag category as appropriate |
| Very long article (>6k chars) | Truncate + note "summarized from first ~6k chars" |
| Multiple URLs in one message | Process all, post cards sequentially |

---

## 8. Future (v2) Ideas

- PDF upload support
- YouTube transcript summarization  
- Weekly digest cron: "Here's what the team saved this week"
- Browser extension / share sheet
- Vector embeddings for semantic search (pgvector or local FAISS)
- OpenClaw skill: `!vault` available without Discord
- Re-process entries with newer/better model
