# Roadrage Repository — Comprehensive Beginner-to-Advanced Explanation

This document explains the repository in depth for someone new to **Three.js** and **game development**.

It covers:
- Project structure and why files are organized this way
- Core technologies and how they interact
- Full runtime flow from page load to each frame
- Detailed file-by-file walkthrough, including line-by-line intent (grouped by closely related lines)

---

## 1) What this project is

Roadrage is a browser game built with:
- **Vanilla JavaScript (ES modules)**
- **Three.js** for 3D rendering
- **Vite** for dev/build tooling
- **Web Audio API** for generated game audio
- **Custom kinematic math** (no physics engine)

This makes it a great learning codebase because most core systems are explicit and readable.

---

## 2) Repository structure

At root:
- `index.html` → browser entry HTML
- `package.json` → scripts and dependencies
- `src/` → all gameplay/runtime source code
- `docs/` → design memory and roadmap notes

Inside `src/`:
- `main.js` → app bootstrap
- `core/` → game loop, rendering, input, loading
- `config/` → constants/tuning values
- `world/` → track, sky, scenery generation
- `entities/` → player bike + AI bikes
- `ui/` → camera system + HUD overlay
- `audio/` → procedural sound
- `utils/` → math and track helper functions
- `combat/` → combat architecture stubs for future phase

Why this organization is good:
- **core** orchestrates, but gameplay logic is split into domain modules
- **config** centralizes values so tuning does not require hunting across files
- **utils** avoids code duplication in math-heavy systems

---

## 3) Key technologies used

### Three.js
Used for:
- scene graph (`Scene`, `Group`, `Mesh`)
- camera (`PerspectiveCamera`, `OrthographicCamera`)
- geometry/materials (`BoxGeometry`, `MeshLambertMaterial`, etc.)
- custom geometry (`BufferGeometry`) for procedural road
- curve math (`CatmullRomCurve3`) for track centerline

### Vite
Used for:
- dev server (`npm run dev`)
- production bundling (`npm run build`)
- native ES module workflow

### Web Audio API
Used for synthesis-only audio:
- oscillator for engine tone
- noise buffers for wind/ambient/impact
- filters + gains for shaping sound

### Kinematic movement (no physics engine)
Movement is done with direct math:
- velocity and heading updates
- position integration
- manual gravity/raycast snap
- manual track boundary clamp

This is simpler to learn than a rigidbody engine and reveals all movement math.

---

## 4) High-level execution flow

1. Browser loads `index.html`.
2. `index.html` loads `/src/main.js` as an ES module.
3. `main.js` creates `new Game()` and calls `game.init()`.
4. `Game.init()` builds world + systems (lights, track, scenery, sky, player, AI, audio hooks).
5. `requestAnimationFrame` starts `_loop`.
6. `_loop` runs fixed-step simulation:
   - poll input
   - update player
   - update AI
   - update audio state
7. Render interpolation smooths visual movement.
8. Camera updates.
9. Renderer draws low-resolution retro frame.
10. HUD overlays gameplay telemetry.

---

## 5) Core concepts you should learn from this codebase

### A) Fixed timestep simulation
Physics uses `GAME.FIXED_STEP` (`1/60`) regardless of monitor FPS.
- Advantage: deterministic and stable gameplay feel.
- Implemented using accumulator loop in `Game._loop`.

### B) Interpolation for smooth rendering
Simulation runs in fixed chunks, rendering may occur between chunks.
- `alpha = accumulator / FIXED_STEP`
- visual position is interpolated between previous and current simulation states

### C) Curve-based track navigation
The road is represented by a spline (`CatmullRomCurve3`).
- progress is parameter `t` in `[0, 1]`
- lateral offsets are computed from Frenet-like frame (tangent/binormal/normal)

### D) Retro rendering pipeline
Renderer first renders to a tiny internal target (`480x270`), then upscales with nearest filtering.
- Gives pixelated PS1-like look
- independent from actual screen resolution

---

## 6) File-by-file detailed walkthrough

> Note: “line-by-line” is provided in tightly grouped ranges so related statements are explained together while still preserving precise flow.

---

## `index.html` (13 lines)

