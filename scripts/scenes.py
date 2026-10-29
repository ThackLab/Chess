# Usage: python3 scripts/scenes.py src/assets/scenes
# Generates the scene backgrounds (src/assets/scenes/*.svg). Wide canvases
# (2400 x 1600) with the main motif in the middle third, so "cover" works on
# phones (which see the middle) and desktops (which see it all).
import math, random, sys
OUT = sys.argv[1]
W, H = 2400, 1600

def f(x): return f'{x:.1f}'.rstrip('0').rstrip('.')

def svg(name, body, defs=''):
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice"><defs>{defs}</defs>{body}</svg>'
    open(f'{OUT}/{name}.svg', 'w').write(s)
    print(name, len(s) // 1024, 'KB')

def sky(id, stops):
    st = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{id}" x1="0" y1="0" x2="0" y2="1">{st}</linearGradient>'

def stars(rng, n, ymax, color='#fff', big=8):
    out = []
    for _ in range(n):
        x, y = rng.uniform(0, W), rng.uniform(0, ymax) ** 1.0
        y = ymax * (rng.random() ** 1.4)
        r = rng.choice([0.9, 1.1, 1.4, 1.8, 2.2]) * (0.8 + 0.4 * rng.random())
        o = rng.uniform(0.35, 1)
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{color}" opacity="{o:.2f}"/>')
    for _ in range(big):
        x, y = rng.uniform(100, W - 100), ymax * 0.8 * rng.random()
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="9" fill="{color}" opacity="0.12"/><circle cx="{f(x)}" cy="{f(y)}" r="2.6" fill="{color}"/>'
                   f'<path d="M{f(x-14)} {f(y)}H{f(x+14)}M{f(x)} {f(y-14)}V{f(y+14)}" stroke="{color}" stroke-width="1.2" opacity="0.6"/>')
    return ''.join(out)

def ridge(rng, base, amp, step, rough=0.55, period=True):
    """A ridge line across the width (midpoint displacement), as points."""
    n = 64
    pts = [0.0] * (n + 1)
    pts[0] = pts[n] = 0
    def split(a, b, a_amp):
        if b - a < 2: return
        m = (a + b) // 2
        pts[m] = (pts[a] + pts[b]) / 2 + rng.uniform(-a_amp, a_amp)
        split(a, m, a_amp * rough); split(m, b, a_amp * rough)
    split(0, n, amp)
    return [(W * i / n, base - p) for i, p in enumerate(pts)]

def area(points, fill, extra=''):
    d = 'M0 ' + f(H) + ' ' + ' '.join(f'L{f(x)} {f(y)}' for x, y in points) + f' L{W} {H} Z'
    return f'<path d="{d}" fill="{fill}" {extra}/>'

def smooth_area(points, fill, extra=''):
    d = f'M0 {H} L{f(points[0][0])} {f(points[0][1])}'
    for i in range(1, len(points)):
        (x0, y0), (x1, y1) = points[i - 1], points[i]
        mx = (x0 + x1) / 2
        d += f' C{f(mx)} {f(y0)} {f(mx)} {f(y1)} {f(x1)} {f(y1)}'
    d += f' L{W} {H} Z'
    return f'<path d="{d}" fill="{fill}" {extra}/>'

