# Helpers for the background renders: scene setup, chess pieces, materials.
import bpy, bmesh, math, sys
from mathutils import Vector

def reset(samples=64, res=(1080, 2340)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    sc.cycles.max_bounces = 12
    sc.cycles.transmission_bounces = 12
    sc.cycles.glossy_bounces = 6
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.image_settings.file_format = 'PNG'
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    return sc

def exposure(ev):
    bpy.context.scene.view_settings.exposure = ev

def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj

def world_sky(elev=8, rot=200, strength=0.4, kind='MULTIPLE_SCATTERING', air=1.0, dust=1.0):
    w = bpy.data.worlds.new('w'); bpy.context.scene.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    sky = nt.nodes.new('ShaderNodeTexSky'); sky.sky_type = kind
    for k, v in (('sun_elevation', math.radians(elev)), ('sun_rotation', math.radians(rot)), ('air_density', air), ('aerosol_density', dust), ('dust_density', dust)):
        if hasattr(sky, k):
            try: setattr(sky, k, v)
            except Exception: pass
    bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = strength
    o = nt.nodes.new('ShaderNodeOutputWorld')
    nt.links.new(sky.outputs[0], bg.inputs[0]); nt.links.new(bg.outputs[0], o.inputs[0])
    return w

def world_color(rgb, strength=1.0):
    w = bpy.data.worlds.new('w'); bpy.context.scene.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (*rgb, 1); bg.inputs[1].default_value = strength
    return w

def camera(loc, look, lens=50, fstop=None, focus=None):
    cam = bpy.data.cameras.new('cam'); cam.lens = lens; cam.sensor_fit = 'AUTO'
    co = link(bpy.data.objects.new('cam', cam))
    co.location = loc
    d = Vector(look) - Vector(loc)
    co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if fstop:
        cam.dof.use_dof = True; cam.dof.aperture_fstop = fstop
        cam.dof.focus_distance = focus if focus else d.length
    bpy.context.scene.camera = co
    return co

def sun(rot=(60, 0, 200), energy=3.0, color=(1, 0.95, 0.88), angle=1.5):
    l = bpy.data.lights.new('sun', 'SUN'); l.energy = energy; l.color = color; l.angle = math.radians(angle)
    o = link(bpy.data.objects.new('sun', l)); o.rotation_euler = tuple(math.radians(a) for a in rot)
    return o

def area(loc, look, energy=500, size=3, color=(1, 1, 1)):
    l = bpy.data.lights.new('area', 'AREA'); l.energy = energy; l.size = size; l.color = color
    o = link(bpy.data.objects.new('area', l)); o.location = loc
    o.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o

def mat(name, base=(0.8, 0.8, 0.8), rough=0.5, metal=0.0, trans=0.0, ior=1.45, coat=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Transmission Weight'].default_value = trans
    b.inputs['IOR'].default_value = ior
    b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = (*emit[0], 1); b.inputs['Emission Strength'].default_value = emit[1]
    return m

def nodes(m):
    return m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']

def marble_mat(name, light=True):
    m = mat(name, rough=0.18, coat=0.6)
    n, l, b = nodes(m)
    tc = n.new('ShaderNodeTexCoord')
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 2.2; noise.inputs['Detail'].default_value = 12; noise.inputs['Distortion'].default_value = 3.5
    wave = n.new('ShaderNodeTexWave'); wave.inputs['Scale'].default_value = 1.4; wave.inputs['Distortion'].default_value = 14; wave.inputs['Detail'].default_value = 8
    l.new(tc.outputs['Object'], noise.inputs['Vector']); l.new(noise.outputs['Color'], wave.inputs['Vector'])
    ramp = n.new('ShaderNodeValToRGB')
    if light:
        ramp.color_ramp.elements[0].color = (0.55, 0.53, 0.5, 1); ramp.color_ramp.elements[0].position = 0.0
        ramp.color_ramp.elements[1].color = (0.93, 0.92, 0.9, 1); ramp.color_ramp.elements[1].position = 0.25
    else:
        ramp.color_ramp.elements[0].color = (0.02, 0.02, 0.025, 1); ramp.color_ramp.elements[0].position = 0.7
        ramp.color_ramp.elements[1].color = (0.35, 0.34, 0.33, 1); ramp.color_ramp.elements[1].position = 1.0
    l.new(wave.outputs['Fac'], ramp.inputs['Fac']); l.new(ramp.outputs['Color'], b.inputs['Base Color'])
    return m

def wood_mat(name, dark=(0.09, 0.045, 0.02), light=(0.32, 0.17, 0.08), scale=3.0, rough=0.35, coat=0.4, straight=False):
    m = mat(name, rough=rough, coat=coat)
    n, l, b = nodes(m)
    tc = n.new('ShaderNodeTexCoord')
    mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 1, 6)
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 1.5; noise.inputs['Detail'].default_value = 6; noise.inputs['Distortion'].default_value = 1.5
    wave = n.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS' if straight else 'RINGS'; wave.inputs['Scale'].default_value = scale; wave.inputs['Distortion'].default_value = 2.5 if straight else 6; wave.inputs['Detail'].default_value = 4
    l.new(tc.outputs['Object'], mp.inputs['Vector']); l.new(mp.outputs['Vector'], noise.inputs['Vector']); l.new(noise.outputs['Color'], wave.inputs['Vector'])
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*dark, 1); ramp.color_ramp.elements[1].color = (*light, 1)
    l.new(wave.outputs['Fac'], ramp.inputs['Fac']); l.new(ramp.outputs['Color'], b.inputs['Base Color'])
    return m

