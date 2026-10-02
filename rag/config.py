"""
RAG Ingestion Pipeline Configuration
Handles environment variables, default source definitions, and directory paths.
"""

import os
from pathlib import Path
from typing import List, Dict, Any
import logging

logger = logging.getLogger("rag.config")

# Base directory paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
KNOWLEDGE_DIR = Path(os.getenv("KNOWLEDGE_DIR", str(DATA_DIR / "knowledge")))
CHROMA_PERSIST_DIR = Path(os.getenv("CHROMA_PERSIST_DIR", str(DATA_DIR / "chroma_db")))
SOURCES_CONFIG_PATH = Path(os.getenv("SOURCES_CONFIG_PATH", str(DATA_DIR / "sources.yaml")))
MANIFEST_PATH = Path(os.getenv("MANIFEST_PATH", str(DATA_DIR / "ingestion_manifest.json")))

# Schedule configuration
RAG_AUTO_UPDATE = os.getenv("RAG_AUTO_UPDATE", "true").lower() in ("true", "1", "yes")
RAG_UPDATE_INTERVAL_HOURS = float(os.getenv("RAG_UPDATE_INTERVAL_HOURS", "168"))

# Ingestion settings
DEFAULT_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "600"))
DEFAULT_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "100"))
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "travel_knowledge")

# Default fallback sources if sources.yaml is absent
DEFAULT_SOURCES: List[Dict[str, Any]] = [
    {
        "name": "wikivoyage_goa",
        "destination": "Goa",
        "url": "https://en.wikivoyage.org/wiki/Goa",
        "type": "html",
        "enabled": True,
    },
    {
        "name": "wikivoyage_mumbai",
        "destination": "Mumbai",
        "url": "https://en.wikivoyage.org/wiki/Mumbai",
        "type": "html",
        "enabled": True,
    },
    {
        "name": "wikivoyage_delhi",
        "destination": "Delhi",
        "url": "https://en.wikivoyage.org/wiki/Delhi",
        "type": "html",
        "enabled": True,
    },
    {
        "name": "wikivoyage_bangalore",
        "destination": "Bangalore",
        "url": "https://en.wikivoyage.org/wiki/Bangalore",
        "type": "html",
        "enabled": True,
    },
    {
        "name": "wikivoyage_hyderabad",
        "destination": "Hyderabad",
        "url": "https://en.wikivoyage.org/wiki/Hyderabad",
        "type": "html",
        "enabled": True,
    },
    {
        "name": "local_goa",
        "destination": "Goa",
        "path": "data/knowledge/goa.md",
        "type": "file",
        "enabled": True,
    },
    {
        "name": "local_mumbai",
        "destination": "Mumbai",
        "path": "data/knowledge/mumbai.md",
        "type": "file",
        "enabled": True,
    },
    {
        "name": "local_delhi",
        "destination": "Delhi",
        "path": "data/knowledge/delhi.md",
        "type": "file",
        "enabled": True,
    },
    {
        "name": "local_bangalore",
        "destination": "Bangalore",
        "path": "data/knowledge/bangalore.md",
        "type": "file",
        "enabled": True,
    },
    {
        "name": "local_hyderabad",
        "destination": "Hyderabad",
        "path": "data/knowledge/hyderabad.md",
        "type": "file",
        "enabled": True,
    },
]


def load_sources_config(config_path: Path = SOURCES_CONFIG_PATH) -> List[Dict[str, Any]]:
    """Load source definitions from YAML file or return defaults."""
    if config_path.exists():
        try:
            import yaml
            with open(config_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                if data and "sources" in data:
                    sources = [s for s in data["sources"] if s.get("enabled", True)]
                    logger.info(f"Loaded {len(sources)} enabled sources from {config_path}")
                    return sources
        except Exception as e:
            logger.warning(f"Error loading sources config from {config_path}: {e}. Falling back to default sources.")

    logger.info("Using default configured sources.")
    return [s for s in DEFAULT_SOURCES if s.get("enabled", True)]