- **L1**: declares HTML5 doctype.
- **L2**: language metadata (`en`).
- **L3–8**: head metadata:
  - charset, viewport for responsive full-screen canvas
  - title/description for browser/SEO clarity
- **L9–12**:
  - `#game-container` is the mount point for Three.js renderer canvas
  - module script loads `/src/main.js`
- **L13**: closes document.

Role: minimal shell that hands control to JS app.

---

## `src/main.js` (9 lines)

- **L1–3**: JSDoc banner comment.
- **L4**: imports `Game` orchestrator class.
- **L5**: imports global CSS.
- **L7**: “Boot” comment.
- **L8**: instantiate game object.
- **L9**: call `init()` to build systems and start loop.

Role: single bootstrap file.

---

## `src/style.css` (34 lines)

- **L1**: file purpose comment.
- **L3–7**: global reset (`margin/padding/box-sizing`).
- **L9–18**: make body full-screen and non-scrollable, black background, prevent accidental selection.
- **L20–26**: container pinned to viewport.
- **L28–34**: canvas fills viewport; `image-rendering: pixelated/crisp-edges` preserves retro upscale.

Role: enforce full-screen game presentation and pixel-art output behavior.

---

## `package.json`

- scripts:
  - `dev`: run Vite server
  - `build`: production bundle
  - `preview`: preview build
- dependencies:
  - `three`
  - `lil-gui` (installed, currently not used in runtime wiring)

---

## `src/config/GameConfig.js`

- **L6–28** exports `GAME` constants used globally.
- Key groups:
  - Physics: fixed step, max substeps
  - Rendering: internal retro resolution + fog/clear color
  - Track: width and segment count
  - Scenery: density + spread ranges

Why important: avoids magic numbers in gameplay files.

---

## `src/config/VehicleConfig.js`

- **L6–47** exports `VEHICLE` constants:
  - speed/accel/braking/drag
  - steering and lean behavior
  - vertical contact/gravity
  - combat numbers (damage/range/stun)
  - camera follow and shake settings
  - OTS offsets

This file is your main tuning panel for “feel”.

---

## `src/core/Renderer.js`

### What it does
Creates a **two-pass** render path:
1) world render into low-res `WebGLRenderTarget`
2) fullscreen quad blit to screen

### Line flow
- **L5–6** imports Three.js and `GAME` constants.
- **L8** defines `Renderer` class.
- **L12–25** constructor:
  - stores container
  - creates `WebGLRenderer` with `antialias: false`
  - fixes pixel ratio at 1
  - sets viewport to browser size and clear color
  - disables shadow maps for retro style/perf
  - appends canvas to DOM
- **L27–35** creates low-res render target using nearest filtering.
- **L38–45** builds blit scene:
  - orthographic camera
  - fullscreen plane with render target texture
- **L48** resize listener.
- **L56–64** `render(scene, camera)`:
  - pass 1: render world to target
  - pass 2: render fullscreen quad to actual screen
- **L69–71** `_onResize` updates output canvas size only.
- **L76–78** getter for raw renderer if needed.
- **L80–84** cleanup `dispose`.

---

## `src/core/InputManager.js`

### What it does
Converts keyboard events into **game actions** (`accelerate`, `kick`, etc.) with:
- held state
- just-pressed edge state

### Line flow
- **L7–16** defines action constants.
- **L19–32** maps key codes to actions (WASD + arrows, J/K, C, Esc).
- **L35–57** constructor:
  - creates maps for held/justPressed/rawDown
  - copies bindings
  - initializes actions to false
  - binds key handlers
  - attaches listeners
- **L62–88** `poll()`:
  - clears justPressed each physics tick
  - recomputes per-action raw state via OR across mapped keys
  - detects rising edges (`raw && !wasHeld`)
  - updates held map
- **L95–97** `isHeld(action)`
- **L104–106** `justPressed(action)`
- **L109–115** `_onKeyDown`: sets raw key true + prevent default for mapped keys
- **L118–120** `_onKeyUp`: sets raw key false
- **L122–125** remove listeners in `dispose`

Why this matters: gameplay code stays independent from keyboard details.

---

## `src/core/AssetLoader.js`

### What it does
Caching loader abstraction for future model/texture pipeline.

### Line flow
- **L8–12** create `TextureLoader` and maps.
- **L19–30** `loadTexture(path)`:
  - returns cached texture if already loaded
  - otherwise loads texture, applies nearest filtering/no mipmaps, caches it
