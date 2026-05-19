"""
Crawl configured subreddits for Tamil Nadu political content.
Uses Reddit's public JSON API (no credentials needed) + VADER sentiment.

Setup:
    pip install requests vaderSentiment
    (No Reddit account or API key required)

Usage:
    python crawler/crawl_reddit.py
    python crawler/crawl_reddit.py --subreddit tamilnadu
    python crawler/crawl_reddit.py --limit 200 --mode hot
    python crawler/crawl_reddit.py --add-sub chennai "Chennai city discussion"
    python crawler/crawl_reddit.py --remove-sub TVKFails
    python crawler/crawl_reddit.py --list-subs
    python crawler/crawl_reddit.py --cleanup        # delete posts >90 days old
    python crawler/crawl_reddit.py --cleanup 30     # delete posts >30 days old
"""

import os, sys, time, logging
from datetime import datetime, timezone

import requests
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

sb  = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
sia = SentimentIntensityAnalyzer()

# Reddit's public JSON API — no auth required, ~60 req/min
REDDIT_HEADERS = {
    "User-Agent": "meiporul/1.0 (Tamil Nadu politics tracker; public data only)",
    "Accept": "application/json",
}

# ── Party / relevance detection ──────────────────────────────────────────────

PARTY_KEYWORDS: dict[str, list[str]] = {
    "TVK":    ["tvk", "tamilaga vettri", "vijay", "actor vijay", "thalapathy"],
    "DMK":    ["dmk", "dravida munnetra", "stalin", "mk stalin", "kanimozhi", "udhayanidhi"],
    "AIADMK": ["aiadmk", "anna dravida", "edappadi", "eps", "palaniswami", "jayalalitha"],
    "BJP":    ["bjp", "bharatiya janata", "annamalai", "tamilisai"],
    "NTK":    ["ntk", "naam tamilar", "seeman"],
    "PMK":    ["pmk", "pattali makkal", "anbumani", "ramadoss"],
    "INC":    ["congress", "national congress", "karti chidambaram"],
    "VCK":    ["vck", "viduthalai chiruthaigal", "thirumavalavan"],
    "DMDK":   ["dmdk", "desiya murpokku", "vijayakanth", "premalatha"],
    "MDMK":   ["mdmk", "marumalarchi", "vaiko"],
}

TN_KEYWORDS = [
    "tamil nadu", "tamilnadu", "tn election", "tn govt", "tn government",
    "tn politics", "2026 election", "tnla", "tamil government",
    "chennai", "coimbatore", "madurai", "tiruchirappalli", "trichy",
    "tirunelveli", "salem", "erode", "tiruppur", "vellore", "tanjavur",
]

# Subreddits where ALL posts are stored (not just TN-relevant ones)
TN_NATIVE_SUBS = {"tamilnadu", "tvkfails", "chennaicity"}


def detect_parties(text: str) -> list[str]:
    t = text.lower()
    return sorted({p for p, kws in PARTY_KEYWORDS.items() if any(kw in t for kw in kws)})


def is_tn_relevant(subreddit: str, text: str) -> bool:
    if subreddit.lower() in TN_NATIVE_SUBS:
        return True
    t = text.lower()
    return bool(detect_parties(t)) or any(kw in t for kw in TN_KEYWORDS)


def get_sentiment(text: str) -> tuple[float, str]:
    score = sia.polarity_scores(text)["compound"]
    if score >= 0.05:
        return round(score, 4), "positive"
    if score <= -0.05:
        return round(score, 4), "negative"
    return round(score, 4), "neutral"


# ── Reddit JSON API helpers ───────────────────────────────────────────────────

def fetch_subreddit_posts(
    subreddit: str, mode: str = "new", limit: int = 100
) -> list[dict]:
    """
    Fetch posts using Reddit's public JSON API (no credentials).
    Reddit returns max 100 per request; paginate with 'after' for more.
    """
    posts: list[dict] = []
    after: str | None = None
    remaining = limit

    while remaining > 0:
        params: dict = {"limit": min(remaining, 100), "raw_json": 1}
        if after:
            params["after"] = after

        url = f"https://www.reddit.com/r/{subreddit}/{mode}.json"
        try:
            resp = requests.get(url, headers=REDDIT_HEADERS, params=params, timeout=30)
            if resp.status_code == 429:
                log.warning("  Rate limited — sleeping 60s")
                time.sleep(60)
                continue
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            log.warning(f"  r/{subreddit} fetch error: {e}")
            break

        children = data.get("data", {}).get("children", [])
        if not children:
            break

        posts.extend(c["data"] for c in children)
        after     = data["data"].get("after")
        remaining -= len(children)

        if not after or len(children) < 100:
            break

        time.sleep(1)   # polite pacing between pagination requests

    return posts


