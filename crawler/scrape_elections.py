"""
Scrape 2026 Tamil Nadu Assembly Election results from Form 20 PDFs.
Source: https://www.elections.tn.gov.in/Form20_TNLA2026.aspx

Downloads all 234 constituency PDFs and parses candidate results.

Usage:
    python crawler/scrape_elections.py
"""

import os
import re
import io
import time
import logging
import sys

import requests
import pdfplumber
from bs4 import BeautifulSoup
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

log_handler = logging.StreamHandler(
    open(sys.stdout.fileno(), mode="w", encoding="utf-8", closefd=False)
)
logging.basicConfig(
    level=logging.INFO,
    handlers=[log_handler],
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)

INDEX_URL  = "https://www.elections.tn.gov.in/Form20_TNLA2026.aspx"
BASE_URL   = "https://www.elections.tn.gov.in"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}

RESERVATION_KEYWORDS = {"sc": "sc", "s.c": "sc", "st": "st", "s.t": "st"}


def get_pdf_links() -> list[dict]:
    """Fetch the index page and return list of {number, name, district, reservation, url}."""
    log.info("Fetching Form 20 index page...")
    resp = requests.get(INDEX_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    links = []

    current_district = ""

    for tag in soup.find_all(["tr", "td", "li", "a", "div", "span", "p"]):
        # Try to detect district headings
        text = tag.get_text(strip=True)
        if tag.name in ("td", "div", "span", "p") and len(text) > 3 and not tag.find("a"):
            if any(d in text for d in [
                "Tiruvallur", "Chennai", "Kancheepuram", "Chengalpattu",
                "Vellore", "Ranipet", "Tirupattur", "Krishnagiri", "Dharmapuri",
                "Tiruvannamalai", "Villupuram", "Kallakurichi", "Salem", "Namakkal",
                "Erode", "Tiruppur", "Nilgiris", "Coimbatore", "Dindigul", "Karur",
                "Tiruchirappalli", "Perambalur", "Ariyalur", "Cuddalore",
                "Nagapattinam", "Mayiladuthurai", "Thanjavur", "Tiruvarur",
                "Pudukottai", "Sivaganga", "Madurai", "Theni", "Virudhunagar",
                "Ramanathapuram", "Thoothukudi", "Tirunelveli", "Tenkasi",
                "Kanyakumari",
            ]):
                current_district = text.strip()

        if tag.name != "a":
            continue

        href = tag.get("href", "")
        if not href.lower().endswith(".pdf"):
            continue

        label = tag.get_text(strip=True)

        # Parse constituency number and name from label
        # Common formats: "1-Gummidipoondi", "001 - Gummidipoondi (SC)"
        match = re.match(r"(\d+)\s*[-–.]\s*(.+)", label)
        if not match:
            continue

        num  = int(match.group(1))
        name_raw = match.group(2).strip()

        # Detect reservation from name suffix
        reservation = "general"
        for kw, val in RESERVATION_KEYWORDS.items():
            if re.search(rf"\({kw}\)", name_raw, re.IGNORECASE):
                reservation = val
                name_raw = re.sub(rf"\s*\({kw}\)", "", name_raw, flags=re.IGNORECASE).strip()
                break

        pdf_url = href if href.startswith("http") else BASE_URL + "/" + href.lstrip("/")

        links.append({
            "number":      num,
            "name":        name_raw,
            "district":    current_district,
            "reservation": reservation,
            "url":         pdf_url,
        })

    log.info(f"Found {len(links)} PDF links on index page.")
    return links


def download_pdf(url: str) -> bytes | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=60)
        if resp.status_code == 200:
            return resp.content
        log.warning(f"  PDF download HTTP {resp.status_code}: {url}")
        return None
    except Exception as e:
        log.error(f"  PDF download error: {e}")
        return None


