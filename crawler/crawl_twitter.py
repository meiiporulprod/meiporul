"""
Crawl monitored Twitter/X accounts for political posts.
Uses twscrape — no official API key needed, but requires one Twitter/X account in the pool.

Setup:
    pip install twscrape
    Set env vars: TWSCRAPE_USERNAME, TWSCRAPE_PASSWORD, TWSCRAPE_EMAIL

Usage:
    python crawler/crawl_twitter.py
    python crawler/crawl_twitter.py --list-accounts
    python crawler/crawl_twitter.py --add-account @jana_naayagan "Jana Naayagan" TVK
    python crawler/crawl_twitter.py --remove-account @jana_naayagan
"""

import asyncio
import os, sys, logging
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


# ── Account management ────────────────────────────────────────────────────────

def get_active_accounts() -> list[dict]:
    return sb.table("monitored_accounts").select("id,handle,display_name,party") \
        .eq("platform", "twitter").eq("active", True).execute().data or []


def cmd_list_accounts() -> None:
    rows = sb.table("monitored_accounts") \
        .select("handle,display_name,party,active") \
        .eq("platform", "twitter").order("handle").execute().data or []
    print(f"\n{'Handle':<22} {'Party':<10} Active  Display Name")
    print("-" * 64)
    for r in rows:
        status = "YES" if r["active"] else "no"
        print(f"@{r['handle']:<21} {r.get('party') or '':<10} {status:<7} {r.get('display_name') or ''}")
    print()


def cmd_add_account(handle: str, display_name: str = "", party: str = "") -> None:
    handle = handle.lstrip("@")
    sb.table("monitored_accounts").upsert({
        "platform":     "twitter",
        "handle":       handle,
        "display_name": display_name or handle,
        "party":        party or None,
        "active":       True,
    }, on_conflict="platform,handle").execute()
    log.info(f"Added @{handle} [{party or 'no party'}]")


def cmd_remove_account(handle: str) -> None:
    handle = handle.lstrip("@")
    sb.table("monitored_accounts").update({"active": False}) \
        .eq("platform", "twitter").eq("handle", handle).execute()
    log.info(f"Deactivated @{handle}")


# ── Crawl ─────────────────────────────────────────────────────────────────────

async def setup_api():
    from twscrape import API
    username = os.environ.get("TWSCRAPE_USERNAME")
    password = os.environ.get("TWSCRAPE_PASSWORD")
    email    = os.environ.get("TWSCRAPE_EMAIL")
    email_pw = os.environ.get("TWSCRAPE_EMAIL_PASSWORD") or password
    if not (username and password and email):
        log.error("TWSCRAPE_USERNAME / TWSCRAPE_PASSWORD / TWSCRAPE_EMAIL not set.")
        log.error("Add a spare Twitter account to GitHub Secrets to enable crawling.")
        sys.exit(1)
    api = API()
    await api.pool.add_account(username, password, email, email_pw)
    await api.pool.login_all()
    return api


async def crawl_account(api, account: dict) -> int:
    handle     = account["handle"]
    account_id = account["id"]
    try:
        user = await api.user_by_login(handle)
        if not user:
            log.warning(f"@{handle}: not found on X")
            return 0

        rows = []
        async for tweet in api.user_tweets(user.id, limit=20):
            media_urls: list[str] = []
            for m in (tweet.media or []):
                for attr in ("fullUrl", "url", "thumbnailUrl"):
                    val = getattr(m, attr, None)
                    if val:
                        media_urls.append(val)
                        break

            rows.append({
                "account_id": account_id,
                "platform":   "twitter",
                "post_id":    str(tweet.id),
                "content":    tweet.rawContent or "",
                "url":        f"https://x.com/{handle}/status/{tweet.id}",
                "media_urls": media_urls,
                "posted_at":  tweet.date.isoformat() if tweet.date else None,
                "likes":      tweet.likeCount    or 0,
                "reposts":    tweet.retweetCount or 0,
                "replies":    tweet.replyCount   or 0,
                "views":      tweet.viewCount    or 0,
            })

        if rows:
            sb.table("monitored_posts").upsert(rows, on_conflict="platform,post_id").execute()
        log.info(f"@{handle}: {len(rows)} tweets upserted")
        return len(rows)
    except Exception as e:
        log.error(f"@{handle}: {e}")
        return 0


async def run_crawl() -> None:
    accounts = get_active_accounts()
    if not accounts:
        log.error("No active Twitter accounts. Run: python crawler/crawl_twitter.py --add-account @handle")
        return
    api   = await setup_api()
    total = 0
    for account in accounts:
        total += await crawl_account(api, account)
    log.info(f"Done — {total} tweets upserted across {len(accounts)} accounts.")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    args = sys.argv[1:]

    if "--list-accounts" in args:
        cmd_list_accounts()
        return

    if "--add-account" in args:
        idx          = args.index("--add-account")
        handle       = args[idx + 1]
        display_name = args[idx + 2] if idx + 2 < len(args) and not args[idx + 2].startswith("--") else ""
        party        = args[idx + 3] if idx + 3 < len(args) and not args[idx + 3].startswith("--") else ""
        cmd_add_account(handle, display_name, party)
        return

    if "--remove-account" in args:
        idx = args.index("--remove-account")
        cmd_remove_account(args[idx + 1])
        return

    asyncio.run(run_crawl())


if __name__ == "__main__":
    main()
