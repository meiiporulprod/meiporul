"""Crop specific sections of hdr3 images to read unclear candidate names."""
from PIL import Image
import easyocr
import os

reader = easyocr.Reader(['en'], gpu=False, verbose=False)
tmp = "crawler/pdf/tmp"

# Generate targeted crops to find unclear candidate names
crops = [
    # (ac, y_start, y_end, label)
    (154, 1000, 1250, "AC154_aiadmk_cand"),
    (154, 1800, 2050, "AC154_tvkk_cand"),
    (155, 300, 700, "AC155_first_cands"),
    (155, 700, 1100, "AC155_next_cands"),
    (155, 1800, 2200, "AC155_tvkk_area"),
    (156, 300, 700, "AC156_first_cands"),
    (156, 900, 1300, "AC156_mid"),
    (156, 1800, 2200, "AC156_tvkk_area"),
    (157, 300, 700, "AC157_first_cands"),
    (158, 300, 700, "AC158_first_cands"),
    (158, 1200, 1600, "AC158_mid"),
]

for ac, y0, y1, label in crops:
    path = f"{tmp}/AC{ac}_hdr3.png"
    img = Image.open(path)
    W, H = img.size
    crop = img.crop((0, y0, W, min(y1, H)))
    out = f"{tmp}/{label}.png"
    crop.save(out)
    ocr = reader.readtext(out, detail=0, paragraph=False)
    print(f"{label}: {ocr}")
