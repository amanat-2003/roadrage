# Road Rage — Dev Memory

> Dense reference for implementation context. Updated each phase.

## Stack
- **Vite** (vanilla JS) + **Three.js r170+** (installed as `three`)
- `lil-gui` installed for debug tuning (not yet wired)
- Zero physics engines — custom kinematic only
- Web Audio API for all sound (no external libs)
- Dev server: `npm run dev` → http://localhost:5173/

## Architecture Snapshot
- `Game.js` = master orchestrator (scene, loop, wires everything)
- Fixed-timestep loop: 60 Hz physics (FIXED_STEP=1/60), accumulator pattern
- Render interpolation via alpha for smooth visuals at any FPS
- All tuning constants in `src/config/VehicleConfig.js` + `GameConfig.js`
- Node v24.7.0 via nvm — must `export PATH` with nvm bin dir

## Track System
- `CatmullRomCurve3` (closed=false, tension=0.5) — 17 control points
- **Ribbon mesh** approach (NOT ExtrudeGeometry — that produced bad normals)
- Custom `BufferGeometry`: samples centreline at TRACK_SEGMENTS intervals, computes Frenet frame, builds left/right vertices as a flat quad strip
- Procedural `CanvasTexture` (128×128): grey asphalt + yellow centre dashes + white edge lines, NearestFilter
- Point-to-point topology (t=0 start, t=1 finish)
- Boundary: project player onto centreline → Frenet binormal → lateral offset clamp
- Y-snap: raycast down onto track ribbon mesh; face normal → bike tilt

## Rendering (PS1 Pipeline)
- `WebGLRenderTarget` 480×270 → NearestFilter fullscreen quad blit
- `antialias: false`, all textures `NearestFilter`, no mipmaps
- `THREE.Fog(0x1a0a2e, 30, 180)` — dark purple fog
- Clear colour same as fog
- CSS `image-rendering: pixelated` on canvas
- Gradient shader skybox: warm brown horizon → dark purple zenith

## Lighting
- Ambient: `0x8877aa` intensity 1.2
- Directional: `0xffddaa` intensity 1.5, position (50, 80, 30)
- Fill: `0x334455` intensity 0.5, position (-20, -10, -30)

## Camera
- Two modes: CHASE (behind+above, dist=6, height=5) and OTS (right offset, lower)
- Toggle: C key
- Smooth lerp follow, look-ahead=8
- Shake: random offset, exponential decay (CAM_SHAKE_DECAY=3.0)
- FOV punch: brief narrow FOV on kick impact

## Player/Vehicle
- Kinematic: acceleration → velocity → position integration (no forces)
- Drag: vel *= 0.98 per frame
- Speed-dependent steering: grip degrades at high speed
- Visual lean: up to 0.45 rad into turns
- Raycasted ground contact + normal alignment
- Hit mechanic: damage + HIT_SPEED_PENALTY (0.7×) + HIT_STUN_DURATION (0.3s)
- Attack animation: rightArm rotation for punch/kick (0.3s/0.35s duration)

## Input System
- Action-based abstraction over raw keyCodes
- Multiple keys can map to same action (WASD + arrows) — uses OR logic
- `poll()` called per physics tick — provides `isHeld()` + `justPressed()`
- Bindings: W/Up=accel, S/Down=brake, A/Left=turnL, D/Right=turnR, J=punch, K=kick, C=cam, Esc=pause

## Audio (Phase 1 — All Procedural)
- Engine: sawtooth oscillator → lowpass filter → gain
  - Freq: 60Hz (idle) → 200Hz (max speed)
  - Filter opens with speed (400Hz → 1600Hz)
- Wind: white noise → bandpass(800Hz) → gain, fades in at >30% speed
- Ambient: brown noise, very low gain (0.04), constant
- Punch SFX: noise burst → bandpass(900Hz) + sine(300Hz), fast decay
- Kick SFX: deeper — noise(450Hz) + sine(150Hz)
- Hit received: sine(80Hz) + noise(240Hz), 0.2s decay
- Started on first keydown/click (browser autoplay policy)

## Procedural Assets (V1)
- Bike: Box frame + Cylinder wheels + CylinderGeometry forks/exhaust
- Rider: Box torso, Cylinder limbs, Sphere head (helmet mat)
- Trees: CylinderGeo trunk (brown) + ConeGeo canopy (green) — InstancedMesh
- Rocks: DodecahedronGeometry — InstancedMesh
- Barrels: CylinderGeometry (red) — InstancedMesh
- Ground plane: 2000×2000 PlaneGeometry at y=-2, dark brown
- Road: Canvas-generated texture on ribbon BufferGeometry

## Key Bugs Fixed
1. **InputManager multi-binding bug**: when KeyW+ArrowUp both map to `accelerate`, second binding could overwrite first's held state. Fixed with per-action OR logic.
2. **ExtrudeGeometry road invisible**: open Shape path produced paper-thin side faces only. Replaced with custom ribbon BufferGeometry — much more reliable.

## File Map
```
src/core/       → Game.js, Renderer.js, InputManager.js, AssetLoader.js
src/config/     → VehicleConfig.js, GameConfig.js
src/world/      → TrackGenerator.js, TrackData.js, SceneryPlacer.js, Skybox.js
src/entities/   → PlayerController.js, BikeModel.js, AIRacer.js, AIPersonalities.js, AIRacerManager.js
src/combat/     → CombatSystem.js, HitboxManager.js
src/ui/         → HUD.js, MenuManager.js, CameraController.js
src/audio/      → AudioManager.js
src/utils/      → MathUtils.js, TrackUtils.js
docs/           → MEMORY.md, to_be_done_by_developer.md
```

## Phase Status
- [x] Phase 1 — Foundation (track + ride + audio + visuals) ✅
- [ ] Phase 2 — AI + HUD
- [ ] Phase 3 — Combat
- [ ] Phase 4 — Menus & Polish
