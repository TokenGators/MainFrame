import os
import re
import time
import httpx
from typing import Optional, Dict, Any
from urllib.parse import urlparse
import trafilatura
from .models import FetchResult

# Fxtwitter API endpoint
FX_TWITTER_API = "https://api.fxtwitter.com"

def fetch_url_content(url: str, timeout: int = 15) -> FetchResult:
    """
    Fetch content from a URL using Trafilatura for articles or fxtwitter for x.com/twiter.com URLs.
    
    Args:
        url (str): The URL to fetch
        timeout (int): Request timeout in seconds
        
    Returns:
        FetchResult: Result containing extracted content and metadata
    """
    try:
        # Check if it's an x.com/twitter.com URL
        if is_x_com_url(url):
            return fetch_x_com_content(url, timeout)
        
        # For regular web articles, use Trafilatura
        return fetch_article_content(url, timeout)
        
    except Exception as e:
        return FetchResult(
            title="",
            author="",
            published="",
            text="",
            word_count=0,
            success=False,
            error=str(e)
        )

def is_x_com_url(url: str) -> bool:
    """Check if URL is from x.com or twitter.com."""
    parsed = urlparse(url)
    return parsed.netloc in ['x.com', 'twitter.com']

def fetch_x_com_content(url: str, timeout: int = 15) -> FetchResult:
    """
    Fetch content from x.com/twiter.com using fxtwitter API.
    
    Args:
        url (str): The x.com URL to fetch
        timeout (int): Request timeout in seconds
        
    Returns:
        FetchResult: Result containing extracted tweet content and metadata
    """
    try:
        # Extract user and status ID from URL
        pattern = r'https?://(?:www\.)?(?:x\.com|twitter\.com)/([^/]+)/status/(\d+)'
        match = re.search(pattern, url)
        
        if not match:
            return FetchResult(
                title="Invalid x.com URL",
                author="",
                published="",
                text="",
                word_count=0,
                success=False,
                error="Could not extract user and status ID from URL"
            )
            
        user = match.group(1)
        status_id = match.group(2)
        
        # Call fxtwitter API
        api_url = f"{FX_TWITTER_API}/{user}/status/{status_id}"
        response = httpx.get(api_url, timeout=timeout, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        
        if response.status_code != 200:
            return FetchResult(
                title="API Error",
                author="",
                published="",
                text="",
                word_count=0,
                success=False,
                error=f"fxtwitter API returned status {response.status_code}"
            )
            
        data = response.json()
        
        # Extract tweet content
        tweet = data.get('tweet', {})
        title = f"Tweet by @{user}"
        author = tweet.get('user', {}).get('name', user)
        published = tweet.get('created_at', '')
        text = tweet.get('text', '')
        
        # Clean up the text (remove URLs, mentions, etc.)
        clean_text = clean_tweet_text(text)
        
        return FetchResult(
            title=title,
            author=author,
            published=published,
            text=clean_text,
            word_count=len(clean_text.split()),
            success=True
        )
        
    except Exception as e:
        return FetchResult(
            title="",
            author="",
            published="",
            text="",
            word_count=0,
            success=False,
            error=str(e)
        )

def fetch_article_content(url: str, timeout: int = 15) -> FetchResult:
    """
    Fetch content from a regular web article using Trafilatura.
    
    Args:
        url (str): The URL to fetch
        timeout (int): Request timeout in seconds
        
    Returns:
        FetchResult: Result containing extracted article content and metadata
    """
    try:
        # Use trafilatura to extract content
        downloaded = trafilatura.fetch_url(url)
        
        if not downloaded:
            return FetchResult(
                title="",
                author="",
                published="",
                text="",
                word_count=0,
                success=False,
                error="Failed to download content"
            )
            
        # Extract metadata and content (returns a Document object)
        metadata = trafilatura.extract_metadata(downloaded)
        title = getattr(metadata, 'title', '') or ''
        author = getattr(metadata, 'author', '') or ''
        published = getattr(metadata, 'date', '') or ''
        
        # Extract content as markdown to preserve structure (headers, lists, etc.)
        content = trafilatura.extract(
            downloaded,
            include_tables=True,
            include_images=False,
            include_links=True,
            include_comments=False,
            include_formatting=True,
            output_format='markdown'
        )
        
        if not content:
            return FetchResult(
                title=title,
                author=author,
                published=published,
                text="",
                word_count=0,
                success=False,
                error="No text content extracted"
            )
            
        # Calculate word count
        word_count = len(content.split())
        
        return FetchResult(
            title=title,
            author=author,
            published=published,
            text=content,
            word_count=word_count,
            success=True
        )
        
    except Exception as e:
        return FetchResult(
            title="",
            author="",
            published="",
            text="",
            word_count=0,
            success=False,
            error=str(e)
        )

def clean_tweet_text(text: str) -> str:
    """
    Clean up tweet text by removing URLs, mentions, hashtags, etc.
    
    Args:
        text (str): Raw tweet text
        
    Returns:
        str: Cleaned tweet text
    """
    # Remove URLs
    text = re.sub(r'http\S+', '', text)
    # Remove @mentions
    text = re.sub(r'@\w+', '', text)
    # Remove hashtags (keep the word after)
    text = re.sub(r'#(\w+)', r'\1', text)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def fetch_multiple_urls(urls: list, timeout: int = 15) -> Dict[str, FetchResult]:
    """
    Fetch content from multiple URLs concurrently.
    
    Args:
        urls (list): List of URLs to fetch
        timeout (int): Request timeout in seconds
        
    Returns:
        Dict[str, FetchResult]: Mapping of URL to fetch result
    """
    results = {}
    
    for url in urls:
        results[url] = fetch_url_content(url, timeout)
        # Add a small delay to be respectful to servers
        time.sleep(0.1)
        
    return results