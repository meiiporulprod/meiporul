"""Deep debug for specific failing PDFs."""
import sys, io, re, logging
logging.disable(logging.CRITICAL)
sys.path.insert(0, ".")
import pdfplumber
import re
from crawler.scrape_elections import get_pdf_links, download_pdf, parse_form20

def reversed_serial(cell_raw):
    raw = str(cell_raw or "")
    stripped = re.sub(r"\s+", "", raw)
    rev_stripped = stripped[::-1].lower()
    if re.search(r"\bsl\.?no\b", rev_stripped):
        return not re.search(r"\bsl\.?no\b", stripped.lower())
    normalized = " ".join(raw.split()).strip()
    rev_normalized = normalized[::-1].lower()
    if re.search(r"\bserial\s*\.?\s*no\b", rev_normalized):
        return not re.search(r"\bserial\s*\.?\s*no\b", normalized.lower())
    return False

links = get_pdf_links()
link_map = {x["number"]: x for x in links}

for num in [149, 151, 164, 199]:
    info = link_map[num]
    pdf = download_pdf(info["url"])
    if not pdf:
        print(f"AC{num:03d}: HTTP FAIL"); continue
    print(f"\n=== AC{num:03d} ===")
    with pdfplumber.open(io.BytesIO(pdf)) as p:
        print(f"  Pages: {len(p.pages)}")
        for pnum in range(min(3, len(p.pages))):
            tables = p.pages[pnum].extract_tables()
            print(f"  Page {pnum}: {len(tables)} tables")
            for ti, t in enumerate(tables[:2]):
                if not t: continue
                print(f"    Table {ti}: {len(t)}r x {len(t[0]) if t else 0}c")
                for ri in range(min(10, len(t))):
                    cells = [repr(str(c or ''))[:20] for c in t[ri][:6]]
                    rs = reversed_serial(t[ri][0] if t[ri] else "")
                    print(f"      R{ri}[rev={rs}]: {cells}")
