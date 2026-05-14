#!/usr/bin/env python3
"""
News crawler for Meiporul.
Fetches RSS feeds from Tamil Nadu news sources and upserts into Supabase.
Run directly or via GitHub Actions cron.
"""

import os
import sys
import logging
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

from sources import SOURCES, RELEVANCE_KEYWORDS

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.StreamHandler(open(sys.stdout.fileno(), mode="w", encoding="utf-8", closefd=False))],
)
log = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Meiporul-Crawler/1.0 (Tamil Nadu political accountability; contact: workwithroshanrk@gmail.com)"
}


def get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def is_relevant(title: str, summary: str) -> tuple[bool, float]:
    """Keyword-based relevance check. Returns (is_relevant, score)."""
    text = f"{title} {summary}".lower()
    hits = sum(1 for kw in RELEVANCE_KEYWORDS if kw in text)
    score = min(hits / 3, 1.0)  # 3 keyword hits = score 1.0
    return hits > 0, round(score, 2)


def parse_published_at(entry) -> str | None:
    """Parse published date from feed entry to ISO string."""
    for attr in ("published_parsed", "updated_parsed"):
        val = getattr(entry, attr, None)
        if val:
            try:
                dt = datetime(*val[:6], tzinfo=timezone.utc)
                return dt.isoformat()
            except Exception:
                pass
    for attr in ("published", "updated"):
        val = getattr(entry, attr, None)
        if val:
            try:
                return parsedate_to_datetime(val).isoformat()
            except Exception:
                pass
    return None


def fetch_feed(rss_url: str) -> list[dict]:
    """Fetch and parse a single RSS feed. Returns list of raw entries."""
    try:
        resp = requests.get(rss_url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        feed = feedparser.parse(resp.content)
        return feed.entries
    except Exception as e:
        log.warning(f"Failed to fetch {rss_url}: {e}")
        return []


def build_article(entry, source_name: str) -> dict | None:
    """Convert a feed entry to a news_articles row dict."""
    url = getattr(entry, "link", None)
    title = getattr(entry, "title", "").strip()
    if not url or not title:
        return None

    summary = getattr(entry, "summary", "") or ""
    # Strip HTML tags from summary
    from bs4 import BeautifulSoup
    summary_text = BeautifulSoup(summary, "html.parser").get_text(separator=" ").strip()

    relevant, score = is_relevant(title, summary_text)

    tags = []
    for tag_obj in getattr(entry, "tags", []):
        term = getattr(tag_obj, "term", None)
        if term:
            tags.append(term.lower())

    return {
        "source_name": source_name,
        "source_url": url,
        "title": title,
        "summary": summary_text[:2000] if summary_text else None,
        "published_at": parse_published_at(entry),
        "is_relevant": relevant,
        "relevance_score": score,
        "tags": tags if tags else None,
        "status": "raw",
    }


def upsert_articles(supabase: Client, articles: list[dict]) -> tuple[int, int]:
    """
    Upsert articles into Supabase. Returns (inserted, skipped).
    Uses source_url as the unique key — duplicates are silently ignored.
    """
    inserted = 0
    skipped = 0
    for article in articles:
        try:
            supabase.table("news_articles").upsert(
                article, on_conflict="source_url", ignore_duplicates=True
            ).execute()
            inserted += 1
        except Exception as e:
            log.warning(f"Skipped {article['source_url']}: {e}")
            skipped += 1
    return inserted, skipped


def run():
    supabase = get_supabase()
    total_inserted = 0
    total_skipped = 0

    for source in SOURCES:
        source_name = source["name"]
        log.info(f"Crawling {source_name}...")

        articles = []
        for rss_url in source["rss_urls"]:
            entries = fetch_feed(rss_url)
            log.info(f"  {rss_url} → {len(entries)} entries")
            for entry in entries:
                article = build_article(entry, source_name)
                if article:
                    articles.append(article)

        inserted, skipped = upsert_articles(supabase, articles)
        total_inserted += inserted
        total_skipped += skipped
        log.info(f"  {source_name}: {inserted} upserted, {skipped} skipped")

    log.info(f"Done. Total: {total_inserted} upserted, {total_skipped} skipped.")


if __name__ == "__main__":
    run()
