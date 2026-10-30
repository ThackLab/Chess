# Wooden pieces on a walnut board by a window: warm afternoon light.
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from lib import *
path, orient, res, q = out_and_size()
sc = reset(24 if q == 'preview' else 56, res)
world_color((0.03, 0.022, 0.016), 1)
exposure(-0.2)
# The board: light maple and dark walnut squares.
maple = wood_mat('maple', (0.45, 0.28, 0.13), (0.7, 0.48, 0.26), 7.0, 0.28, 0.5, True)
walnut = wood_mat('walnut', (0.07, 0.035, 0.016), (0.2, 0.1, 0.045), 7.0, 0.28, 0.5, True)
for i in range(8):
    for j in range(8):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(i - 3.5, j - 3.5 + 1.5, -0.05))
        c = bpy.context.object; c.scale = (1, 1, 0.1); c.data.materials.append(maple if (i + j) % 2 else walnut)
table = wood_mat('table', (0.03, 0.015, 0.008), (0.12, 0.06, 0.03), 2.0, 0.45, 0.3)
plane(200, table, (0, 0, -0.1))
box = wood_mat('pieceL', (0.5, 0.32, 0.15), (0.74, 0.53, 0.3), 9.0, 0.32, 0.3)
dark = wood_mat('pieceD', (0.04, 0.02, 0.01), (0.16, 0.08, 0.035), 9.0, 0.3, 0.6)
S = 0.95
piece('king', (-0.5, -0.5 + 1.5, 0), dark, S)
piece('knight', (0.5, -1.5 + 1.5, 0), box, S, math.radians(-160))
piece('pawn', (1.5, -2.5 + 1.5, 0), box, S)
piece('queen', (-1.5, 0.5 + 1.5, 0), dark, S)
piece('pawn', (-2.5, -1.5 + 1.5, 0), dark, S)
piece('bishop', (2.5, 1.5 + 1.5, 0), box, S)
piece('rook', (-3.5, 3.5 + 1.5, 0), dark, S)
if orient == 'portrait':
    camera((1.0, -5.0, 2.4), (0.0, 0.8, 0.5), lens=36, fstop=2.0, focus=5.0)
else:
    camera((0.8, -4.8, 2.2), (0.0, 1.2, 0.5), lens=28, fstop=2.2, focus=4.9)
area((-5, 1, 4.5), (0, 1.5, 0), 1400, 3, (1.0, 0.8, 0.58))
area((5, -3, 3), (0, 1, 0.5), 250, 4, (0.7, 0.8, 1.0))
render(path)
