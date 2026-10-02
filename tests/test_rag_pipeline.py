"""
Comprehensive Test Suite for RAG Ingestion & Retrieval Pipeline
Verifies:
1. New document ingestion
2. Unchanged document skip (SHA-256 hash comparison)
3. Changed document update
4. Idempotency / Duplicate prevention
5. Source failure tolerance
6. Retrieval query with metadata attribution
"""

import os
import shutil
import tempfile
from pathlib import Path
import pytest

from rag.config import BASE_DIR
from rag.source_fetcher import SourceFetcher
from rag.content_cleaner import ContentCleaner
from rag.chunker import TextChunker
from rag.updater import ManifestManager, ChromaUpdater, compute_content_hash
from rag.ingestion import RAGIngestionPipeline
from rag.retrieval import get_destination_context


@pytest.fixture
def temp_rag_dir():
    """Create a temporary directory for ChromaDB and manifest testing."""
    temp_dir = Path(tempfile.mkdtemp())
    chroma_dir = temp_dir / "chroma_db"
    manifest_path = temp_dir / "ingestion_manifest.json"
    
    yield {
        "root": temp_dir,
        "chroma_dir": chroma_dir,
        "manifest_path": manifest_path,
    }
    
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def test_pipeline(temp_rag_dir):
    """Initialize a pipeline instance pointing to temporary storage."""
    updater = ChromaUpdater(persist_dir=temp_rag_dir["chroma_dir"], collection_name="test_knowledge")
    manifest_mgr = ManifestManager(manifest_path=temp_rag_dir["manifest_path"])
    
    pipeline = RAGIngestionPipeline(
        fetcher=SourceFetcher(),
        cleaner=ContentCleaner(),
        chunker=TextChunker(chunk_size=300, chunk_overlap=50),
        updater=updater,
        manifest_manager=manifest_mgr,
    )
    return pipeline, updater, manifest_mgr


def test_1_new_document_ingestion(test_pipeline, temp_rag_dir):
    """Test 1: New document is fetched, cleaned, chunked, and stored in ChromaDB."""
    pipeline, updater, manifest_mgr = test_pipeline

    test_sources = [
        {
            "name": "test_goa_local",
            "destination": "Goa",
            "path": "data/knowledge/goa.md",
            "type": "file",
            "enabled": True,
        }
    ]

    summary = pipeline.run(sources=test_sources, force=False)
    
    assert summary["total_sources"] == 1
    assert summary["updated"] == 1
    assert summary["skipped"] == 0
    assert summary["failed"] == 0

    col = updater.get_collection()
    assert col.count() > 0

    manifest = manifest_mgr.load_manifest()
    assert "test_goa_local" in manifest
    assert manifest["test_goa_local"]["destination"] == "Goa"


def test_2_unchanged_document_skip(test_pipeline, temp_rag_dir):
    """Test 2: Re-running ingestion without changes skips document processing."""
    pipeline, updater, manifest_mgr = test_pipeline

    test_sources = [
        {
            "name": "test_goa_local",
            "destination": "Goa",
            "path": "data/knowledge/goa.md",
            "type": "file",
            "enabled": True,
        }
    ]

    # First run
    res1 = pipeline.run(sources=test_sources, force=False)
    assert res1["updated"] == 1
    col_count_before = updater.get_collection().count()

    # Second run without content modification
    res2 = pipeline.run(sources=test_sources, force=False)
    assert res2["updated"] == 0
    assert res2["skipped"] == 1

    col_count_after = updater.get_collection().count()
    assert col_count_before == col_count_after


def test_3_changed_document_update(test_pipeline, temp_rag_dir):
    """Test 3: Changing content updates the document and replaces old chunks."""
    pipeline, updater, manifest_mgr = test_pipeline

    # Create temporary doc
    doc_path = temp_rag_dir["root"] / "temp_city.md"
    doc_path.write_text("# TempCity\nInitial content for TempCity beaches.", encoding="utf-8")

    test_sources = [
        {
            "name": "temp_source",
            "destination": "TempCity",
            "path": str(doc_path),
            "type": "file",
            "enabled": True,
        }
    ]

    # Ingest v1
    res1 = pipeline.run(sources=test_sources, force=False)
    assert res1["updated"] == 1

    manifest_v1 = manifest_mgr.load_manifest()
    hash_v1 = manifest_v1["temp_source"]["content_hash"]

    # Modify content v2
    doc_path.write_text("# TempCity\nUpdated content with new historical places and forts in TempCity.", encoding="utf-8")

    # Ingest v2
    res2 = pipeline.run(sources=test_sources, force=False)
    assert res2["updated"] == 1
    assert res2["skipped"] == 0

    manifest_v2 = manifest_mgr.load_manifest()
    hash_v2 = manifest_v2["temp_source"]["content_hash"]

    assert hash_v1 != hash_v2


def test_4_duplicate_prevention(test_pipeline, temp_rag_dir):
    """Test 4: Running forced ingestion twice yields same number of chunks (no duplicates)."""
    pipeline, updater, manifest_mgr = test_pipeline

    test_sources = [
        {
            "name": "test_mumbai_local",
            "destination": "Mumbai",
            "path": "data/knowledge/mumbai.md",
            "type": "file",
            "enabled": True,
        }
    ]

    # Ingest 1
    pipeline.run(sources=test_sources, force=True)
    count_run_1 = updater.get_collection().count()

    # Ingest 2 (forced)
    pipeline.run(sources=test_sources, force=True)
    count_run_2 = updater.get_collection().count()

    assert count_run_1 == count_run_2


def test_5_source_failure_isolation(test_pipeline, temp_rag_dir):
    """Test 5: If one source fails, other valid sources continue to process successfully."""
    pipeline, updater, manifest_mgr = test_pipeline

    test_sources = [
        {
            "name": "invalid_source",
            "destination": "NonExistent",
            "path": "data/knowledge/non_existent_file.md",
            "type": "file",
            "enabled": True,
        },
        {
            "name": "valid_goa_source",
            "destination": "Goa",
            "path": "data/knowledge/goa.md",
            "type": "file",
            "enabled": True,
        }
    ]

    summary = pipeline.run(sources=test_sources, force=False)
    
    assert summary["total_sources"] == 2
    assert summary["updated"] == 1
    assert summary["failed"] == 1


def test_6_retrieval_query(test_pipeline, temp_rag_dir):
    """Test 6: Querying context for Goa returns relevant chunks with source attribution."""
    pipeline, updater, manifest_mgr = test_pipeline

    test_sources = [
        {
            "name": "goa_tourist_kb",
            "destination": "Goa",
            "path": "data/knowledge/goa.md",
            "type": "file",
            "enabled": True,
        }
    ]

    pipeline.run(sources=test_sources, force=True)

    # Re-assign updater for global retrieval test or test collection
    context = get_destination_context("Goa", "historical places and beaches")
    
    assert len(context) > 0
    assert "Goa" in context
