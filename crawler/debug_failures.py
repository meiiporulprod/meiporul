"""
Debug script to inspect raw PDF table structure for 'No candidates parsed' failures.
Usage: python crawler/debug_failures.py
"""
import sys, io, logging
logging.disable(logging.CRITICAL)
sys.path.insert(0, ".")
import pdfplumber
from crawler.scrape_elections import get_pdf_links, download_pdf, parse_form20

TARGETS = [66, 68, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 164, 199, 200, 201]

links = get_pdf_links()
link_map = {x["number"]: x for x in links}

for num in TARGETS:
    info = link_map.get(num)
    if not info:
        print(f"AC{num:03d}: not found in link list")
        continue
    pdf = download_pdf(info["url"])
    if not pdf:
        print(f"AC{num:03d}: HTTP FAIL")
        continue
    result = parse_form20(pdf, num)
    if result:
        w = result[0]
        print(f"AC{num:03d} OK: {w['candidate_name'][:25]:25s} {w['total_votes']:,}")
        continue
    # Dump raw table structure for first page
    with pdfplumber.open(io.BytesIO(pdf)) as p:
        tables = p.pages[0].extract_tables()
        if not tables:
            print(f"AC{num:03d} NO TABLES on page 0")
            continue
        t = tables[0]
        print(f"AC{num:03d} FAIL page0: {len(t)}r x {len(t[0]) if t else 0}c")
        for ri in range(min(6, len(t))):
            print(f"  R{ri}: {[repr(str(c or ''))[:30] for c in t[ri][:5]]}")
