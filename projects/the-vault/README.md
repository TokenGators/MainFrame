# The Vault

The Vault is a Discord bot that intelligently collects, processes, and organizes links shared in Discord channels. It uses AI to summarize content, extract key points, categorize articles, and provides full-text search capabilities.

## Features

- **Link Collection**: Automatically collects links posted in Discord channels
- **AI Processing**: Summarizes content, extracts key points, and tags articles
- **Full-Text Search**: Search through all collected content using FTS5
- **Tag Filtering**: Organize content by tags for easy retrieval
- **Markdown Export**: Save processed entries as markdown files for local backup

## Setup

### Prerequisites

- Python 3.8+
- Ollama (for AI processing)
- Discord Bot Token
- SQLite 3

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd the-vault
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Initialize the project:
```bash
python setup.py
```

4. Set up environment variables in `.env`:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Configuration

Create a `.env` file based on `.env.example`:

```
DISCORD_BOT_TOKEN=<your-discord-bot-token>
DISCORD_VAULT_CHANNEL_ID=<channel-id>
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3.5:35b
DB_PATH=./data/vault.db
VAULT_DIR=./vault
MAX_CONTENT_CHARS=6000
REQUEST_TIMEOUT=15
```

## Usage

### Running the Bot

```bash
python src/bot.py
```

### In Discord

When you post a link in the configured channel, The Vault will automatically process it.

Available commands:
- `!vault search <query>` - Search through all entries
- `!vault recent [count]` - Show recent entries  
- `!vault tags` - List all available tags
- `!vault info` - Show bot information

### Command Line Ingestion

Process URLs directly from the command line:
```bash
python src/ingest.py https://example.com https://another-example.com
```

## Pipeline Overview

1. **Fetcher**: Extracts content using Trafilatura for articles and fxtwitter API for X.com links
2. **Processor**: Uses Ollama AI to summarize, extract key points, and tag content  
3. **Storage**: Saves entries to SQLite database with FTS5 indexing
4. **Search**: Full-text search capabilities across all content
5. **Discord Bot**: Monitors channels and processes links automatically

## Directory Structure

```
the-vault/
├── src/                 # Source code
│   ├── fetcher.py       # Content fetching
│   ├── processor.py     # AI processing with Ollama
│   ├── storage.py       # Database operations
│   ├── search.py        # Search functionality
│   └── bot.py           # Discord bot
├── data/                # Database and temporary files
├── vault/               # Markdown backup files
├── .env.example         # Environment variables example
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

## Development

### Adding New Features

1. Create new modules in `src/`
2. Update `requirements.txt` if adding new dependencies
3. Commit each phase separately using the workflow:
   ```bash
   ./scripts/git-workflow.sh save <type> the-vault "phase X: description"
   ```

### Database Schema

The Vault uses SQLite with FTS5 for full-text search capabilities:

```sql
CREATE TABLE entries (
    id          TEXT PRIMARY KEY,
    url         TEXT NOT NULL UNIQUE,
    title       TEXT,
    domain      TEXT,
    summary     TEXT,
    key_points  TEXT,
    tags        TEXT,
    category    TEXT,
    author      TEXT,
    published   TEXT,
    saved_at    TEXT NOT NULL,
    saved_by    TEXT,
    word_count  INTEGER,
    read_time   INTEGER,
    raw_content TEXT,
    discord_msg TEXT
);

CREATE VIRTUAL TABLE entries_fts USING fts5(
    title, summary, key_points, tags, raw_content,
    content='entries', content_rowid='rowid'
);
```

## License

MIT License