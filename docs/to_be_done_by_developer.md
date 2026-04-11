# Road Rage — To Be Done By Developer

> Tasks that require manual action from the developer (asset acquisition, accounts, etc.)  
> These are **not required for V1** — the game runs with procedural assets. These are for **future visual/audio upgrades**.

---

## 1. 3D Models (GLTF/GLB Format)

### What You Need
Replace the procedural box/cylinder bike and rider with proper low-poly models.

| Model | Requirements |
|---|---|
| **Motorcycle** | Low-poly (500–2000 tris). Single mesh or simple hierarchy. Origin at bottom-centre. Facing +Z forward. GLB format preferred. |
| **Rider** | Low-poly humanoid sitting pose. Separate arm meshes (or skinned with arm bones) for punch/kick animations. Same origin/facing as bike. |
| **Scenery (optional)** | Low-poly trees, barriers, signs, buildings. Will be instanced, so keep them simple. |

### Where To Find Them
1. **[Poly Pizza](https://poly.pizza/)** — Free, CC0 licensed, already optimised for games. Search "low poly motorcycle".
2. **[Sketchfab](https://sketchfab.com/)** — Filter by "Downloadable" + "Low Poly". Check license (CC-BY or CC0). GLB export available.
3. **[Kenney Assets](https://kenney.nl/)** — Free CC0 game assets. Great for vehicles and props.
4. **[CGTrader (Free section)](https://www.cgtrader.com/)** — Filter "Free" + your format. May need Blender conversion.

### How To Convert To GLB
If the model is in `.obj`, `.fbx`, or `.blend` format:
1. Install [Blender](https://www.blender.org/) (free)
2. `File → Import → [format]`
3. Scale to ~2 units tall for bike
4. Set origin: `Right-click → Set Origin → Origin to Geometry`
5. Rotate so front faces +Z: `R → Z → [angle]`
6. `File → Export → glTF 2.0` → choose `.glb` (binary)
7. Place in `public/models/` directory

### Where To Place
```
public/models/bike.glb
public/models/rider.glb
public/models/tree.glb       (optional)
public/models/barrier.glb    (optional)
```

The `AssetLoader.js` will look for these paths automatically (with fallback to procedural geometry).

---

## 2. Textures

### Road Texture (Optional Enhancement)
V1 generates a road texture procedurally. To upgrade:
- Create or download a **128×128 px** seamless asphalt texture (grey, gritty)
- Add white dashed lane markings baked in, or provide as a separate overlay
- Save as `public/textures/road_diffuse.png`
- Websites: [ambientCG](https://ambientcg.com/) (CC0), [Poly Haven](https://polyhaven.com/textures) (CC0)

### Skybox (Optional Enhancement)
V1 uses a gradient shader. To upgrade:
- Create a **low-res cubemap** (6 faces, 256×256 each) or a single equirectangular HDR
- Save as `public/textures/sky_*.png` (px, nx, py, ny, pz, nz)

---

## 3. Audio Files (Optional Enhancement)

V1 uses synthesised audio. To upgrade with real recordings:

| Sound | Spec | Suggested Source |
|---|---|---|
| Engine idle loop | Mono, 44.1kHz, WAV/MP3, ~2s loop | [Freesound.org](https://freesound.org/) — search "motorcycle engine loop" |
| Engine high RPM loop | Same as above, higher pitch | Same source |
| Punch impact | Short (<0.5s), punchy thud | Freesound — "punch impact" |
| Kick impact | Short (<0.5s), heavier thud | Freesound — "kick body impact" |
| Wind / speed ambience | Mono, loopable, ~3s | Freesound — "wind rushing" |
| Race start beep | Short tone, 3 beeps + 1 go | Synthesise or Freesound |

Place files in:
```
public/audio/engine_idle.mp3
public/audio/engine_high.mp3
public/audio/punch.mp3
public/audio/kick.mp3
public/audio/wind.mp3
```

> **License reminder:** Always check that assets from Freesound are CC0 or CC-BY. If CC-BY, add attribution in a `CREDITS.md` file.

---

## 4. Fonts (Optional Enhancement)

V1 HUD uses system monospace font rendered to Canvas. To upgrade:
- Download a pixel/bitmap font (e.g., [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) from Google Fonts)
- Add via CSS `@font-face` or Google Fonts link in `index.html`

---

*None of the above are blocking. The game is fully playable with procedural assets.*