# ------------------------------------------------------------------ gothic night
def gothic():
    rng = random.Random(7)
    defs = sky('g', [(0, '#05041a'), (0.45, '#140d38'), (0.78, '#2c1852'), (1, '#4a2566')])
    defs += '<radialGradient id="moon" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fffbe9"/><stop offset="0.62" stop-color="#fff1c8"/><stop offset="1" stop-color="#f0dcae"/></radialGradient>'
    defs += '<radialGradient id="halo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#f3e6ff" stop-opacity="0.45"/><stop offset="1" stop-color="#f3e6ff" stop-opacity="0"/></radialGradient>'
    defs += '<radialGradient id="win" cx="0.5" cy="0.6" r="0.6"><stop offset="0" stop-color="#ffd98a"/><stop offset="1" stop-color="#ff9e3d"/></radialGradient>'
    b = f'<rect width="{W}" height="{H}" fill="url(#g)"/>' + stars(rng, 260, 1050)
    mx, my = 1480, 360
    b += f'<circle cx="{mx}" cy="{my}" r="300" fill="url(#halo)"/><circle cx="{mx}" cy="{my}" r="110" fill="url(#moon)"/>'
    b += f'<circle cx="{mx-34}" cy="{my-20}" r="16" fill="#e8d6a8" opacity="0.5"/><circle cx="{mx+28}" cy="{my+30}" r="24" fill="#e8d6a8" opacity="0.4"/><circle cx="{mx+40}" cy="{my-40}" r="10" fill="#e8d6a8" opacity="0.45"/>'
    # Thin clouds over the moon.
    for (cx, cy, rx, o) in [(1380, 430, 260, 0.18), (1620, 470, 200, 0.14), (900, 560, 320, 0.1)]:
        b += f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="22" fill="#cbb8ff" opacity="{o}"/>'
    # Far hills, then the cathedral and its town.
    b += area(ridge(rng, 1270, 120, 0), '#1d1340')
    sil = '#0a0617'
    parts = []
    def tower(x, w, h, spire, base=1460):
        top = base - h
        parts.append(f'<rect x="{f(x)}" y="{f(top)}" width="{f(w)}" height="{f(h+200)}"/>')
        parts.append(f'<path d="M{f(x-8)} {f(top)} L{f(x+w/2)} {f(top-spire)} L{f(x+w+8)} {f(top)} Z"/>')
        # pinnacles
        for px in (x - 4, x + w - 8):
            parts.append(f'<path d="M{f(px)} {f(top)} L{f(px+6)} {f(top-46)} L{f(px+12)} {f(top)} Z"/>')
        return top
    cx = 1200
    # nave and roof
    parts.append(f'<rect x="{cx-330}" y="1120" width="660" height="500"/><path d="M{cx-340} 1120 L{cx} 960 L{cx+340} 1120 Z"/>')
    tl = tower(cx - 300, 120, 470, 230)
    tr = tower(cx + 180, 120, 470, 230)
    tc = tower(cx - 55, 110, 560, 330)
    # flying buttresses
    for sx in (cx - 460, cx + 380):
        parts.append(f'<rect x="{sx}" y="1190" width="80" height="400"/><path d="M{sx} 1190 L{sx+40} 1110 L{sx+80} 1190 Z"/>')
    # side chapels
    for sx, w, h in ((cx - 640, 180, 260), (cx + 460, 180, 260)):
        parts.append(f'<rect x="{sx}" y="{1460-h}" width="{w}" height="{h+200}"/><path d="M{sx-10} {1460-h} L{sx+w/2} {1460-h-90} L{sx+w+10} {1460-h} Z"/>')
    # town: little houses with roofs and a far church on each side
    x = 0
    while x < W:
        w = rng.uniform(70, 150)
        h = rng.uniform(80, 190)
        if abs(x + w / 2 - cx) > 700:
            parts.append(f'<rect x="{f(x)}" y="{f(1500-h)}" width="{f(w)}" height="{f(h+120)}"/><path d="M{f(x-6)} {f(1500-h)} L{f(x+w/2)} {f(1500-h-rng.uniform(40,90))} L{f(x+w+6)} {f(1500-h)} Z"/>')
        x += w + rng.uniform(-10, 30)
    for sx in (380, 2020):
        tower(sx, 60, 330, 170, 1500)
    b += f'<g fill="{sil}">' + ''.join(parts) + f'<rect x="0" y="1490" width="{W}" height="110"/></g>'
    # Windows: a rose window and arched windows glowing.
    win = []
    win.append(f'<circle cx="{cx}" cy="1060" r="44" fill="url(#win)" opacity="0.8"/><circle cx="{cx}" cy="1060" r="44" fill="none" stroke="{sil}" stroke-width="6"/>')
    for i in range(8):
        a = i * math.pi / 4
        win.append(f'<line x1="{cx}" y1="1060" x2="{f(cx+44*math.cos(a))}" y2="{f(1060+44*math.sin(a))}" stroke="{sil}" stroke-width="5"/>')
    def arch(x, y, w, h, o=0.75):
        win.append(f'<path d="M{f(x)} {f(y+h)} V{f(y+w/2)} A{f(w/2)} {f(w/2)} 0 0 1 {f(x+w)} {f(y+w/2)} V{f(y+h)} Z" fill="url(#win)" opacity="{o}"/>')
    for wx in (cx - 270, cx - 230, cx + 210, cx + 250):
        arch(wx, 1120, 22, 70)
        arch(wx, 1260, 22, 80, 0.6)
    for wx in range(cx - 300, cx + 300, 70):
        if abs(wx - cx) > 60: arch(wx + 10, 1340, 26, 90, 0.55)
    arch(cx - 22, 1220, 44, 120, 0.85)
    for _ in range(26):
        hx = rng.uniform(0, W)
        if abs(hx - cx) > 720:
            win.append(f'<rect x="{f(hx)}" y="{f(rng.uniform(1380,1460))}" width="12" height="16" rx="3" fill="#ffc46b" opacity="{rng.uniform(0.35,0.8):.2f}"/>')
    b += ''.join(win)
    # Bats.
    for (x, y, s) in [(1700, 560, 1), (1790, 610, 0.7), (1640, 640, 0.6), (620, 520, 0.8)]:
        b += f'<path transform="translate({x} {y}) scale({s})" d="M0 0 C-14 -16 -30 -14 -44 -2 C-34 -4 -26 2 -22 10 C-16 4 -8 4 0 12 C8 4 16 4 22 10 C26 2 34 -4 44 -2 C30 -14 14 -16 0 0 Z" fill="{sil}"/>'
    svg('gothic', b, defs)

