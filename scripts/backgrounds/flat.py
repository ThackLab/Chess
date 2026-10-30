"""Backgrounds that are pictures rather than 3D scenes: bokeh, brushed metal,
sky, 8-bit, light and slate. Run: python3 scripts/backgrounds/flat.py <outdir>
(needs numpy, Pillow and opencv-python-headless)."""
import sys, math
import numpy as np
import cv2
from PIL import Image

SIZES = {'portrait': (900, 1950), 'landscape': (1920, 1080)}

def fbm(h, w, octaves, rng, base=4):
    out = np.zeros((h, w), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cells = base * 2 ** o
        g = rng.random((cells + 1, int(cells * w / h) + 2)).astype(np.float32)
        out += amp * cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)
        total += amp
        amp *= 0.5
    return out / total

def save(img, path):
    Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8)).save(path)

def grain(img, rng, s=0.012):
    return img + rng.normal(0, s, img.shape[:2])[..., None].astype(np.float32)

def bubblegum(w, h, rng):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    t = (x / w * 0.4 + y / h * 0.6)[..., None]
    img = (1 - t) * np.array([1.0, 0.62, 0.78]) + t * np.array([0.98, 0.36, 0.62])
    img = img.astype(np.float32)
    light = np.zeros((h, w, 3), np.float32)
    for layer, (count, blur, k) in enumerate(((26, 9.0, 0.22), (34, 3.0, 0.3), (22, 1.2, 0.38))):
        lay = np.zeros((h, w, 3), np.float32)
        for _ in range(count):
            r = rng.uniform(0.03, 0.13) * min(w, h) * (1.5 - layer * 0.3)
            cx, cy = rng.uniform(-0.1, 1.1) * w, rng.uniform(-0.1, 1.1) * h
            d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r
            disc = (d < 1) * (0.75 + 0.25 * d ** 3)
            col = np.array([1.0, rng.uniform(0.82, 0.96), rng.uniform(0.9, 1.0)], np.float32)
            lay += (disc * rng.uniform(0.4, 1.0) * k)[..., None] * col
        light += cv2.GaussianBlur(lay, (0, 0), blur)
    img = 1 - (1 - img) * (1 - np.clip(light, 0, 1))
    glow = cv2.GaussianBlur(light, (0, 0), 60) * 0.25
    return grain(np.clip(img + glow, 0, 1), rng, 0.008)

def metal(w, h, rng):
    streak = rng.normal(0, 1, (h, w)).astype(np.float32)
    streak = cv2.GaussianBlur(streak, (0, 0), sigmaX=120, sigmaY=0.6)
    streak = (streak - streak.mean()) / (streak.std() + 1e-6)
    fine = cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), sigmaX=18, sigmaY=0.4)
    fine = fine / (fine.std() + 1e-6)
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    sheen = 0.5 + 0.5 * np.cos((x / w - 0.35) * 2.2 + (y / h - 0.3) * 1.4)
    base = 0.16 + 0.1 * sheen + 0.018 * streak + 0.012 * fine
    img = np.stack([base * 0.97, base, base * 1.04], -1)
    # Scratches.
    sc = np.zeros((h, w), np.float32)
    for _ in range(140):
        x0, y0 = rng.uniform(0, w), rng.uniform(0, h)
        a = rng.uniform(0, math.pi)
        L = rng.uniform(30, 260)
        cv2.line(sc, (int(x0), int(y0)), (int(x0 + L * math.cos(a)), int(y0 + L * math.sin(a))), float(rng.uniform(0.04, 0.16)), 1, cv2.LINE_AA)
    img += cv2.GaussianBlur(sc, (0, 0), 0.6)[..., None]
    vig = 1 - 0.45 * (((x - w / 2) / w) ** 2 + ((y - h / 2) / h) ** 2)
    return grain(np.clip(img * vig[..., None], 0, 1), rng, 0.01)

