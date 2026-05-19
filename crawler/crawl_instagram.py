"""
Crawl monitored Instagram accounts for political posts.
Uses instaloader — no API key needed for public profiles.

Setup:
    pip install instaloader
    Optional: set INSTAGRAM_USERNAME + INSTAGRAM_PASSWORD to avoid rate limits

Usage:
    python crawler/crawl_instagram.py
    python crawler/crawl_instagram.py --list-accounts
    python crawler/crawl_instagram.py --add-account @handle "Display Name" TVK
    python crawler/crawl_instagram.py --remove-account @handle
"""

import os, sys, logging, time
from datetime import datetime, timezone, timedelta

from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


# ── Loader setup ──────────────────────────────────────────────────────────────

def get_loader():
    import instaloader
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        post_metadata_txt_pattern="",
        quiet=True,
    )
    username = os.environ.get("INSTAGRAM_USERNAME")
    password = os.environ.get("INSTAGRAM_PASSWORD")
    if username and password:
        try:
            L.login(username, password)
            log.info(f"Logged in as @{username}")
        except Exception as e:
            log.warning(f"Instagram login failed: {e} — continuing without auth")
    return L


# ── Account management ────────────────────────────────────────────────────────

def get_active_accounts() -> list[dict]:
    return sb.table("monitored_accounts").select("id,handle,display_name,party") \
        .eq("platform", "instagram").eq("active", True).execute().data or []


def cmd_list_accounts() -> None:
    rows = sb.table("monitored_accounts") \
        .select("handle,display_name,party,active") \
        .eq("platform", "instagram").order("handle").execute().data or []
    print(f"\n{'Handle':<22} {'Party':<10} Active  Display Name")
    print("-" * 64)
    for r in rows:
        status = "YES" if r["active"] else "no"
        print(f"@{r['handle']:<21} {r.get('party') or '':<10} {status:<7} {r.get('display_name') or ''}")
    print()


def cmd_add_account(handle: str, display_name: str = "", party: str = "") -> None:
    handle = handle.lstrip("@")
    sb.table("monitored_accounts").upsert({
        "platform":     "instagram",
        "handle":       handle,
        "display_name": display_name or handle,
        "party":        party or None,
        "active":       True,
    }, on_conflict="platform,handle").execute()
    log.info(f"Added @{handle} [{party or 'no party'}]")


def cmd_remove_account(handle: str) -> None:
    handle = handle.lstrip("@")
    sb.table("monitored_accounts").update({"active": False}) \
        .eq("platform", "instagram").eq("handle", handle).execute()
    log.info(f"Deactivated @{handle}")


# ── Crawl ─────────────────────────────────────────────────────────────────────

def crawl_account(L, account: dict) -> int:
    import instaloader
    handle     = account["handle"]
    account_id = account["id"]
    cutoff     = datetime.now(timezone.utc) - timedelta(days=14)

    try:
        profile = instaloader.Profile.from_username(L.context, handle)
        rows: list[dict] = []
        for post in profile.get_posts():
            post_date = post.date_utc.replace(tzinfo=timezone.utc)
            if post_date < cutoff:
                break

            media_urls: list[str] = []
            try:
                if post.typename == "GraphSidecar":
                    for i, node in enumerate(post.get_sidecar_nodes()):
                        if i >= 3:
                            break
                        media_urls.append(node.display_url)
                elif post.url:
                    media_urls.append(post.url)
            except Exception:
                pass

            rows.append({
                "account_id": account_id,
                "platform":   "instagram",
                "post_id":    post.shortcode,
                "content":    (post.caption or "")[:2000],
                "url":        f"https://www.instagram.com/p/{post.shortcode}/",
                "media_urls": media_urls,
                "posted_at":  post_date.isoformat(),
                "likes":      post.likes              or 0,
                "reposts":    0,
                "replies":    post.comments           or 0,
                "views":      post.video_view_count   or 0,
            })

        if rows:
            sb.table("monitored_posts").upsert(rows, on_conflict="platform,post_id").execute()
        log.info(f"@{handle}: {len(rows)} posts upserted")
        time.sleep(3)   # polite pacing
        return len(rows)
    except Exception as e:
        log.error(f"@{handle}: {e}")
        return 0


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

    accounts = get_active_accounts()
    if not accounts:
        log.info("No active Instagram accounts. Run: python crawler/crawl_instagram.py --add-account @handle")
        return
    L     = get_loader()
    total = 0
    for account in accounts:
        total += crawl_account(L, account)
    log.info(f"Done — {total} posts upserted across {len(accounts)} accounts.")


if __name__ == "__main__":
    main()
