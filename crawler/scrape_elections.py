"""
Scrape 2026 Tamil Nadu Assembly Election results from ECI website.
Fetches all 234 constituency pages and upserts into Supabase.

Usage:
    python crawler/scrape_elections.py
"""

import os
import re
import time
import logging
import sys
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# UTF-8 logging for Windows
log_handler = logging.StreamHandler(
    open(sys.stdout.fileno(), mode="w", encoding="utf-8", closefd=False)
)
logging.basicConfig(level=logging.INFO, handlers=[log_handler],
                    format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)

ECI_BASE = "https://results.eci.gov.in/ResultAcGenMay2026"
TOTAL_CONSTITUENCIES = 234

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9,ta;q=0.8",
    "Referer": f"{ECI_BASE}/index.htm",
    "Connection": "keep-alive",
}

# Tamil Nadu district names for lookup (constituency number → district)
# Source: Delimitation Order 2008
DISTRICT_MAP = {
    range(1, 7):    "Tiruvallur",
    range(7, 18):   "Chennai",
    range(18, 25):  "Kancheepuram",
    range(25, 32):  "Chengalpattu",
    range(32, 40):  "Vellore",
    range(40, 44):  "Ranipet",
    range(44, 48):  "Tirupattur",
    range(48, 53):  "Krishnagiri",
    range(53, 61):  "Dharmapuri",
    range(61, 68):  "Tiruvannamalai",
    range(68, 73):  "Villupuram",
    range(73, 79):  "Kallakurichi",
    range(79, 85):  "Salem",
    range(85, 90):  "Namakkal",
    range(90, 95):  "Erode",
    range(95, 99):  "Tiruppur",
    range(99, 106): "The Nilgiris",
    range(106, 112):"Coimbatore",
    range(112, 117):"Dindigul",
    range(117, 123):"Karur",
    range(123, 130):"Tiruchirappalli",
    range(130, 136):"Perambalur",
    range(136, 140):"Ariyalur",
    range(140, 145):"Cuddalore",
    range(145, 152):"Nagapattinam",
    range(152, 157):"Mayiladuthurai",
    range(157, 164):"Thanjavur",
    range(164, 170):"Tiruvarur",
    range(170, 175):"Pudukottai",
    range(175, 182):"Sivaganga",
    range(182, 188):"Madurai",
    range(188, 193):"Theni",
    range(193, 200):"Virudhunagar",
    range(200, 205):"Ramanathapuram",
    range(205, 211):"Thoothukudi",
    range(211, 217):"Tirunelveli",
    range(217, 222):"Tenkasi",
    range(222, 229):"Kanyakumari",
    range(229, 235):"Vellore",  # remaining
}

def get_district(num: int) -> str:
    for r, district in DISTRICT_MAP.items():
        if num in r:
            return district
    return "Unknown"


def fetch_page(num: int) -> str | None:
    url = f"{ECI_BASE}/ConstituencywiseS22{num}.htm"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        if resp.status_code == 200:
            return resp.text
        log.warning(f"  [{num}] HTTP {resp.status_code} — {url}")
        return None
    except Exception as e:
        log.error(f"  [{num}] Error: {e}")
        return None


