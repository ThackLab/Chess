# The open sea at dusk: Blender's ocean surface under a low sun.
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from lib import *
path, orient, res, q = out_and_size()
sc = reset(24 if q == 'preview' else 48, res)
world_sky(1.2, 180, 0.7, air=1.4, dust=5.0)
exposure(-0.3)
bpy.ops.mesh.primitive_plane_add(size=2)
oc = bpy.context.object
om = oc.modifiers.new('ocean', 'OCEAN')
om.geometry_mode = 'GENERATE'; om.size = 1.0; om.spatial_size = 120; om.repeat_x = 4; om.repeat_y = 6
om.resolution = 12 if q == 'preview' else 22
om.wave_scale = 3.5; om.choppiness = 1.7; om.wind_velocity = 22; om.wave_alignment = 0.3; om.random_seed = 7
oc.location = (-240, -30, 0)
bpy.ops.object.shade_smooth()
w = mat('water', (0.002, 0.008, 0.014), 0.08, trans=0.0, ior=1.33, coat=0.0)
nn, ll, b = nodes(w)
b.inputs['Specular IOR Level'].default_value = 0.7
oc.data.materials.append(w)
if orient == 'portrait':
    camera((0, -10, 3.0), (0, 60, 2.2), lens=30)
else:
    camera((0, -10, 3.0), (0, 60, 2.4), lens=24)
sun((88, 0, 180), 2.5, (1.0, 0.72, 0.45), 1.2)
render(path)