- **L37–44** `loadModel(path)` stub with warning (planned GLTF support).

Currently not central to runtime, but useful for future asset migration.

---

## `src/world/TrackData.js`

- **L12–30** defines static control points (`Vector3`) for track path.
- **L35–37** exports accessor `getTrackPoints()`.

Think of this as the authored “road skeleton”.

---

## `src/world/TrackGenerator.js`

### What it does
Builds complete track world objects:
- centerline spline
- road mesh ribbon
- procedural road texture
- ground plane
- start/finish banners

### Line flow
- **L10–21** constructor fields: curve, track mesh, root group, markers.
- **L27–43** `generate()`:
  - gets control points
  - creates `CatmullRomCurve3` (open track)
  - builds road/ground/markers
  - returns grouped object

#### `_buildRoadMesh()` (L48–111)
- prepares arrays for positions/normals/uvs/indices
- loops from `i=0..segments`:
  - compute `t`, point, tangent
  - compute lateral `binormal = tangent × worldUp`
  - compute surface normal `normal = binormal × tangent`
  - generate left/right edge vertices offset by half width
  - append vertex attributes
  - append indices for two triangles per segment strip
- builds `BufferGeometry` with attributes and index
- creates mesh with lambert material and procedural texture
- stores `trackMesh` and adds to group

#### `_createRoadTexture()` (L117–156)
- creates 128x128 canvas
- paints asphalt base
- adds random grain dots
- paints center dashed line and white edges
- wraps into `CanvasTexture`, sets repeat and nearest filtering

#### `_buildGroundPlane()` (L161–171)
- creates large dark plane under road to avoid “floating in void” look.

#### `_buildMarkers()` + `_createBanner()` (L176–225)
- samples start/end points from curve
- creates simple arch structures from primitives
- rotates banners to track tangent direction

This file is a key procedural-generation example.

---

## `src/world/SceneryPlacer.js`

### What it does
Places roadside props efficiently via `InstancedMesh`.

### Line flow
- **L13–16** constructor stores centerline and group.
- **L22–30** `generate()` computes sample count by track length and density, then places trees/rocks/barriers.

#### `_placeTrees(count)`
- creates trunk and canopy geometry/materials
- creates instanced meshes for both
- for each instance:
  - random `t` on curve
  - computes binormal (left/right direction)
  - picks side, distance, scale
  - places/rotates/scales trunk and canopy matrices
- marks instance matrices dirty and adds to scene group

#### `_placeRocks(count)`
- similar pattern with dodecahedron geometry and squat random scaling.

#### `_placeBarriers(count)`
- places cylinder barrels near road edge (`ROAD_HALF_WIDTH + random`).

Advanced concept shown: batching many objects with low draw-call cost.

---

## `src/world/Skybox.js`

### What it does
Creates a giant inward-facing sphere with gradient shader sky.

### Line flow
- **L13** sphere geometry (radius 500).
- **L15–51** shader material:
  - uniforms for top/horizon/bottom colors
  - vertex shader passes world position
  - fragment shader mixes colors based on normalized vertical direction
  - `BackSide` draws inside of sphere
  - `depthWrite: false` avoids depth interference
- **L53–55** returns mesh with low render order so sky renders as background.

Great starter shader example.

---

## `src/entities/BikeModel.js`

### What it does
Procedural low-poly bike+rider mesh and simple combat animation hooks.

### Line flow
- **L9–22** constructor creates root/rider groups, arm references, calls `_build()`.
- **L24–141** `_build()`:
  - creates materials
  - builds bike parts (body, tank, wheels, fork, handlebar, exhaust, seat)
  - builds rider parts (torso, head, arms, legs)
  - stores default arm rotation
- **L147–151** `animatePunch(progress)` sinusoidal arm swing.
- **L157–161** `animateKick(progress)` different swing profile.
- **L166–171** `resetPose()` returns arms to riding pose.
- **L177–179** `setLean(angle)` rotates whole group about Z.
- **L185–188** `setColor(color)` tints fuel tank material.

This class isolates visual representation from controller logic.

---

## `src/entities/PlayerController.js`

