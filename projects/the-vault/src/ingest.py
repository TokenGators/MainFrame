#!/usr/bin/env python3
"""
Vault Ingest Pipeline
Processes URLs through the complete pipeline: fetch -> process -> store
"""

import os
import sys
import argparse
import json
from typing import List, Dict, Optional
from datetime import datetime

# Add src to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.fetcher import fetch_url_content, fetch_multiple_urls
from src.processor import process_entry, process_multiple_entries
from src.storage import init_db, save_entry, write_markdown

def ingest_single_url(url: str, db_path: str, vault_dir: str) -> Optional[Dict]:
    """
    Ingest a single URL through the complete pipeline.
    
    Args:
        url (str): The URL to ingest
        db_path (str): Path to database file
        vault_dir (str): Path to vault directory
        
    Returns:
        Dict or None: Result dictionary if successful, None if failed
    """
    print(f"📥 Processing: {url}")
    
    # 1. Fetch content
    fetch_result = fetch_url_content(url)
    
    if not fetch_result.success:
        print(f"❌ Failed to fetch: {fetch_result.error}")
        return None
    
    # 2. Process with AI
    try:
        # Generate a unique ID for the entry
        import nanoid
        entry_id = f"v_{nanoid.generate(size=10)}"
        
        entry = process_entry(fetch_result, entry_id, url)
        
        # 3. Save to database
        save_entry(entry, db_path)
        
        # 4. Write markdown file
        write_markdown(entry, vault_dir)
        
        print(f"✅ Successfully ingested: {entry.title}")
        
        return {
            'id': entry.id,
            'url': entry.url,
            'title': entry.title,
            'saved_at': entry.saved_at
        }
        
    except Exception as e:
        print(f"❌ Error processing entry: {str(e)}")
        return None

def ingest_multiple_urls(urls: List[str], db_path: str, vault_dir: str) -> List[Dict]:
    """
    Ingest multiple URLs through the complete pipeline.
    
    Args:
        urls (List[str]): List of URLs to ingest
        db_path (str): Path to database file
        vault_dir (str): Path to vault directory
        
    Returns:
        List[Dict]: List of successful ingestion results
    """
    print(f"📥 Ingesting {len(urls)} URLs...")
    
    # Initialize database
    init_db(db_path)
    
    results = []
    
    # Fetch all URLs first
    fetch_results = fetch_multiple_urls(urls)
    
    # Process each fetch result
    for url, fetch_result in fetch_results.items():
        if not fetch_result.success:
            print(f"❌ Failed to fetch {url}: {fetch_result.error}")
            continue
            
        try:
            # Generate a unique ID for the entry
            import nanoid
            entry_id = f"v_{nanoid.generate(size=10)}"
            
            entry = process_entry(fetch_result, entry_id, url)
            
            # Save to database
            save_entry(entry, db_path)
            
            # Write markdown file
            write_markdown(entry, vault_dir)
            
            results.append({
                'id': entry.id,
                'url': entry.url,
                'title': entry.title,
                'saved_at': entry.saved_at
            })
            
            print(f"✅ Successfully ingested: {entry.title}")
            
        except Exception as e:
            print(f"❌ Error processing {url}: {str(e)}")
    
    return results

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description='Vault Ingest Pipeline')
    parser.add_argument('urls', nargs='+', help='URL(s) to ingest')
    parser.add_argument('--db-path', default='./data/vault.db', help='Database path (default: ./data/vault.db)')
    parser.add_argument('--vault-dir', default='./vault', help='Vault directory (default: ./vault)')
    
    args = parser.parse_args()
    
    # Initialize database
    init_db(args.db_path)
    
    # Process URLs
    results = ingest_multiple_urls(args.urls, args.db_path, args.vault_dir)
    
    # Print summary
    print(f"\n📊 Summary: {len(results)} URLs successfully ingested")
    
    if results:
        for result in results:
            print(f"  • {result['title']} ({result['url']})")

if __name__ == '__main__':
    main()