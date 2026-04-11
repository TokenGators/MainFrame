import os
import json
import httpx
from typing import Dict, List, Optional
from .models import VaultEntry, ProcessedEntry, FetchResult

# Ollama API endpoint
OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen3.5:35b')

# Prompt templates
SUMMARIZE_PROMPT = """
You are an expert content summarizer. Please provide a concise, clear summary of the following text.
The summary should capture the main points and key information.

Text to summarize:
{content}

Summary (in 1-2 sentences):
"""

KEY_POINTS_PROMPT = """
You are an expert content analyzer. Please extract 3-5 key points from the following text.
Format each point as a clear, concise bullet point.

Text to analyze:
{content}

Key Points:
"""

TAGS_PROMPT = """
You are an expert content categorizer. Based on the following text, please suggest 3-5 relevant tags.
Tags should be lowercase and hyphenated (e.g., 'machine-learning', 'python-programming').

Text to categorize:
{content}

Tags (comma-separated):
"""

CATEGORY_PROMPT = """
You are an expert content classifier. Based on the following text, please classify it into one of these categories:
Technology, Science, Business, Education, Arts, Sports, Health, Politics, Entertainment, Lifestyle, Other

Text to classify:
{content}

Category:
"""

def process_content(fetch_result: FetchResult, timeout: int = 120) -> ProcessedEntry:
    """
    Process fetched content using Ollama AI.
    
    Args:
        fetch_result (FetchResult): Result from fetching URL content
        timeout (int): Request timeout in seconds
        
    Returns:
        ProcessedEntry: AI-processed results including summary, key points, tags, and category
    """
    if not fetch_result.success:
        raise Exception(f"Cannot process failed fetch result: {fetch_result.error}")
    
    # Create a combined text for processing (title + content)
    combined_text = f"{fetch_result.title}\n\n{fetch_result.text}"
    
    # Get summary
    summary = get_ai_summary(combined_text, timeout)
    
    # Get key points
    key_points = get_ai_key_points(combined_text, timeout)
    
    # Get tags
    tags = get_ai_tags(combined_text, timeout)
    
    # Get category
    category = get_ai_category(combined_text, timeout)
    
    return ProcessedEntry(
        summary=summary,
        key_points=key_points,
        tags=tags,
        category=category
    )

def get_ai_summary(content: str, timeout: int = 120) -> str:
    """Get AI-generated summary of content."""
    prompt = SUMMARIZE_PROMPT.format(content=content[:6000])  # Limit content size
    
    response = call_ollama(prompt, timeout)
    return response.strip()

def get_ai_key_points(content: str, timeout: int = 120) -> List[str]:
    """Get AI-generated key points from content."""
    prompt = KEY_POINTS_PROMPT.format(content=content[:6000])  # Limit content size
    
    response = call_ollama(prompt, timeout)
    
    # Parse the response into bullet points
    lines = [line.strip() for line in response.split('\n') if line.strip()]
    key_points = []
    
    for line in lines:
        if line.startswith('- ') or line.startswith('* '):
            key_points.append(line[2:].strip())
        elif line and not line.startswith('#'):
            key_points.append(line.strip())
    
    return key_points[:5]  # Limit to 5 points

def get_ai_tags(content: str, timeout: int = 120) -> List[str]:
    """Get AI-generated tags for content."""
    prompt = TAGS_PROMPT.format(content=content[:6000])  # Limit content size
    
    response = call_ollama(prompt, timeout)
    
    # Parse comma-separated tags
    tags = [tag.strip().lower() for tag in response.split(',') if tag.strip()]
    
    # Convert to hyphenated format and limit to 5
    formatted_tags = []
    for tag in tags[:5]:
        # Convert spaces and special characters to hyphens
        formatted_tag = ''.join(c if c.isalnum() else '-' for c in tag.lower()).strip('-')
        if formatted_tag:
            formatted_tags.append(formatted_tag)
    
    return formatted_tags

def get_ai_category(content: str, timeout: int = 120) -> str:
    """Get AI-generated category for content."""
    prompt = CATEGORY_PROMPT.format(content=content[:6000])  # Limit content size
    
    response = call_ollama(prompt, timeout)
    
    # Normalize category name
    category = response.strip().lower()
    
    # Map to standard categories
    category_map = {
        'technology': 'Technology',
        'science': 'Science', 
        'business': 'Business',
        'education': 'Education',
        'arts': 'Arts',
        'sports': 'Sports',
        'health': 'Health',
        'politics': 'Politics',
        'entertainment': 'Entertainment',
        'lifestyle': 'Lifestyle',
        'other': 'Other'
    }
    
    return category_map.get(category, 'Other')

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
            "stream": False
        }
        
        # Call Ollama API
        response = httpx.post(
            f"{OLLAMA_HOST}/api/generate",
            json=payload,
            timeout=timeout
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
        word_count=fetch_result.word_count,
        read_time=estimate_read_time(fetch_result.word_count),
        raw_content=fetch_result.text
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