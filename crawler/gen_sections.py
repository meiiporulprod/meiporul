"""Generate 300px section crops from hdr3 images for all ACs."""
from PIL import Image
import os

tmp = "crawler/pdf/tmp"
acs = [151, 153, 154, 155, 156, 157, 158]

for ac in acs:
    path = f"{tmp}/AC{ac}_hdr3.png"
    if not os.path.exists(path):
        print(f"Missing: {path}")
        continue
    img = Image.open(path)
    W, H = img.size
    print(f"AC{ac}: {W}x{H}")
    for y_start in range(0, H, 300):
        y_end = min(y_start + 400, H)
        crop = img.crop((0, y_start, W, y_end))
        crop.save(f"{tmp}/AC{ac}_sec_{y_start}.png")
    print(f"  -> {len(range(0, H, 300))} sections")

print("Done.")
