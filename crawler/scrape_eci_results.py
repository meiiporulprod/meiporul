"""
Scrape official ECI results for all 234 TN constituencies.
Primary:  ConstituencywiseS22{n}.htm  — table with EVM + postal breakdown
Fallback: candidateswise-S22{n}.htm   — card layout, total votes only

Usage: python crawler/scrape_eci_results.py
"""
import os, re, time, sys
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

CONSTITUENCYWISE_URL = "https://results.eci.gov.in/ResultAcGenMay2026/ConstituencywiseS22{n}.htm"
CANDIDATEWISE_URL    = "https://results.eci.gov.in/ResultAcGenMay2026/candidateswise-S22{n}.htm"

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
    "PUTHIYA TAMILAGAM":                        "PT",
    "KONGUNADU MAKKAL DESIA KATCHI":            "KMDK",
    "INDEPENDENT":                              "IND",
    "NONE OF THE ABOVE":                        None,
}

def to_abbr(raw: str) -> str | None:
    u = raw.strip().upper()
    if u in PARTY_ABBR:
        return PARTY_ABBR[u]
    if "TAMILAGA VETTRI" in u or "VAAZHVURIMAI" in u: return "TVK"
    if "ANNA DRAVIDA" in u:      return "AIADMK"
    if "DRAVIDA MUNNETRA" in u:  return "DMK"
    if "NAAM TAMILAR" in u:      return "NTK"
    if "DESIYA MURPOKKU" in u:   return "DMDK"
    if "PATTALI MAKKAL" in u:    return "PMK"
    if "VIDUTHALAI" in u:        return "VCK"
    if "MARUMALARCHI" in u:      return "MDMK"
    if "MUSLIM LEAGUE" in u:     return "IUML"
    if "AMMA MAKKAL" in u or "ANNA MAKKAL MUNNETRA" in u: return "AMMK"
    if "BHARATIYA JANATA" in u:  return "BJP"
    if "CONGRESS" in u:          return "INC"
    if "COMMUNIST" in u and "MARXIST" in u: return "CPI(M)"
    if "COMMUNIST" in u:         return "CPI"
    if "BAHUJAN" in u:           return "BSP"
    if "INDEPENDENT" in u:       return "IND"
    if "NONE OF THE ABOVE" in u: return None
    return raw.strip()

def parse_table(html: str) -> list[dict]:
    """Parse ConstituencyWise table — returns EVM, postal, total."""
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table")
    if not table:
        return []
    candidates = []
    for row in table.find_all("tr")[1:]:
        cells = [td.get_text(strip=True) for td in row.find_all("td")]
        if len(cells) < 6:
            continue
        sn, name, party_raw = cells[0], cells[1], cells[2]
        # Skip total row and header repeats
        if not sn.isdigit():
            continue
        party = to_abbr(party_raw)
        if party is None:   # NOTA
            continue
        try:
            evm    = int(cells[3].replace(",", ""))
            postal = int(cells[4].replace(",", ""))
            total  = int(cells[5].replace(",", ""))
            pct    = float(cells[6]) if len(cells) > 6 and cells[6] else 0.0
        except (ValueError, IndexError):
            continue
        candidates.append({
            "name": name.strip(), "party": party,
            "evm": evm, "postal": postal, "total": total, "pct": pct,
        })
    return candidates

def parse_cards(html: str) -> list[dict]:
    """Fallback: parse candidatewise card layout — total votes only."""
    soup = BeautifulSoup(html, "html.parser")
    candidates = []
    for box in soup.find_all(class_="cand-box"):
        try:
            name  = box.find("h5").get_text(strip=True)
            party = to_abbr(box.find("h6").get_text(strip=True))
            if party is None:
                continue
            nums  = re.findall(r"\d[\d,]*", box.find(class_="status").get_text())
            total = int(nums[0].replace(",", "")) if nums else 0
            candidates.append({"name": name, "party": party,
                                "evm": 0, "postal": 0, "total": total, "pct": 0.0})
        except Exception:
            continue
    return candidates

def norm(s): return re.sub(r"[^A-Z0-9]", "", s.upper())

def get_cid(number: int) -> str | None:
    r = sb.table("election_constituencies").select("id").eq("number", number).single().execute()
    return r.data["id"] if r.data else None

def update_db(number: int, candidates: list[dict], has_evm: bool) -> tuple[int, int]:
    cid = get_cid(number)
    if not cid:
        return 0, 0

    existing = sb.table("election_results") \
        .select("id,candidate_name") \
        .eq("constituency_id", cid).eq("election_year", 2026) \
        .execute().data
    db_map = {norm(r["candidate_name"]): r["id"] for r in existing}

    by_total = sorted(candidates, key=lambda c: c["total"], reverse=True)
    grand    = sum(c["total"] for c in by_total)

    upd = ins = 0
    for rank, c in enumerate(by_total, 1):
        payload = {
            "party":      c["party"],
            "total_votes": c["total"],
            "vote_share":  round(c["total"] / grand * 100, 2) if grand else 0,
            "rank":        rank,
            "is_winner":   rank == 1,
        }
        if has_evm:
            payload["evm_votes"]    = c["evm"]
            payload["postal_votes"] = c["postal"]

        key = norm(c["name"])
        if key in db_map:
            sb.table("election_results").update(payload).eq("id", db_map[key]).execute()
            upd += 1
        else:
            sb.table("election_results").upsert({
                **payload,
                "constituency_id": cid,
                "election_year":   2026,
                "candidate_name":  c["name"],
                "evm_votes":       c.get("evm", 0),
                "postal_votes":    c.get("postal", 0),
            }, on_conflict="constituency_id,election_year,candidate_name").execute()
            ins += 1
    return upd, ins


def fetch(page, url: str) -> str:
    page.goto(url, timeout=25000)
    page.wait_for_load_state("networkidle", timeout=15000)
    html = page.content()
    if "Access Denied" in html:
        time.sleep(2)
        page.goto(url, timeout=25000)
        page.wait_for_load_state("networkidle", timeout=15000)
        html = page.content()
    return html


only: set[int] = set()
if "--only" in sys.argv:
    idx  = sys.argv.index("--only")
    only = {int(n) for n in sys.argv[idx + 1].split(",")}
    print(f"Running for AC numbers: {sorted(only)}\n")

print("Starting ECI scraper — browser window will open, don't close it.\n")
total_upd = total_ins = total_fail = 0

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False)
    page = browser.new_page()

    for n in range(1, 235):
        if only and n not in only:
            continue
        try:
            # PRIMARY: ConstituencyWise (table with EVM + postal)
            html = fetch(page, CONSTITUENCYWISE_URL.format(n=n))
            candidates = parse_table(html)
            has_evm = True

            # FALLBACK: candidatewise (cards, total only)
            if not candidates:
                html = fetch(page, CANDIDATEWISE_URL.format(n=n))
                candidates = parse_cards(html)
                has_evm = False

            if not candidates:
                print(f"AC{n:3d}: ✗ no data on either URL")
                total_fail += 1
                continue

            u, i = update_db(n, candidates, has_evm)
            total_upd += u
            total_ins += i
            src = "table" if has_evm else "cards"
            winner = next((c["name"] for c in candidates
                           if c["total"] == max(x["total"] for x in candidates)), "?")
            print(f"AC{n:3d}: {u:3d} updated, {i} new  [{src}]  winner: {winner}")
            page.wait_for_timeout(300)

        except Exception as e:
            print(f"AC{n:3d}: ERROR — {e}")
            total_fail += 1

    browser.close()

print(f"\nDone. Updated: {total_upd}  Inserted: {total_ins}  Failed: {total_fail}")
