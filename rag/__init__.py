"""
Automated RAG Knowledge Ingestion and Update Pipeline
"""

from rag.config import load_sources_config, RAG_AUTO_UPDATE, RAG_UPDATE_INTERVAL_HOURS
from rag.ingestion import RAGIngestionPipeline, run_ingestion
from rag.retrieval import get_destination_context
from rag.scheduler import start_scheduler, stop_scheduler, is_scheduler_running

__all__ = [
    "load_sources_config",
    "RAG_AUTO_UPDATE",
    "RAG_UPDATE_INTERVAL_HOURS",
    "RAGIngestionPipeline",
    "run_ingestion",
    "get_destination_context",
    "start_scheduler",
    "stop_scheduler",
    "is_scheduler_running",
]
