# Clear glass pieces on black glass, lit by blue and violet light: the Glass look.
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from lib import *
path, orient, res, q = out_and_size()
sc = reset(24 if q == 'preview' else 64, res)
world_color((0.004, 0.006, 0.014), 1)
exposure(0.3)
floor = plane(200, mat('floor', (0.004, 0.006, 0.012), 0.08, coat=1.0))
glass = mat('glass', (0.85, 0.92, 1.0), 0.02, trans=1.0, ior=1.5)
blue = mat('blueglass', (0.25, 0.55, 1.0), 0.03, trans=1.0, ior=1.5)
S = 1.0
piece('queen', (-0.4, 0.6, 0), glass, S)
piece('knight', (0.7, -0.3, 0), blue, S, math.radians(-25))
piece('pawn', (1.7, 1.0, 0), glass, S)
piece('king', (-1.7, 2.6, 0), blue, S)
piece('rook', (1.4, 3.2, 0), glass, S)
piece('pawn', (-2.4, -0.4, 0), blue, S)
if orient == 'portrait':
    camera((0.6, -5.6, 1.3), (0.0, 0.6, 0.65), lens=38, fstop=2.0, focus=5.6)
else:
    camera((0.4, -5.2, 1.2), (0.0, 1.0, 0.6), lens=30, fstop=2.2, focus=5.2)
# A big soft panel behind for the glass to refract, and coloured rims.
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 12, 6), rotation=(math.radians(90), 0, 0))
panel = bpy.context.object
pm = mat('panel', (0, 0, 0), 1.0, emit=((0.12, 0.26, 0.75), 0.45))
panel.data.materials.append(pm)
area((-5, 1, 3), (0, 1, 0.6), 500, 1.5, (0.6, 0.35, 1.0))
area((5, -1, 2.5), (0, 1, 0.6), 400, 1.5, (0.3, 0.7, 1.0))
render(path)