def sky(w, h, rng):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    t = (y / h)[..., None]
    img = (1 - t) * np.array([0.16, 0.42, 0.82]) + t * np.array([0.62, 0.8, 0.96])
    img = img.astype(np.float32)
    warp = fbm(h, w, 4, rng, 2)
    n = fbm(h, w, 8, rng, 3)
    n = cv2.remap(n, (x + (warp - 0.5) * 160).astype(np.float32), (y + (warp - 0.5) * 90).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    # Clouds thicken towards the horizon, and are lit from above.
    cover = np.clip((n - 0.56 + 0.16 * (y / h)) * 7.0, 0, 1) ** 1.2
    above = np.vstack([np.repeat(n[:1], 24, 0), n[:-24]])
    lit = np.clip(0.5 + (n - above) * 9, 0, 1)
    cloud = (1 - lit[..., None]) * np.array([0.72, 0.8, 0.92]) + lit[..., None] * np.array([1.0, 1.0, 1.0])
    img = img * (1 - cover[..., None]) + cloud.astype(np.float32) * cover[..., None]
    sun = np.exp(-(((x - 0.75 * w) / w) ** 2 + ((y - 0.12 * h) / h) ** 2) / 0.02)[..., None] * 0.25
    return grain(np.clip(img + sun, 0, 1), rng, 0.006)

def eightbit(w, h, rng):
    P = 6 if w < h else 8
    sw, sh = w // P, h // P
    img = np.zeros((sh, sw, 3), np.float32)
    bands = [(0.23, 0.55, 0.9), (0.33, 0.63, 0.94), (0.45, 0.72, 0.96), (0.58, 0.8, 0.98)]
    for yy in range(sh):
        f = yy / sh * len(bands) * 1.4
        i = min(len(bands) - 1, int(f))
        frac = f - int(f)
        img[yy] = bands[i]
    # Pixel clouds.
    for _ in range(int(sw / 18)):
        cx, cy = rng.integers(0, sw), rng.integers(0, int(sh * 0.45))
        for k in range(rng.integers(3, 6)):
            r = rng.integers(2, 5)
            ox, oy = cx + k * 3 - 6, cy + rng.integers(-1, 2)
            yy, xx = np.ogrid[:sh, :sw]
            m = (xx - ox) ** 2 + (yy - oy) ** 2 <= r * r
            img[m] = (1, 1, 1)
    # Hills and grass.
    ground = int(sh * 0.84)
    for xx in range(sw):
        hill = ground - int(6 + 5 * math.sin(xx / 9.0) + 3 * math.sin(xx / 3.7))
        img[hill:, xx] = (0.36, 0.67, 0.2)
        img[hill:hill + 1, xx] = (0.55, 0.85, 0.28)
        img[ground + 4:, xx] = (0.47, 0.31, 0.16)
        if (xx * 7) % 5 == 0:
            img[ground + 4: ground + 5, xx] = (0.38, 0.24, 0.12)
        if rng.random() < 0.18:
            img[max(0, hill - 1):hill, xx] = (0.3, 0.6, 0.16)
    big = cv2.resize(img, (sw * P, sh * P), interpolation=cv2.INTER_NEAREST)
    out = np.zeros((h, w, 3), np.float32)
    out[: big.shape[0], : big.shape[1]] = big[:h, :w]
    if big.shape[0] < h: out[big.shape[0]:] = big[-1]
    if big.shape[1] < w: out[:, big.shape[1]:] = out[:, big.shape[1] - 1: big.shape[1]]
    return out

def light(w, h, rng):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((x - 0.5 * w) / w) ** 2 + ((y - 0.25 * h) / h) ** 2)
    v = 0.93 - 0.12 * d
    img = np.stack([v, v, v * 1.01], -1)
    return grain(np.clip(img, 0, 1), rng, 0.005)

def slate(w, h, rng):
    n = fbm(h, w, 8, rng, 3)
    layers = fbm(h, w, 5, rng, 2)
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    strata = 0.5 + 0.5 * np.sin((y / h * 22 + layers * 6))
    v = 0.12 + 0.07 * n + 0.025 * strata
    img = np.stack([v * 0.94, v * 1.0, v * 1.08], -1)
    return grain(np.clip(img, 0, 1), rng, 0.012)

MAKERS = {'bubblegum': bubblegum, 'metal': metal, 'sky': sky, 'pixel': eightbit, 'light': light, 'slate': slate}

if __name__ == '__main__':
    out = sys.argv[1]
    only = sys.argv[2:] or list(MAKERS)
    for name in only:
        for orient, (w, h) in SIZES.items():
            rng = np.random.default_rng(abs(hash(name)) % 1000 + (1 if orient == 'landscape' else 0))
            save(MAKERS[name](w, h, rng), f'{out}/{name}-{orient}.png')
            print(name, orient)