# ------------------------------------------------------------------ blossom
FLOWER = '<symbol id="fl" viewBox="-1 -1 2 2" overflow="visible">' + ''.join(f'<ellipse cx="0" cy="-0.55" rx="0.42" ry="0.62" transform="rotate({i*72})"/>' for i in range(5)) + '<circle r="0.2" fill="#ffd36b"/></symbol>'

def flower(x, y, r, color, center, rot, o=1):
    return f'<use href="#fl" x="{f(x-r)}" y="{f(y-r)}" width="{f(2*r)}" height="{f(2*r)}" fill="{color}" transform="rotate({rot:.0f} {f(x)} {f(y)})"/>'

def heart(x, y, s, color, o):
    return f'<path transform="translate({f(x)} {f(y)}) scale({s:.2f})" d="M0 6 C-14 -8 -26 6 -14 18 L0 30 L14 18 C26 6 14 -8 0 6 Z" fill="{color}" opacity="{o:.2f}"/>'

def blossom():
    rng = random.Random(3)
    defs = sky('g', [(0, '#ffc8de'), (0.5, '#ffd9e8'), (1, '#fff0f6')])
    defs += FLOWER
    defs += '<radialGradient id="bk" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
    b = f'<rect width="{W}" height="{H}" fill="url(#g)"/>'
    for _ in range(18):
        b += f'<circle cx="{f(rng.uniform(0,W))}" cy="{f(rng.uniform(0,H))}" r="{f(rng.uniform(60,220))}" fill="url(#bk)"/>'
    # Branches from the top corners, covered in blossom.
    def branch(x0, y0, dx, dy, depth, width):
        out = ''
        x1, y1 = x0 + dx, y0 + dy
        out += f'<path d="M{f(x0)} {f(y0)} Q{f(x0+dx*0.5+dy*0.15)} {f(y0+dy*0.5-dx*0.15)} {f(x1)} {f(y1)}" stroke="#7a3f52" stroke-width="{f(width)}" fill="none" stroke-linecap="round"/>'
        flowers = ''
        if depth > 0:
            for k in (-1, 1):
                a = math.atan2(dy, dx) + k * rng.uniform(0.35, 0.7)
                L = math.hypot(dx, dy) * rng.uniform(0.55, 0.75)
                o, fl = branch(x1, y1, L * math.cos(a), L * math.sin(a), depth - 1, width * 0.65)
                out += o; flowers += fl
        for _ in range(3 + (3 - depth) * 2):
            t = rng.random()
            fx, fy = x0 + dx * t + rng.uniform(-30, 30), y0 + dy * t + rng.uniform(-30, 30)
            c = rng.choice(['#ff8fbd', '#ffb3d1', '#ffffff', '#ff6fa8'])
            flowers += flower(fx, fy, rng.uniform(18, 34), c, '#ffd36b', rng.uniform(0, 72))
        return out, flowers
    o1, f1 = branch(-40, 60, 520, 180, 3, 26)
    o2, f2 = branch(W + 40, 120, -560, 150, 3, 26)
    b += o1 + o2 + f1 + f2
    # Falling petals and little hearts.
    for _ in range(70):
        x, y = rng.uniform(0, W), rng.uniform(250, H)
        if rng.random() < 0.7:
            b += f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(rng.uniform(7,13))}" ry="{f(rng.uniform(4,7))}" transform="rotate({rng.uniform(0,180):.0f} {f(x)} {f(y)})" fill="{rng.choice(["#ff8fbd","#ffb3d1","#ffffff"])}" opacity="{rng.uniform(0.5,0.9):.2f}"/>'
        else:
            b += heart(x, y, rng.uniform(0.6, 1.3), rng.choice(['#ff6fa8', '#ff8fbd', '#ffffff']), rng.uniform(0.35, 0.7))
    # Soft clouds at the bottom.
    for i in range(9):
        b += f'<ellipse cx="{f(i*300+rng.uniform(-40,40))}" cy="{f(H+20)}" rx="{f(rng.uniform(220,320))}" ry="{f(rng.uniform(120,190))}" fill="#fff" opacity="0.7"/>'
    svg('blossom', b, defs)