def parse_form20(pdf_bytes: bytes, constituency_num: int) -> list[dict]:
    """
    Parse Form 20 PDF and return list of candidate dicts.

    Form 20 table columns (typical):
    S.No | Name of Candidate | Symbol | Party | EVM Votes | Postal Votes | Total | % of Votes
    """
    candidates = []

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if not table or len(table) < 2:
                        continue

                    # Identify header row
                    header = [str(c or "").lower().strip() for c in table[0]]
                    header_text = " ".join(header)

                    # Must look like a results table
                    if not any(kw in header_text for kw in
                               ["candidate", "votes", "party", "total"]):
                        continue

                    # Map column indices
                    name_idx   = next((i for i, h in enumerate(header) if "candidate" in h or "name" in h), 1)
                    party_idx  = next((i for i, h in enumerate(header) if "party" in h), 3)
                    evm_idx    = next((i for i, h in enumerate(header) if "evm" in h or ("votes" in h and "postal" not in h)), 4)
                    post_idx   = next((i for i, h in enumerate(header) if "postal" in h), 5)
                    total_idx  = next((i for i, h in enumerate(header) if "total" in h), 6)
                    share_idx  = next((i for i, h in enumerate(header) if "%" in h or "share" in h or "percent" in h), -1)

                    for row in table[1:]:
                        if not row or len(row) < 3:
                            continue

                        # Skip header repeats, totals, NOTA rows
                        first = str(row[0] or "").strip().lower()
                        if first in ("s.no", "sl no", "sno", "", "total") or not first.isdigit():
                            if any(kw in str(row).lower() for kw in ["nota", "none of the above", "total valid", "rejected"]):
                                continue
                            if not first.isdigit():
                                continue

                        def clean_num(val) -> int:
                            s = str(val or "0").replace(",", "").replace(" ", "").strip()
                            return int(float(s)) if re.match(r"^\d+(\.\d+)?$", s) else 0

                        def clean_float(val) -> float | None:
                            s = str(val or "").replace(",", "").replace("%", "").strip()
                            try:
                                return round(float(s), 2)
                            except ValueError:
                                return None

                        name  = str(row[name_idx] or "").strip()
                        party = str(row[party_idx] or "IND").strip() or "IND"

                        evm_votes    = clean_num(row[evm_idx])    if evm_idx < len(row)   else 0
                        postal_votes = clean_num(row[post_idx])   if post_idx < len(row)  else 0
                        total_votes  = clean_num(row[total_idx])  if total_idx < len(row) else evm_votes + postal_votes
                        vote_share   = clean_float(row[share_idx]) if share_idx >= 0 and share_idx < len(row) else None

                        if name and total_votes > 0:
                            candidates.append({
                                "candidate_name": name,
                                "party":          party,
                                "evm_votes":      evm_votes,
                                "postal_votes":   postal_votes,
                                "total_votes":    total_votes,
                                "vote_share":     vote_share,
                            })

                    if candidates:
                        break  # found results table, skip rest of tables on this page

            if candidates:
                break  # found results, skip remaining pages

    except Exception as e:
        log.error(f"  PDF parse error [{constituency_num}]: {e}")
        return []

    if not candidates:
        return []

    # Sort by votes, assign rank, compute vote_share if missing
    candidates.sort(key=lambda c: c["total_votes"], reverse=True)
    total = sum(c["total_votes"] for c in candidates)
    for i, c in enumerate(candidates):
        c["rank"]      = i + 1
        c["is_winner"] = (i == 0)
        if c["vote_share"] is None and total > 0:
            c["vote_share"] = round((c["total_votes"] / total) * 100, 2)

    return candidates


def upsert_constituency(info: dict) -> str:
    result = supabase.table("election_constituencies").upsert(
        {
            "number":      info["number"],
            "name":        info["name"],
            "district":    info["district"],
            "reservation": info["reservation"],
        },
        on_conflict="number",
    ).execute()
    return result.data[0]["id"]


def upsert_results(constituency_id: str, candidates: list):
    rows = [
        {"constituency_id": constituency_id, "election_year": 2026, **c}
        for c in candidates
    ]
    supabase.table("election_results").upsert(
        rows,
        on_conflict="constituency_id,election_year,candidate_name",
    ).execute()


def main():
    pdf_links = get_pdf_links()

    if not pdf_links:
        log.error("No PDF links found on index page. Check if site structure changed.")
        return

    success, failed = 0, []

    for info in sorted(pdf_links, key=lambda x: x["number"]):
        num = info["number"]
        log.info(f"[{num:3d}/234] {info['name']} ({info['district']})")

        pdf_bytes = download_pdf(info["url"])
        if not pdf_bytes:
            failed.append(num)
            time.sleep(1)
            continue

        candidates = parse_form20(pdf_bytes, num)
        if not candidates:
            log.warning(f"  [{num}] No candidates parsed from PDF")
            failed.append(num)
            time.sleep(1)
            continue

        try:
            cid = upsert_constituency(info)
            upsert_results(cid, candidates)
            w = candidates[0]
            log.info(
                f"  → {len(candidates)} candidates | "
                f"Winner: {w['candidate_name']} ({w['party']}) "
                f"{w['total_votes']:,} votes"
            )
            success += 1
        except Exception as e:
            log.error(f"  [{num}] DB error: {e}")
            failed.append(num)

        time.sleep(0.3)

    log.info(f"\nComplete — {success}/234 constituencies imported.")
    if failed:
        log.warning(f"Failed: {failed}")
        log.info("Re-run to retry — upsert is safe to repeat.")


if __name__ == "__main__":
    main()
