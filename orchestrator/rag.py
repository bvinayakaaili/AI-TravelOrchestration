"""
RAG Engine Bridge — delegating to automated RAG pipeline in top-level `rag` module.
Preserves backwards compatibility for existing imports in orchestrator components.
"""

import sys
from pathlib import Path

# Add project root to sys.path if not present
PROJECT_ROOT = Path(__file__).parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from rag import get_destination_context, run_ingestion, start_scheduler, stop_scheduler
from rag.updater import ChromaUpdater

_updater = ChromaUpdater()


def _get_collection():
    """Retrieve ChromaDB collection via ChromaUpdater."""
    return _updater.get_collection()


def rebuild_index(force: bool = True):
    """Trigger full ingestion pipeline rebuild."""
    summary = run_ingestion(force=force)
    col = _get_collection()
    return {
        "chunks": col.count() if col else 0,
        "summary": summary
    }


__all__ = ["get_destination_context", "rebuild_index", "run_ingestion", "_get_collection"]