# Piece profiles (radius, height), revolved. Units: a square is 1.
PROFILES = {
    'pawn': [(0, 0), (0.36, 0), (0.36, 0.06), (0.3, 0.1), (0.22, 0.14), (0.15, 0.36), (0.13, 0.55), (0.24, 0.6), (0.24, 0.64), (0.12, 0.68), (0.18, 0.8), (0.17, 0.9), (0.09, 0.97), (0, 1.0)],
    'rook': [(0, 0), (0.4, 0), (0.4, 0.07), (0.33, 0.12), (0.26, 0.17), (0.22, 0.55), (0.24, 0.7), (0.3, 0.74), (0.3, 0.95), (0.24, 0.95), (0.24, 0.88), (0, 0.88)],
    'bishop': [(0, 0), (0.38, 0), (0.38, 0.07), (0.31, 0.12), (0.22, 0.17), (0.14, 0.6), (0.13, 0.78), (0.24, 0.82), (0.24, 0.86), (0.13, 0.9), (0.17, 1.0), (0.16, 1.12), (0.1, 1.22), (0.05, 1.27), (0.07, 1.3), (0.04, 1.35), (0, 1.36)],
    'queen': [(0, 0), (0.42, 0), (0.42, 0.08), (0.34, 0.13), (0.25, 0.19), (0.15, 0.75), (0.14, 0.95), (0.27, 1.0), (0.27, 1.04), (0.15, 1.08), (0.24, 1.3), (0.2, 1.34), (0.12, 1.36), (0.08, 1.42), (0.1, 1.46), (0, 1.5)],
    'king': [(0, 0), (0.43, 0), (0.43, 0.08), (0.35, 0.13), (0.26, 0.19), (0.16, 0.8), (0.15, 1.0), (0.28, 1.05), (0.28, 1.09), (0.15, 1.13), (0.23, 1.33), (0.22, 1.42), (0.06, 1.46), (0.06, 1.5), (0, 1.5)],
}

def lathe(name, prof, segs=72):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    rings = [[bm.verts.new((r * math.cos(2 * math.pi * k / segs), r * math.sin(2 * math.pi * k / segs), z)) for k in range(segs)] for r, z in prof]
    for a, c in zip(rings, rings[1:]):
        for k in range(segs):
            bm.faces.new([a[k], a[(k + 1) % segs], c[(k + 1) % segs], c[k]])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return me

