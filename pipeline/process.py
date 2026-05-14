#!/usr/bin/env python3
"""
AI pipeline for Meiporul.
Reads raw articles from Supabase, processes them through an LLM.

Local mode (default): uses Ollama directly with gemma3.
Production mode: set USE_CLAUDE=true + ANTHROPIC_API_KEY to use Claude API.
"""

import os
import sys
import json
import logging
import re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.StreamHandler(open(sys.stdout.fileno(), mode="w", encoding="utf-8", closefd=False))],
)
log = logging.getLogger(__name__)

USE_CLAUDE = os.getenv("USE_CLAUDE", "false").lower() == "true"
MODEL = os.getenv("AI_MODEL", "claude-sonnet-4-6" if USE_CLAUDE else "gemma3")
BATCH_SIZE = int(os.getenv("PIPELINE_BATCH_SIZE", "10"))


def ask(prompt: str) -> str:
    """Send a prompt to the configured LLM and return the response text."""
    if USE_CLAUDE:
        import anthropic
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        message = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    else:
        import ollama
        response = ollama.chat(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.3},
        )
        return response["message"]["content"].strip()


def get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def parse_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text.strip(), flags=re.MULTILINE)
    return json.loads(text)


def process_article(article: dict) -> dict:
    title = article["title"]
    summary = article.get("summary") or ""
    source = article.get("source_name", "")

    prompt = f"""You are an AI assistant for Meiporul, a Tamil Nadu political accountability platform.

Analyze this news article and respond ONLY with valid JSON (no markdown, no explanation):

Title: {title}
Source: {source}
Content: {summary[:1000]}

Return this exact JSON structure:
{{
  "title_tamil": "<Tamil translation of the title>",
  "summary": "<2-3 sentence English summary focused on political/governance impact>",
  "summary_tamil": "<Tamil version of the summary>",
  "is_relevant": <true or false — is this relevant to Tamil Nadu politics, TVK, Vijay, DMK, AIADMK, or TN governance?>,
  "relevance_score": <0.0 to 1.0>,
  "tags": ["<tag1>", "<tag2>"]
}}

Tags must be from: tvk, vijay, dmk, aiadmk, governance, economy, education, infrastructure, health, women, youth, environment, election, promise, policy, corruption, protest"""

    try:
        raw = ask(prompt)
        data = parse_json(raw)
    except Exception as e:
        log.warning(f"Failed for '{title}': {e}")
        return {}

    return {
        "title_tamil": data.get("title_tamil"),
        "summary": data.get("summary") or article.get("summary"),
        "summary_tamil": data.get("summary_tamil"),
        "is_relevant": bool(data.get("is_relevant", False)),
        "relevance_score": float(data.get("relevance_score", 0.0)),
        "tags": data.get("tags", []),
        "status": "reviewed",
    }


def draft_social_content(article: dict, supabase: Client):
    title = article["title"]
    summary = article.get("summary") or ""

    prompt = f"""You are a social media writer for Meiporul, a Tamil Nadu political accountability platform that tracks TVK/Vijay's promises.

Write a tweet (max 240 chars) about this article. Be factual, non-partisan, and end with #மெய்பொருள்.

Title: {title}
Summary: {summary}

Respond ONLY with valid JSON:
{{
  "content_english": "<tweet in English>",
  "content_tamil": "<tweet in Tamil>",
  "hashtags": ["<tag1>", "<tag2>"]
}}"""

    try:
        raw = ask(prompt)
        data = parse_json(raw)
    except Exception as e:
        log.warning(f"Social draft failed for '{title}': {e}")
        return

    draft = {
        "theme": "weekly-news",
        "content_type": "tweet",
        "content_english": data.get("content_english", ""),
        "content_tamil": data.get("content_tamil", ""),
        "hashtags": data.get("hashtags", []),
        "article_id": article["id"],
        "status": "draft",
    }

    try:
        supabase.table("content_drafts").insert(draft).execute()
        log.info(f"  → Draft saved: {title[:60]}")
    except Exception as e:
        log.warning(f"  → Draft insert failed: {e}")


def run():
    mode = f"Claude API ({MODEL})" if USE_CLAUDE else f"Ollama ({MODEL})"
    log.info(f"Pipeline starting — model: {mode}")

    supabase = get_supabase()

    result = (
        supabase.table("news_articles")
        .select("id, title, summary, source_name, is_relevant, summary_tamil")
        .eq("status", "raw")
        .order("crawled_at", desc=True)
        .limit(BATCH_SIZE)
        .execute()
    )
    articles = result.data
    log.info(f"Fetched {len(articles)} raw articles")

    if not articles:
        log.info("Nothing to process.")
        return

    for i, article in enumerate(articles, 1):
        log.info(f"[{i}/{len(articles)}] {article['title'][:70]}")

        updates = process_article(article)
        if not updates:
            supabase.table("news_articles").update({"status": "reviewed"}).eq("id", article["id"]).execute()
            continue

        supabase.table("news_articles").update(updates).eq("id", article["id"]).execute()

        if updates.get("is_relevant"):
            article.update(updates)
            draft_social_content(article, supabase)

    log.info("Pipeline run complete.")


if __name__ == "__main__":
    run()