# ------------------------------------------------------------------ aurora
def aurora():
    rng = random.Random(11)
    defs = sky('g', [(0, '#020812'), (0.5, '#04192a'), (0.85, '#0a3343'), (1, '#0f4450')])
    defs += '<filter id="blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="38"/></filter>'
    defs += '<linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b5cff" stop-opacity="0"/><stop offset="0.35" stop-color="#5ee8c5" stop-opacity="0.55"/><stop offset="0.8" stop-color="#2fd18b" stop-opacity="0.85"/><stop offset="1" stop-color="#2fd18b" stop-opacity="0"/></linearGradient>'
    defs += '<linearGradient id="snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f7ff" stop-opacity="0.85"/><stop offset="1" stop-color="#e6f7ff" stop-opacity="0"/></linearGradient>'
    b = f'<rect width="{W}" height="{H}" fill="url(#g)"/>' + stars(rng, 220, 1100)
    # Curtains of light: wavy bands made of tall strokes, blurred.
    for band, (y0, amp, h, phase, color) in enumerate([(300, 120, 420, 0, 'url(#ag)'), (460, 90, 320, 2.1, 'url(#ag)'), (220, 70, 260, 4.0, '#9a7bff')]):
        d = ''
        pts = [(x, y0 + amp * math.sin(x / 380 + phase) + 40 * math.sin(x / 130 + phase * 2)) for x in range(-100, W + 120, 40)]
        top = ' '.join(f'L{f(x)} {f(y)}' for x, y in pts)
        bottom = ' '.join(f'L{f(x)} {f(y + h)}' for x, y in reversed(pts))
        d = f'M{f(pts[0][0])} {f(pts[0][1])} ' + top + ' ' + bottom + ' Z'
        op = 0.5 if band < 2 else 0.25
        b += f'<path d="{d}" fill="{color}" opacity="{op}" filter="url(#blur)"/>'
    # Fine vertical rays in the main band.
    for x in range(0, W, 26):
        y = 300 + 120 * math.sin(x / 380) + 40 * math.sin(x / 130)
        b += f'<rect x="{x}" y="{f(y+40)}" width="6" height="{f(rng.uniform(180,360))}" fill="#7dffcf" opacity="{rng.uniform(0.03,0.09):.2f}"/>'
    far = ridge(rng, 1180, 300, 0, 0.5)
    b += area(far, '#0d2f3d')
    # snow on the far peaks
    b += area([(x, y) for x, y in far], 'url(#snow)', 'opacity="0.35" transform="translate(0 6)"').replace(f'L{W} {H} Z', f'L{W} {H} Z')
    near = ridge(random.Random(5), 1400, 220, 0, 0.55)
    b += area(near, '#061822')
    b += f'<rect y="1520" width="{W}" height="80" fill="#04121a"/>'
    svg('aurora', b, defs)

