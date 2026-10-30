# Backgrounds and textured boards

The pictures behind the app (Settings → Theme → Background) and the textured boards.

- `blender/scene_*.py`: 3D scenes rendered with Cycles through Blender's Python module (`pip install bpy`, Blender 5.2):
  `python blender/scene_marble.py -- out/marble-portrait.png portrait` (or `landscape`; add `preview` for a quick low-quality look).
  Glass Desert is `scene_marble.py`, Real 3D `scene_real3d.py`, Wood `scene_wood.py`, Glass `scene_glass.py`, Space and Ocean their own.
- `flat.py`: the 2D ones (bokeh, brushed metal, sky, 8-bit, light, slate), with numpy, Pillow and OpenCV.
- `pack.py <dir> <name>[=<id>]`: turns `<name>-portrait.png` / `<name>-landscape.png` into the app's WebP files and a thumbnail in `src/assets/backgrounds`.
- `boards.py src/assets/boards`: the textured boards (walnut, marble, metal, glass, neon, 8-bit...).

The chess pieces in the renders are modelled in `blender/lib.py` (lathed profiles; the knight is an extruded silhouette). Everything here is original work; nothing is taken from other sites.
