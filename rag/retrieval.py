"""
RAG Retrieval Module
Queries indexed destination knowledge in ChromaDB and returns formatted context with source attribution.
"""

import logging
from typing import Optional

from rag.updater import ChromaUpdater

logger = logging.getLogger("rag.retrieval")

_updater_instance: Optional[ChromaUpdater] = None


def get_destination_context(destination: str, query: str, n_results: int = 3) -> str:
    """
    Retrieve relevant context from ChromaDB for a given destination + user query.
    Formats retrieved documents with source attribution metadata.
    
    Args:
        destination: City or target destination (e.g. "Goa")
        query: User search query or preferences
        n_results: Max number of top relevant chunks to retrieve
        
    Returns:
        Formatted context string ready for LLM prompt injection, or empty string.
    """
    global _updater_instance
    if _updater_instance is None:
        _updater_instance = ChromaUpdater()

    try:
        collection = _updater_instance.get_collection()
        if collection.count() == 0:
            logger.warning("ChromaDB collection is empty. Returning empty RAG context.")
            return ""

        search_query = f"{destination} {query}".strip()
        dest_clean = destination.lower().strip()

        # Query with city metadata filter if possible
        results = None
        try:
            results = collection.query(
                query_texts=[search_query],
                n_results=min(n_results, collection.count()),
                where={"city": dest_clean}
            )
        except Exception:
            results = None

        documents = results.get("documents", [[]])[0] if results else []
        metadatas = results.get("metadatas", [[]])[0] if results else []

        # Fallback query without city filter if no results match
        if not documents:
            results = collection.query(
                query_texts=[search_query],
                n_results=min(n_results, collection.count())
            )
            documents = results.get("documents", [[]])[0] if results else []
            metadatas = results.get("metadatas", [[]])[0] if results else []

        if not documents:
            return ""

        formatted_blocks = []
        for doc, meta in zip(documents, metadatas):
            src_name = meta.get("source_name", meta.get("source", "knowledge_base")) if meta else "knowledge_base"
            src_url = meta.get("source_url", "") if meta else ""
            
            attribution = f"[Source: {src_name}" + (f" | URL: {src_url}]" if src_url else "]")
            formatted_blocks.append(f"{attribution}\n{doc}")

        logger.info(f"[RAG Retrieval] Retrieved {len(documents)} context chunks for '{destination}'")
        return "\n\n".join(formatted_blocks)

    except Exception as e:
        logger.warning(f"[RAG Retrieval] ChromaDB query failed: {e}")
        return ""
