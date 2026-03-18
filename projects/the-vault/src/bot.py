#!/usr/bin/env python3
"""
Vault Discord Bot
Handles incoming links in Discord and processes them through the Vault pipeline.
"""

import os
import re
import discord
from discord.ext import commands
import asyncio
from typing import Optional, List
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('vault_bot')

# Add src to Python path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.fetcher import fetch_url_content
from src.processor import process_entry
from src.storage import init_db, save_entry, write_markdown

# Bot configuration
TOKEN = os.getenv('DISCORD_BOT_TOKEN')
CHANNEL_ID = int(os.getenv('DISCORD_VAULT_CHANNEL_ID', '0'))
BOT_PREFIX = '!vault'

# Initialize bot
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix=BOT_PREFIX, intents=intents)

@bot.event
async def on_ready():
    """Event when bot is ready."""
    print(f'{bot.user} has logged in!')
    if CHANNEL_ID:
        channel = bot.get_channel(CHANNEL_ID)
        if channel:
            print(f"Monitoring channel: {channel.name}")
        else:
            print("Warning: Channel ID not found")
    else:
        print("Warning: No channel ID configured")

@bot.event
async def on_message(message):
    """Handle incoming messages."""
    # Don't respond to bot messages
    if message.author == bot.user:
        return
    
    # Check if we're in the correct channel (if configured)
    if CHANNEL_ID and message.channel.id != CHANNEL_ID:
        return
    
    # Look for URLs in the message
    urls = extract_urls(message.content)
    
    if urls:
        await process_urls_in_message(message, urls)
    
    # Let other commands run
    await bot.process_commands(message)

@bot.command(name='search')
async def search_command(ctx, *, query: str):
    """Search the vault."""
    try:
        from src.search import search_entries
        
        db_path = os.getenv('DB_PATH', './data/vault.db')
        entries = search_entries(query, db_path, limit=5)
        
        if not entries:
            await ctx.send(f"No results found for '{query}'")
            return
            
        response = f"Search results for '{query}':\n\n"
        for i, entry in enumerate(entries, 1):
            response += f"{i}. **{entry.title}**\n"
            response += f"   _{entry.summary[:100]}..._\n"
            response += f"   [{entry.url}]({entry.url})\n\n"
            
        await ctx.send(response)
        
    except Exception as e:
        logger.error(f"Search command error: {e}")
        await ctx.send("Error performing search")

@bot.command(name='recent')
async def recent_command(ctx, count: int = 5):
    """Show recent entries."""
    try:
        from src.search import get_recent_entries
        
        db_path = os.getenv('DB_PATH', './data/vault.db')
        entries = get_recent_entries(db_path, limit=count)
        
        if not entries:
            await ctx.send("No entries found")
            return
            
        response = f"Recent entries:\n\n"
        for i, entry in enumerate(entries, 1):
            response += f"{i}. **{entry.title}**\n"
            response += f"   _{entry.summary[:100]}..._\n"
            response += f"   [{entry.url}]({entry.url})\n\n"
            
        await ctx.send(response)
        
    except Exception as e:
        logger.error(f"Recent command error: {e}")
        await ctx.send("Error retrieving recent entries")

@bot.command(name='tags')
async def tags_command(ctx):
    """Show all available tags."""
    try:
        from src.search import get_all_tags
        
        db_path = os.getenv('DB_PATH', './data/vault.db')
        tags = get_all_tags(db_path)
        
        if not tags:
            await ctx.send("No tags found")
            return
            
        response = "Available tags:\n\n"
        for tag in tags[:20]:  # Limit to first 20
            response += f"• {tag}\n"
            
        if len(tags) > 20:
            response += f"\n... and {len(tags) - 20} more tags"
            
        await ctx.send(response)
        
    except Exception as e:
        logger.error(f"Tags command error: {e}")
        await ctx.send("Error retrieving tags")

@bot.command(name='info')
async def info_command(ctx):
    """Show bot information."""
    try:
        from src.search import get_entries_count
        
        db_path = os.getenv('DB_PATH', './data/vault.db')
        count = get_entries_count(db_path)
        
        response = f"Vault Bot Information\n"
        response += f"=====================\n"
        response += f"Entries in vault: {count}\n"
        response += f"Channel: {bot.get_channel(CHANNEL_ID).name if CHANNEL_ID else 'Not configured'}\n"
        response += f"Prefix: {BOT_PREFIX}\n"
        
        await ctx.send(response)
        
    except Exception as e:
        logger.error(f"Info command error: {e}")
        await ctx.send("Error retrieving bot information")

async def process_urls_in_message(message, urls: List[str]):
    """Process URLs found in a message."""
    try:
        # Initialize database
        db_path = os.getenv('DB_PATH', './data/vault.db')
        vault_dir = os.getenv('VAULT_DIR', './vault')
        init_db(db_path)
        
        # Process each URL
        for url in urls[:3]:  # Limit to first 3 URLs to avoid spam
            await process_single_url(url, message, db_path, vault_dir)
            
    except Exception as e:
        logger.error(f"Error processing URLs: {e}")
        try:
            await message.channel.send("Error processing links")
        except:
            pass

async def process_single_url(url: str, message, db_path: str, vault_dir: str):
    """Process a single URL through the pipeline."""
    try:
        # Check if URL already exists
        from src.storage import get_by_url
        
        existing_entry = get_by_url(url, db_path)
        if existing_entry:
            await message.channel.send(f"Already in vault: {existing_entry.title}")
            return
            
        # Fetch content
        fetch_result = fetch_url_content(url)
        
        if not fetch_result.success:
            await message.channel.send(f"Failed to fetch: {url} - {fetch_result.error}")
            return
            
        # Process with AI
        import nanoid
        entry_id = f"v_{nanoid.generate(size=10)}"
        
        entry = process_entry(fetch_result, entry_id, url)
        entry.saved_by = message.author.name
        
        # Save to database and write markdown
        save_entry(entry, db_path)
        write_markdown(entry, vault_dir)
        
        # Send confirmation message
        response = f"✅ Added to Vault: {entry.title}\n"
        response += f"   [{url}]({url})\n"
        response += f"   _{entry.summary[:150]}..._"
        
        await message.channel.send(response)
        
    except Exception as e:
        logger.error(f"Error processing single URL {url}: {e}")
        try:
            await message.channel.send(f"Error processing: {url}")
        except:
            pass

def extract_urls(text: str) -> List[str]:
    """Extract URLs from text."""
    # Pattern to match URLs
    url_pattern = re.compile(
        r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
    )
    
    urls = url_pattern.findall(text)
    
    # Remove trailing punctuation
    cleaned_urls = []
    for url in urls:
        # Remove trailing punctuation
        while url and url[-1] in '.!?,;:':
            url = url[:-1]
        if url:
            cleaned_urls.append(url)
            
    return cleaned_urls

# Run the bot
if __name__ == '__main__':
    if not TOKEN:
        print("Error: DISCORD_BOT_TOKEN environment variable not set")
        exit(1)
        
    if not CHANNEL_ID:
        print("Warning: DISCORD_VAULT_CHANNEL_ID environment variable not set")
        
    try:
        bot.run(TOKEN)
    except Exception as e:
        logger.error(f"Failed to start bot: {e}")