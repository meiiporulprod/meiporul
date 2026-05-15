"""Read the LEFT sub-cell (candidate name) of hdr3 images for specific ACs."""
from PIL import Image
import easyocr
import os

reader = easyocr.Reader(['en'], gpu=False, verbose=False)
tmp = "crawler/pdf/tmp"

# hdr3 is 643px wide; each row has left (candidate) and right (party) sub-cells
# Split at ~320px
W_HALF = 320

def read_left_strip(ac, y0, y1, label):
    img = Image.open(f"{tmp}/AC{ac}_hdr3.png")
    W, H = img.size
    crop = img.crop((0, y0, W_HALF, min(y1, H)))
    out = f"{tmp}/{label}.png"
    crop.save(out)
    ocr = reader.readtext(out, detail=0, paragraph=False)
    print(f"{label} (y={y0}-{y1}): {ocr}")
    return ocr

# AC154: AIADMK candidate is around y=1150-1450
read_left_strip(154, 900, 1500, "AC154_left_900_1500")
read_left_strip(154, 1200, 1800, "AC154_left_1200_1800")

# AC156: candidates are hard to read
read_left_strip(156, 600, 1800, "AC156_left_600_1800")
read_left_strip(156, 1800, 3000, "AC156_left_1800_3000")

# AC155: independents have partial names
read_left_strip(155, 1800, 3300, "AC155_left_1800_3300")

# AC158: key candidates
read_left_strip(158, 300, 1800, "AC158_left_300_1800")
read_left_strip(158, 1800, 3300, "AC158_left_1800_3300")