# ------------------------------------------------------------------ synthwave
def synthwave():
    rng = random.Random(21)
    hy = 1000  # horizon
    defs = sky('g', [(0, '#0d0021'), (0.35, '#2a0a52'), (0.55, '#6a1680'), (0.625, '#ff3d8b'), (0.6251, '#170030'), (1, '#0b0018')])
    defs += '<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe66b"/><stop offset="0.55" stop-color="#ff8a5c"/><stop offset="1" stop-color="#ff2f9a"/></linearGradient>'
    defs += '<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    defs += f'<clipPath id="sunclip">' + ''.join(f'<rect x="0" y="{f(hy-430+i*0)}" width="{W}" height="1"/>' for i in range(0)) + '</clipPath>'
    # The sun with stripes cut out of its lower half.
    stripes = ''.join(f'<rect x="0" y="{f(hy - 200 + i * 38 + i*i*1.2)}" width="{W}" height="{f(6 + i * 4)}" fill="#000"/>' for i in range(6))
    defs += f'<mask id="sm"><rect width="{W}" height="{H}" fill="#fff"/>{stripes}</mask>'
    b = f'<rect width="{W}" height="{H}" fill="url(#g)"/>' + stars(rng, 140, 650, '#ffd6ff', 4)
    b += f'<circle cx="1200" cy="{hy-170}" r="360" fill="#ff3d8b" opacity="0.18"/>'
    b += f'<circle cx="1200" cy="{hy-170}" r="290" fill="url(#sun)" mask="url(#sm)"/>'
    # Retro mountains on the horizon.
    m = ridge(rng, hy, 180, 0, 0.45)
    b += area([(x, min(y, hy)) for x, y in m], '#1b0236').replace(f'M0 {H}', f'M0 {hy}').replace(f'L{W} {H} Z', f'L{W} {hy} Z')
    pts = ' '.join(f'{f(x)},{f(min(y,hy))}' for x, y in m)
    b += f'<polyline points="{pts}" fill="none" stroke="#ff4fd8" stroke-width="3" opacity="0.8" filter="url(#glow)"/>'
    # The grid floor.
    g = []
    vx = 1200
    for i in range(-30, 31):
        x2 = vx + i * 160
        g.append(f'<line x1="{vx + i*8}" y1="{hy}" x2="{x2}" y2="{H}"/>')
    y = hy
    k = 1
    while y < H:
        g.append(f'<line x1="0" y1="{f(y)}" x2="{W}" y2="{f(y)}"/>')
        y += 6 * k
        k *= 1.35
    b += f'<g stroke="#ff3dd8" stroke-width="3" opacity="0.75" filter="url(#glow)">' + ''.join(g) + '</g>'
    b += f'<rect y="{hy-2}" width="{W}" height="6" fill="#ff7ae0" opacity="0.9" filter="url(#glow)"/>'
    svg('synthwave', b, defs)

