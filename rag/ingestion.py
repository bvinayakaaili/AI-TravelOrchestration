"""
RAG Ingestion Pipeline Engine
Main orchestration entry point for fetching, cleaning, hashing, chunking,
embedding, and updating destination knowledge into ChromaDB.
"""

import sys
import time
import logging
from typing import List, Dict, Any, Optional

from rag.config import load_sources_config, BASE_DIR
from rag.source_fetcher import SourceFetcher
from rag.content_cleaner import ContentCleaner
from rag.chunker import TextChunker
from rag.updater import ManifestManager, ChromaUpdater, compute_content_hash

# Setup formatted logging for CLI and application
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("rag.ingestion")


class RAGIngestionPipeline:
    """Automated RAG knowledge ingestion and update pipeline."""

    def __init__(self, fetcher: Optional[SourceFetcher] = None,
                 cleaner: Optional[ContentCleaner] = None,
                 chunker: Optional[TextChunker] = None,
                 updater: Optional[ChromaUpdater] = None,
                 manifest_manager: Optional[ManifestManager] = None):
        self.fetcher = fetcher or SourceFetcher()
        self.cleaner = cleaner or ContentCleaner()
        self.chunker = chunker or TextChunker()
        self.updater = updater or ChromaUpdater()
        self.manifest_manager = manifest_manager or ManifestManager()

    def run(self, sources: Optional[List[Dict[str, Any]]] = None, force: bool = False) -> Dict[str, Any]:
        """
        Execute full RAG ingestion pipeline across configured sources.
        
        Args:
            sources: Optional list of source definitions. Defaults to loaded configuration.
            force: If True, re-processes documents even if content hash has not changed.

        Returns:
            Dictionary containing summary stats and source-level results.
        """
        start_time = time.time()
        logger.info("[RAG] Starting ingestion pipeline...")

        if sources is None:
            sources = load_sources_config()

        results = []
        updated_count = 0
        skipped_count = 0
        failed_count = 0

        for source in sources:
            source_name = source.get("name", "unnamed")
            destination = source.get("destination", "Unknown")
            source_url = source.get("url") or source.get("path") or ""

            logger.info(f"[RAG] Checking destination '{destination}' (Source: {source_name})")

            try:
                # Step 1: Fetch Content
                fetch_result = self.fetcher.fetch_source(source)
                if fetch_result.get("status") != "success":
                    error_msg = fetch_result.get("error", "Unknown fetch error")
                    logger.warning(f"[RAG] Source '{source_name}' failed to fetch: {error_msg}")
                    failed_count += 1
                    results.append({
                        "source_name": source_name,
                        "destination": destination,
                        "status": "failed",
                        "error": error_msg,
                    })
                    continue

                # Step 2: Clean Content
                clean_result = self.cleaner.clean(fetch_result)
                clean_text = clean_result.get("clean_text", "")
                sections_count = clean_result.get("sections_count", 0)

                # Step 3: Compute Hash & Change Detection
                content_hash = compute_content_hash(clean_text)
                has_changed = self.manifest_manager.has_changed(source_name, content_hash)

                if not has_changed and not force:
                    logger.info(f"[RAG] No changes detected for '{destination}' ({source_name}). Skipping re-indexing.")
                    skipped_count += 1
                    results.append({
                        "source_name": source_name,
                        "destination": destination,
                        "status": "unchanged",
                        "content_hash": content_hash,
                    })
                    continue

                logger.info(f"[RAG] Content changed/new for '{destination}' ({source_name}). Extracted {sections_count} sections.")

                # Step 4: Split into Chunks
                chunks = self.chunker.create_chunks(clean_result, content_hash)
                logger.info(f"[RAG] Created {len(chunks)} chunks for '{destination}'. Generating embeddings & updating ChromaDB...")

                # Step 5 & 6: Embed & Update ChromaDB
                update_res = self.updater.update_source_chunks(source_name, chunks)

                # Step 7: Update Manifest
                self.manifest_manager.update_entry(
                    source_name=source_name,
                    destination=destination,
                    source_url=source_url,
                    content_hash=content_hash,
                    chunk_count=len(chunks),
                )

                updated_count += 1
                logger.info(f"[RAG] Successfully updated '{destination}' ({source_name}) in ChromaDB ({len(chunks)} chunks).")

                results.append({
                    "source_name": source_name,
                    "destination": destination,
                    "status": "updated",
                    "chunks_count": len(chunks),
                    "sections_count": sections_count,
                    "content_hash": content_hash,
                })

            except Exception as e:
                logger.error(f"[RAG] Exception processing source '{source_name}': {e}", exc_info=True)
                failed_count += 1
                results.append({
                    "source_name": source_name,
                    "destination": destination,
                    "status": "failed",
                    "error": str(e),
                })

        elapsed = round(time.time() - start_time, 2)
        summary = {
            "total_sources": len(sources),
            "updated": updated_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "duration_seconds": elapsed,
            "results": results,
        }

        logger.info(
            f"[RAG] Ingestion completed in {elapsed}s | "
            f"Total: {len(sources)} | Updated: {updated_count} | Skipped: {skipped_count} | Failed: {failed_count}"
        )

        return summary


def run_ingestion(sources: Optional[List[Dict[str, Any]]] = None, force: bool = False) -> Dict[str, Any]:
    """Helper function to execute RAG ingestion."""
    pipeline = RAGIngestionPipeline()
    return pipeline.run(sources=sources, force=force)


if __name__ == "__main__":
    force_flag = "--force" in sys.argv
    summary = run_ingestion(force=force_flag)
    print("\n--- RAG Ingestion Summary ---")
    print(f"Total Sources: {summary['total_sources']}")
    print(f"Updated: {summary['updated']}")
    print(f"Skipped: {summary['skipped']}")
    print(f"Failed: {summary['failed']}")
    print(f"Duration: {summary['duration_seconds']} seconds\n")
