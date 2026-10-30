"""Textured boards: 8x8 squares drawn as one picture. Run:
python3 scripts/backgrounds/boards.py src/assets/boards (needs numpy, Pillow, opencv)."""
import sys, math
import numpy as np
import cv2
from PIL import Image

N = 640
SQ = N // 8

def fbm(h, w, octaves, rng, base=4):
    out = np.zeros((h, w), np.float32); amp = 1.0; tot = 0.0
    for o in range(octaves):
        c = base * 2 ** o
        g = rng.random((c + 1, c + 1)).astype(np.float32)
        out += amp * cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC); tot += amp; amp *= 0.5
    return out / tot

def checker():
    y, x = np.mgrid[0:N, 0:N]
    return ((x // SQ + y // SQ) % 2 == 1)  # True = dark square (a8 is light)

def squares(fn, rng):
    """Each square gets its own patch of texture (rotated for wood, like a real inlaid board)."""
    img = np.zeros((N, N, 3), np.float32)
    dark = checker()
    for r in range(8):
        for c in range(8):
            d = (r + c) % 2 == 1
            img[r * SQ:(r + 1) * SQ, c * SQ:(c + 1) * SQ] = fn(d, (r, c), rng)
    return img

def grain(img, rng, s=0.01):
    return img + rng.normal(0, s, img.shape[:2])[..., None].astype(np.float32)

def bevel(img, k=0.06):
    """A faint edge on every square, as on a real board."""
    y, x = np.mgrid[0:N, 0:N]
    ex = np.minimum(x % SQ, SQ - 1 - x % SQ); ey = np.minimum(y % SQ, SQ - 1 - y % SQ)
    e = np.minimum(ex, ey)
    return img * (1 - k * np.exp(-e / 1.5))[..., None]

def wood_patch(light, dark, burl=False):
    def f(isdark, rc, rng):
        h = w = SQ
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)
        turb = fbm(h, w, 5, rng, 2) * (9 if burl else 2.5)
        ang = rng.uniform(-0.08, 0.08) + (math.pi / 2 if (rc[0] + rc[1]) % 2 else 0)
        u = x * math.cos(ang) + y * math.sin(ang)
        if burl:
            cx, cy = rng.uniform(0, w), rng.uniform(0, h)
            v = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) * 0.22 + turb * 3
        else:
            v = u * rng.uniform(0.18, 0.26) + turb * 4
        rings = 0.5 + 0.5 * np.sin(v)
        rings = rings ** 1.6
        fine = cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), sigmaX=0.6, sigmaY=6)
        lo, hi = (np.array(dark[0]), np.array(dark[1])) if isdark else (np.array(light[0]), np.array(light[1]))
        t = np.clip(rings * 0.8 + 0.06 * fine + 0.1, 0, 1)[..., None]
        return (lo * t + hi * (1 - t)).astype(np.float32)
    return f

def marble(rng):
    n = fbm(N, N, 7, rng, 3)
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    veins = np.abs(np.sin((x * 0.012 + y * 0.008) + n * 9))
    veins = 1 - np.clip(veins * 4, 0, 1)
    dark = checker()[..., None]
    lightc = np.array([0.9, 0.89, 0.87]) - 0.18 * veins[..., None] * np.array([1, 1, 1.02])
    darkc = np.array([0.36, 0.38, 0.4]) - 0.12 * n[..., None] + 0.25 * veins[..., None]
    return bevel(np.where(dark, darkc, lightc).astype(np.float32), 0.08)

def metal(rng):
    streak = cv2.GaussianBlur(rng.normal(0, 1, (N, N)).astype(np.float32), (0, 0), sigmaX=40, sigmaY=0.5)
    streak /= streak.std() + 1e-6
    dark = checker()[..., None]
    lightc = np.array([0.74, 0.75, 0.77]) + 0.03 * streak[..., None]
    darkc = np.array([0.36, 0.37, 0.4]) + 0.025 * streak[..., None]
    return bevel(np.where(dark, darkc, lightc).astype(np.float32), 0.12)

def stone(rng):
    n = fbm(N, N, 8, rng, 4)
    n2 = fbm(N, N, 6, rng, 8)
    dark = checker()[..., None]
    lightc = np.array([0.72, 0.69, 0.64]) + 0.12 * (n[..., None] - 0.5) + 0.05 * (n2[..., None] - 0.5)
    darkc = np.array([0.42, 0.42, 0.42]) + 0.12 * (n[..., None] - 0.5) + 0.05 * (n2[..., None] - 0.5)
    return grain(bevel(np.where(dark, darkc, lightc).astype(np.float32), 0.1), rng, 0.012)

