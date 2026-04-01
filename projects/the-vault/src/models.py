from dataclasses import dataclass
from typing import List, Optional
import datetime

@dataclass
class VaultEntry:
    id: str  # nanoid, e.g. "v_k3j9xp"
    url: str  # unique URL
    title: Optional[str]
    domain: Optional[str]
    summary: Optional[str]
    key_points: Optional[List[str]]
    tags: Optional[List[str]]
    category: Optional[str]
    author: Optional[str]
    published: Optional[str]  # ISO date string if detectable
    saved_at: str  # ISO timestamp
    saved_by: Optional[str]  # Discord username who dropped the link
    word_count: Optional[int]
    read_time: Optional[int]  # estimated minutes
    raw_content: Optional[str]  # full extracted text (for re-processing)
    discord_msg: Optional[str]  # Discord message ID for reference

@dataclass
class FetchResult:
    title: str
    author: str
    published: str
    text: str
    word_count: int
    success: bool = True
    error: Optional[str] = None

@dataclass
class ProcessedEntry:
    summary: str
    key_points: List[str]
    tags: List[str]
    category: str