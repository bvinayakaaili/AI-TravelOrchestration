"""
Chunker Module
Splits document text into semantic chunks with overlap, avoiding breaking mid-sentence,
and attaches source metadata to each chunk.
"""

import re
import logging
from typing import List, Dict, Any
from datetime import datetime, timezone

from rag.config import DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP

logger = logging.getLogger("rag.chunker")


class TextChunker:
    """Splits clean text documents into indexed chunks with detailed metadata."""

    def __init__(self, chunk_size: int = DEFAULT_CHUNK_SIZE, chunk_overlap: int = DEFAULT_CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def create_chunks(self, clean_data: Dict[str, Any], content_hash: str) -> List[Dict[str, Any]]:
        """
        Split document text into chunks and assign chunk-level metadata.
        Returns a list of dicts: {"text": ..., "id": ..., "metadata": ...}
        """
        text = clean_data.get("clean_text", "")
        destination = clean_data.get("destination", "Unknown")
        source_name = clean_data.get("source_name", "unknown")
        source_url = clean_data.get("source_url", "")
        ingested_at = datetime.now(timezone.utc).isoformat()
        city = destination.lower().strip()

        raw_chunks = self._semantic_split(text)
        chunk_objects = []

        for idx, chunk_text in enumerate(raw_chunks):
            if not chunk_text.strip():
                continue

            # Deterministic, unique chunk ID
            chunk_id = f"{city}_{source_name}_chunk_{idx}"

            chunk_metadata = {
                "destination": destination,
                "city": city,
                "source_name": source_name,
                "source_url": source_url,
                "content_hash": content_hash,
                "chunk_id": chunk_id,
                "chunk_index": idx,
                "ingested_at": ingested_at,
            }

            chunk_objects.append({
                "id": chunk_id,
                "text": chunk_text,
                "metadata": chunk_metadata,
            })

        logger.info(f"Generated {len(chunk_objects)} chunks for {destination} ({source_name})")
        return chunk_objects

    def _semantic_split(self, text: str) -> List[str]:
        """Split text by headings/paragraphs while maintaining target size and overlap."""
        if len(text) <= self.chunk_size:
            return [text]

        # 1. Split text into logical sections based on headers or double newlines
        sections = re.split(r"(\n(?=#{1,6}\s+)|\n\n+)", text)
        
        chunks = []
        current_chunk = ""

        for sec in sections:
            if not sec or not sec.strip():
                continue

            if len(current_chunk) + len(sec) <= self.chunk_size:
                current_chunk += sec
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())

                # If the section itself is larger than chunk_size, split by sentences
                if len(sec) > self.chunk_size:
                    sub_chunks = self._split_large_section(sec)
                    chunks.extend(sub_chunks[:-1])
                    current_chunk = sub_chunks[-1] if sub_chunks else ""
                else:
                    # Apply overlap from previous chunk if available
                    overlap_text = current_chunk[-self.chunk_overlap:] if len(current_chunk) >= self.chunk_overlap else ""
                    current_chunk = overlap_text + sec

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks

    def _split_large_section(self, section: str) -> List[str]:
        """Fallback splitter for long paragraphs using sentence boundaries."""
        sentences = re.split(r"(?<=[.!?])\s+", section)
        sub_chunks = []
        curr = ""

        for sent in sentences:
            if len(curr) + len(sent) <= self.chunk_size:
                curr += (" " if curr else "") + sent
            else:
                if curr:
                    sub_chunks.append(curr.strip())
                curr = sent

        if curr:
            sub_chunks.append(curr.strip())

        return sub_chunks
