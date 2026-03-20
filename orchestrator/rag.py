"""
RAG Engine using ChromaDB + Ollama Embeddings.
Loads destination knowledge from data/knowledge/*.md files,
embeds them, and retrieves relevant context for any travel query.
"""

import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("travel_rag")

KNOWLEDGE_DIR = Path(__file__).parent.parent / "data" / "knowledge"
CHROMA_PERSIST_DIR = Path(__file__).parent.parent / "data" / "chroma_db"

# Lazy-init globals
_collection = None
_client = None


def _get_collection():
    """Initialize ChromaDB collection on first access."""
    global _collection, _client

    if _collection is not None:
        return _collection

    try:
        import chromadb
        from chromadb.utils import embedding_functions

        # Use a sentence-transformers embedding function (no server needed)
        emb_fn = embedding_functions.DefaultEmbeddingFunction()

        _client = chromadb.PersistentClient(path=str(CHROMA_PERSIST_DIR))
        _collection = _client.get_or_create_collection(
            name="travel_knowledge",
            embedding_function=emb_fn,
            metadata={"hnsw:space": "cosine"}
        )

        # Populate if empty
        if _collection.count() == 0:
            _load_knowledge_files(_collection)

        logger.info(f"ChromaDB ready — {_collection.count()} chunks loaded")
        return _collection

    except Exception as e:
        logger.warning(f"ChromaDB unavailable: {e} — RAG context will be skipped")
        return None


def _load_knowledge_files(collection):
    """Read markdown knowledge files and index them into ChromaDB."""
    if not KNOWLEDGE_DIR.exists():
        logger.warning(f"Knowledge directory not found: {KNOWLEDGE_DIR}")
        return

    md_files = list(KNOWLEDGE_DIR.glob("*.md"))
    if not md_files:
        logger.warning("No knowledge files found")
        return

    docs, ids, metadatas = [], [], []
    chunk_size = 600   # characters per chunk

    for filepath in md_files:
        city = filepath.stem.lower()
        content = filepath.read_text(encoding="utf-8")

        # Split into overlapping chunks
        chunks = []
        start = 0
        while start < len(content):
            end = min(start + chunk_size, len(content))
            # Try to end at a newline
            if end < len(content):
                newline_pos = content.rfind("\n", start, end)
                if newline_pos > start:
                    end = newline_pos
            chunks.append(content[start:end].strip())
            start = end

        for i, chunk in enumerate(chunks):
            chunk_id = f"{city}_chunk_{i}"
            docs.append(chunk)
            ids.append(chunk_id)
            metadatas.append({"city": city, "source": str(filepath.name)})

    if docs:
        collection.add(documents=docs, ids=ids, metadatas=metadatas)
        logger.info(f"Indexed {len(docs)} chunks from {len(md_files)} knowledge files")


def get_destination_context(destination: str, query: str, n_results: int = 3) -> str:
    """
    Retrieve relevant context from ChromaDB for a given destination + query.
    Returns a formatted string to inject into the LLM prompt, or empty string if unavailable.
    """
    collection = _get_collection()
    if collection is None:
        return ""

    try:
        # Build a search query combining destination + user intent
        search_query = f"{destination} {query}"

        results = collection.query(
            query_texts=[search_query],
            n_results=min(n_results, collection.count()),
            where={"city": destination.lower()} if _has_knowledge_for(destination) else None,
        )

        documents = results.get("documents", [[]])[0]
        if not documents:
            # Fallback: search without city filter
            results = collection.query(
                query_texts=[search_query],
                n_results=min(n_results, collection.count()),
            )
            documents = results.get("documents", [[]])[0]

        if documents:
            context = "\n\n".join(documents)
            logger.info(f"RAG: retrieved {len(documents)} chunks for '{destination}'")
            return context

    except Exception as e:
        logger.warning(f"RAG query failed: {e}")

    return ""


def _has_knowledge_for(destination: str) -> bool:
    """Check if we have indexed knowledge for this destination."""
    known_cities = {f.stem.lower() for f in KNOWLEDGE_DIR.glob("*.md")} if KNOWLEDGE_DIR.exists() else set()
    return destination.lower().strip() in known_cities


def rebuild_index():
    """Force rebuild the ChromaDB index (useful after adding new knowledge files)."""
    global _collection, _client
    _collection = None
    _client = None
    col = _get_collection()
    return {"chunks": col.count() if col else 0}