def process_post(raw: dict, subreddit: str) -> dict | None:
    try:
        text = f"{raw.get('title', '')} {raw.get('selftext', '') or ''}".strip()
        sentiment_score, sentiment_label = get_sentiment(text)
        ts = datetime.fromtimestamp(raw["created_utc"], tz=timezone.utc).isoformat()
        permalink = raw.get("permalink", "")
        return {
            "post_id":         raw["id"],
            "subreddit":       raw.get("subreddit", subreddit),
            "title":           raw.get("title", ""),
            "selftext":        (raw.get("selftext") or "")[:2000],
            "url":             raw.get("url", ""),
            "permalink":       f"https://reddit.com{permalink}" if permalink else "",
            "author":          raw.get("author") or "[deleted]",
            "score":           raw.get("score", 0),
            "upvote_ratio":    raw.get("upvote_ratio"),
            "num_comments":    raw.get("num_comments", 0),
            "created_utc":     ts,
            "party_mentions":  detect_parties(text),
            "sentiment_score": sentiment_score,
            "sentiment_label": sentiment_label,
            "is_relevant":     is_tn_relevant(subreddit, text),
        }
    except Exception as e:
        log.warning(f"  Post {raw.get('id', '?')} error: {e}")
        return None


# ── DB source management ──────────────────────────────────────────────────────

def get_active_subreddits() -> list[str]:
    r = sb.table("reddit_sources").select("subreddit").eq("active", True).execute()
    return [row["subreddit"] for row in (r.data or [])]


def cmd_add_sub(subreddit: str, description: str = "") -> None:
    sb.table("reddit_sources").upsert(
        {"subreddit": subreddit, "description": description, "active": True},
        on_conflict="subreddit",
    ).execute()
    log.info(f"Added r/{subreddit}")


def cmd_remove_sub(subreddit: str) -> None:
    sb.table("reddit_sources").update({"active": False}).eq("subreddit", subreddit).execute()
    log.info(f"Deactivated r/{subreddit}")


def cmd_cleanup(days: int = 90) -> None:
    """Delete posts older than `days` days — Reddit policy discourages permanent archiving."""
    cutoff = datetime.now(tz=timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    from datetime import timedelta
    cutoff = cutoff - timedelta(days=days)
    result = sb.table("reddit_posts").delete().lt("created_utc", cutoff.isoformat()).execute()
    deleted = len(result.data or [])
    log.info(f"Deleted {deleted} posts older than {days} days (before {cutoff.date()})")


def cmd_list_subs() -> None:
    rows = sb.table("reddit_sources").select("subreddit,active,description,added_at").order("subreddit").execute().data or []
    print(f"\n{'Subreddit':<20} {'Active':<8} Description")
    print("-" * 60)
    for r in rows:
        status = "YES" if r["active"] else "no"
        print(f"r/{r['subreddit']:<18} {status:<8} {r.get('description') or ''}")
    print()


# ── Main crawl ────────────────────────────────────────────────────────────────

def crawl(subreddits: list[str], limit: int = 100, mode: str = "new") -> None:
    total = 0
    for sub_name in subreddits:
        log.info(f"Crawling r/{sub_name} [{mode}, limit={limit}]")
        try:
            raw_posts = fetch_subreddit_posts(sub_name, mode=mode, limit=limit)
            rows = [r for p in raw_posts if (r := process_post(p, sub_name))]

            # For non-TN-native subs, only store TN-relevant posts
            if sub_name.lower() not in TN_NATIVE_SUBS:
                rows = [r for r in rows if r["is_relevant"]]

            if not rows:
                log.info(f"  r/{sub_name}: 0 relevant posts")
                time.sleep(2)
                continue

            for i in range(0, len(rows), 100):
                sb.table("reddit_posts").upsert(
                    rows[i:i + 100], on_conflict="post_id"
                ).execute()

            relevant = sum(1 for r in rows if r["is_relevant"])
            log.info(f"  r/{sub_name}: {len(rows)} upserted ({relevant} relevant)")
            total += len(rows)
            time.sleep(2)   # ~60 req/min limit for unauthenticated requests

        except Exception as e:
            log.error(f"  r/{sub_name}: {e}")

    log.info(f"Done -- {total} posts upserted across {len(subreddits)} subreddits.")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    args = sys.argv[1:]

    # Management commands (no Reddit credentials needed for list)
    if "--list-subs" in args:
        cmd_list_subs()
        return

    if "--cleanup" in args:
        idx  = args.index("--cleanup")
        days = int(args[idx + 1]) if idx + 1 < len(args) and args[idx + 1].isdigit() else 90
        cmd_cleanup(days)
        return

    if "--add-sub" in args:
        idx = args.index("--add-sub")
        subreddit   = args[idx + 1]
        description = args[idx + 2] if idx + 2 < len(args) and not args[idx + 2].startswith("--") else ""
        cmd_add_sub(subreddit, description)
        return

    if "--remove-sub" in args:
        idx = args.index("--remove-sub")
        cmd_remove_sub(args[idx + 1])
        return

    # Crawl args
    only_sub = args[args.index("--subreddit") + 1] if "--subreddit" in args else None
    limit    = int(args[args.index("--limit") + 1])  if "--limit"    in args else 100
    mode     = args[args.index("--mode") + 1]         if "--mode"     in args else "new"

    if mode not in ("new", "hot", "top", "rising"):
        log.error(f"Invalid mode '{mode}'. Use: new, hot, top, rising")
        return

    subs = [only_sub] if only_sub else get_active_subreddits()
    if not subs:
        log.error("No active subreddits. Run --list-subs or --add-sub <name>")
        return

    log.info(f"Subreddits: {subs}")
    crawl(subs, limit=limit, mode=mode)


if __name__ == "__main__":
    main()
