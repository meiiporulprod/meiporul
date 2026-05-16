"""
Extract per-booth vote data from Form 20 PDFs.
Stores results in election_booths + election_booth_results.

Usage:
    python crawler/scrape_booths.py
    python crawler/scrape_booths.py --only 16,17,27
"""

import os, re, io, time, logging, sys
import requests, pdfplumber
from bs4 import BeautifulSoup
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

INDEX_URL = "https://www.elections.tn.gov.in/Form20_TNLA2026.aspx"
BASE_URL  = "https://www.elections.tn.gov.in"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}

METADATA = {
    "total","nota","rejected","tendered","valid","votes",
    "station","polling","elector","booth","serial","contest","number",
}
_POSTAL_KW  = {"postal", "latsop", "latosp"}
_PARTY_SKIP = {"nota","total","grand","valid","votes","rejected","tendered","number"}

PARTY_ABBR = {
    "TAMILAGA VETTRI KAZHAGAM":                 "TVK",
    "TAMILAGA KAZHAGAM VETTRI":                 "TVK",
    "TAMIZHAGA VAAZHVURIMAI KATCHI":            "TVK",
    "DRAVIDA MUNNETRA KAZHAGAM":                "DMK",
    "ALL INDIA ANNA DRAVIDA MUNNETRA KAZHAGAM": "AIADMK",
    "BHARATIYA JANATA PARTY":                   "BJP",
    "INDIAN NATIONAL CONGRESS":                 "INC",
    "COMMUNIST PARTY OF INDIA (MARXIST)":       "CPI(M)",
    "COMMUNIST PARTY OF INDIA":                 "CPI",
    "VIDUTHALAI CHIRUTHAIGAL KATCHI":           "VCK",
    "DESIYA MURPOKKU DRAVIDA KAZHAGAM":         "DMDK",
    "PATTALI MAKKAL KATCHI":                    "PMK",
    "NAAM TAMILAR KATCHI":                      "NTK",
    "MARUMALARCHI DRAVIDA MUNNETRA KAZHAGAM":   "MDMK",
    "INDIAN UNION MUSLIM LEAGUE":               "IUML",
    "AMMA MAKKAL MUNNETRA KAZAGHAM":            "AMMK",
    "ANNA MAKKAL MUNNETRA KAZHAGAM":            "AMMK",
    "BAHUJAN SAMAJ PARTY":                      "BSP",
    "INDEPENDENT":                              "IND",
}

def to_abbr(raw: str) -> str:
    u = raw.strip().upper()
    if u in PARTY_ABBR:
        return PARTY_ABBR[u]
    if "TAMILAGA VETTRI" in u or "VAAZHVURIMAI" in u: return "TVK"
    if "ANNA DRAVIDA" in u:      return "AIADMK"
    if "DRAVIDA MUNNETRA" in u:  return "DMK"
    if "NAAM TAMILAR" in u:      return "NTK"
    if "PATTALI MAKKAL" in u:    return "PMK"
    if "VIDUTHALAI" in u:        return "VCK"
    if "MARUMALARCHI" in u:      return "MDMK"
    if "MUSLIM LEAGUE" in u:     return "IUML"
    if "AMMA MAKKAL" in u:       return "AMMK"
    if "BHARATIYA JANATA" in u:  return "BJP"
    if "CONGRESS" in u:          return "INC"
    if "COMMUNIST" in u and "MARXIST" in u: return "CPI(M)"
    if "COMMUNIST" in u:         return "CPI"
    if "INDEPENDENT" in u:       return "IND"
    return raw.strip()

