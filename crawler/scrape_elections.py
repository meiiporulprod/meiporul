"""
Scrape 2026 Tamil Nadu Assembly Election results from Form 20 PDFs.
Source: https://www.elections.tn.gov.in/Form20_TNLA2026.aspx

Downloads all 234 constituency PDFs and parses candidate results.

Usage:
    python crawler/scrape_elections.py
    python crawler/scrape_elections.py --only 16,17,27   # retry specific ACs
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
    Parse Form 20 booth-wise PDF.

    Structural variants found across TN districts:
      A (standard): row0[0]='Serial No. Of Polling Station'; names at row1[1+]; booths at row2+
      B (partial-rev): row0[0,1]=reversed serial/station, row0[2]='No of Valid Votes...' (normal);
                       names at row1[2+] reversed; booths at row2+, col0=slno, col1=ps_no
      C (full-rev-names): row0[0,1]=reversed serial; row0[2+]=candidate names reversed;
                          row1[2+]=party names reversed; booths at row2+
      D (two-row hdr): row0[0]='', row1[0]='Slno'; row1[2+]=names reversed; booths at row3+
      E (shifted-D):   row0[0]='', row1[0]='', row2[0]='Slno'; names at row1[2+]; booths at row4+
      F (title-rows):  4+ FORM-20 title rows before structural header row
    """
    METADATA = {
        "total", "nota", "rejected", "tendered", "valid", "votes",
        "station", "polling", "elector", "booth", "serial", "contest", "number",
    }

    def to_int(val) -> int:
        s = re.sub(r"\s+", "", str(val or "0")).replace(",", "")
        return int(float(s)) if re.match(r"^\d+(\.\d+)?$", s) else 0

    def fix_cell(val) -> str:
        return " ".join(str(val or "").split()).strip()

    def rev_cell(val) -> str:
        return fix_cell(str(val or "")[::-1])

    def is_header(text: str) -> bool:
        t = text.lower()
        t_ns = t.replace(" ", "")  # space-stripped — catches spaced-letter PDFs ("T ot al")
        return (len(t) < 2
                or any(kw in t for kw in METADATA)
                or any(kw in t[::-1] for kw in METADATA)
                or any(kw in t_ns for kw in METADATA)
                or any(kw in t_ns[::-1] for kw in METADATA)
                # catch truncated reversed headers: 'lato'→rev→'otal' is suffix of 'total'
                or (len(t_ns) >= 3 and any(kw.endswith(t_ns) for kw in METADATA))
                or (len(t_ns) >= 3 and any(kw.endswith(t_ns[::-1]) for kw in METADATA)))

    def reversed_serial(cell_raw: str) -> bool:
        # Detect reversed structural identifiers: 'Sl.No.', 'Serial No.', 'Table Serial No.'
        # Two checks: compact (strip all whitespace — handles '.ON.LS') and
        # normalized (preserve word boundaries — handles 'Table Serial No.').
        raw = str(cell_raw or "")

        # Check 1: compact — handles '.ON\n.LS' → stripped '.ON.LS' → rev 'SL.NO.'
        stripped = re.sub(r"\s+", "", raw)
        rev_stripped = stripped[::-1].lower()
        if re.search(r"\bsl\.?no\b", rev_stripped):
            return not re.search(r"\bsl\.?no\b", stripped.lower())

        # Check 2: normalized — handles 'Table Serial No.' reversed where word
        # boundaries are only visible when whitespace is preserved
        normalized = fix_cell(raw)
        rev_normalized = normalized[::-1].lower()
        if re.search(r"\bserial\s*\.?\s*no\b", rev_normalized):
            return not re.search(r"\bserial\s*\.?\s*no\b", normalized.lower())

        return False

    def _extract_names_reversed(name_row, start_col: int) -> list[tuple[int, str]]:
        cols = []
        for i in range(start_col, len(name_row)):
            name = rev_cell(name_row[i])
            if name and not is_header(name):
                cols.append((i, name))
        return cols

    # Track candidate columns as (col_index, name) so vote indexing is always exact
    cand_cols: list[tuple[int, str]] = []
    col_votes: dict[int, int] = {}
    col_parties: dict[int, str] = {}
    found = False

    _PARTY_SKIP = {"nota", "total", "grand", "valid", "votes", "rejected", "tendered", "number"}

    def _register_parties(party_row, col_indices: list[int], reverse: bool = True) -> None:
        for ci in col_indices:
            if ci >= len(party_row):
                continue
            raw = str(party_row[ci] or "").strip()
            name = rev_cell(raw) if reverse else fix_cell(raw)
            if not name or len(name) < 2 or name.isdigit():
                continue
            nl = name.lower().replace(" ", "")
            if any(kw in nl for kw in _PARTY_SKIP):
                continue
            col_parties[ci] = name

    def accumulate(table_rows, skip_rows: int):
        for row in table_rows[skip_rows:]:
            if not row:
                continue
            cell0 = str(row[0] or "").strip()
            if not cell0.isdigit():
                continue
            # Skip column-index rows: row[0]='1', row[1]='2', row[2]='3', ...
            if (len(row) > 1
                    and str(row[1] or "").strip().isdigit()
                    and int(str(row[1] or "0").strip()) == int(cell0) + 1):
                continue
            for ci, _ in cand_cols:
                if ci < len(row):
                    col_votes[ci] += to_int(row[ci])

    def _try_register(cols: list[tuple[int, str]]) -> bool:
        nonlocal found
        if cols:
            cand_cols.extend(cols)
            for ci, _ in cols:
                col_votes[ci] = 0
            found = True
            return True
        return False

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                for table in page.extract_tables():
                    if not table or len(table) < 3:
                        continue

                    r0l = [str(c or "").lower().strip() for c in table[0]]
                    r1l = [str(c or "").lower().strip() for c in table[1]] if len(table) > 1 else []
                    r2l = [str(c or "").lower().strip() for c in table[2]] if len(table) > 2 else []

                    if not found:
                        first0 = r0l[0] if r0l else ""
                        first1 = r1l[0] if r1l else ""
                        first2 = r2l[0] if r2l else ""

                        # --- Type E (shifted-D): row0='', row1='', row2='Slno' ---
                        if (not first0
                                and not first1
                                and len(r2l) > 2
                                and first2 in ("slno", "sl no", "sl.no", "s.no")
                                and len(table) > 3):
                            cols = _extract_names_reversed(table[1], 2)
                            if _try_register(cols):
                                ci_list = [ci for ci, _ in cols]
                                if len(table) > 3:
                                    _register_parties(table[3], ci_list)
                                accumulate(table, 4)
                            continue

                        # --- Type D: row0='', row1[0]='Slno' ---
                        if (not first0
                                and len(r1l) > 2
                                and first1 in ("slno", "sl no", "sl.no", "s.no")
                                and ("polling" in r1l[1] or "station" in r1l[1]
                                     or "name" in r1l[1] or "booth" in r1l[1])):
                            cols = _extract_names_reversed(table[1], 2)
                            if _try_register(cols):
                                ci_list = [ci for ci, _ in cols]
                                if len(table) > 2:
                                    _register_parties(table[2], ci_list)
                                accumulate(table, 3)
                            continue

                        # --- Type D-rev: row0='', row1[0]=reversed structural id ---
                        if (not first0
                                and len(table) > 1
                                and reversed_serial(table[1][0] if table[1] else "")):
                            cols = _extract_names_reversed(table[1], 2)
                            if _try_register(cols):
                                ci_list = [ci for ci, _ in cols]
                                if len(table) > 2:
                                    _register_parties(table[2], ci_list)
                                accumulate(table, 2)
                            continue

                        # --- Type B or C (reversed serial in row0[0]) ---
                        if reversed_serial(table[0][0] if table[0] else ""):
                            # Try same row first (Type C: names in row0, parties in row1)
                            cols = _extract_names_reversed(table[0], 2)
                            if cols:
                                if _try_register(cols):
                                    ci_list = [ci for ci, _ in cols]
                                    if len(table) > 1:
                                        _register_parties(table[1], ci_list)
                                    accumulate(table, 2)
                            elif len(table) > 1:
                                # Type B: names in row1, parties in row2
                                cols = _extract_names_reversed(table[1], 2)
                                if _try_register(cols):
                                    ci_list = [ci for ci, _ in cols]
                                    if len(table) > 2:
                                        _register_parties(table[2], ci_list)
                                    accumulate(table, 2)
                            continue

                        # --- Type A (standard, forward) ---
                        if any("serial" in h or "polling" in h or "station" in h for h in r0l):
                            total_col = next(
                                (i for i, h in enumerate(r0l) if "total" in h and i > 2), -1
                            )
                            end = total_col if total_col > 0 else len(table[1])
                            cols = []
                            for i in range(1, end):
                                name = fix_cell(table[1][i])
                                if name and not is_header(name):
                                    cols.append((i, name))
                            if _try_register(cols):
                                ci_list = [ci for ci, _ in cols]
                                # Parties typically in row2 (before booth data)
                                if len(table) > 2:
                                    _register_parties(table[2], ci_list, reverse=False)
                                accumulate(table, 2)
                            continue

                        # --- Type F (title rows before structural header) ---
                        # Scan rows 1-9 for one that looks like the structural header row
                        for ri in range(1, min(10, len(table))):
                            rXl = [str(c or "").lower().strip() for c in table[ri]]
                            rX0 = rXl[0] if rXl else ""
                            if reversed_serial(table[ri][0] if table[ri] else ""):
                                # Try same row first: candidates may be in col4+ of the
                                # structural header row (col2/col3 filtered by is_header)
                                name_row = ri
                                cols = _extract_names_reversed(table[ri], 2)
                                if not cols and ri + 1 < len(table):
                                    cols = _extract_names_reversed(table[ri + 1], 2)
                                    name_row = ri + 1
                                if _try_register(cols):
                                    ci_list = [ci for ci, _ in cols]
                                    party_ri = name_row + 1
                                    if party_ri < len(table):
                                        _register_parties(table[party_ri], ci_list)
                                    accumulate(table, name_row + 1)
                                break
                            elif (rX0 in ("slno", "sl no", "sl.no", "s.no")
                                    and len(rXl) > 2
                                    and ("polling" in rXl[1] or "station" in rXl[1]
                                         or "name" in rXl[1] or "booth" in rXl[1])):
                                cols = _extract_names_reversed(table[ri], 2)
                                if _try_register(cols):
                                    ci_list = [ci for ci, _ in cols]
                                    if ri + 2 < len(table):
                                        _register_parties(table[ri + 2], ci_list)
                                    accumulate(table, ri + 2)
                                break
                            elif ri + 1 < len(table):
                                # Split structural header: cell col0 spans two rows (AC030 style)
                                c0_top = re.sub(r"\s+", "", str(table[ri][0] or ""))
                                c0_bot = re.sub(r"\s+", "", str(table[ri + 1][0] or ""))
                                # AC164 style: ri+1 col0 empty — try ri+2 for completion
                                if not c0_bot and ri + 2 < len(table):
                                    c0_bot = re.sub(r"\s+", "", str(table[ri + 2][0] or ""))
                                if (len(c0_top) <= 4 and not c0_top.isdigit()
                                        and re.search(r"\b(sl|serial)\.?no",
                                                      (c0_top + c0_bot)[::-1].lower())):
                                    cols = _extract_names_reversed(table[ri], 2)
                                    if not cols and ri + 1 < len(table):
                                        cols = _extract_names_reversed(table[ri + 1], 2)
                                    if _try_register(cols):
                                        ci_list = [ci for ci, _ in cols]
                                        if ri + 2 < len(table):
                                            _register_parties(table[ri + 2], ci_list)
                                        accumulate(table, ri + 2)
                                        break  # only break on successful registration

                    else:
                        # Subsequent pages: accumulate booth rows only
                        accumulate(table, 0)

    except Exception as e:
        log.error(f"  PDF parse error [{constituency_num}]: {e}")
        return []

    if not cand_cols or all(v == 0 for v in col_votes.values()):
        return []

    candidates = [
        {
            "candidate_name": name,
            "party":          col_parties.get(ci, "IND"),
            "evm_votes":      col_votes[ci],
            "postal_votes":   0,
            "total_votes":    col_votes[ci],
            "vote_share":     None,
        }
        for ci, name in cand_cols
        if col_votes[ci] > 0
    ]

    candidates.sort(key=lambda c: c["total_votes"], reverse=True)
    grand_total = sum(c["total_votes"] for c in candidates)
    for i, c in enumerate(candidates):
        c["rank"]       = i + 1
        c["is_winner"]  = (i == 0)
        c["vote_share"] = round((c["total_votes"] / grand_total) * 100, 2) if grand_total > 0 else 0.0

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
    # Disambiguate duplicate candidate names (possible when two candidates share a name)
    name_count: dict[str, int] = {}
    rows = []
    for c in candidates:
        raw = c["candidate_name"]
        if raw in name_count:
            name_count[raw] += 1
            c = {**c, "candidate_name": f"{raw} ({name_count[raw]})"}
        else:
            name_count[raw] = 1
        rows.append({"constituency_id": constituency_id, "election_year": 2026, **c})
    supabase.table("election_results").upsert(
        rows,
        on_conflict="constituency_id,election_year,candidate_name",
    ).execute()


def main():
    only: set[int] = set()
    if "--only" in sys.argv:
        idx = sys.argv.index("--only")
        only = {int(n) for n in sys.argv[idx + 1].split(",")}

    pdf_links = get_pdf_links()

    if not pdf_links:
        log.error("No PDF links found on index page. Check if site structure changed.")
        return

    success, failed = 0, []

    for info in sorted(pdf_links, key=lambda x: x["number"]):
        if only and info["number"] not in only:
            continue
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

    total = len(only) if only else 234
    log.info(f"\nComplete — {success}/{total} constituencies imported.")
    if failed:
        log.warning(f"Failed: {failed}")
        log.info("Re-run to retry — upsert is safe to repeat.")


if __name__ == "__main__":
    main()