def parse_page(html: str, num: int) -> dict | None:
    """Parse ECI constituency result page. Returns constituency + candidates dict."""
    soup = BeautifulSoup(html, "html.parser")

    # Constituency name is usually in a heading or table caption
    name = None
    for tag in soup.find_all(["h1", "h2", "h3", "caption", "td"]):
        text = tag.get_text(strip=True)
        # ECI pages have format like "1 - Gummidipoondi"
        if re.match(r"^\d+\s*[-–]\s*\w", text):
            parts = re.split(r"[-–]", text, maxsplit=1)
            if len(parts) == 2:
                name = parts[1].strip()
                break

    if not name:
        # Fallback: look for any heading containing constituency info
        h = soup.find("div", class_=re.compile(r"constituency|header|title", re.I))
        if h:
            name = h.get_text(strip=True)

    # Parse results table
    # ECI table columns: Candidate | Party | EVM Votes | Postal Votes | Total Votes | % of Votes
    candidates = []
    tables = soup.find_all("table")

    for table in tables:
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue

        # Detect header row
        headers = [th.get_text(strip=True).lower() for th in rows[0].find_all(["th", "td"])]
        if not any(kw in " ".join(headers) for kw in ["candidate", "party", "votes", "total"]):
            continue

        for row in rows[1:]:
            cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
            if len(cells) < 4:
                continue

            # Skip total/summary rows
            if any(kw in cells[0].lower() for kw in ["total", "nota", "none"]):
                # Handle NOTA separately if needed
                continue

            try:
                # Try to extract: name, party, evm, postal, total, vote_share
                candidate_name = cells[0]
                party = cells[1] if len(cells) > 1 else "IND"

                # Find numeric columns
                nums = []
                for c in cells[2:]:
                    cleaned = c.replace(",", "").replace("%", "").strip()
                    if re.match(r"^\d+(\.\d+)?$", cleaned):
                        nums.append(float(cleaned))

                if len(nums) >= 3:
                    evm_votes    = int(nums[0])
                    postal_votes = int(nums[1])
                    total_votes  = int(nums[2])
                    vote_share   = round(nums[3], 2) if len(nums) > 3 else None
                elif len(nums) == 2:
                    evm_votes    = 0
                    postal_votes = 0
                    total_votes  = int(nums[0])
                    vote_share   = round(nums[1], 2) if len(nums) > 1 else None
                elif len(nums) == 1:
                    evm_votes    = 0
                    postal_votes = 0
                    total_votes  = int(nums[0])
                    vote_share   = None
                else:
                    continue

                if candidate_name and total_votes >= 0:
                    candidates.append({
                        "candidate_name": candidate_name,
                        "party":          party,
                        "evm_votes":      evm_votes,
                        "postal_votes":   postal_votes,
                        "total_votes":    total_votes,
                        "vote_share":     vote_share,
                    })
            except (ValueError, IndexError):
                continue

        if candidates:
            break  # found the right table

    if not candidates:
        return None

    # Sort by total_votes descending, assign rank
    candidates.sort(key=lambda c: c["total_votes"], reverse=True)
    for i, c in enumerate(candidates):
        c["rank"]      = i + 1
        c["is_winner"] = (i == 0)

    # Compute vote_share if missing
    total = sum(c["total_votes"] for c in candidates)
    for c in candidates:
        if c["vote_share"] is None and total > 0:
            c["vote_share"] = round((c["total_votes"] / total) * 100, 2)

    return {
        "number":     num,
        "name":       name or f"Constituency {num}",
        "district":   get_district(num),
        "candidates": candidates,
    }


def upsert_constituency(data: dict) -> str:
    """Upsert constituency and return its UUID."""
    result = supabase.table("election_constituencies").upsert(
        {
            "number":   data["number"],
            "name":     data["name"],
            "district": data["district"],
        },
        on_conflict="number",
    ).execute()
    return result.data[0]["id"]


def upsert_results(constituency_id: str, candidates: list):
    rows = [
        {
            "constituency_id": constituency_id,
            "election_year":   2026,
            **c,
        }
        for c in candidates
    ]
    supabase.table("election_results").upsert(
        rows,
        on_conflict="constituency_id,election_year,candidate_name",
    ).execute()


def main():
    log.info(f"Scraping 2026 Tamil Nadu election results — {TOTAL_CONSTITUENCIES} constituencies")

    success = 0
    failed  = []

    for num in range(1, TOTAL_CONSTITUENCIES + 1):
        log.info(f"[{num:3d}/{TOTAL_CONSTITUENCIES}] Fetching...")

        html = fetch_page(num)
        if not html:
            failed.append(num)
            time.sleep(1)
            continue

        data = parse_page(html, num)
        if not data or not data["candidates"]:
            log.warning(f"  [{num}] Could not parse results")
            failed.append(num)
            time.sleep(1)
            continue

        try:
            cid = upsert_constituency(data)
            upsert_results(cid, data["candidates"])
            log.info(
                f"  [{num}] {data['name']} — "
                f"{len(data['candidates'])} candidates, "
                f"winner: {data['candidates'][0]['candidate_name']} ({data['candidates'][0]['party']})"
            )
            success += 1
        except Exception as e:
            log.error(f"  [{num}] DB error: {e}")
            failed.append(num)

        time.sleep(0.5)  # be polite to ECI servers

    log.info(f"\nDone. Success: {success}/{TOTAL_CONSTITUENCIES}")
    if failed:
        log.warning(f"Failed constituencies: {failed}")
        log.info("Re-run the script to retry failed ones — upsert is idempotent.")


if __name__ == "__main__":
    main()
