"""
ChromaDB Updater & Ingestion Manifest Module
Manages Persistent ChromaDB updates, document replacement, manifest hashing, and change detection.
"""

import os
import json
import hashlib
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from rag.config import CHROMA_PERSIST_DIR, MANIFEST_PATH, COLLECTION_NAME

logger = logging.getLogger("rag.updater")


def compute_content_hash(text: str) -> str:
    """Generate SHA-256 hash of cleaned text."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class ManifestManager:
    """Tracks document hashes, ingestion timestamps, and source statuses in ingestion_manifest.json."""

    def __init__(self, manifest_path: Path = MANIFEST_PATH):
        self.manifest_path = manifest_path

    def load_manifest(self) -> Dict[str, Any]:
        """Load manifest from JSON file."""
        if self.manifest_path.exists():
            try:
                with open(self.manifest_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error reading manifest file at {self.manifest_path}: {e}")
        return {}

    def save_manifest(self, manifest: Dict[str, Any]) -> None:
        """Write manifest to JSON file."""
        try:
            self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save manifest file at {self.manifest_path}: {e}")

    def has_changed(self, source_name: str, new_hash: str) -> bool:
        """Check if source content hash differs from stored manifest hash."""
        manifest = self.load_manifest()
        stored_entry = manifest.get(source_name, {})
        stored_hash = stored_entry.get("content_hash")
        return stored_hash != new_hash

    def update_entry(self, source_name: str, destination: str, source_url: str, content_hash: str, chunk_count: int) -> None:
        """Update source entry in manifest after successful ingestion."""
        manifest = self.load_manifest()
        manifest[source_name] = {
            "destination": destination,
            "source_name": source_name,
            "source_url": source_url,
            "content_hash": content_hash,
            "chunk_count": chunk_count,
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        }
        self.save_manifest(manifest)


class ChromaUpdater:
    """Manages ChromaDB vector database updates, upserts, and chunk deletions."""

    def __init__(self, persist_dir: Path = CHROMA_PERSIST_DIR, collection_name: str = COLLECTION_NAME):
        self.persist_dir = persist_dir
        self.collection_name = collection_name
        self._collection = None
        self._client = None

    def get_collection(self):
        """Lazy-initialize ChromaDB persistent collection."""
        if self._collection is not None:
            return self._collection

        import chromadb
        from chromadb.utils import embedding_functions

        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=str(self.persist_dir))
        emb_fn = embedding_functions.DefaultEmbeddingFunction()

        self._collection = self._client.get_or_create_collection(
            name=self.collection_name,
            embedding_function=emb_fn,
            metadata={"hnsw:space": "cosine"}
        )
        return self._collection

    def update_source_chunks(self, source_name: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Update ChromaDB chunks for a source.
        Deletes existing chunks for source_name and inserts new chunks.
        Operation is fully idempotent.
        """
        collection = self.get_collection()

        # Delete existing chunks matching source_name metadata or matching chunk IDs prefix
        self._remove_existing_chunks(collection, source_name)

        if not chunks:
            logger.info(f"No chunks provided for source {source_name}. Cleanup completed.")
            return {"deleted": True, "added_chunks": 0}

        documents = [c["text"] for c in chunks]
        ids = [c["id"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]

        collection.add(documents=documents, ids=ids, metadatas=metadatas)
        logger.info(f"Updated ChromaDB: added {len(chunks)} chunks for source {source_name}")

        return {
            "deleted": True,
            "added_chunks": len(chunks),
            "total_collection_count": collection.count(),
        }

    def _remove_existing_chunks(self, collection, source_name: str) -> None:
        """Remove existing chunks belonging to source_name."""
        try:
            # Query by metadata filter source_name
            existing = collection.get(where={"source_name": source_name})
            if existing and existing.get("ids"):
                old_ids = existing["ids"]
                collection.delete(ids=old_ids)
                logger.info(f"Deleted {len(old_ids)} old chunks for source {source_name} from ChromaDB")
        except Exception as e:
            logger.debug(f"Metadata deletion query fallback for {source_name}: {e}")
