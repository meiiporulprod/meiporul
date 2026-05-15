import io, requests, pdfplumber, sys
sys.path.insert(0, ".")
from crawler.scrape_elections import get_pdf_links

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

num = int(sys.argv[1]) if len(sys.argv) > 1 else 16
links = get_pdf_links()
info = next((x for x in links if x["number"] == num), None)
if not info:
    print("Not found"); sys.exit(1)

url = info["url"]
print("URL:", url)
resp = requests.get(url, headers=HEADERS, timeout=60)
print("Status:", resp.status_code, "Bytes:", len(resp.content))

with pdfplumber.open(io.BytesIO(resp.content)) as pdf:
    print("Pages:", len(pdf.pages))
    for pi, page in enumerate(pdf.pages[:2]):
        tables = page.extract_tables()
        print(f"\n--- Page {pi} ({len(tables)} tables) ---")
        for ti, t in enumerate(tables):
            if not t:
                continue
            print(f"  Table {ti}: {len(t)} rows x {len(t[0])} cols")
            for ri, row in enumerate(t[:5]):
                print(f"    Row {ri}:", [str(c or "")[:25] for c in row])
