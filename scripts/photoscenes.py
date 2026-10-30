# Renders the photographic scene backgrounds (src/assets/scenes/*.webp).
# Everything is generated here from noise, light and blur, so the pictures
# are as open as the code: no stock photos.
#   pip install numpy opencv-python-headless pillow
#   python3 scripts/photoscenes.py src/assets/scenes
import math
import sys

import cv2
import numpy as np
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None


def rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)], np.float32) ** 2.2


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


class Noise:
    """Value-noise fBm built from upscaled random grids (fast, smooth enough)."""

    def __init__(self, seed):
        self.rng = np.random.default_rng(seed)

    def layer(self, w, h, cells_x, cells_y=None):
        cells_y = cells_y or max(2, int(cells_x * h / w))
        g = self.rng.random((cells_y + 3, cells_x + 3), dtype=np.float32)
        big = cv2.resize(g, (int(w * (cells_x + 3) / cells_x), int(h * (cells_y + 3) / cells_y)), interpolation=cv2.INTER_CUBIC)
        return big[:h, :w]

    def fbm(self, w, h, cells, octaves=6, gain=0.5, lac=2.0, stretch=(1, 1)):
        total = np.zeros((h, w), np.float32)
        amp, norm, c = 1.0, 0.0, cells
        for _ in range(octaves):
            cx = max(2, int(c / stretch[0]))
            cy = max(2, int(c * h / w / stretch[1]))
            total += amp * self.layer(w, h, cx, cy)
            norm += amp
            amp *= gain
            c *= lac
        return total / norm

    def ridge1d(self, w, cells, octaves=7, gain=0.52):
        """A 1-D mountain profile in 0..1, with sharp ridged peaks."""
        total = np.zeros(w, np.float32)
        amp, norm, c = 1.0, 0.0, cells
        for _ in range(octaves):
            g = self.rng.random(int(c) + 4, dtype=np.float32) * 2 - 1
            xs = np.linspace(0, int(c) + 1, w)
            v = np.interp(xs, np.arange(len(g)), g)
            # cubic smoothing of the interpolation
            v = cv2.GaussianBlur(v.reshape(1, -1), (0, 0), sigmaX=max(1, w / c / 6)).ravel()
            total += amp * (1 - np.abs(v))
            norm += amp
            amp *= gain
            c *= 2.1
        return total / norm