def extrude_profile(name, pts, depth):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    front = [bm.verts.new((x, -depth / 2, z)) for x, z in pts]
    back = [bm.verts.new((x, depth / 2, z)) for x, z in pts]
    bm.faces.new(front); bm.faces.new(list(reversed(back)))
    n = len(pts)
    for i in range(n):
        bm.faces.new([front[i], front[(i + 1) % n], back[(i + 1) % n], back[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    return me

KNIGHT_HEAD = [(-0.25, 0.3), (-0.28, 0.6), (-0.24, 0.85), (-0.16, 1.05), (-0.09, 1.2), (-0.04, 1.36), (0.03, 1.22), (0.1, 1.24), (0.2, 1.12), (0.3, 0.98), (0.36, 0.86), (0.34, 0.76), (0.24, 0.74), (0.1, 0.78), (0.06, 0.66), (0.16, 0.48), (0.22, 0.3)]

def piece(kind, loc, material, scale=1.0, rot=0.0):
    if kind == 'knight':
        base = link(bpy.data.objects.new('kb', lathe('kb', [(0, 0), (0.4, 0), (0.4, 0.07), (0.33, 0.11), (0.27, 0.17), (0.25, 0.26), (0.2, 0.34), (0, 0.36)])))
        head = link(bpy.data.objects.new('kh', extrude_profile('kh', KNIGHT_HEAD, 0.34)))
        bev = head.modifiers.new('b', 'BEVEL'); bev.width = 0.06; bev.segments = 4
        sub = head.modifiers.new('s', 'SUBSURF'); sub.levels = 2; sub.render_levels = 2
        for p in head.data.polygons: p.use_smooth = True
        # One solid: overlapping glass volumes render black.
        for o in (base, head):
            o.location = loc; o.scale = (scale,) * 3; o.rotation_euler = (0, 0, rot)
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        hm = bpy.data.meshes.new_from_object(head.evaluated_get(dg))
        solid = link(bpy.data.objects.new('khs', hm)); solid.matrix_world = head.matrix_world.copy()
        bpy.data.objects.remove(head)
        sb = base.modifiers.new('s', 'SUBSURF'); sb.levels = 2; sb.render_levels = 2
        bo = base.modifiers.new('u', 'BOOLEAN'); bo.object = solid; bo.operation = 'UNION'; bo.solver = 'EXACT'
        solid.hide_render = True; solid.hide_viewport = True
        base.data.materials.append(material)
        return [base]
    o = link(bpy.data.objects.new(kind, lathe(kind, PROFILES[kind])))
    sub = o.modifiers.new('s', 'SUBSURF'); sub.levels = 1; sub.render_levels = 2
    if kind == 'rook':
        # Notches in the top.
        for a in range(4):
            bpy.ops.mesh.primitive_cube_add(size=1)
            cut = bpy.context.object; cut.scale = (0.7, 0.09, 0.2); cut.rotation_euler = (0, 0, a * math.pi / 4)
            cut.location = (0, 0, 0.98); cut.hide_render = True; cut.hide_viewport = True
            bo = o.modifiers.new('cut', 'BOOLEAN'); bo.object = cut; bo.operation = 'DIFFERENCE'
            cut.parent = o
    o.data.materials.append(material); o.location = loc; o.scale = (scale,) * 3; o.rotation_euler = (0, 0, rot)
    if kind == 'king':
        for (sx, sz, z) in ((0.05, 0.2, 1.62), (0.16, 0.05, 1.63)):
            bpy.ops.mesh.primitive_cube_add(size=1)
            c = bpy.context.object; c.scale = (sx * scale, 0.05 * scale, sz * scale)
            c.location = (loc[0], loc[1], loc[2] + z * scale); c.data.materials.append(material)
            bv = c.modifiers.new('b', 'BEVEL'); bv.width = 0.012 * scale; bv.segments = 3
    return [o]

def plane(size, material, loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=size, location=loc)
    p = bpy.context.object; p.data.materials.append(material)
    return p

def checker_mat(name, a=(0.85, 0.82, 0.75), b=(0.08, 0.07, 0.06), scale=8, rough=0.25):
    m = mat(name, rough=rough, coat=0.5)
    n, l, bs = nodes(m)
    tc = n.new('ShaderNodeTexCoord'); ch = n.new('ShaderNodeTexChecker'); ch.inputs['Scale'].default_value = scale
    ch.inputs['Color1'].default_value = (*a, 1); ch.inputs['Color2'].default_value = (*b, 1)
    l.new(tc.outputs['UV'], ch.inputs['Vector']); l.new(ch.outputs['Color'], bs.inputs['Base Color'])
    return m

def render(path):
    sc = bpy.context.scene; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

def out_and_size():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    path = args[0] if args else '/tmp/out.png'
    orient = args[1] if len(args) > 1 else 'portrait'
    q = args[2] if len(args) > 2 else 'full'
    res = (900, 1950) if orient == 'portrait' else (1920, 1080)
    if q == 'preview': res = (res[0] // 3, res[1] // 3)
    return path, orient, res, q
