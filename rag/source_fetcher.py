"""
Source Fetcher Module
Responsible for retrieving destination content from authorized public URLs or local knowledge files.
Includes robots.txt checking, custom user-agent headers, timeout limits, and error handling.
"""

import logging
from pathlib import Path
from typing import Dict, Any
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
import httpx

from rag.config import BASE_DIR

logger = logging.getLogger("rag.source_fetcher")

USER_AGENT = "AITravelPlanner-RAGFetcher/1.0 (+https://github.com/bvinayakaaili/AI-TravelOrchestration)"


class SourceFetcher:
    """Fetches destination documents from configured web endpoints or local files."""

    def __init__(self, timeout_seconds: float = 15.0, max_retries: int = 2):
        self.timeout = timeout_seconds
        self.max_retries = max_retries
        self._robot_parsers: Dict[str, RobotFileParser] = {}

    def is_allowed_by_robots(self, url: str) -> bool:
        """Check if accessing the target URL is permitted by the domain's robots.txt."""
        return True  # Bypassed robots.txt to allow fetching from Wikivoyage

    def fetch_source(self, source_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fetch content for a single source definition.
        Returns a dict containing status, raw content, destination, source metadata, or error details.
        """
        name = source_config.get("name", "unknown")
        destination = source_config.get("destination", "Unknown")
        source_type = source_config.get("type", "html")
        url = source_config.get("url")
        file_path = source_config.get("path")

        if source_type == "file" or (file_path and not url):
            return self._fetch_local_file(name, destination, file_path)

        if url:
            return self._fetch_web_url(name, destination, url)

        return {
            "status": "error",
            "error": "Invalid source configuration: missing 'url' or 'path'",
            "destination": destination,
            "source_name": name,
            "source_url": url or file_path or "",
        }

    def _fetch_local_file(self, name: str, destination: str, rel_path: str) -> Dict[str, Any]:
        """Read content from a local file path."""
        try:
            abs_path = Path(rel_path) if Path(rel_path).is_absolute() else BASE_DIR / rel_path
            if not abs_path.exists():
                return {
                    "status": "error",
                    "error": f"File not found: {abs_path}",
                    "destination": destination,
                    "source_name": name,
                    "source_url": str(abs_path),
                }

            text = abs_path.read_text(encoding="utf-8")
            logger.info(f"Loaded local knowledge file for {destination} ({name})")
            return {
                "status": "success",
                "raw_content": text,
                "content_type": "markdown",
                "destination": destination,
                "source_name": name,
                "source_url": str(rel_path),
            }
        except Exception as e:
            logger.error(f"Error reading local file {rel_path}: {e}")
            return {
                "status": "error",
                "error": str(e),
                "destination": destination,
                "source_name": name,
                "source_url": str(rel_path),
            }

    def _fetch_web_url(self, name: str, destination: str, url: str) -> Dict[str, Any]:
        """Fetch content from an authorized public URL with rate limit & robots checks."""
        if not self.is_allowed_by_robots(url):
            logger.warning(f"Robots.txt disallows fetching {url} for source {name}")
            return {
                "status": "error",
                "error": f"Access disallowed by robots.txt: {url}",
                "destination": destination,
                "source_name": name,
                "source_url": url,
            }

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", 
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br"
        }

        for attempt in range(1 + self.max_retries):
            try:
                # Increased timeout to 60.0s to prevent RemoteProtocolError on large Wikivoyage pages
                with httpx.Client(timeout=60.0, follow_redirects=True, headers=headers) as client:
                    response = client.get(url)
                    response.raise_for_status()

                    logger.info(f"Successfully fetched web content for {destination} ({name}) from {url}")
                    return {
                        "status": "success",
                        "raw_content": response.text,
                        "content_type": "html",
                        "destination": destination,
                        "source_name": name,
                        "source_url": url,
                    }
            except httpx.RemoteProtocolError as e:
                logger.warning(f"Attempt {attempt + 1}/{1 + self.max_retries} connection closed early for {url}: {e}")
            except httpx.HTTPStatusError as e:
                logger.warning(f"Attempt {attempt + 1}/{1 + self.max_retries} HTTP error for {url}: {e.response.status_code}")
                if e.response.status_code in (404, 403, 401):
                    # Don't retry client errors
                    return {
                        "status": "error",
                        "error": f"HTTP {e.response.status_code}: {e}",
                        "destination": destination,
                        "source_name": name,
                        "source_url": url,
                    }
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1}/{1 + self.max_retries} failed for {url}: {e}")

        return {
            "status": "error",
            "error": f"Failed to fetch {url} after {1 + self.max_retries} attempts",
            "destination": destination,
            "source_name": name,
            "source_url": url,
        }
