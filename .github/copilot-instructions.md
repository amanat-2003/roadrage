# Roadrage Project Guidelines

## Code Style

- Vanilla JavaScript (ES6+ Modules), no TypeScript.
- Utilize JSDoc comments for class and method documentation.
- See `src/core/Game.js` for an example of component orchestration and structured systems.

## Architecture

- **Rendering:** Three.js (r170+) based, using Vite for bundling.
- **Physics:** Custom kinematic physics rather than an external physics engine.
- **Audio:** Native Web Audio API for procedural sound (see `src/audio/AudioManager.js`).
- **Structure:**
  - `src/core/`: Bootstrapping, rendering, input, and main game loop.
  - `src/entities/`: Player and AI racer logic.
  - `src/world/`: Procedural track generation and scenery placement.
  - `src/config/`: Centralized tuning parameters.

## Build and Run

- **Development Server:** `npm run dev` (starts Vite)
- **Production Build:** `npm run build`
- **Preview:** `npm run preview`
- Node v24.7.0+ is required.

## Conventions

- **Link, Don't Duplicate:** Rely on existing docs. For system architecture, rendering pipeline, and object interactions, always check [docs/MEMORY.md](docs/MEMORY.md) first.
- **Asset Pipeline Upgrades:** The game currently uses primitive/procedural V1 assets. When migrating to final GLTF/GLB formats, real audio, or textures, adhere strictly to the steps defined in [docs/to_be_done_by_developer.md](docs/to_be_done_by_developer.md).
- **No Physics Engines:** Do not introduce Ammo.js, Cannon.js, or similar. All collision and movement logic remains custom/kinematic.
