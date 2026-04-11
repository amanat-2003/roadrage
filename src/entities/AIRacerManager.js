/**
 * AIRacerManager.js — Spawns & updates N AI racers.
 * Handles staggered starting positions and passes player data for proximity logic.
 */
import * as THREE from 'three';
import { AIRacer } from './AIRacer.js';
import { getPersonalityForIndex } from './AIPersonalities.js';
import { GAME } from '../config/GameConfig.js';

export class AIRacerManager {
    constructor() {
        /** @type {AIRacer[]} */
        this.racers = [];
    }

    /**
     * Spawn AI racers at staggered positions behind the start line.
     * @param {number} count - number of racers (3, 6, or 12)
     * @param {THREE.CatmullRomCurve3} centreline
     * @param {THREE.Mesh} trackMesh
     * @param {THREE.Scene} scene
     */
    spawn(count, centreline, trackMesh, scene) {
        this.dispose(scene);

        for (let i = 0; i < count; i++) {
            const personality = getPersonalityForIndex(i, count);

            // Stagger starts: first AI at t=0.005, each subsequent further back
            // with slight lateral offsets for visual variety
            const startT = 0.005 + (i * 0.003);

            // Alternate lane positions: left-centre-right
            const lanePatterns = [-0.6, 0.6, -0.3, 0.3, 0, -0.8, 0.8, -0.1, 0.1, -0.5, 0.5, 0];
            const laneOffset = lanePatterns[i % lanePatterns.length];

            const racer = new AIRacer(
                centreline,
                trackMesh,
                personality,
                startT,
                laneOffset
            );

            this.racers.push(racer);
            scene.add(racer.mesh);
        }
    }

    /**
     * Update all AI racers.
     * @param {number} dt - fixed timestep
     * @param {THREE.Vector3} playerPosition
     * @param {number} playerTrackT
     */
    fixedUpdate(dt, playerPosition, playerTrackT) {
        for (const racer of this.racers) {
            racer.fixedUpdate(dt, playerPosition, playerTrackT);
        }
    }

    /**
     * Get the sorted positions of all racers (including player) for leaderboard.
     * @param {number} playerTrackT - player's progress [0,1]
     * @returns {{ position: number, totalRacers: number }}
     */
    getPlayerPosition(playerTrackT) {
        let position = 1; // start at 1st place

        for (const racer of this.racers) {
            if (racer.trackT > playerTrackT) {
                position++;
            }
        }

        return {
            position,
            totalRacers: this.racers.length + 1, // +1 for player
        };
    }

    /**
     * Get all racers sorted by track progress (descending = 1st place first).
     * @returns {AIRacer[]}
     */
    getSortedByProgress() {
        return [...this.racers].sort((a, b) => b.trackT - a.trackT);
    }

    /**
     * Clean up all AI racers from the scene.
     */
    dispose(scene) {
        for (const racer of this.racers) {
            scene.remove(racer.mesh);
        }
        this.racers = [];
    }
}
