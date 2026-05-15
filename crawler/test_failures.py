import sys, io, logging
logging.disable(logging.CRITICAL)
sys.path.insert(0, ".")
import pdfplumber
from crawler.scrape_elections import get_pdf_links, parse_form20, download_pdf

links = get_pdf_links()

for num in [17, 63, 90, 139]:
    info = next(x for x in links if x["number"] == num)
    pdf = download_pdf(info["url"])
    result = parse_form20(pdf, num) if pdf else []
    if result:
        w = result[0]
        print(f"AC{num:03d} OK: {w['candidate_name'][:25]:25s} {w['total_votes']:,}")
    else:
        if not pdf:
            print(f"AC{num:03d}: HTTP FAIL")
        else:
            with pdfplumber.open(io.BytesIO(pdf)) as p:
                t = p.pages[0].extract_tables()[0]
                print(f"AC{num:03d} FAIL {len(t)}r x {len(t[0])}c")
                for ri in range(min(5, len(t))):
                    print(f"  R{ri}: {[str(c or '')[:15] for c in t[ri][:6]]}")