def newspaper(rng):
    dark = checker()
    y, x = np.mgrid[0:N, 0:N]
    # Halftone dots on the dark squares, paper grain on the light.
    dots = (((x % 6) - 3) ** 2 + ((y % 6) - 3) ** 2) < 5
    paper = 0.9 + 0.03 * (fbm(N, N, 6, rng, 8) - 0.5)
    v = np.where(dark, np.where(dots, 0.42, 0.72), paper)
    img = np.stack([v * 1.0, v * 0.99, v * 0.96], -1).astype(np.float32)
    return grain(img, rng, 0.015)

def glass(rng):
    dark = checker()[..., None]
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    sheen = 0.5 + 0.5 * np.cos((x + y) / N * 3.0)
    lightc = np.array([0.55, 0.68, 0.8]) + 0.08 * sheen[..., None]
    darkc = np.array([0.14, 0.22, 0.34]) + 0.06 * sheen[..., None]
    img = np.where(dark, darkc, lightc).astype(np.float32)
    # A bright rim on each square.
    ex = np.minimum(x % SQ, SQ - 1 - x % SQ); ey = np.minimum(y % SQ, SQ - 1 - y % SQ)
    rim = np.exp(-np.minimum(ex, ey) / 1.2)[..., None] * 0.25
    return np.clip(img + rim, 0, 1)

def neon(rng):
    dark = checker()[..., None]
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    ex = np.minimum(x % SQ, SQ - 1 - x % SQ); ey = np.minimum(y % SQ, SQ - 1 - y % SQ)
    glow = np.exp(-np.minimum(ex, ey) / 3.0)[..., None]
    lightc = np.array([0.18, 0.1, 0.3]) + glow * np.array([0.95, 0.3, 0.95])
    darkc = np.array([0.06, 0.03, 0.12]) + glow * np.array([0.2, 0.85, 1.0])
    return np.clip(np.where(dark, darkc, lightc), 0, 1).astype(np.float32)

def pixel(rng):
    img = np.zeros((64, 64, 3), np.float32)
    for r in range(8):
        for c in range(8):
            d = (r + c) % 2
            base = np.array([0.42, 0.62, 0.28]) if d else np.array([0.88, 0.93, 0.7])
            blk = np.tile(base, (8, 8, 1)).astype(np.float32)
            # A few darker pixels for texture.
            for _ in range(5):
                blk[rng.integers(0, 8), rng.integers(0, 8)] = base * 0.88
            blk[:, -1] *= 0.92; blk[-1, :] *= 0.92
            img[r * 8:(r + 1) * 8, c * 8:(c + 1) * 8] = blk
    return cv2.resize(img, (N, N), interpolation=cv2.INTER_NEAREST)

def icysea(rng):
    n = fbm(N, N, 7, rng, 4)
    frost = fbm(N, N, 5, rng, 16)
    dark = checker()[..., None]
    lightc = np.array([0.84, 0.9, 0.93]) + 0.06 * (frost[..., None] - 0.5)
    darkc = np.array([0.47, 0.62, 0.71]) + 0.08 * (n[..., None] - 0.5) + 0.06 * (frost[..., None] - 0.5)
    return bevel(np.where(dark, darkc, lightc).astype(np.float32), 0.06)

def tournament(rng):
    dark = checker()[..., None]
    lightc = np.array([0.93, 0.93, 0.9]); darkc = np.array([0.19, 0.4, 0.29])
    img = np.where(dark, darkc, lightc).astype(np.float32)
    sheen = fbm(N, N, 3, rng, 2)[..., None]
    return grain(img * (0.96 + 0.06 * sheen), rng, 0.006)

BOARDS = {
    'walnut': lambda rng: grain(bevel(squares(wood_patch(((0.62, 0.42, 0.24), (0.78, 0.58, 0.36)), ((0.2, 0.11, 0.06), (0.33, 0.19, 0.1))), rng), 0.1), rng, 0.008),
    'burled': lambda rng: grain(bevel(squares(wood_patch(((0.68, 0.48, 0.28), (0.85, 0.66, 0.42)), ((0.3, 0.16, 0.08), (0.46, 0.27, 0.14)), burl=True), rng), 0.1), rng, 0.008),
    'marble': marble,
    'metal': metal,
    'stone': stone,
    'newspaper': newspaper,
    'glass': glass,
    'neonboard': neon,
    'pixel': pixel,
    'icysea': icysea,
    'tournament': tournament,
}

if __name__ == '__main__':
    out = sys.argv[1]
    for i, (name, fn) in enumerate(BOARDS.items()):
        img = fn(np.random.default_rng(100 + i))
        Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8)).save(f'{out}/{name}.webp', quality=88, method=6)
        print(name)
