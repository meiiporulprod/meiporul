"""
Remove duplicate election_results rows caused by PDF->ECI name mismatch.

Two-pass strategy:
  Pass A  — major-party duplicates in same constituency: keep highest votes
            (if tie, keep longer name; if still tie, keep alphabetically last)
  Pass B  — any remaining exact-same-vote duplicates (catches IND etc.):
            keep longest name
Then re-rank every constituency by total_votes DESC.

Usage:
    python crawler/cleanup_results.py
"""

import os, re
from collections import defaultdict
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

MAJOR_PARTIES = {
    "TVK","DMK","AIADMK","BJP","INC","CPI(M)","CPI",
    "VCK","DMDK","PMK","NTK","MDMK","IUML","AMMK","BSP","PT","KMDK",
}

# ── Load everything ──────────────────────────────────────────────────────────

def fetch_all(table_name, filters: dict, select: str) -> list:
    """Paginate through all rows (bypasses Supabase's 1000-row default limit)."""
    rows, offset, page = [], 0, 500
    while True:
        q = sb.table(table_name).select(select)
        for k, v in filters.items():
            q = q.eq(k, v)
        batch = q.range(offset, offset + page - 1).execute().data or []
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows

print("Loading all 2026 election results...")
all_rows = fetch_all(
    "election_results",
    {"election_year": 2026},
    "id,constituency_id,candidate_name,party,total_votes,rank,is_winner,evm_votes",
)
print(f"Loaded {len(all_rows)} rows.\n")

all_consts = (
    sb.table("election_constituencies")
    .select("id,number,name")
    .order("number")
    .execute()
    .data or []
)
cid_to_info = {c["id"]: c for c in all_consts}

# Group rows by constituency
by_const: dict[str, list] = defaultdict(list)
for r in all_rows:
    by_const[r["constituency_id"]].append(r)


# ── Dedup logic ───────────────────────────────────────────────────────────────

def name_quality(name: str) -> int:
    """
    Score for 'looks like a real name'. Higher = better.
    ECI-source priority is handled separately in best(); this scores the name text itself.
    """
    if not name:
        return 0
    s = name.strip()
    score = 0
    # Strongly prefer names starting with an uppercase letter
    if s and s[0].isupper():
        score += 10000
    # Penalise garbled OCR text with brackets (e.g. '. M . L A M ) MK AM YT I( N A L A P')
    if '(' in s or ')' in s:
        score -= 9000
    # Penalise multiple single-letter tokens (space-separated) — fully garbled text
    single_letters = re.findall(r'(?<![A-Z])[A-Z](?![A-Z\.])', s)
    if len(single_letters) >= 3:
        score -= 7000
    score += len(s)
    return score

def best(rows: list) -> dict:
    """
    Pick the row to keep.
    Priority:  1) ECI-sourced (evm_votes > 0)  2) total_votes  3) name_quality  4) alpha-last
    """
    return sorted(
        rows,
        key=lambda r: (
            1 if (r.get("evm_votes") or 0) > 0 else 0,
            r["total_votes"],
            name_quality(r["candidate_name"]),
            r["candidate_name"],
        ),
        reverse=True,
    )[0]

to_delete: set[str] = set()

for cid, rows in by_const.items():
    info = cid_to_info.get(cid, {})
    ac   = info.get("number", "?")
    name = info.get("name", "?")

    # Pass A: major-party duplicates
    party_groups: dict[str, list] = defaultdict(list)
    for r in rows:
        if r["party"] in MAJOR_PARTIES:
            party_groups[r["party"]].append(r)

    for party, prows in party_groups.items():
        if len(prows) < 2:
            continue
        keep    = best(prows)
        deletes = [r for r in prows if r["id"] != keep["id"]]
        for d in deletes:
            print(f"  AC{ac:3d} {name}: [A] DELETE {d['candidate_name']!r} "
                  f"({d['party']}) {d['total_votes']:,} -> keep {keep['candidate_name']!r} {keep['total_votes']:,}")
            to_delete.add(d["id"])

    # Pass B: exact-same-vote duplicates (any party)
    vote_groups: dict[int, list] = defaultdict(list)
    for r in rows:
        if r["id"] not in to_delete and r["total_votes"] > 0:
            vote_groups[r["total_votes"]].append(r)

    for votes, vrows in vote_groups.items():
        if len(vrows) < 2:
            continue
        keep    = best(vrows)
        deletes = [r for r in vrows if r["id"] != keep["id"]]
        for d in deletes:
            print(f"  AC{ac:3d} {name}: [B] DELETE dup-vote {d['candidate_name']!r} "
                  f"({d['party']}) {votes:,} -> keep {keep['candidate_name']!r}")
            to_delete.add(d["id"])

# ── Execute deletes ───────────────────────────────────────────────────────────

print(f"\nDeleting {len(to_delete)} duplicate rows...")
for row_id in to_delete:
    sb.table("election_results").delete().eq("id", row_id).execute()
print("Done deleting.\n")

# ── Re-rank ───────────────────────────────────────────────────────────────────

print("Re-ranking all constituencies by total_votes...")

# Reload after deletes
all_rows_clean = fetch_all(
    "election_results",
    {"election_year": 2026},
    "id,constituency_id,candidate_name,party,total_votes",
)

by_const_clean: dict[str, list] = defaultdict(list)
for r in all_rows_clean:
    by_const_clean[r["constituency_id"]].append(r)

re_ranked = 0
for cid, rows in by_const_clean.items():
    # Exclude NOTA from ranked ordering
    nota_ids = {r["id"] for r in rows if r["party"] == "NOTA" or r["candidate_name"] == "NOTA"}
    ranked   = [r for r in rows if r["id"] not in nota_ids]
    ranked.sort(key=lambda r: r["total_votes"], reverse=True)

    for rank, row in enumerate(ranked, 1):
        sb.table("election_results").update({
            "rank":      rank,
            "is_winner": rank == 1,
        }).eq("id", row["id"]).execute()
        re_ranked += 1

    # Keep NOTA at rank=0
    for row in rows:
        if row["id"] in nota_ids:
            sb.table("election_results").update({
                "rank":      0,
                "is_winner": False,
            }).eq("id", row["id"]).execute()

print(f"Re-ranked {re_ranked} rows across {len(by_const_clean)} constituencies.")
print("\nDone. Run ECI scraper for all constituencies, then run this script again:")
print("  meiporul\\Scripts\\python.exe crawler/scrape_eci_results.py")
