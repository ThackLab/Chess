# Glass and marble pieces on cracked desert earth under a hazy low sun.
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from lib import *
path, orient, res, q = out_and_size()
sc = reset(24 if q == 'preview' else 56, res)
world_sky(6, 160, 0.35, air=1.6, dust=3.0)
exposure(-0.6)
# Cracked earth: voronoi edges become dark cracks with depth (bump).
g = mat('earth', (0.42, 0.36, 0.3), 0.92)
n, l, b = nodes(g)
tc = n.new('ShaderNodeTexCoord')
vor = n.new('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value = 2.4; vor.inputs['Randomness'].default_value = 1.0
nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3; nz.inputs['Detail'].default_value = 12; nz.inputs['Roughness'].default_value = 0.65
mix = n.new('ShaderNodeVectorMath'); mix.operation = 'ADD'
sc2 = n.new('ShaderNodeVectorMath'); sc2.operation = 'SCALE'; sc2.inputs['Scale'].default_value = 0.22
l.new(nz.outputs['Color'], sc2.inputs[0]); l.new(tc.outputs['Object'], mix.inputs[0]); l.new(sc2.outputs[0], mix.inputs[1]); l.new(mix.outputs[0], vor.inputs['Vector'])
crack1 = n.new('ShaderNodeMapRange'); crack1.inputs['From Min'].default_value = 0.0; crack1.inputs['From Max'].default_value = 0.05
l.new(vor.outputs['Distance'], crack1.inputs['Value'])
# Finer secondary cracks.
vor2 = n.new('ShaderNodeTexVoronoi'); vor2.feature = 'DISTANCE_TO_EDGE'; vor2.inputs['Scale'].default_value = 7.0
l.new(mix.outputs[0], vor2.inputs['Vector'])
crack2 = n.new('ShaderNodeMapRange'); crack2.inputs['From Min'].default_value = 0.0; crack2.inputs['From Max'].default_value = 0.02; crack2.inputs['To Min'].default_value = 0.55
l.new(vor2.outputs['Distance'], crack2.inputs['Value'])
crack = n.new('ShaderNodeMath'); crack.operation = 'MINIMUM'
l.new(crack1.outputs['Result'], crack.inputs[0]); l.new(crack2.outputs['Result'], crack.inputs[1])
grain = n.new('ShaderNodeTexNoise'); grain.inputs['Scale'].default_value = 40; grain.inputs['Detail'].default_value = 8
ramp = n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (0.2, 0.16, 0.13, 1); ramp.color_ramp.elements[1].color = (0.46, 0.39, 0.32, 1)
l.new(grain.outputs['Fac'], ramp.inputs['Fac'])
cm = n.new('ShaderNodeMix'); cm.data_type = 'RGBA'
cm.inputs['B'].default_value = (0.05, 0.035, 0.03, 1)
inv = n.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
l.new(crack.outputs[0], inv.inputs[1]); l.new(inv.outputs[0], cm.inputs['Factor']); l.new(ramp.outputs['Color'], cm.inputs['A'])
l.new(cm.outputs['Result'], b.inputs['Base Color'])
bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.9; bump.inputs['Distance'].default_value = 0.05
hgt = n.new('ShaderNodeMath'); hgt.operation = 'ADD'
gs = n.new('ShaderNodeMath'); gs.operation = 'MULTIPLY'; gs.inputs[1].default_value = 0.15
l.new(grain.outputs['Fac'], gs.inputs[0]); l.new(crack.outputs[0], hgt.inputs[0]); l.new(gs.outputs[0], hgt.inputs[1]); l.new(hgt.outputs[0], bump.inputs['Height'])
l.new(bump.outputs['Normal'], b.inputs['Normal'])
plane(400, g)
glass = mat('glass', (0.92, 0.95, 1.0), 0.03, trans=1.0, ior=1.5)
smoke = mat('smoke', (0.55, 0.52, 0.5), 0.06, trans=1.0, ior=1.5)
marble = marble_mat('marble')
S = 1.6
piece('knight', (-0.9, 0.2, 0), glass, S, math.radians(-20))
piece('pawn', (0.75, -1.4, 0), glass, S)
piece('pawn', (2.2, 0.6, 0), smoke, S)
piece('king', (-2.6, 3.2, 0), smoke, S)
piece('bishop', (1.0, 3.6, 0), glass, S)
piece('rook', (3.8, 6.5, 0), smoke, S)
piece('queen', (-4.6, 8.0, 0), glass, S)
piece('pawn', (-3.2, -2.6, 0), marble, S * 0.95)
if orient == 'portrait':
    camera((0.6, -11.5, 2.2), (0.2, 0, 1.3), lens=42, fstop=2.2, focus=11.2)
else:
    camera((0.3, -10.5, 2.0), (0.0, 1.0, 1.2), lens=34, fstop=2.4, focus=10.5)
sun((80, 0, 160), 2.6, (1.0, 0.8, 0.6), 2.0)
render(path)
