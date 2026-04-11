# The Vault — Project Overview

**Project:** the-vault  
**Type:** Link Intelligence Pipeline  
**Status:** Spec / Pre-build  
**Stack:** Python 3.11+, SQLite, Ollama (35B), Discord.py, Trafilatura  

---

## What Is This?

The Vault is a team knowledge pipeline. Drop a link anywhere (Discord channel, slash command) and an agent fetches the content, summarizes it with a local AI model, tags it automatically, and catalogs it for search and retrieval later.

Think Readwise Reader + Raindrop.io — but local, AI-first, and Discord-native.

---

## Why Build It?

| Tool | What's Good | What's Missing |
|------|-------------|----------------|
| Pocket | Simple save-it-later | Shut down, no AI |
| Raindrop.io | Great collections/tags | Manual tagging, cloud-only, no summarization |
| Readwise Reader | Highlights, RSS | Paid, no team workflow, no Discord |
| Omnivore | Open source, highlights | No AI, no Discord, clunky self-host |

None of them fit: **team-first, Discord-native, local AI, zero cloud lock-in.**

---

## Core Flow

```
User drops URL in #the-vault Discord channel
        ↓
Discord bot picks up the message
        ↓
Fetcher: pulls full page content (Trafilatura)
        ↓
Processor: local 35B model → summary + tags + category
        ↓
Storage: SQLite + markdown export
        ↓
Discord: posts formatted digest card back to channel
        ↓
Searchable later via !vault search <query>
```

---

## Stack Decisions

- **Language:** Python 3.11 (consistent with brand-story scripts)
- **AI Model:** `ollama/qwen3.5:35b` via local Ollama API (`http://localhost:11434`)
- **Content Extraction:** Trafilatura (best-in-class article extraction, handles JS-heavy pages via fallback)
- **Database:** SQLite (local, zero-dependency, portable) + markdown sidecar files for human readability
- **Discord Interface:** discord.py bot + slash commands
- **Search:** SQLite FTS5 full-text search (built-in, fast)
- **Config:** `.env` file, no hardcoded secrets

---

## Non-Goals (v1)

- No web UI (Discord is the UI)
- No cloud sync
- No browser extension
- No PDF/YouTube support (v2)
- No multi-user auth
