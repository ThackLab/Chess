# A planet's night side with city-free clouds, its atmosphere lit from behind, and stars.
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from lib import *
path, orient, res, q = out_and_size()
sc = reset(24 if q == 'preview' else 48, res)
exposure(0.0)
# Stars and a faint nebula in the world.
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
nt = w.node_tree; n = nt.nodes; l = nt.links; n.clear()
tc = n.new('ShaderNodeTexCoord')
st = n.new('ShaderNodeTexVoronoi'); st.inputs['Scale'].default_value = 260; st.feature = 'F1'
sr = n.new('ShaderNodeMapRange'); sr.inputs['From Min'].default_value = 0.0; sr.inputs['From Max'].default_value = 0.1; sr.inputs['To Min'].default_value = 1.0; sr.inputs['To Max'].default_value = 0.0
l.new(tc.outputs['Generated'], st.inputs['Vector']); l.new(st.outputs['Distance'], sr.inputs['Value'])
sep = n.new('ShaderNodeSeparateColor'); l.new(st.outputs['Color'], sep.inputs[0])
lum = n.new('ShaderNodeMath'); lum.operation = 'POWER'; lum.inputs[1].default_value = 10
l.new(sep.outputs[0], lum.inputs[0])
pw = n.new('ShaderNodeMath'); pw.operation = 'MULTIPLY'
l.new(sr.outputs['Result'], pw.inputs[0]); l.new(lum.outputs[0], pw.inputs[1])
neb = n.new('ShaderNodeTexNoise'); neb.inputs['Scale'].default_value = 2.5; neb.inputs['Detail'].default_value = 14; neb.inputs['Roughness'].default_value = 0.62
l.new(tc.outputs['Generated'], neb.inputs['Vector'])
nr = n.new('ShaderNodeValToRGB'); nr.color_ramp.elements[0].position = 0.52; nr.color_ramp.elements[0].color = (0, 0, 0, 1)
nr.color_ramp.elements[1].position = 0.78; nr.color_ramp.elements[1].color = (0.08, 0.03, 0.14, 1)
e = nr.color_ramp.elements.new(0.66); e.color = (0.01, 0.02, 0.06, 1)
l.new(neb.outputs['Fac'], nr.inputs['Fac'])
add = n.new('ShaderNodeMix'); add.data_type = 'RGBA'; add.blend_type = 'ADD'; add.inputs['Factor'].default_value = 1
l.new(nr.outputs['Color'], add.inputs['A'])
sm = n.new('ShaderNodeMath'); sm.operation = 'MULTIPLY'; sm.inputs[1].default_value = 30
l.new(pw.outputs[0], sm.inputs[0]); l.new(sm.outputs[0], add.inputs['B'])
bg = n.new('ShaderNodeBackground'); out = n.new('ShaderNodeOutputWorld')
l.new(add.outputs['Result'], bg.inputs['Color']); l.new(bg.outputs[0], out.inputs[0])
# The planet.
bpy.ops.mesh.primitive_uv_sphere_add(radius=10, segments=128, ring_count=64, location=(0, 0, -11.2))
pl = bpy.context.object; bpy.ops.object.shade_smooth()
m = mat('planet', (0.01, 0.04, 0.12), 0.5)
nn, ll, b = nodes(m)
tc2 = nn.new('ShaderNodeTexCoord')
cl = nn.new('ShaderNodeTexNoise'); cl.inputs['Scale'].default_value = 3.5; cl.inputs['Detail'].default_value = 14; cl.inputs['Distortion'].default_value = 0.6
ll.new(tc2.outputs['Object'], cl.inputs['Vector'])
cr = nn.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position = 0.52; cr.color_ramp.elements[0].color = (0.008, 0.03, 0.1, 1); cr.color_ramp.elements[1].position = 0.72; cr.color_ramp.elements[1].color = (0.85, 0.88, 0.95, 1)
ll.new(cl.outputs['Fac'], cr.inputs['Fac']); ll.new(cr.outputs['Color'], b.inputs['Base Color'])
pl.data.materials.append(m)
# Atmosphere: a slightly bigger sphere of thin volume.
bpy.ops.mesh.primitive_uv_sphere_add(radius=10.25, segments=128, ring_count=64, location=(0, 0, -11.2))
at = bpy.context.object; bpy.ops.object.shade_smooth()
am = bpy.data.materials.new('atmo'); am.use_nodes = True
an = am.node_tree.nodes; an.remove(an['Principled BSDF'])
vs = an.new('ShaderNodeVolumeScatter'); vs.inputs['Color'].default_value = (0.45, 0.7, 1.0, 1); vs.inputs['Density'].default_value = 0.35
am.node_tree.links.new(vs.outputs[0], an['Material Output'].inputs['Volume'])
at.data.materials.append(am)
sun((-80, 0, 10), 6, (1.0, 0.97, 0.94), 0.6)
if orient == 'portrait':
    camera((0, -16, -0.2), (0, 0, -0.9), lens=40)
else:
    camera((0, -16, -0.3), (0, 0, -0.7), lens=30)
render(path)