def norm_name(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", s.upper())

def to_int(val) -> int:
    s = re.sub(r"\s+", "", str(val or "0")).replace(",", "")
    return int(float(s)) if re.match(r"^\d+(\.\d+)?$", s) else 0

def fix_cell(val) -> str:
    return " ".join(str(val or "").split()).strip()

def rev_cell(val) -> str:
    return fix_cell(str(val or "")[::-1])

def is_header(text: str) -> bool:
    t = text.lower()
    t_ns = t.replace(" ", "")
    return (len(t) < 2
            or any(kw in t for kw in METADATA)
            or any(kw in t[::-1] for kw in METADATA)
            or any(kw in t_ns for kw in METADATA)
            or any(kw in t_ns[::-1] for kw in METADATA)
            or (len(t_ns) >= 3 and any(kw.endswith(t_ns) for kw in METADATA))
            or (len(t_ns) >= 3 and any(kw.endswith(t_ns[::-1]) for kw in METADATA)))

def reversed_serial(cell_raw: str) -> bool:
    raw = str(cell_raw or "")
    stripped = re.sub(r"\s+", "", raw)
    rev_s = stripped[::-1].lower()
    if re.search(r"\bsl\.?no\b", rev_s):
        return not re.search(r"\bsl\.?no\b", stripped.lower())
    normalized = fix_cell(raw)
    rev_n = normalized[::-1].lower()
    if re.search(r"\bserial\s*\.?\s*no\b", rev_n):
        return not re.search(r"\bserial\s*\.?\s*no\b", normalized.lower())
    return False

def _is_postal_row(row) -> bool:
    for cell in row[:3]:
        t = re.sub(r"\s+", "", str(cell or "")).lower()
        if any(kw in t for kw in _POSTAL_KW) or any(kw in t[::-1] for kw in _POSTAL_KW):
            return True
    return False


def parse_form20_booths(pdf_bytes: bytes, num: int) -> list[dict]:
    """
    Returns [{booth_number, booth_name, candidates: [{name, party, votes}]}].
    Mirrors the layout-detection logic in scrape_elections.parse_form20 but
    captures individual booth rows instead of aggregating totals.
    """
    cand_cols:   list[tuple[int, str]] = []
    col_parties: dict[int, str] = {}
    booths:      list[dict] = []
    is_reversed  = False
    found        = False

    def _extract_names_rev(name_row, start_col):
        cols = []
        for i in range(start_col, len(name_row)):
            name = rev_cell(name_row[i])
            if name and not is_header(name):
                cols.append((i, name))
        return cols

    def _reg_parties(party_row, col_indices, reverse=True):
        for ci in col_indices:
            if ci >= len(party_row):
                continue
            raw  = str(party_row[ci] or "").strip()
            name = rev_cell(raw) if reverse else fix_cell(raw)
            if not name or len(name) < 2 or name.isdigit():
                continue
            nl = name.lower().replace(" ", "")
            if any(kw in nl for kw in _PARTY_SKIP):
                continue
            col_parties[ci] = to_abbr(name)

    def _try_reg(cols):
        nonlocal found
        if cols:
            cand_cols.extend(cols)
            found = True
            return True
        return False

    def capture(table_rows, skip_rows):
        for row in table_rows[skip_rows:]:
            if not row:
                continue
            cell0 = str(row[0] or "").strip()
            if not cell0.isdigit() and _is_postal_row(row):
                continue
            if not cell0.isdigit():
                continue
            # skip column-index rows (row[0]=1, row[1]=2, row[2]=3 ...)
            if (len(row) > 1
                    and str(row[1] or "").strip().isdigit()
                    and int(str(row[1] or "0").strip()) == int(cell0) + 1):
                continue
            booth_num  = int(cell0)
            raw_name   = str(row[1] or "").strip() if len(row) > 1 else ""
            booth_name = rev_cell(raw_name) if is_reversed else fix_cell(raw_name)
            # if booth name is a pure number it's a PS station number, not a label
            if re.match(r"^\d+$", booth_name.replace(",", "").replace(".", "")):
                booth_name = ""

            cands = []
            for ci, cname in cand_cols:
                if ci < len(row):
                    v = to_int(row[ci])
                    cands.append({
                        "name":  cname,
                        "party": col_parties.get(ci, "IND"),
                        "votes": v,
                    })

            if booth_num > 0 and cands and sum(c["votes"] for c in cands) > 0:
                booths.append({
                    "booth_number": booth_num,
                    "booth_name":   booth_name,
                    "candidates":   cands,
                })

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

                        # Type E
                        if (not first0 and not first1
                                and len(r2l) > 2
                                and first2 in ("slno", "sl no", "sl.no", "s.no")
                                and len(table) > 3):
                            cols = _extract_names_rev(table[1], 2)
                            if _try_reg(cols):
                                is_reversed = True
                                ci_list = [ci for ci, _ in cols]
                                if len(table) > 3:
                                    _reg_parties(table[3], ci_list)
                                capture(table, 4)
                            continue

                        # Type D
                        if (not first0 and len(r1l) > 2
                                and first1 in ("slno", "sl no", "sl.no", "s.no")
                                and any(k in r1l[1] for k in ("polling", "station", "name", "booth"))):
                            cols = _extract_names_rev(table[1], 2)
                            if _try_reg(cols):
                                is_reversed = True
                                ci_list = [ci for ci, _ in cols]
                                if len(table) > 2:
                                    _reg_parties(table[2], ci_list)
                                capture(table, 3)
                            continue

                        # Type D-rev
                        if (not first0 and len(table) > 1
                                and reversed_serial(table[1][0] if table[1] else "")):
                            cols = _extract_names_rev(table[1], 2)
                            if _try_reg(cols):
                                is_reversed = True
                                ci_list = [ci for ci, _ in cols]
                                if len(table) > 2:
                                    _reg_parties(table[2], ci_list)
                                capture(table, 2)
                            continue

                        # Type B / C
                        if reversed_serial(table[0][0] if table[0] else ""):
                            cols = _extract_names_rev(table[0], 2)
                            if cols:
                                if _try_reg(cols):
                                    is_reversed = True
                                    ci_list = [ci for ci, _ in cols]
                                    if len(table) > 1:
                                        _reg_parties(table[1], ci_list)
                                    capture(table, 2)
                            elif len(table) > 1:
                                cols = _extract_names_rev(table[1], 2)
                                if _try_reg(cols):
                                    is_reversed = True
                                    ci_list = [ci for ci, _ in cols]
                                    if len(table) > 2:
                                        _reg_parties(table[2], ci_list)
                                    capture(table, 2)
                            continue

                        # Type A (standard forward)
                        if any("serial" in h or "polling" in h or "station" in h for h in r0l):
                            total_col = next(
                                (i for i, h in enumerate(r0l) if "total" in h and i > 2), -1)
                            end  = total_col if total_col > 0 else len(table[1])
                            cols = []
                            for i in range(1, end):
                                name = fix_cell(table[1][i])
                                if name and not is_header(name):
                                    cols.append((i, name))
                            if _try_reg(cols):
                                is_reversed = False
                                ci_list = [ci for ci, _ in cols]
                                if len(table) > 2:
                                    _reg_parties(table[2], ci_list, reverse=False)
                                capture(table, 2)
                            continue

                        # Type F (title rows before structural header)
                        for ri in range(1, min(10, len(table))):
                            rXl = [str(c or "").lower().strip() for c in table[ri]]
                            rX0 = rXl[0] if rXl else ""
                            if reversed_serial(table[ri][0] if table[ri] else ""):
                                name_row = ri
                                cols = _extract_names_rev(table[ri], 2)
                                if not cols and ri + 1 < len(table):
                                    cols = _extract_names_rev(table[ri + 1], 2)
                                    name_row = ri + 1
                                if _try_reg(cols):
                                    is_reversed = True
                                    ci_list = [ci for ci, _ in cols]
                                    party_ri = name_row + 1
                                    if party_ri < len(table):
                                        _reg_parties(table[party_ri], ci_list)
                                    capture(table, name_row + 1)
                                break
                            elif (rX0 in ("slno", "sl no", "sl.no", "s.no")
                                    and len(rXl) > 2
                                    and any(k in rXl[1] for k in ("polling", "station", "name", "booth"))):
                                cols = _extract_names_rev(table[ri], 2)
                                if _try_reg(cols):
                                    is_reversed = True
                                    ci_list = [ci for ci, _ in cols]
                                    if ri + 2 < len(table):
                                        _reg_parties(table[ri + 2], ci_list)
                                    capture(table, ri + 2)
                                break
                            elif ri + 1 < len(table):
                                c0_top = re.sub(r"\s+", "", str(table[ri][0] or ""))
                                c0_bot = re.sub(r"\s+", "", str(table[ri + 1][0] or ""))
                                if not c0_bot and ri + 2 < len(table):
                                    c0_bot = re.sub(r"\s+", "", str(table[ri + 2][0] or ""))
                                if (len(c0_top) <= 4 and not c0_top.isdigit()
                                        and re.search(r"\b(sl|serial)\.?no",
                                                      (c0_top + c0_bot)[::-1].lower())):
                                    cols = _extract_names_rev(table[ri], 2)
                                    if not cols and ri + 1 < len(table):
                                        cols = _extract_names_rev(table[ri + 1], 2)
                                    if _try_reg(cols):
                                        is_reversed = True
                                        ci_list = [ci for ci, _ in cols]
                                        if ri + 2 < len(table):
                                            _reg_parties(table[ri + 2], ci_list)
                                        capture(table, ri + 2)
                                        break
                    else:
                        capture(table, 0)

    except Exception as e:
        log.error(f"  PDF parse error [AC{num}]: {e}")
        return []

    return booths


# ── PDF source (same as scrape_elections.py) ────────────────────────────────

RESERVATION_KEYWORDS = {"sc": "sc", "s.c": "sc", "st": "st", "s.t": "st"}

def get_pdf_links() -> list[dict]:
    log.info("Fetching Form 20 index page...")
    resp = requests.get(INDEX_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    links = []
    current_district = ""
    for tag in soup.find_all(["tr", "td", "li", "a", "div", "span", "p"]):
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
        match = re.match(r"(\d+)\s*[-–.]\s*(.+)", label)
        if not match:
            continue
        num      = int(match.group(1))
        name_raw = match.group(2).strip()
        reservation = "general"
        for kw, val in RESERVATION_KEYWORDS.items():
            if re.search(rf"\({kw}\)", name_raw, re.IGNORECASE):
                reservation = val
                name_raw = re.sub(rf"\s*\({kw}\)", "", name_raw, flags=re.IGNORECASE).strip()
                break
        pdf_url = href if href.startswith("http") else BASE_URL + "/" + href.lstrip("/")
        links.append({
            "number": num, "name": name_raw,
            "district": current_district, "reservation": reservation, "url": pdf_url,
        })
    log.info(f"Found {len(links)} PDF links.")
    return links


def download_pdf(url: str) -> bytes | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=60)
        if resp.status_code == 200:
            return resp.content
        log.warning(f"  HTTP {resp.status_code}: {url}")
        return None
    except Exception as e:
        log.error(f"  Download error: {e}")
        return None


# ── DB helpers ───────────────────────────────────────────────────────────────

def get_constituency_id(num: int) -> str | None:
    r = sb.table("election_constituencies").select("id").eq("number", num).single().execute()
    return r.data["id"] if r.data else None


def get_party_map(constituency_id: str) -> dict[str, str]:
    """candidate_name (normalised) → correct party from election_results."""
    r = sb.table("election_results") \
        .select("candidate_name,party") \
        .eq("constituency_id", constituency_id) \
        .eq("election_year", 2026) \
        .execute()
    return {norm_name(row["candidate_name"]): row["party"] for row in (r.data or [])}


def upsert_booth_data(constituency_id: str, booths: list[dict], party_map: dict):
    if not booths:
        return 0

    # 1. Upsert booth metadata
    booth_meta = [
        {
            "constituency_id": constituency_id,
            "election_year":   2026,
            "booth_number":    b["booth_number"],
            "booth_name":      b["booth_name"] or None,
        }
        for b in booths
    ]
    result = sb.table("election_booths").upsert(
        booth_meta,
        on_conflict="constituency_id,election_year,booth_number",
    ).execute()
    booth_id_map = {r["booth_number"]: r["id"] for r in (result.data or [])}

    # 2. Upsert booth results
    result_rows = []
    for b in booths:
        bid = booth_id_map.get(b["booth_number"])
        if not bid:
            continue
        for c in b["candidates"]:
            # prefer corrected party from election_results; fall back to PDF party
            party = party_map.get(norm_name(c["name"]), c["party"])
            result_rows.append({
                "booth_id":      bid,
                "candidate_name": c["name"],
                "party":         party,
                "votes":         c["votes"],
            })

    for i in range(0, len(result_rows), 500):
        sb.table("election_booth_results").upsert(
            result_rows[i:i + 500],
            on_conflict="booth_id,candidate_name",
        ).execute()

    return len(booths)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    only: set[int] = set()
    if "--only" in sys.argv:
        idx  = sys.argv.index("--only")
        only = {int(n) for n in sys.argv[idx + 1].split(",")}

    pdf_links = get_pdf_links()
    if not pdf_links:
        log.error("No PDF links found. Check if site structure changed.")
        return

    success, failed = 0, []

    for info in sorted(pdf_links, key=lambda x: x["number"]):
        if only and info["number"] not in only:
            continue
        num = info["number"]
        log.info(f"[{num:3d}/234] {info['name']} ({info['district']})")

        cid = get_constituency_id(num)
        if not cid:
            log.warning(f"  AC{num}: not found in election_constituencies, skipping")
            failed.append(num)
            continue

        pdf_bytes = download_pdf(info["url"])
        if not pdf_bytes:
            failed.append(num)
            time.sleep(1)
            continue

        booths = parse_form20_booths(pdf_bytes, num)
        if not booths:
            log.warning(f"  AC{num}: no booth data parsed")
            failed.append(num)
            time.sleep(1)
            continue

        party_map = get_party_map(cid)

        try:
            count = upsert_booth_data(cid, booths, party_map)
            log.info(f"  → {count} booths stored")
            success += 1
        except Exception as e:
            log.error(f"  AC{num}: DB error — {e}")
            failed.append(num)

        time.sleep(0.3)

    total = len(only) if only else 234
    log.info(f"\nDone — {success}/{total} constituencies processed.")
    if failed:
        log.warning(f"Failed: {failed}")


if __name__ == "__main__":
    main()
