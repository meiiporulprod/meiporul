"""Trace the exact parse path for AC149 to find why it fails."""
import sys, io, re, logging
logging.disable(logging.CRITICAL)
sys.path.insert(0, ".")
import pdfplumber
from crawler.scrape_elections import get_pdf_links, download_pdf

links = get_pdf_links()
link_map = {x["number"]: x for x in links}

METADATA = {
    "total", "nota", "rejected", "tendered", "valid", "votes",
    "station", "polling", "elector", "booth", "serial", "contest",
}

def to_int(val):
    s = re.sub(r"\s+", "", str(val or "0")).replace(",", "")
    return int(float(s)) if re.match(r"^\d+(\.\d+)?$", s) else 0

def fix_cell(val):
    return " ".join(str(val or "").split()).strip()

def rev_cell(val):
    return fix_cell(str(val or "")[::-1])

def is_header(text):
    t = text.lower()
    t_ns = t.replace(" ", "")
    return (len(t) < 2
            or any(kw in t for kw in METADATA)
            or any(kw in t[::-1] for kw in METADATA)
            or any(kw in t_ns for kw in METADATA)
            or any(kw in t_ns[::-1] for kw in METADATA))

def reversed_serial(cell_raw):
    raw = str(cell_raw or "")
    stripped = re.sub(r"\s+", "", raw)
    rev_stripped = stripped[::-1].lower()
    if re.search(r"\bsl\.?no\b", rev_stripped):
        return not re.search(r"\bsl\.?no\b", stripped.lower())
    normalized = fix_cell(raw)
    rev_normalized = normalized[::-1].lower()
    if re.search(r"\bserial\s*\.?\s*no\b", rev_normalized):
        return not re.search(r"\bserial\s*\.?\s*no\b", normalized.lower())
    return False

num = 149
info = link_map[num]
pdf = download_pdf(info["url"])
with pdfplumber.open(io.BytesIO(pdf)) as p:
    page = p.pages[0]
    tables = page.extract_tables()
    table = tables[0]
    print(f"Table 0: {len(table)}r x {len(table[0])}c")
    print(f"R4 reversed_serial: {reversed_serial(table[4][0])}")

    # Simulate _extract_names_reversed for row 4 (structural header)
    cols_from_r4 = []
    for i in range(2, len(table[4])):
        name = rev_cell(table[4][i])
        if name and not is_header(name):
            cols_from_r4.append((i, name))
    print(f"Cols from R4: {cols_from_r4[:3]}")

    # Simulate _extract_names_reversed for row 5 (name row)
    cols_from_r5 = []
    for i in range(2, len(table[5])):
        name = rev_cell(table[5][i])
        if name and not is_header(name):
            cols_from_r5.append((i, name))
    print(f"Cols from R5: {cols_from_r5[:5]}")

    # If registered, simulate accumulate from row 6
    if cols_from_r5:
        cand_cols = cols_from_r5
        col_votes = {ci: 0 for ci, _ in cand_cols}
        for row in table[6:]:
            if not row: continue
            cell0 = str(row[0] or "").strip()
            if not cell0.isdigit(): continue
            if (len(row) > 1 and str(row[1] or "").strip().isdigit()
                    and int(str(row[1] or "0").strip()) == int(cell0) + 1):
                continue
            for ci, _ in cand_cols:
                if ci < len(row):
                    col_votes[ci] += to_int(row[ci])
        print(f"Votes from page 0: {dict(list(col_votes.items())[:4])}")
        total = sum(col_votes.values())
        print(f"Total: {total}")
