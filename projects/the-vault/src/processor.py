import os
import re
import json
import httpx
from urllib.parse import urlparse
from typing import Dict, List, Optional
from .models import VaultEntry, ProcessedEntry, FetchResult

# Ollama API endpoint
OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen3.5:35b')
MAX_CONTENT_CHARS = int(os.getenv('MAX_CONTENT_CHARS', '6000'))

# Single combined prompt — one Ollama call, one JSON response
COMBINED_PROMPT = """You are a research assistant cataloging articles for a team knowledge base.

Article title: {title}
Content:
{content}

Respond in this exact JSON format (no other text, no markdown code blocks):
{{"summary": "3-5 sentence summary of what this article is about and why it matters", "key_points": ["point 1", "point 2", "point 3", "point 4", "point 5"], "tags": ["tag1", "tag2", "tag3"], "category": "one of: AI | Dev | Crypto | Design | Business | Culture | General"}}"""

def process_content(fetch_result: FetchResult, timeout: int = 300) -> ProcessedEntry:
    """Process fetched content using a single Ollama AI call returning JSON."""
    if not fetch_result.success:
        raise Exception(f"Cannot process failed fetch result: {fetch_result.error}")

    prompt = COMBINED_PROMPT.format(
        title=fetch_result.title or 'Untitled',
        content=fetch_result.text[:MAX_CONTENT_CHARS]
    )

    raw = call_ollama(prompt, timeout)

    # Parse JSON — strip markdown code fences if model wraps them
    cleaned = raw.strip()
    if cleaned.startswith('```'):
        cleaned = re.sub(r'^```[a-z]*\n?', '', cleaned)
        cleaned = re.sub(r'\n?```$', '', cleaned)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: extract JSON object with regex
        m = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if m:
            data = json.loads(m.group())
        else:
            data = {}

    return ProcessedEntry(
        summary=data.get('summary', 'No summary available.'),
        key_points=data.get('key_points', []),
        tags=data.get('tags', []),
        category=data.get('category', 'General')
    )

def call_ollama(prompt: str, timeout: int = 120) -> str:
    """
    Call Ollama API with the given prompt.
    
    Args:
        prompt (str): The prompt to send to Ollama
        timeout (int): Request timeout in seconds
        
    Returns:
        str: Response from Ollama
    """
    try:
        # Prepare the payload for Ollama
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.3, "num_ctx": 8192}
        }

        # Call Ollama API
        response = httpx.post(
            f"{OLLAMA_HOST}/api/generate",
            json=payload,
            timeout=httpx.Timeout(timeout, connect=10.0)
        )
        
        if response.status_code != 200:
            raise Exception(f"Ollama API returned status {response.status_code}: {response.text}")
        
        # Parse the JSON response
        data = response.json()
        
        return data.get('response', '').strip()
        
    except httpx.TimeoutException:
        raise Exception("Ollama request timed out")
    except Exception as e:
        raise Exception(f"Error calling Ollama: {str(e)}")

def process_entry(fetch_result: FetchResult, entry_id: str, url: str) -> VaultEntry:
    """
    Process a fetch result into a complete VaultEntry.
    
    Args:
        fetch_result (FetchResult): Result from fetching URL content
        entry_id (str): Unique ID for the entry
        url (str): Original URL
        
    Returns:
        VaultEntry: Complete VaultEntry with processed data
    """
    # Process the content with AI
    processed = process_content(fetch_result)
    
    # Create VaultEntry
    import datetime
    now = datetime.datetime.now().isoformat()
    
    return VaultEntry(
        id=entry_id,
        url=url,
        title=fetch_result.title,
        domain=get_domain_from_url(url),
        summary=processed.summary,
        key_points=processed.key_points,
        tags=processed.tags,
        category=processed.category,
        author=fetch_result.author,
        published=fetch_result.published,
        saved_at=now,
        saved_by=None,
        word_count=fetch_result.word_count,
        read_time=estimate_read_time(fetch_result.word_count),
        raw_content=fetch_result.text,
        discord_msg=None
    )

def get_domain_from_url(url: str) -> str:
    """Extract domain from URL."""
    try:
        parsed = urlparse(url)
        return parsed.netloc
    except:
        return url

def estimate_read_time(word_count: int) -> int:
    """Estimate read time in minutes (assuming 200 words per minute)."""
    if word_count is None:
        return 0
    return max(1, word_count // 200)

# Utility function to process multiple entries
def process_multiple_entries(fetch_results: Dict[str, FetchResult]) -> Dict[str, VaultEntry]:
    """
    Process multiple fetch results into VaultEntries.
    
    Args:
        fetch_results (Dict[str, FetchResult]): Mapping of URLs to fetch results
        
    Returns:
        Dict[str, VaultEntry]: Mapping of entry IDs to processed entries
    """
    entries = {}
    
    for url, result in fetch_results.items():
        # Generate a unique ID for each entry
        import nanoid
        entry_id = f"v_{nanoid.generate(size=10)}"
        
        try:
            entry = process_entry(result, entry_id, url)
            entries[entry_id] = entry
        except Exception as e:
            print(f"Error processing {url}: {str(e)}")
            # Continue with other entries even if one fails
    
    return entries