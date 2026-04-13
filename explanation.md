# Roadrage - Full Project Explanation and Flow

Roadrage is a retro-style motorcycle racing game built from scratch using **Vanilla JavaScript** and **Three.js**. It intentionally avoids heavy external libraries (no physics engines like Cannon.js or Ammo.js) to keep the codebase educational, performant, and deeply customizable.

This document serves as a comprehensive guide to understanding the code execution flow and the various systems that power the game.

---

## 1. Project Architecture & Setup

The project follows a modular, object-oriented approach. 
- **Bundler:** Vite
- **Graphics:** Three.js (r170+)
- **Audio:** Native Web Audio API
- **Physics:** Custom Kinematic Physics (Math-based, no external engine)

### Directory Structure
```
src/
├── main.js                 # Entry point
├── core/                   # Game Loop, Rendering, Input
├── entities/               # Player, AI Racers, Vehicles
├── world/                  # Procedural Track & Scenery Generation
├── audio/                  # Web Audio API implementation
├── ui/                     # HUD and Camera
└── config/                 # Tuning constants (Speed, UI, etc.)
```

---

## 2. Bootstrapping & The Core Loop

### Entry Point (`src/main.js`)
When you run the game, the browser executes `main.js`. Its only job is to import the `Game` class, instantiate it, and call `init()`.

```javascript
import { Game } from './core/Game.js';
import './style.css';

const game = new Game();
game.init(); 
```

### The Master Orchestrator (`src/core/Game.js`)
`Game.js` handles all the "wiring".
1. **`constructor()`**: Creates the Three.js `Scene`, `Camera`, custom `Renderer`, and instantiates all the sub-systems (Player, AI, Audio, HUD).
2. **`init()`**: Adds lights to the scene, tells the `TrackGenerator` to build the world, spawns the entities, and kicks off the `_loop`.

### The Fixed-Timestep Game Loop
This is the heartbeat of the game. Because monitors have different refresh rates (60Hz, 144Hz, etc.), applying physics based purely on frame time causes inconsistencies. 

Instead, Roadrage uses an **Accumulator Pattern**:
```javascript
_loop(now) {
    requestAnimationFrame(this._loop);

    // Calculate time passed since last frame
    const rawDelta = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;
    this._accumulator += rawDelta;

    // Run PHYSICS firmly at 60Hz (measured in GAME.FIXED_STEP)
    while (this._accumulator >= GAME.FIXED_STEP) {
        this.input.poll(); // 1. Check keyboard
        this.player.fixedUpdate(GAME.FIXED_STEP, this.input); // 2. Move player
        this.aiManager.fixedUpdate(GAME.FIXED_STEP, ...); // 3. Move AI
        this._accumulator -= GAME.FIXED_STEP;
    }

    // Smooth out visuals between physics ticks
    const alpha = this._accumulator / GAME.FIXED_STEP;
    this.player.interpolate(alpha);

    // 4. Draw the 3D frame
    this.renderer.render(this.scene, this.camera);
}
```

---

## 3. Retro Rendering Pipeline (`src/core/Renderer.js`)

Roadrage specifically targets a retro "PS1" look. Modern Three.js defaults to smooth, high-resolution rendering. To achieve the pixelated look:

1. The game disables Anti-Aliasing (`antialias: false`).
2. Instead of drawing directly to your 1080p or 4K screen, it draws to a tiny internal canvas (a `WebGLRenderTarget`) sized roughly 480x270.
3. It then takes that tiny image and scales it up to fit your screen using `NearestFilter` (which preserves the hard pixel edges instead of blurring them).

```javascript
// Render scene to a tiny hidden screen (Pass 1)
this.renderer.setRenderTarget(this.renderTarget);
this.renderer.render(scene, camera);

// Blit (copy) that tiny screen onto your monitor without blurring (Pass 2)
this.renderer.setRenderTarget(null);
this.renderer.render(this.quadScene, this.quadCamera);
```

---

## 4. Track Generation (`src/world/TrackGenerator.js`)

The track is not a 3D model loaded from Blender. It is procedurally generated using math!

1. **The Curve:** The game takes an array of 3D coordinates (`TrackData.js`) and connects them using a mathematical spline (`Three.CatmullRomCurve3`). This gives us a perfectly smooth invisible line through the 3D space.
2. **The Ribbon:** To draw the road surface, `TrackGenerator._buildRoadMesh()` "walks" along this invisible line. At every step, it calculates:
    * **Tangent:** Which way is forward?
    * **Binormal:** Which way is left/right? (Calculated via Cross Product)
    * **Normal:** Which way is UP from the track surface?
3. It pushes vertices to the left and right of the invisible line to create a flat "Ribbon" of polygons using `BufferGeometry`.

```javascript
// Example of extracting the track's lateral shape
const tangent = centreline.getTangentAt(t).normalize();
const binormal = new THREE.Vector3().crossVectors(tangent, worldUp).normalize();

// Push left vertex and right vertex out from the centreline
const left = point.clone().addScaledVector(binormal, -halfW);
const right = point.clone().addScaledVector(binormal, halfW);
```
Finally, a texture is drawn directly using an HTML Javascript `Canvas` (Asphalt grey + yellow centre dashes) and wrapped over this ribbon.

---

## 5. Kinematic Physics (`src/entities/PlayerController.js`)

Because we use no physics engine, the bike movement is pure math.
In `fixedUpdate` (which runs exactly 60 times a second):

1. **Acceleration & Braking:**
   ```javascript
   if (input.isHeld(Actions.ACCELERATE)) this.acceleration += VEHICLE.ACCELERATION_POWER;
   ```
2. **Friction / Drag:** Speed multiplied by ~0.98 every frame, so if you let go of gas, you slow down automatically.
   ```javascript
   this.velocity *= VEHICLE.DRAG; 
   ```
3. **Steering:** Steering pushes the bike along the `Binormal` (left/right) of the track based on speed. Slower speeds allow sharper turns, simulating grip loss.
4. **Track Snapping:** Instead of complex collision detecting against the 3D road polygons, the game calculates where the player *should* be mathematically on the `CatmullRomCurve` using a parameter called `trackT` (0.0 is the start line, 1.0 is the finish line).

---

## 6. Procedural Audio (`src/audio/AudioManager.js`)

Instead of loading `.mp3` files, all sound is generated entirely via code using the **Web Audio API**.
* **Engine Sound:** Uses a "Sawtooth" oscillator. As your `velocity` increases in `fixedUpdate`, the script increases the `frequency` (pitch) of the oscillator, mimicking engine RPMs.
* **Wind Sound:** Generates "White Noise" and runs it through a filter as you hit high speeds.
* **Combat Sound:** Brief bursts of heavily filtered noise simulate punching/kicking impacts.

---

## Summary of Data Flow
1. User presses 'W' -> `InputManager` registers `ACTION.ACCELERATE`.
2. `Game._loop` fires -> `PlayerController.fixedUpdate` reads 'W'.
3. Player's `velocity` increases. Math updates the player's 3D position along the `TrackGenerator`'s spline.
4. `Game._loop` updates `AudioManager` to raise engine pitch.
5. `Game._loop` updates `CameraController` to follow new player coordinates.
6. `Renderer` draws the 3D view to the low-res buffer, then scales it up to the screen.

Understanding this custom "from-scratch" approach provides an incredible foundation before scaling up to heavier engines like Unreal or Unity!