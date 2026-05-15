from PIL import Image
import easyocr
reader = easyocr.Reader(['en'], gpu=False, verbose=False)
img = Image.open("crawler/pdf/tmp/AC152_lp3x.png")
W, H = img.size
top = img.crop((0, 0, W, H // 4))
top.save("crawler/pdf/tmp/AC152_lp_hdr.png")
for t in reader.readtext("crawler/pdf/tmp/AC152_lp_hdr.png", detail=0):
    print(t)
