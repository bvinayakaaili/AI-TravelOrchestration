"""
RAG Scheduler Module
Provides non-blocking background scheduled updates for destination knowledge ingestion.
"""

import asyncio
import logging
from typing import Optional

from rag.config import RAG_AUTO_UPDATE, RAG_UPDATE_INTERVAL_HOURS

logger = logging.getLogger("rag.scheduler")

_scheduler_task: Optional[asyncio.Task] = None
_is_running: bool = False


async def _scheduler_loop(interval_hours: float):
    """Background async loop running ingestion at configured interval."""
    global _is_running
    _is_running = True
    interval_seconds = max(interval_hours * 3600, 60.0) # minimum 60s check
    
    logger.info(f"[RAG Scheduler] Started background schedule loop (interval: {interval_hours}h / {interval_seconds}s)")

    # Run initial ingestion (disabled to speed up backend startup)
    # To run manually, use the POST /rag/ingest endpoint or run `python -m rag.ingestion`
    # try:
    #     from rag.ingestion import run_ingestion
    #     logger.info("[RAG Scheduler] Running initial ingestion trigger on startup...")
    #     run_ingestion()
    # except Exception as e:
    #     logger.error(f"[RAG Scheduler] Error during initial ingestion: {e}")

    while _is_running:
        try:
            await asyncio.sleep(interval_seconds)
            if not _is_running:
                break
            logger.info("[RAG Scheduler] Periodic interval elapsed. Triggering RAG ingestion...")
            from rag.ingestion import run_ingestion
            run_ingestion()
        except asyncio.CancelledError:
            logger.info("[RAG Scheduler] Background scheduler task cancelled.")
            break
        except Exception as e:
            logger.error(f"[RAG Scheduler] Error in background scheduler loop: {e}")
            await asyncio.sleep(300) # wait 5 mins on failure before retrying loop

    _is_running = False
    logger.info("[RAG Scheduler] Background scheduler loop stopped.")


def start_scheduler(interval_hours: float = RAG_UPDATE_INTERVAL_HOURS, auto_start: bool = RAG_AUTO_UPDATE) -> Optional[asyncio.Task]:
    """Start background scheduler loop if enabled and not already running."""
    global _scheduler_task, _is_running
    if not auto_start:
        logger.info("[RAG Scheduler] RAG_AUTO_UPDATE is disabled. Scheduler not started.")
        return None

    if _is_running and _scheduler_task and not _scheduler_task.done():
        logger.info("[RAG Scheduler] Scheduler is already running.")
        return _scheduler_task

    try:
        loop = asyncio.get_running_loop()
        _scheduler_task = loop.create_task(_scheduler_loop(interval_hours))
        return _scheduler_task
    except RuntimeError:
        logger.warning("[RAG Scheduler] No active asyncio event loop found to attach scheduler task.")
        return None


def stop_scheduler():
    """Stop running background scheduler loop."""
    global _scheduler_task, _is_running
    _is_running = False
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        logger.info("[RAG Scheduler] Stop signal sent to background scheduler.")
    _scheduler_task = None


def is_scheduler_running() -> bool:
    """Check if scheduler loop is active."""
    return _is_running
