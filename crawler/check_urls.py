import sys
sys.path.insert(0, "crawler")
from scrape_elections import get_pdf_links

links = get_pdf_links()
failing = {16, 17, 19, 27, 62, 127, 229, 230}
for info in sorted(links, key=lambda x: x["number"]):
    if info["number"] in failing:
        print(f'{info["number"]:3d}: {info["name"][:30]:30s} -> {info["url"]}')
