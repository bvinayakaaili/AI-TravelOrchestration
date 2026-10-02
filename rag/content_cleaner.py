"""
Content Cleaner Module
Parses HTML or Markdown text, removes boilerplate/navigation/script elements,
normalizes formatting, and returns clean structured textual knowledge.
"""

import re
import logging
from typing import Dict, Any

logger = logging.getLogger("rag.content_cleaner")

# HTML tags to completely purge
DISCARD_TAGS = [
    "script", "style", "nav", "footer", "header", "aside", "form",
    "iframe", "noscript", "svg", "button", "input", "select", "option", "textarea"
]

# CSS class/ID fragments indicative of nav/ads/footers
DISCARD_CLASSES_IDS = [
    "nav", "menu", "sidebar", "footer", "header", "advertisement", "ad-container",
    "social-share", "cookie-banner", "mw-editsection", "mw-jump-link", "catlinks",
    "printfooter", "siteSub", "contentSub"
]


class ContentCleaner:
    """Cleans raw document responses into normalized markdown/text knowledge."""

    def clean(self, fetch_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Clean and extract meaningful text from raw content.
        Returns a dict with cleaned text, destination, source metadata, and section counts.
        """
        raw_content = fetch_result.get("raw_content", "")
        content_type = fetch_result.get("content_type", "html")
        destination = fetch_result.get("destination", "Unknown")
        source_name = fetch_result.get("source_name", "unknown")
        source_url = fetch_result.get("source_url", "")

        if content_type == "html":
            cleaned_text, sections_count = self._clean_html(raw_content, destination)
        else:
            cleaned_text, sections_count = self._clean_markdown_or_text(raw_content, destination)

        # Prepend source header metadata
        formatted_doc = (
            f"# Destination: {destination}\n"
            f"Source Name: {source_name}\n"
            f"Source URL: {source_url}\n\n"
            f"{cleaned_text}"
        )

        return {
            "destination": destination,
            "source_name": source_name,
            "source_url": source_url,
            "clean_text": formatted_doc,
            "raw_body_text": cleaned_text,
            "sections_count": sections_count,
        }

    def _clean_html(self, html_str: str, destination: str) -> tuple[str, int]:
        """Parse HTML, remove unnecessary elements, extract headings and paragraphs."""
        try:
            from bs4 import BeautifulSoup, Comment
            soup = BeautifulSoup(html_str, "html.parser")

            # Remove HTML comments
            for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
                comment.extract()

            # Remove unwanted tags
            for tag_name in DISCARD_TAGS:
                for element in soup.find_all(tag_name):
                    element.decompose()

            # Remove elements with nav/ad class/id attributes
            for element in soup.find_all(True):
                if getattr(element, 'attrs', None) is None:
                    continue  # Element was already decomposed (e.g. as a child of a removed parent)
                
                if element.name in ("body", "html", "main", "article"):
                    continue
                element_id = element.get("id", "")
                element_classes = " ".join(element.get("class", [])) if isinstance(element.get("class"), list) else element.get("class", "")

                combined = f"{element_id} {element_classes}".lower()
                if any(bad_kw in combined for bad_kw in DISCARD_CLASSES_IDS):
                    element.decompose()

            # Extract headings, paragraphs, and list items
            content_blocks = []
            heading_count = 0

            # Target main content container if available
            main_content = soup.find("main") or soup.find("article") or soup.find("div", {"id": "bodyContent"}) or soup.body or soup

            for elem in main_content.find_all(["h1", "h2", "h3", "h4", "p", "li"]):
                text = elem.get_text(strip=True)
                if not text or len(text) < 3:
                    continue

                if elem.name in ("h1", "h2", "h3", "h4"):
                    heading_count += 1
                    level = elem.name[1]
                    hashes = "#" * int(level)
                    content_blocks.append(f"\n{hashes} {text}\n")
                elif elem.name == "li":
                    content_blocks.append(f"- {text}")
                else:
                    content_blocks.append(text)

            raw_text = "\n".join(content_blocks)
            normalized = self._normalize_text(raw_text)
            return normalized, heading_count

        except Exception as e:
            logger.warning(f"BeautifulSoup parsing failed or uninstalled ({e}), falling back to regex HTML strip")
            return self._regex_strip_html(html_str)

    def _clean_markdown_or_text(self, text: str, destination: str) -> tuple[str, int]:
        """Normalize existing markdown or text content."""
        heading_count = len(re.findall(r"^#{1,6}\s+", text, re.MULTILINE))
        normalized = self._normalize_text(text)
        return normalized, heading_count

    def _normalize_text(self, text: str) -> str:
        """Normalize whitespace, remove repeated empty lines and trailing spaces."""
        # Replace non-breaking space & zero width spaces
        text = text.replace("\xa0", " ").replace("\u200b", "")
        # Remove trailing whitespace from lines
        lines = [line.rstrip() for line in text.splitlines()]
        # Collapse multiple consecutive blank lines into max 2 newlines
        cleaned = re.sub(r"\n{3,}", "\n\n", "\n".join(lines))
        return cleaned.strip()

    def _regex_strip_html(self, html_str: str) -> tuple[str, int]:
        """Fallback regex HTML stripping if BS4 unavailable."""
        text = re.sub(r"<(script|style|nav|footer)[^>]*>.*?</\1>", "", html_str, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", "\n", text)
        heading_count = len(re.findall(r"^#{1,6}\s+", text, re.MULTILINE))
        return self._normalize_text(text), heading_count
