/**
 * AIRacerManager.js — Spawns & updates N AI racers.
 * Phase 2 implementation — stub for now.
 */

export class AIRacerManager {
    constructor() {
        this.racers = [];
    }

    /**
     * Spawn AI racers.
     * @param {number} count - number of racers (user-selected: 3, 6, or 12)
     * @param {THREE.CatmullRomCurve3} centreline
     * @param {THREE.Mesh} trackMesh
     * @param {THREE.Scene} scene
     */
    spawn(count, centreline, trackMesh, scene) {
        // Phase 2: create AIRacer instances with personalities
    }

    fixedUpdate(dt) {
        for (const racer of this.racers) {
            racer.fixedUpdate(dt);
        }
    }
}