### What it does
All player movement/gameplay state:
- acceleration, braking, drag
- steering and lean
- gravity + raycast track snap
- track clamp and progress
- wrong-way + finish detection
- combat animation and damage state

### Line flow (major sections)
- **L14–17** reusable raycasting vectors allocated once.
- **L23–62** constructor:
  - references centerline and track mesh
  - creates bike model and mesh
  - initializes physics/combat/progress/recovery state
  - calls `_initPosition`

#### `_initPosition()` (L64–75)
- samples early track point (`t=0.01`), sets initial heading from tangent, sets mesh transform.

#### `fixedUpdate(dt, input)` (L82–240)
1) **finish behavior** (L83–95): if finished, coast and return early.
2) **tick state prep** (L97–104): race timer, previous state snapshots, stun factor.
3) **accel/brake** (L106–112).
4) **drag + off-road speed penalty** (L114–120).
5) **speed clamp** (L123).
6) **steering and visual lean** (L126–138).
7) **forward integration** (L140–145).
8) **vertical motion** if airborne (L147–150).
9) **raycast snap to road** (L153–171): grounded handling, surface normal capture, off-track timer.
10) **recovery trigger** (L174–176).
11) **track boundary clamp** (L179–185).
12) **progress update** via nearest spline projection (L187).
13) **wrong-way detection** using `deltaT` (L191–197).
14) **finish detection** near end of track (L200–203).
15) **block reverse past start line** (L206–208).
16) **attack animation timer and pose updates** (L211–224).
17) **combat input triggers** (L227–234).
18) **apply final transform to mesh** (L237–239).

#### `_recoverToTrack()` (L245–258)
Teleports player to nearest safe point on curve, restores stable state, applies speed penalty.

#### `interpolate(alpha)` (L264–267)
Smooth visual position between last/current physics states.

#### `takeDamage(amount)` (L273–280)
Reduces health, speed, and applies stun.

#### `getForward()` (L286–290)
Returns heading direction vector.

This file is the central gameplay math reference.

---

## `src/entities/AIPersonalities.js`

- defines personality enum keys (`aggressive/balanced/cautious`)
- maps each personality to speed/cooldown/drafting/color/name modifiers
- `getPersonalityForIndex(index,total)` ensures first 3 racers are one of each type for variety

Role: declarative AI behavior tuning table.

---

## `src/entities/AIRacer.js`

### What it does
Implements one AI rider with state machine:
- `RACING`
- `ATTACKING`
- `RECOVERING`

### Line flow
- **L14–18** internal AI state enum.
- **L28–71** constructor:
  - stores track refs/personality config
  - creates bike model and tint
  - initializes race/path state
  - initializes FSM/attack timers
  - initializes health/stun/speed variation fields
  - places at start via `_updateTransformFromT`

#### `_applyTint(color)` (L76–90)
Traverses mesh hierarchy; clones/tints dark materials to personality color.

#### `_randomAttackCooldown()` (L92–97)
Returns random cooldown in personality range.

#### `fixedUpdate(dt, playerPosition, playerTrackT)` (L105–184)
1) if finished: coast and update transform
2) stun/control factor
3) random speed variation updates
4) rubber-banding based on `trackT` gap to player
5) compute target speed and damp toward it
6) advance `trackT` by normalized distance
7) lane weaving via sinusoidal target lateral offset
8) run FSM-specific update
9) finish detection
10) refresh world transform

#### FSM helpers
- `_updateRacing` (L186–200): countdown attack cooldown, trigger attack near player
- `_updateAttacking` (L202–219): animate punch/kick and return to racing when done
- `_updateRecovering` (L221–227): temporary post-hit behavior

#### `_updateTransformFromT()` (L232–254)
- compute Frenet frame
- position = curve point + binormal*lateralOffset + rideHeight
- heading from tangent
- lean from lane-change rate
- apply mesh transform

#### `takeDamage(amount)` (L259–267)
Health reduction + speed/stun penalty + state transition to recovering.

---

## `src/entities/AIRacerManager.js`

### What it does
Owns all AI racers and scene insertion/removal.

### Line flow
- **L11–14** initializes `racers` array.
- **`spawn` (L23–48)**:
  - clears old racers
  - loops `count`
  - assigns personality
  - computes staggered start `t`
  - picks lane pattern
  - creates AIRacer and adds to scene
