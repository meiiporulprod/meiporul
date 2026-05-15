"""OCR section crops for all ACs, output structured text per section."""
import easyocr
import json
import os
from PIL import Image

reader = easyocr.Reader(['en'], gpu=False, verbose=False)
tmp = "crawler/pdf/tmp"
acs = [151, 153, 154, 155, 156, 157, 158]

results = {}
for ac in acs:
    ac_results = []
    # Read sections y=300 to y=3900 (candidate area)
    for y_start in range(300, 4200, 300):
        path = f"{tmp}/AC{ac}_sec_{y_start}.png"
        if not os.path.exists(path):
            continue
        ocr = reader.readtext(path, detail=0, paragraph=False)
        ac_results.append({"y": y_start, "text": ocr})
        print(f"AC{ac} y={y_start}: {ocr}")
    results[str(ac)] = ac_results

with open(f"{tmp}/sections_ocr.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nSaved to sections_ocr.json")