def warp(n, field, wx, wy, amount):
    h, w = field.shape
    xs, ys = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(field, xs + (wx - 0.5) * amount, ys + (wy - 0.5) * amount, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def blur(img, s):
    return cv2.GaussianBlur(img, (0, 0), sigmaX=s, sigmaY=s)


def bolt(rng, x0, y0, x1, y1, rough, depth):
    """A lightning path by midpoint displacement; returns a list of points."""
    pts = [(x0, y0), (x1, y1)]
    for _ in range(depth):
        nxt = [pts[0]]
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            L = math.hypot(bx - ax, by - ay)
            mx, my = (ax + bx) / 2, (ay + by) / 2
            # push sideways, perpendicular to the segment
            nx, ny = -(by - ay) / (L + 1e-6), (bx - ax) / (L + 1e-6)
            d = rng.normal() * L * rough
            nxt += [(mx + nx * d, my + ny * d), (bx, by)]
        pts = nxt
    return pts


def draw_path(buf, pts, width, value):
    p = np.array([[int(x * 4), int(y * 4)] for x, y in pts], np.int32)
    cv2.polylines(buf, [p], False, value, thickness=max(1, int(width)), lineType=cv2.LINE_AA, shift=2)


def finish(img, rng, grain=0.018, vignette=0.55, bloom=(0.35, 30)):
    h, w, _ = img.shape
    # bloom: bright parts glow
    bright = np.clip(img - 0.35, 0, None)
    img = img + bloom[0] * blur(bright, bloom[1]) + 0.25 * bloom[0] * blur(bright, bloom[1] * 4)
    # vignette
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.sqrt(((xs - w / 2) / (w / 2)) ** 2 + ((ys - h * 0.45) / (h / 1.6)) ** 2)
    img = img * (1 - vignette * smoothstep(0.55, 1.5, r))[..., None]
    # filmic tone map, then gamma
    img = img / (1 + img * 0.55)
    img = np.clip(img, 0, 1) ** (1 / 2.2)
    img = np.clip((img - 0.035) / 0.965, 0, 1) ** 1.12  # a touch of contrast, like a photo's curve
    img = img + rng.normal(0, grain, img.shape).astype(np.float32)
    return np.clip(img, 0, 1)


def save(name, img, quality=80):
    Image.fromarray((img * 255).astype(np.uint8)).save(f'{OUT}/{name}.webp', 'WEBP', quality=quality, method=6)
    import os

    print(name, img.shape[1], 'x', img.shape[0], os.path.getsize(f'{OUT}/{name}.webp') // 1024, 'KB')


# ------------------------------------------------------------------ terrain and sky, in perspective


def heightmap(n, size, seed, massifs=()):
    """A mountain range: ridged multifractal noise shaped by a few big massifs (x, z, height, width)."""
    total = np.zeros((size, size), np.float32)
    amp, cells, weight = 1.0, 9, np.ones((size, size), np.float32)
    for o in range(7):
        v = n.layer(size, size, cells, cells)
        r = (1 - np.abs(v * 2 - 1)) ** 2
        r *= weight
        weight = np.clip(r * 1.6, 0, 1)
        total += r * amp
        amp *= 0.5
        cells *= 2
    total = (total - total.min()) / (total.max() - total.min())
    if massifs:
        zz, xx = np.mgrid[0:size, 0:size].astype(np.float32)
        env = np.full((size, size), 0.12, np.float32)
        for x, z, a, r in massifs:
            env += a * np.exp(-(((xx - x) / r) ** 2 + ((zz - z) / (r * 0.6)) ** 2))
        total = total**1.35 * env
    total = cv2.GaussianBlur(total, (0, 0), 1.6)
    return total.astype(np.float32)


class Camera:
    def __init__(self, w, h, horizon, focal, cam_x, cam_z, cam_h):
        self.w, self.h, self.horizon, self.f = w, h, horizon, focal
        self.cx, self.cz, self.ch = cam_x, cam_z, cam_h


def terrain(img, cam, hm, hscale, n_slices, d_near, d_far, shade, bump=None, bump_scale=0.0):
    """Draws the heightmap seen from the camera (front to back, like a voxel landscape)."""
    h, w = img.shape[:2]
    size = hm.shape[0]
    ds = d_near * (d_far / d_near) ** (np.arange(n_slices, dtype=np.float32) / (n_slices - 1))
    sx = np.arange(w, dtype=np.float32)
    wx = cam.cx + (sx[None, :] - w / 2) * ds[:, None] / cam.f
    wz = np.broadcast_to(cam.cz + ds[:, None], wx.shape).astype(np.float32)
    hgt = cv2.remap(hm, wx.astype(np.float32), wz, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP) * hscale
    yproj = cam.horizon - (hgt - cam.ch) * cam.f / ds[:, None]
    runmin = np.minimum.accumulate(yproj, axis=0)
    skyline = runmin[-1]
    # which depth slice each pixel shows (-1 for sky)
    idx = np.full((h, w), -1, np.int32)
    ys = np.arange(h, dtype=np.float32)
    for x in range(w):
        col = -runmin[:, x]
        k = np.searchsorted(col, -ys, side='left')
        idx[:, x] = np.where(k < n_slices, k, -1)
    ii = np.clip(idx, 0, n_slices - 1)
    xx = np.broadcast_to(np.arange(w)[None, :], (h, w))
    # Where exactly the line of sight meets the ground: between the slice before (whose
    # projection is still below this row) and this one. Interpolating there keeps steep
    # faces smooth instead of one flat colour per slice.
    jj = np.clip(ii - 1, 0, n_slices - 1)
    y_cur, y_prev = yproj[ii, xx], yproj[jj, xx]
    f = np.where(ii > 0, np.clip((y_prev - ys[:, None]) / np.maximum(y_prev - y_cur, 1e-3), 0, 1), 1.0).astype(np.float32)
    lerp = lambda a, b: a * (1 - f) + b * f
    P = dict(d=lerp(ds[jj], ds[ii]), wx=lerp(wx[jj, xx], wx[ii, xx]), wz=lerp(wz[jj, xx], wz[ii, xx]), hgt=lerp(hgt[jj, xx], hgt[ii, xx]))
    # the height of the ray at each pixel: varies down a cliff face, unlike the slice's surface height
    P['hpix'] = np.minimum(cam.ch + (cam.horizon - ys[:, None]) * P['d'] / cam.f, P['hgt'])
    gy, gx = np.gradient(hm * hscale)
    if bump is not None:
        by, bx = np.gradient(bump)
        gx, gy = gx + bx * bump_scale, gy + by * bump_scale
    P['gx'] = cv2.remap(gx.astype(np.float32), P['wx'].astype(np.float32), P['wz'].astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    P['gz'] = cv2.remap(gy.astype(np.float32), P['wx'].astype(np.float32), P['wz'].astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    col = shade(P)
    # soft edge along the skyline
    alpha = np.clip(ys[:, None] + 1 - skyline[None, :], 0, 1) * (idx >= 0)
    img[:] = img * (1 - alpha[..., None]) + col * alpha[..., None]
    return dict(idx=idx, skyline=skyline, yproj=yproj, runmin=runmin, ds=ds, wx=wx, wz=wz, hgt=hgt, P=P)


def cloud_deck(n, cam, w, h, seed, height, scale, cover):
    """Cloud density on a plane above the camera, so it recedes to the horizon."""
    size = 2048
    base = n.fbm(size, size, 6, 7, 0.55)
    wx_, wy_ = n.fbm(size, size, 3, 4), n.fbm(size, size, 3, 4)
    tex = warp(n, base, wx_, wy_, size * 0.12)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    up = np.maximum(cam.horizon - ys, 1.0)
    t = height * cam.f / up
    u = (cam.cx + (xs - w / 2) * t / cam.f) * scale
    v = (t * scale)
    dens = cv2.remap(tex, u.astype(np.float32), v.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    dens = smoothstep(cover, cover + 0.22, dens)
    fade = smoothstep(h * 0.04, h * 0.24, cam.horizon - ys)  # clear sky low on the horizon
    return dens * fade, t


# ------------------------------------------------------------------ the storm


def storm(w, h, seed, L):
    """A moonlit thunderstorm over the mountains: rain, lightning, the moon through the clouds."""
    n = Noise(seed)
    rng = np.random.default_rng(seed + 1)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    cam = Camera(w, h, L['horizon'] * h, L['focal'] * w, 1024, 60, L['cam_h'])
    mx, my, mr = L['moon'][0] * w, L['moon'][1] * h, L['moon'][2] * min(w, h)
    dm = np.sqrt((xs - mx) ** 2 + (ys - my) ** 2)

    # Sky.
    t = np.clip(ys / cam.horizon, 0, 1)[..., None]
    img = (rgb('#010208') * (1 - t) + rgb('#111c2c') * t).astype(np.float32)
    img += np.exp(-dm / (mr * 2.4))[..., None] * rgb('#a9bde0') * 1.1 + np.exp(-dm / (mr * 9))[..., None] * rgb('#2c3a52') * 0.45
    # light low on the horizon, stronger toward the moon
    glow_band = np.exp(-(((ys - cam.horizon) / (h * 0.12)) ** 2)) * (0.7 + 0.9 * np.exp(-np.abs(xs - mx) / (w * 0.5)))
    img += glow_band[..., None] * rgb('#4a6288') * 1.3

    stars = np.zeros((h, w), np.float32)
    k = int(w * h / 1800)
    sx, sy = rng.integers(0, w, k), rng.integers(0, int(cam.horizon), k)
    stars[sy, sx] = rng.random(k) ** 7 * 3
    img += blur(stars, 0.7)[..., None] * rgb('#dfe8ff')

    # The moon.
    tex = n.fbm(w, h, max(4, int(w / mr * 1.6)), 6)
    maria = smoothstep(0.47, 0.6, n.fbm(w, h, max(3, int(w / mr * 0.8)), 4))
    crat = np.zeros((h, w), np.float32)
    for _ in range(70):
        a, rr = rng.random() * 2 * math.pi, mr * math.sqrt(rng.random()) * 0.95
        cx_, cy_, cr = mx + rr * math.cos(a), my + rr * math.sin(a), mr * rng.uniform(0.015, 0.08)
        d = np.sqrt((xs - cx_) ** 2 + (ys - cy_) ** 2) / cr
        crat += np.where(d < 1, -0.22 * (1 - d), np.where(d < 1.3, 0.1 * (1.3 - d) * 3.3, 0))
    limb = np.sqrt(np.clip(1 - (dm / mr) ** 2, 0, 1)) ** 0.4
    moon = ((0.95 - 0.3 * maria + 0.16 * (tex - 0.5) + crat) * limb)[..., None] * rgb('#fff6e2') * 3.2
    edge = smoothstep(mr + 1.2, mr - 1.2, dm)[..., None]
    img = img * (1 - edge) + moon * edge

    # Storm clouds on a deck that recedes to the horizon, broken around the moon.
    dens, _ = cloud_deck(Noise(seed + 200), cam, w, h, seed, L['cloud_h'], L['cloud_scale'], L['cover'])
    ragged = (n.fbm(w, h, 7, 5) - 0.5) * mr * 6
    gap = smoothstep(mr * 0.6, mr * 5.0, dm + ragged)
    dens = dens * (0.18 + 0.82 * gap)
    wisp = smoothstep(0.5, 0.85, warp(n, n.fbm(w, h, 8, 5, stretch=(3, 1)), n.fbm(w, h, 3, 3), n.fbm(w, h, 3, 3), w * 0.06))
    dens = np.clip(dens + wisp * (1 - gap) * 0.55 * (dm > mr * 0.6), 0, 1)
    vx, vy = (mx - xs), (my - ys)
    vl = np.sqrt(vx**2 + vy**2) + 1e-3
    probe = cv2.remap(dens, xs + vx / vl * 10, ys + vy / vl * 10, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    lit = np.clip((dens - probe) * 3.5 + 0.15, 0, 1)
    near_moon = np.exp(-dm / (mr * 4.0))
    belly = rgb('#06090f')
    cloud = belly[None, None] * (1 - lit[..., None]) + rgb('#3a4760')[None, None] * lit[..., None] * (0.3 + 1.8 * near_moon[..., None])
    cloud += (rgb('#eef2ff') * 1.2)[None, None] * (near_moon * lit * smoothstep(0.0, 0.5, dens) * (1 - smoothstep(0.5, 1.0, dens)) * 0.8)[..., None]
    img = img * (1 - dens[..., None] * 0.97) + cloud * dens[..., None] * 0.97

    # Distant rain falling from the cloud base.
    curtain = smoothstep(0.52, 0.78, n.fbm(w, h, 50, 4, stretch=(1, 14)))
    curtain *= smoothstep(cam.horizon - h * 0.18, cam.horizon - h * 0.04, ys) * (1 - smoothstep(cam.horizon + h * 0.02, cam.horizon + h * 0.12, ys))
    img = img * (1 - 0.3 * curtain[..., None]) + curtain[..., None] * rgb('#2c374b') * 0.3

    # The mountains: find a peak for the lightning first, then light the terrain with the moon and the strike.
    hm = heightmap(Noise(seed + 100), 2048, seed, L['massifs'])
    hmax = float(hm.max())
    # Scale the heights so the highest peak tops out at L['peak_y'] on screen.
    small = Camera(w // 4, h // 4, cam.horizon / 4, cam.f / 4, cam.cx, cam.cz, L['cam_h'])
    lo_s, hi_s = 50.0, 2000.0
    for _ in range(18):
        mid = (lo_s + hi_s) / 2
        probe_img = np.zeros((h // 4, w // 4, 3), np.float32)
        top = terrain(probe_img, small, hm, mid, 300, 40, 1900, lambda P: np.zeros(P['d'].shape + (3,), np.float32))['skyline'].min() * 4
        if top < L['peak_y'] * h:
            hi_s = mid
        else:
            lo_s = mid
    hscale = (lo_s + hi_s) / 2
    moon_dir = np.array(L['moon_dir'], np.float32)
    moon_dir /= np.linalg.norm(moon_dir)
    strike = {}

    def shade(P):
        nx, ny, nz = -P['gx'], np.ones_like(P['gx']), -P['gz']
        nl = np.sqrt(nx**2 + ny**2 + nz**2)
        nx, ny, nz = nx / nl, ny / nl, nz / nl
        lam = np.clip(nx * moon_dir[0] + ny * moon_dir[1] + nz * moon_dir[2], 0, 1)
        # rock texture on the face: noise over (across, up), so it runs in strata down the cliffs
        u = (P['wx'] * 3.0) % 2048
        v = (P['hpix'] * 3.0 + P['wz'] * 0.7) % 2048
        rock_n = cv2.remap(strata, u.astype(np.float32), v.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
        rel = P['hpix'] / (hscale * hmax)
        snow = smoothstep(0.3, 0.5, rel + 0.3 * (rock_n - 0.5)) * smoothstep(0.35, 0.7, ny)
        snow = blur(snow, 0.8)
        occl = 0.35 + 0.65 * smoothstep(0.05, 0.6, rel)  # valleys darker than ridges
        albedo = rgb('#2c313b')[None, None] * (0.6 + 0.8 * rock_n[..., None]) * (1 - snow[..., None]) + rgb('#c9d3e4')[None, None] * snow[..., None]
        light = (0.06 + 1.7 * lam)[..., None] * rgb('#b7c7e6')
        if strike:
            dx, dy, dz = strike['x'] - P['wx'], strike['y'] - P['hgt'], strike['z'] - P['wz']
            dl = np.sqrt(dx**2 + dy**2 + dz**2) + 1
            fl = np.clip((nx * dx + ny * dy + nz * dz) / dl, 0, 1) * (strike['power'] / (1 + (dl / strike['reach']) ** 2))
            light = light + fl[..., None] * rgb('#c4ccff')
        col = albedo * light * occl[..., None]
        fog = 1 - np.exp(-P['d'] / L['fog'])
        return col * (1 - fog[..., None]) + rgb('#141d2b')[None, None] * fog[..., None] * (1 + 0.6 * near_moon[..., None])

    strata = Noise(seed + 400).fbm(2048, 2048, 64, 6, 0.6, stretch=(1, 0.35))
    dummy = img.copy()
    pre = terrain(dummy, cam, hm, hscale, L['slices'], 40, 1900, lambda P: np.zeros(P['d'].shape + (3,), np.float32))
    # the strike: the highest visible point near the wanted column
    lo, hi = int(L['strike_x'][0] * w), int(L['strike_x'][1] * w)
    sx_ = lo + int(np.argmin(pre['skyline'][lo:hi]))
    i_s = int(np.argmin(pre['yproj'][:, sx_]))
    strike.update(x=float(pre['wx'][i_s, sx_]), z=float(pre['wz'][i_s, sx_]), y=float(pre['hgt'][i_s, sx_]) + 4, power=L['strike_power'], reach=L['strike_reach'])
    ly1 = float(pre['skyline'][sx_]) + h * 0.012  # into the summit, not just touching it
    lx1 = float(sx_)
    bump = Noise(seed + 300).fbm(2048, 2048, 160, 5, 0.6) * 120 + Noise(seed + 301).fbm(2048, 2048, 40, 4, 0.5, stretch=(1, 2.5)) * 160
    terrain(img, cam, hm, hscale, L['slices'], 40, 1900, shade, bump.astype(np.float32), hscale / 500)

    # Mist lying in the valleys.
    mist = smoothstep(0.35, 0.8, n.fbm(w, h, 7, 5, stretch=(5, 1)))
    for yb, s_ in L['mist']:
        band_ = np.exp(-(((ys - yb * h) / (h * s_)) ** 2)) * mist
        img = img * (1 - 0.45 * band_[..., None]) + band_[..., None] * rgb('#334058') * 0.5

    # Lightning.
    lx0, ly0 = lx1 + L['bolt_from'][0] * w, L['bolt_from'][1] * h
    core = np.zeros((h, w), np.float32)
    path = bolt(rng, lx0, ly0, lx1, ly1, 0.2, 9)
    draw_path(core, path, max(2, w / 600), 1.0)
    for _ in range(L['branches']):
        i = rng.integers(len(path) // 10, len(path) * 2 // 3)
        bx, by = path[i]
        ang = math.atan2(ly1 - ly0, lx1 - lx0) + rng.choice([-1, 1]) * rng.uniform(0.35, 1.0)
        ln = math.hypot(lx1 - lx0, ly1 - ly0) * rng.uniform(0.1, 0.32)
        bp = bolt(rng, bx, by, bx + ln * math.cos(ang), by + ln * math.sin(ang), 0.36, 6)
        draw_path(core, bp, max(1, w / 1300), rng.uniform(0.3, 0.65))
    glow = blur(core, 2) * 1.4 + blur(core, 7) * 1.3 + blur(core, 30) * 1.5 + blur(core, 110) * 1.8
    flash = blur(core, w / 5) * 60
    img += core[..., None] * 5 + glow[..., None] * rgb('#bccaff')
    img += (flash * (0.25 + dens))[..., None] * rgb('#a9b6e6') * 0.75
    # a hot spot where it strikes
    hit = np.exp(-np.sqrt((xs - lx1) ** 2 + (ys - ly1) ** 2) / (w * 0.012))
    img += hit[..., None] * rgb('#dfe4ff') * 0.7

    # A lake in front: the mountains, the moon and the lightning reflected, rippled by the rain.
    if 'water' in L:
        wl = int(L['water'] * h)
        rows = np.arange(wl, h, dtype=np.float32)
        depth = (rows - wl) / (h - wl)
        ripple = (n.fbm(w, h, 30, 4, stretch=(3, 1))[wl:] - 0.5) * (6 + 40 * depth[:, None])
        src_y = np.clip(2 * wl - rows - 1, 0, wl - 1)[:, None] + ripple * 0.4
        src_x = xs[wl:] + ripple
        refl = cv2.remap(img, src_x.astype(np.float32), np.broadcast_to(src_y, src_x.shape).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        refl = cv2.GaussianBlur(refl, (0, 0), sigmaX=1.5, sigmaY=4)
        fres = (0.55 - 0.3 * depth)[:, None, None]
        water = refl * fres + rgb('#04070d') * (1 - fres)
        # rain hitting the water: short bright rings
        drops = np.zeros((h - wl, w), np.float32)
        for _ in range(int(w * (h - wl) / 2600)):
            x, y = rng.integers(0, w), rng.integers(0, h - wl)
            r = 1 + (y / (h - wl)) * rng.uniform(2, 6)
            cv2.ellipse(drops, (int(x), int(y)), (int(r * 3), max(1, int(r * 0.45))), 0, 0, 360, float(rng.uniform(0.02, 0.08)), 1, cv2.LINE_AA)
        drops = blur(drops, 0.8)
        lightness = (0.4 + 2.0 * np.exp(-np.abs(xs[wl:] - mx) / (w * 0.25)) + 2.5 * np.exp(-np.abs(xs[wl:] - lx1) / (w * 0.2)))
        water += (drops * lightness)[..., None] * rgb('#9fb0d0')
        # a soft line where the water meets the shore
        img[wl:] = water
        shore = np.exp(-((ys - wl) / 3.0) ** 2)
        img = img * (1 - 0.6 * shore[..., None])

    # Rain: far fine streaks, then bigger near ones, lit by the moon and the flash.
    ang = math.radians(L['wind'])
    light = 0.3 + 1.0 * np.exp(-dm / (w * 0.7)) + 2.5 * np.exp(-np.sqrt((xs - lx1) ** 2 + (ys - ly1) ** 2) / (w * 0.35))
    for count_div, lmin, lmax, vmin, vmax, thick, bl in ((380, 0.005, 0.014, 0.04, 0.13, 1, 0.5), (3200, 0.012, 0.034, 0.06, 0.2, 1, 0.8)):
        rain = np.zeros((h, w), np.float32)
        count = int(w * h / count_div)
        rx, ry = rng.integers(0, w, count), rng.integers(-80, h, count)
        lens = rng.uniform(h * lmin, h * lmax, count)
        vals = rng.uniform(vmin, vmax, count)
        for x, y, ln, v in zip(rx, ry, lens, vals):
            cv2.line(rain, (int(x), int(y)), (int(x + math.sin(ang) * ln), int(y + math.cos(ang) * ln)), float(v), thick, cv2.LINE_AA)
        img += (blur(rain, bl) * light)[..., None] * rgb('#aebbd6') * 0.6

    return finish(img, rng, grain=0.022, vignette=0.55, bloom=(0.45, w / 80))


STORM_PORTRAIT = dict(
    horizon=0.56,
    focal=1.25,
    cam_h=70,
    peak_y=0.31,
    slices=900,
    fog=2300,
    moon=(0.7, 0.15, 0.07),
    moon_dir=(0.85, 0.5, -0.15),
    cloud_h=520,
    cloud_scale=0.8,
    cover=0.36,
    massifs=[(950, 640, 1.0, 150), (1160, 720, 0.85, 170), (780, 760, 0.8, 180), (1320, 620, 0.6, 130), (1024, 1300, 0.8, 700)],
    strike_x=(0.25, 0.5),
    strike_power=4.0,
    strike_reach=140,
    bolt_from=(0.04, 0.1),
    branches=7,
    mist=[(0.555, 0.012)],
    water=0.575,
    wind=9,
)

STORM_LANDSCAPE = dict(
    horizon=0.6,
    focal=0.8,
    cam_h=70,
    peak_y=0.3,
    slices=900,
    fog=2300,
    moon=(0.72, 0.18, 0.075),
    moon_dir=(0.85, 0.5, -0.15),
    cloud_h=520,
    cloud_scale=0.8,
    cover=0.36,
    massifs=[(950, 640, 1.0, 150), (1160, 720, 0.85, 170), (780, 760, 0.8, 180), (1320, 620, 0.6, 130), (1024, 1300, 0.8, 700), (520, 900, 0.7, 260), (1560, 880, 0.7, 260), (300, 1150, 0.6, 300), (1780, 1150, 0.6, 300)],
    strike_x=(0.3, 0.48),
    strike_power=4.0,
    strike_reach=140,
    bolt_from=(0.03, 0.12),
    branches=8,
    mist=[(0.6, 0.014)],
    water=0.625,
    wind=9,
)

if __name__ == '__main__':
    if not ONLY or 'storm' in ONLY:
        save('storm-portrait', storm(1290, 2580, 7, STORM_PORTRAIT), 78)
        save('storm-landscape', storm(2560, 1440, 7, STORM_LANDSCAPE), 78)
