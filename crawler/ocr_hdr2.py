"""OCR hdr2 images to extract candidate name/party pairs per AC."""
import easyocr
import json

reader = easyocr.Reader(['en'], gpu=False, verbose=False)
tmp = "crawler/pdf/tmp"
acs = [151, 152, 153, 154, 155, 156, 157, 158]

results = {}
for ac in acs:
    path = f"{tmp}/AC{ac}_hdr2.png"
    ocr = reader.readtext(path, detail=0, paragraph=False)
    results[str(ac)] = ocr
    print(f"\nAC{ac}:")
    for t in ocr:
        print(f"  {t!r}")

with open(f"{tmp}/hdr2_ocr.json", "w") as f:
    json.dump(results, f, indent=2)
print("\nSaved hdr2_ocr.json")