# ------------------------------------------------------------------ deep sea
def deepsea():
    rng = random.Random(31)
    defs = sky('g', [(0, '#0e6a96'), (0.3, '#06416b'), (0.7, '#03213d'), (1, '#010c1a')])
    defs += '<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bff0ff" stop-opacity="0.35"/><stop offset="1" stop-color="#bff0ff" stop-opacity="0"/></linearGradient>'
    defs += '<filter id="soft"><feGaussianBlur stdDeviation="14"/></filter>'
    b = f'<rect width="{W}" height="{H}" fill="url(#g)"/>'
    for _ in range(9):
        x = rng.uniform(300, 2100)
        w = rng.uniform(60, 180)
        lean = rng.uniform(-260, 260)
        b += f'<path d="M{f(x)} -20 L{f(x+w)} -20 L{f(x+w*2.6+lean)} {f(H*0.8)} L{f(x-w*0.8+lean)} {f(H*0.8)} Z" fill="url(#ray)" opacity="{rng.uniform(0.35,0.8):.2f}" filter="url(#soft)"/>'
    # Fish silhouettes.
    for _ in range(14):
        x, y, s = rng.uniform(0, W), rng.uniform(500, 1150), rng.uniform(0.5, 1.2)
        flip = rng.choice([1, -1])
        b += f'<path transform="translate({f(x)} {f(y)}) scale({f(s*flip)} {f(s)})" d="M0 0 C20 -14 44 -14 60 0 C44 14 20 14 0 0 Z M-4 0 L-18 -10 L-18 10 Z" fill="#021a2e" opacity="{rng.uniform(0.35,0.7):.2f}"/>'
    # Bubbles.
    for _ in range(90):
        x, y, r = rng.uniform(0, W), rng.uniform(300, H), rng.uniform(3, 14)
        b += f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="#bff0ff" fill-opacity="0.08" stroke="#bff0ff" stroke-opacity="{rng.uniform(0.25,0.6):.2f}" stroke-width="2"/>'
    # Seabed: rocks, coral and kelp.
    b += smooth_area(ridge(rng, 1460, 90, 0, 0.5)[::4], '#02111f')
    for _ in range(26):
        x = rng.uniform(0, W)
        h = rng.uniform(140, 420)
        sway = rng.uniform(-50, 50)
        b += f'<path d="M{f(x)} {H} C{f(x+sway)} {f(H-h*0.4)} {f(x-sway)} {f(H-h*0.7)} {f(x+sway*0.6)} {f(H-h)}" stroke="#03241f" stroke-width="{f(rng.uniform(10,22))}" fill="none" stroke-linecap="round"/>'
    for _ in range(10):
        x = rng.uniform(0, W)
        b += f'<ellipse cx="{f(x)}" cy="{f(H-30)}" rx="{f(rng.uniform(60,150))}" ry="{f(rng.uniform(40,90))}" fill="#010a14"/>'
    svg('deepsea', b, defs)

