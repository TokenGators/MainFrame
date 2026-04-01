import os
import sqlite3
from typing import Optional, List
from .models import VaultEntry
import markdown

def init_db(db_path: str):
    """Initialize the database with tables and FTS5 index."""
    # Create data directory if it doesn't exist
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create entries table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS entries (
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
        )
    ''')
    
    # Create FTS5 virtual table for full-text search
    cursor.execute('''
        CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
            title, summary, key_points, tags, raw_content,
            content='entries', content_rowid='rowid'
        )
    ''')
    
    # Create triggers to maintain FTS index
    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS entries_fts_insert 
        AFTER INSERT ON entries 
        BEGIN
            INSERT INTO entries_fts(rowid, title, summary, key_points, tags, raw_content)
            VALUES (new.rowid, new.title, new.summary, new.key_points, new.tags, new.raw_content);
        END;
    ''')
    
    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS entries_fts_update 
        AFTER UPDATE ON entries 
        BEGIN
            UPDATE entries_fts SET 
                title = new.title,
                summary = new.summary,
                key_points = new.key_points,
                tags = new.tags,
                raw_content = new.raw_content
            WHERE rowid = old.rowid;
        END;
    ''')
    
    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS entries_fts_delete 
        AFTER DELETE ON entries 
        BEGIN
            DELETE FROM entries_fts WHERE rowid = old.rowid;
        END;
    ''')
    
    conn.commit()
    conn.close()

def save_entry(entry: VaultEntry, db_path: str):
    """Save a VaultEntry to the database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Convert lists to JSON strings for storage
    key_points_json = '[]' if entry.key_points is None else str(entry.key_points)
    tags_json = '[]' if entry.tags is None else str(entry.tags)
    
    cursor.execute('''
        INSERT OR REPLACE INTO entries 
        (id, url, title, domain, summary, key_points, tags, category, author, published,
         saved_at, saved_by, word_count, read_time, raw_content, discord_msg)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        entry.id, entry.url, entry.title, entry.domain, entry.summary,
        key_points_json, tags_json, entry.category, entry.author, entry.published,
        entry.saved_at, entry.saved_by, entry.word_count, entry.read_time,
        entry.raw_content, entry.discord_msg
    ))
    
    conn.commit()
    conn.close()

def _build_markdown_content(entry: VaultEntry, full_content: bool = False) -> str:
    """Build the markdown content for a vault entry.
    
    Args:
        entry: The vault entry to format
        full_content: If True, include the full raw_content body for indexing (Obsidian).
                      If False, include only the digest (DB sidecar / legacy vault).
    """
    md_content = f"""---
id: {entry.id}
url: {entry.url}
title: {entry.title or ''}
category: {entry.category or ''}
tags: {entry.tags or []}
saved_at: {entry.saved_at}
saved_by: {entry.saved_by or ''}
read_time: {entry.read_time or 0} min
---

# {entry.title or ''}

## Summary
{entry.summary or ''}

## Key Points
"""
    if entry.key_points:
        for point in entry.key_points:
            md_content += f"- {point}\n"
    else:
        md_content += "- No key points extracted\n"

    if full_content and entry.raw_content:
        md_content += f"""
## Full Content

{entry.raw_content}
"""

    md_content += f"""
## Source
{entry.url}
"""
    return md_content


def write_markdown(entry: VaultEntry, vault_dir: str):
    """Write a markdown sidecar file for the entry (year-month subdirectory structure)."""
    # Create vault directory if it doesn't exist
    os.makedirs(vault_dir, exist_ok=True)
    
    # Format saved_at to get year-month for directory structure
    saved_at_dt = entry.saved_at.split('T')[0]  # Extract date part
    year_month = saved_at_dt[:7]  # YYYY-MM
    
    # Create year-month subdirectory
    subdir = os.path.join(vault_dir, year_month)
    os.makedirs(subdir, exist_ok=True)
    
    # Generate filename from title (replace spaces with hyphens and make lowercase)
    if entry.title:
        slug = ''.join(c if c.isalnum() else '-' for c in entry.title.lower()).strip('-')
        filename = f"{entry.id}-{slug[:50]}.md"
    else:
        filename = f"{entry.id}.md"
    
    filepath = os.path.join(subdir, filename)
    
    with open(filepath, 'w') as f:
        f.write(_build_markdown_content(entry, full_content=False))


def write_to_obsidian_inbox(entry: VaultEntry, obsidian_inbox: str):
    """Write a clean markdown file directly to an Obsidian inbox folder (flat, no subdirs)."""
    os.makedirs(obsidian_inbox, exist_ok=True)
    
    # Generate filename from title
    if entry.title:
        slug = ''.join(c if c.isalnum() else '-' for c in entry.title.lower()).strip('-')
        filename = f"{entry.id}-{slug[:60]}.md"
    else:
        filename = f"{entry.id}.md"
    
    filepath = os.path.join(obsidian_inbox, filename)
    
    with open(filepath, 'w') as f:
        f.write(_build_markdown_content(entry, full_content=True))
    
    return filepath

def get_by_url(url: str, db_path: str) -> Optional[VaultEntry]:
    """Get a VaultEntry by URL or None if not found."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM entries WHERE url = ?', (url,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return VaultEntry(
            id=row[0],
            url=row[1],
            title=row[2],
            domain=row[3],
            summary=row[4],
            key_points=eval(row[5]) if row[5] else None,
            tags=eval(row[6]) if row[6] else None,
            category=row[7],
            author=row[8],
            published=row[9],
            saved_at=row[10],
            saved_by=row[11],
            word_count=row[12],
            read_time=row[13],
            raw_content=row[14],
            discord_msg=row[15]
        )
    return None

def get_by_id(entry_id: str, db_path: str) -> Optional[VaultEntry]:
    """Get a VaultEntry by ID or None if not found."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM entries WHERE id = ?', (entry_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return VaultEntry(
            id=row[0],
            url=row[1],
            title=row[2],
            domain=row[3],
            summary=row[4],
            key_points=eval(row[5]) if row[5] else None,
            tags=eval(row[6]) if row[6] else None,
            category=row[7],
            author=row[8],
            published=row[9],
            saved_at=row[10],
            saved_by=row[11],
            word_count=row[12],
            read_time=row[13],
            raw_content=row[14],
            discord_msg=row[15]
        )
    return None

def update_fts(entry: VaultEntry, db_path: str):
    """Update the FTS index for an entry."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Update the FTS table manually
    cursor.execute('''
        UPDATE entries_fts 
        SET title = ?, summary = ?, key_points = ?, tags = ?, raw_content = ?
        WHERE rowid = (
            SELECT rowid FROM entries WHERE id = ?
        )
    ''', (entry.title, entry.summary, str(entry.key_points), str(entry.tags), entry.raw_content, entry.id))
    
    conn.commit()
    conn.close()