- **`fixedUpdate` (L56–60)** updates each racer.
- **`getPlayerPosition` (L67–80)** computes leaderboard rank by comparing `trackT`.
- **`getSortedByProgress` (L86–88)** helper sorter.
- **`dispose` (L93–98)** removes meshes and clears array.

---

## `src/ui/CameraController.js`

### What it does
Third-person camera with:
- CHASE and OTS modes
- smooth damp following
- impact shake
- FOV punch effect

### Line flow
- **L9–12** camera mode enum.
- **L18–37** constructor initializes state vectors, shake fields, FOV state.
- **L42–44** `toggleMode()` swaps modes.
- **L50–52** `shake(intensity)`.
- **L57–59** `fovPunch()` narrows target FOV.

#### `update(targetPosition, heading, speed, dt)` (L68–136)
1) compute heading sin/cos
2) choose desired camera position and look target based on mode
3) damp camera position and look target
4) apply/decay shake offset
5) damp FOV back toward base
6) write camera transform and lookAt

#### `init(position, heading)` (L141–156)
Sets immediate initial camera placement on spawn/restart.

---

## `src/ui/HUD.js`

### What it does
Renders a full-screen 2D canvas overlay with:
- speed meter
- health bar
- progress bar
- timer
- race position
- camera mode/control hints
- off-road/wrong-way warnings
- finish overlay

### Line flow
- **L8–28** constructor creates overlay canvas, appends to body, tracks wrong-way flash phase.
- **L30–33** resize helper.
- **L38–43** `_formatTime` (`M:SS.t`).
- **L48–52** `_ordinal` helper (`1st`, `2nd`, etc.).

#### `render(data)` (L69–248)
- clears canvas and sets dynamic font
- draws speed bar bottom-left
- draws health bar bottom-right
- draws progress top-center with START/FINISH labels
- draws timer bottom-center
- draws race placement text
- draws camera mode + controls hints
- conditionally draws off-road warning
- conditionally draws flashing wrong-way overlay
- conditionally draws finish screen overlay and restart hint

- **L250–252** `dispose` removes canvas.

---

## `src/audio/AudioManager.js`

### What it does
Procedural audio engine with persistent ambient layers and one-shot impacts.

### Line flow
- **L10–28** constructor initializes handles/flags.
- **`start` (L34–43)**: creates `AudioContext`, initializes subsystems once.

#### `_initEngine` (L49–66)
- saw oscillator + lowpass filter + gain to destination.

#### `_initWind` (L71–95)
- generates white noise buffer, loops through bandpass and gain.

#### `_initAmbient` (L100–122)
- generates brown noise-like signal for low background rumble.

#### `update(speed,maxSpeed)` (L130–155)
- normalizes speed
- maps speed to engine frequency/filter/volume
- maps higher speed to wind volume

#### one-shot effects
- `playPunch` (L160–163)
- `playKick` (L168–171)
- `playHitReceived` (L176–179)
- all call `_playImpact(freq,vol,duration)` (L187–229):
  - creates decaying filtered noise burst
  - adds sine thud component

- **`resume` (L234–238)** handles suspended audio context from browser policies.
- **`dispose` (L240–244)** closes context.

---

## `src/utils/MathUtils.js`

Small shared primitives:
- `lerp(a,b,t)`
- `clamp(value,min,max)`
- `remap(value,inMin,inMax,outMin,outMax)`
- `damp(current,target,smoothing,dt)` (frame-rate independent smoothing)
- `randomRange(min,max)`
- `randomInt(min,max)`

These functions are foundational in movement/camera/AI smoothing.

---

## `src/utils/TrackUtils.js`

### What it does
Track-space math utilities.

### Line flow
- module-scope temp vectors reduce garbage allocations.
- `findNearestT(curve, position, samples=200)`:
  - coarse sweep over `t`
  - local ternary-style refinement iterations
  - returns approximate nearest `t`
- `getFrenetFrame(curve,t)`:
  - computes `point`, normalized tangent, binormal from cross product, fallback for near-vertical tangent, then normal
- `getLateralOffset(curve, position, t)`:
  - projects vector from curve point to object onto binormal