# ------------------------------------------------------------------ enchanted forest
def forest():
    rng = random.Random(41)
    defs = sky('g', [(0, '#06140f'), (0.5, '#0c2a1d'), (1, '#123826')])
    defs += '<radialGradient id="ff" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#f4ff9a"/><stop offset="0.3" stop-color="#d6ff6b" stop-opacity="0.7"/><stop offset="1" stop-color="#b8ff4a" stop-opacity="0"/></radialGradient>'
    defs += '<radialGradient id="mg" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#e8ffe0" stop-opacity="0.35"/><stop offset="1" stop-color="#e8ffe0" stop-opacity="0"/></radialGradient>'
    b = f'<rect width="{W}" height="{H}" fill="url(#g)"/>' + stars(rng, 120, 700, '#eaffd8', 3)
    b += f'<circle cx="900" cy="330" r="260" fill="url(#mg)"/><circle cx="900" cy="330" r="80" fill="#f3ffe8" opacity="0.9"/>'
    def pines(base, hmin, hmax, color, step):
        out = []
        x = -60
        while x < W + 60:
            h = rng.uniform(hmin, hmax)
            w = h * rng.uniform(0.32, 0.42)
            y0 = base + rng.uniform(-30, 30)
            tiers = 4
            for t in range(tiers):
                ty = y0 - h + t * h * 0.22
                tw = w * (0.45 + t * 0.2)
                out.append(f'<path d="M{f(x)} {f(ty)} L{f(x+tw/2)} {f(ty+h*0.34)} L{f(x-tw/2)} {f(ty+h*0.34)} Z"/>')
            out.append(f'<rect x="{f(x-w*0.06)}" y="{f(y0-h*0.2)}" width="{f(w*0.12)}" height="{f(h*0.4)}"/>')
            x += step * rng.uniform(0.6, 1.2)
        return f'<g fill="{color}">' + ''.join(out) + f'<rect x="0" y="{base}" width="{W}" height="{H-base}"/></g>'
    b += pines(1180, 260, 420, '#0f3322', 70)
    # Mist between the layers.
    b += f'<rect y="1080" width="{W}" height="160" fill="#bfe8c8" opacity="0.06"/>'
    b += pines(1360, 320, 520, '#092416', 95)
    b += pines(1560, 420, 680, '#04140b', 150)
    # Fireflies.
    for _ in range(46):
        x, y = rng.uniform(0, W), rng.uniform(700, 1500)
        r = rng.uniform(10, 26)
        b += f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="url(#ff)" opacity="{rng.uniform(0.5,1):.2f}"/>'
    svg('forest', b, defs)

# ------------------------------------------------------------------ desert dusk
def desert():
    rng = random.Random(51)
    defs = sky('g', [(0, '#1e0d2e'), (0.32, '#4a1c4e'), (0.55, '#a8385a'), (0.7, '#f07a4a'), (0.8, '#ffc078'), (1, '#ffc078')])
    defs += '<radialGradient id="sg" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff3c4" stop-opacity="0.8"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>'
    b = f'<rect width="{W}" height="{H}" fill="url(#g)"/>' + stars(rng, 90, 520, '#fff', 3)
    b += f'<circle cx="1300" cy="1080" r="420" fill="url(#sg)"/><circle cx="1300" cy="1100" r="150" fill="#ffe6a6"/>'
    def dunes(base, amp, color, seed, pts=7):
        r = random.Random(seed)
        p = [(W * i / pts, base - r.uniform(0, amp)) for i in range(pts + 1)]
        return smooth_area(p, color)
    b += dunes(1180, 160, '#a8485a', 1)
    b += dunes(1300, 200, '#6e2a46', 2)
    b += dunes(1420, 180, '#3e1733', 3)
    b += dunes(1530, 120, '#220a1e', 4)
    # A caravan of camels on the middle dune.
    camel = 'M0 0 C6 -30 20 -34 28 -20 C34 -40 54 -40 58 -22 C64 -26 72 -40 78 -48 C82 -52 90 -50 88 -44 C84 -36 80 -20 74 -8 L74 30 L68 30 L66 4 L40 6 L38 30 L32 30 L30 4 C18 6 10 4 6 0 L6 30 L0 30 Z'
    for i, (x, y) in enumerate([(1060, 1262), (1160, 1254), (1260, 1250)]):
        b += f'<path transform="translate({x} {y}) scale(0.9)" d="{camel}" fill="#3e1733"/>'
    svg('desert', b, defs)

for fn in (gothic, blossom, aurora, synthwave, deepsea, forest, desert):
    fn()
