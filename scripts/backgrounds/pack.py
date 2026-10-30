"""Turns rendered backgrounds (<name>-portrait.png, <name>-landscape.png) into
the app's WebP files and a square thumbnail. Run:
python3 scripts/backgrounds/pack.py <render dir> <name>[=<id>] ..."""
import sys, os
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'assets', 'backgrounds')
# Where the thumbnail is cut from the tall picture (fraction down the image).
FOCUS = {'glassdesert': 0.5, 'ebony': 0.55, 'woodset': 0.55, 'glasshall': 0.55, 'space': 0.62, 'ocean': 0.5, 'storm': 0.45}

def pack(src_dir, name, ident):
    os.makedirs(OUT, exist_ok=True)
    for orient in ('portrait', 'landscape'):
        im = Image.open(os.path.join(src_dir, f'{name}-{orient}.png')).convert('RGB')
        im.save(os.path.join(OUT, f'{ident}-{orient}.webp'), quality=80, method=6)
    im = Image.open(os.path.join(src_dir, f'{name}-portrait.png')).convert('RGB')
    w, h = im.size
    cy = int(h * FOCUS.get(ident, 0.5))
    box = (0, max(0, cy - w // 2), w, max(0, cy - w // 2) + w)
    im.crop(box).resize((240, 240), Image.LANCZOS).save(os.path.join(OUT, f'{ident}-thumb.webp'), quality=82, method=6)
    print(ident, os.path.getsize(os.path.join(OUT, f'{ident}-portrait.webp')) // 1024, 'KB')

if __name__ == '__main__':
    src = sys.argv[1]
    for arg in sys.argv[2:]:
        name, _, ident = arg.partition('=')
        pack(src, name, ident or name)