- `clampToTrack(position, curve, halfWidth)`:
  - finds nearest `t`
  - computes lateral offset
  - pushes position back toward centerline if outside road width

This file is mathematically central to road-following behavior.

---

## `src/combat/CombatSystem.js` and `src/combat/HitboxManager.js`

Both are scaffolding stubs for future phase:
- `CombatSystem` currently only stores registered entities
- `fixedUpdate` has TODO for overlap/damage resolution
- `HitboxManager` defines storage and TODO overlap resolution method

These indicate planned architecture rather than active runtime logic.

---

## `src/core/Game.js` — Full orchestration flow (most important)

### Constructor (`L25–65`)
Creates and wires almost every runtime system:
- DOM container, Three scene + fog
- perspective camera
- renderer/input/audio/HUD
- camera controller
- world placeholders
- AI manager
- loop timing fields
- audio start flag
- binds `_loop` for requestAnimationFrame callback safety

### `init()` (`L70–128`)
1. Add ambient/key/fill lights.
2. Build procedural track and add to scene.
3. Build scenery and sky and add to scene.
4. Spawn player and AI racers.
5. Register first-interaction listeners to satisfy browser audio policy.
6. Register restart key (`R`) post-finish.
7. Initialize timer and start frame loop.

### `_loop(now)` (`L157–240`)
1. Queue next frame immediately.
2. Compute frame delta with cap (`0.1s`) to avoid giant jumps.
3. Accumulate elapsed time.
4. Clamp accumulator by max substeps to avoid spiral-of-death.
5. While enough accumulated time exists:
   - poll input
   - handle camera toggle
   - trigger combat SFX/camera shake/fov punch
   - update player physics
   - update AI physics
   - update procedural audio by player speed
   - consume one fixed step from accumulator
6. Compute interpolation alpha.
7. Interpolate player visual.
8. Update camera follow.
9. Render frame via retro renderer.
10. Compute player race position from AI manager.
11. Render HUD with all current state.

This method is the complete real-time game pipeline.

---

## 7) Data ownership and interactions

- `Game` owns top-level lifecycle and cross-system calls.
- `PlayerController` owns player state.
- `AIRacerManager` owns AI collection; each `AIRacer` owns its state.
- `TrackGenerator` owns generated track mesh and centerline.
- `CameraController` owns camera behavior.
- `AudioManager` owns audio graph lifecycle.
- `HUD` owns overlay rendering.

Pattern used: **composition over inheritance**.

---

## 8) Beginner learning roadmap using this repository

1. Start with `main.js` and `Game.js` to understand orchestration.
2. Then read `PlayerController.js` + `TrackUtils.js` to learn movement math.
3. Read `TrackGenerator.js` to learn procedural geometry.
4. Read `Renderer.js` to learn custom render pipelines.
5. Read `CameraController.js` and `HUD.js` to learn polish systems.
6. Read `AIRacer.js` for basic AI state machine + rubber-banding.
7. Read `AudioManager.js` for practical Web Audio synthesis.

---

## 9) Advanced notes and design tradeoffs

- **No physics engine**: easier to reason about, less realistic collisions.
- **Spline + nearest-t search**: simple and robust for arcade racer tracks.
- **InstancedMesh scenery**: large visual density at low CPU/GPU cost.
- **Fixed-step simulation**: stable gameplay across hardware.
- **Two-pass pixelation**: cheap retro style with predictable output.
- **Procedural audio**: no asset management overhead; highly dynamic but less realistic.

---

## 10) Quick reference map

- Boot: `src/main.js`
- Main loop: `src/core/Game.js`
- Render pipeline: `src/core/Renderer.js`
- Input actions: `src/core/InputManager.js`
- Track generation: `src/world/TrackGenerator.js`
- Track math: `src/utils/TrackUtils.js`
- Player movement/combat: `src/entities/PlayerController.js`
- AI: `src/entities/AIRacer.js` + `AIRacerManager.js`
- Camera: `src/ui/CameraController.js`
- HUD: `src/ui/HUD.js`
- Audio: `src/audio/AudioManager.js`
- Tunables: `src/config/*.js`

---

If you want, next I can generate a **second companion file** with true literal per-line annotation (`L1`, `L2`, `L3`...) for one file at a time (starting with `Game.js`), so you can study it like a textbook.
