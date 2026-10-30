# Dark lacquered pieces on a marble board, a single warm key light, deep shadow.
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from lib import *
path, orient, res, q = out_and_size()
sc = reset(24 if q == 'preview' else 64, res)
world_color((0.01, 0.01, 0.012), 1)
exposure(0.2)
board = checker_mat('board', (0.5, 0.47, 0.43), (0.03, 0.028, 0.026), 8, 0.18)
p = plane(8, board); p.location = (0, 2, 0)
bpy.ops.object.mode_set(mode='OBJECT')
# UVs for the checker: the default plane has 0..1 UVs.
floor = plane(200, mat('floor', (0.01, 0.01, 0.01), 0.4)); floor.location = (0, 0, -0.02)
black = mat('black', (0.015, 0.014, 0.013), 0.12, coat=1.0)
ivory = marble_mat('ivory')
S = 1.0
piece('king', (-0.5, 0.5, 0), black, S)
piece('knight', (0.55, -0.4, 0), black, S, math.radians(-25))
piece('pawn', (1.5, 0.5, 0), black, S)
piece('queen', (-1.6, 2.5, 0), ivory, S)
piece('bishop', (0.5, 2.6, 0), ivory, S)
piece('rook', (2.5, 3.5, 0), black, S)
piece('pawn', (-2.5, -0.6, 0), ivory, S)
if orient == 'portrait':
    camera((0.6, -5.6, 1.5), (0.0, 0.4, 0.7), lens=38, fstop=1.8, focus=5.4)
else:
    camera((0.4, -5.2, 1.4), (0.0, 0.8, 0.65), lens=30, fstop=2.0, focus=5.0)
area((-4, -2, 5), (0, 1, 0.5), 900, 2.5, (1.0, 0.86, 0.7))
area((4, 5, 2.5), (0, 1, 0.8), 400, 1.5, (0.6, 0.7, 1.0))
render(path)
