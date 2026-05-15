"""Crop and OCR the top header area of lp3x pages to get candidate names."""
from PIL import Image
import easyocr
import os

reader = easyocr.Reader(['en'], gpu=False, verbose=False)
tmp = "crawler/pdf/tmp"
acs = [151, 153, 154, 155, 156, 157, 158]

for ac in acs:
    path = f"{tmp}/AC{ac}_lp3x.png"
    img = Image.open(path)
    W, H = img.size
    # Top ~30% of the last page = header with candidate names
    top = img.crop((0, 0, W, H // 3))
    out = f"{tmp}/AC{ac}_lp_hdr.png"
    top.save(out)
    ocr = reader.readtext(out, detail=0, paragraph=False)
    print(f"\nAC{ac} ({W}x{H}) top header:")
    for t in ocr:
        print(f"  {t!r}")
