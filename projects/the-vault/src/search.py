import sqlite3
from typing import List, Optional, Dict, Any
from .models import VaultEntry

def search_entries(query: str, db_path: str, limit: int = 20, tags: Optional[List[str]] = None) -> List[VaultEntry]:
    """
    Search entries in the vault using FTS5.
    
    Args:
        query (str): Search query
        db_path (str): Path to database file
        limit (int): Maximum number of results to return
        tags (List[str], optional): Filter by specific tags
        
    Returns:
        List[VaultEntry]: List of matching VaultEntries
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Build the search query with optional tag filtering
    if tags:
        # Create a query that searches for entries with specified tags
        tag_conditions = " OR ".join([f"tags LIKE '%{tag}%'" for tag in tags])
        sql = f"""
            SELECT * FROM entries 
            WHERE rowid IN (
                SELECT rowid FROM entries_fts 
                WHERE entries_fts MATCH ?
                AND ({tag_conditions})
            )
            ORDER BY saved_at DESC
            LIMIT ?
        """
        cursor.execute(sql, (query, limit))
    else:
        # Simple FTS search
        sql = """
            SELECT * FROM entries 
            WHERE rowid IN (
                SELECT rowid FROM entries_fts 
                WHERE entries_fts MATCH ?
            )
            ORDER BY saved_at DESC
            LIMIT ?
        """
        cursor.execute(sql, (query, limit))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [row_to_entry(row) for row in rows]

def get_recent_entries(db_path: str, limit: int = 20) -> List[VaultEntry]:
    """
    Get the most recently saved entries.
    
    Args:
        db_path (str): Path to database file
        limit (int): Maximum number of results to return
        
    Returns:
        List[VaultEntry]: List of recent VaultEntries
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM entries 
        ORDER BY saved_at DESC 
        LIMIT ?
    """, (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [row_to_entry(row) for row in rows]

def get_entries_by_tag(tag: str, db_path: str, limit: int = 20) -> List[VaultEntry]:
    """
    Get entries filtered by a specific tag.
    
    Args:
        tag (str): Tag to filter by
        db_path (str): Path to database file
        limit (int): Maximum number of results to return
        
    Returns:
        List[VaultEntry]: List of VaultEntries with the specified tag
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Search for entries that contain the tag in their tags list
    cursor.execute("""
        SELECT * FROM entries 
        WHERE tags LIKE ?
        ORDER BY saved_at DESC 
        LIMIT ?
    """, (f'%{tag}%', limit))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [row_to_entry(row) for row in rows]

def get_all_tags(db_path: str) -> List[str]:
    """
    Get all unique tags from entries.
    
    Args:
        db_path (str): Path to database file
        
    Returns:
        List[str]: List of all unique tags
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT DISTINCT tags FROM entries WHERE tags IS NOT NULL")
    rows = cursor.fetchall()
    conn.close()
    
    # Flatten and deduplicate tags
    all_tags = set()
    for row in rows:
        if row[0]:
            # Parse the JSON string representation of the list
            try:
                import ast
                tags_list = ast.literal_eval(row[0])
                all_tags.update(tags_list)
            except:
                # If parsing fails, treat as a single tag
                all_tags.add(row[0].strip())
    
    return sorted(list(all_tags))

def get_entries_count(db_path: str) -> int:
    """
    Get the total number of entries in the vault.
    
    Args:
        db_path (str): Path to database file
        
    Returns:
        int: Total number of entries
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM entries")
    count = cursor.fetchone()[0]
    conn.close()
    
    return count

def row_to_entry(row) -> VaultEntry:
    """
    Convert a database row to a VaultEntry object.
    
    Args:
        row: Database row
        
    Returns:
        VaultEntry: Converted VaultEntry
    """
    # Convert lists from JSON strings
    key_points = eval(row[5]) if row[5] else None
    tags = eval(row[6]) if row[6] else None
    
    return VaultEntry(
        id=row[0],
        url=row[1],
        title=row[2],
        domain=row[3],
        summary=row[4],
        key_points=key_points,
        tags=tags,
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

def search_entries_detailed(query: str, db_path: str, limit: int = 20) -> Dict[str, Any]:
    """
    Perform a detailed search with additional metadata.
    
    Args:
        query (str): Search query
        db_path (str): Path to database file
        limit (int): Maximum number of results to return
        
    Returns:
        Dict[str, Any]: Search results with metadata
    """
    entries = search_entries(query, db_path, limit)
    
    # Get tag statistics for the search results
    all_tags = get_all_tags(db_path)
    
    return {
        'query': query,
        'count': len(entries),
        'entries': entries,
        'tags': all_tags,
        'timestamp': datetime.now().isoformat()
    }

# Example usage function
def demo_search():
    """Demonstrate search functionality."""
    db_path = './data/vault.db'
    
    # Get recent entries
    recent = get_recent_entries(db_path, 5)
    print("Recent entries:")
    for entry in recent:
        print(f"  • {entry.title} ({entry.saved_at})")
    
    # Get all tags
    tags = get_all_tags(db_path)
    print(f"\nAvailable tags: {', '.join(tags[:10])}")
    
    # Search with a query
    if tags:
        sample_tag = tags[0]
        tagged_entries = get_entries_by_tag(sample_tag, db_path, 5)
        print(f"\nEntries with tag '{sample_tag}':")
        for entry in tagged_entries:
            print(f"  • {entry.title}")

if __name__ == '__main__':
    demo_search()