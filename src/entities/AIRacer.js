/**
 * AIRacer.js — Single AI opponent with path-following FSM behaviour.
 * Follows the centreline spline with personality-based speed and behavior.
 * States: RACING, ATTACKING, RECOVERING
 */
import * as THREE from 'three';
import { VEHICLE } from '../config/VehicleConfig.js';
import { GAME } from '../config/GameConfig.js';
import { PERSONALITY_CONFIGS } from './AIPersonalities.js';
import { BikeModel } from './BikeModel.js';
import { getFrenetFrame } from '../utils/TrackUtils.js';
import { clamp, randomRange, damp } from '../utils/MathUtils.js';

const AIState = {
    RACING: 'racing',
    ATTACKING: 'attacking',
    RECOVERING: 'recovering',
};

export class AIRacer {
    /**
     * @param {THREE.CatmullRomCurve3} centreline
     * @param {THREE.Mesh} trackMesh
     * @param {string} personalityKey - key into AIPersonality
     * @param {number} startT - starting position on track [0, 1]
     * @param {number} laneOffset - lateral offset from centreline (-1 to 1 normalized)
     */
    constructor(centreline, trackMesh, personalityKey, startT, laneOffset) {
        this.centreline = centreline;
        this.trackMesh = trackMesh;
        this.personality = PERSONALITY_CONFIGS[personalityKey];
        this.personalityKey = personalityKey;

        // Visual model
        this.bikeModel = new BikeModel();
        this.mesh = this.bikeModel.group;

        // Tint the rider body to personality colour
        this._applyTint(this.personality.color);

        // Path-following state
        this.trackT = startT;
        this.velocity = 0;
        this.laneOffset = laneOffset * (GAME.ROAD_HALF_WIDTH * 0.5);
        this.targetLaneOffset = this.laneOffset;
        this.heading = 0;
        this.currentLean = 0;
        this.finished = false;
        this.finishTime = 0;

        // FSM
        this.state = AIState.RACING;
        this.attackTimer = 0;
        this.attackCooldown = this._randomAttackCooldown();
        this.attackTarget = null;
        this.attackType = null;

        // Health
        this.health = VEHICLE.HEALTH;
        this.stunTimer = 0;
        this.position = new THREE.Vector3();

        // Speed variation — adds natural-looking racing
        this._baseSpeed = VEHICLE.MAX_SPEED * this.personality.speedMultiplier;
        this._speedVariation = 0;
        this._speedVariationTimer = 0;
        this._speedVariationInterval = randomRange(2, 5);

        // Place at start
        this._updateTransformFromT();
    }

    /**
     * Apply personality colour tint to rider body.
     */
    _applyTint(color) {
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                // Tint the rider torso/legs (dark meshes)
                if (child.material.color) {
                    const c = child.material.color;
                    if (c.r < 0.3 && c.g < 0.3 && c.b < 0.3) {
                        child.material = child.material.clone();
                        child.material.color.setHex(color);
                        child.material.color.multiplyScalar(0.3); // Subtle tint
                    }
                }
            }
        });
    }

    _randomAttackCooldown() {
        return randomRange(
            this.personality.attackFrequencyMin,
            this.personality.attackFrequencyMax
        );
    }

    /**
     * Fixed-timestep update.
     * @param {number} dt
     * @param {THREE.Vector3} playerPosition - for proximity-based attacks
     * @param {number} playerTrackT - player's progress for rubber-banding
     */
    fixedUpdate(dt, playerPosition, playerTrackT) {
        if (this.finished) {
            this.velocity *= 0.95;
            if (Math.abs(this.velocity) < 0.5) this.velocity = 0;
            this.trackT += (this.velocity * dt) / this.centreline.getLength();
            this.trackT = clamp(this.trackT, 0, 1);
            this._updateTransformFromT();
            return;
        }

        // Stun
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
        }
        const controlFactor = this.stunTimer > 0 ? 0.3 : 1.0;

        // ── Speed Variation (natural racing behaviour) ──
        this._speedVariationTimer += dt;
        if (this._speedVariationTimer > this._speedVariationInterval) {
            this._speedVariation = randomRange(-0.1, 0.1) * this._baseSpeed;
            this._speedVariationInterval = randomRange(2, 5);
            this._speedVariationTimer = 0;
        }

        // ── Rubber-banding ──
        // If AI is too far behind the player, speed up slightly
        // If AI is too far ahead, slow down slightly
        let rubberBand = 0;
        const tDiff = this.trackT - playerTrackT;
        if (tDiff < -0.1) {
            // Behind player — speed up
            rubberBand = Math.abs(tDiff) * 0.3 * this._baseSpeed;
        } else if (tDiff > 0.15) {
            // Far ahead — slow down a bit
            rubberBand = -tDiff * 0.15 * this._baseSpeed;
        }

        // ── Target speed ──
        const targetSpeed = clamp(
            this._baseSpeed + this._speedVariation + rubberBand,
            this._baseSpeed * 0.4,
            this._baseSpeed * 1.15
        ) * controlFactor;

        // Smooth acceleration toward target speed
        this.velocity = damp(this.velocity, targetSpeed, 3.0, dt);

        // ── Advance along track ──
        const trackLen = this.centreline.getLength();
        this.trackT += (this.velocity * dt) / trackLen;
        this.trackT = clamp(this.trackT, 0, 1);

        // ── Lane weaving ──
        // Periodically change lane offset for natural movement
        this._speedVariationTimer += dt * 0.3;
        this.targetLaneOffset = Math.sin(this._speedVariationTimer * 0.5 + this.trackT * 20) 
            * GAME.ROAD_HALF_WIDTH * 0.4;
        this.laneOffset = damp(this.laneOffset, this.targetLaneOffset, 2.0, dt);

        // ── FSM state updates ──
        switch (this.state) {
            case AIState.RACING:
                this._updateRacing(dt, playerPosition);
                break;
            case AIState.ATTACKING:
                this._updateAttacking(dt);
                break;
            case AIState.RECOVERING:
                this._updateRecovering(dt);
                break;
        }

        // ── Finish detection ──
        if (this.trackT >= 0.98 && !this.finished) {
            this.finished = true;
        }

        // ── Update visual transform ──
        this._updateTransformFromT();
    }

    _updateRacing(dt, playerPosition) {
        this.attackCooldown -= dt;
        if (this.attackCooldown <= 0 && playerPosition) {
            const dist = this.position.distanceTo(playerPosition);
            if (dist < VEHICLE.PUNCH_RANGE * 2) {
                // Close enough — attack!
                this.state = AIState.ATTACKING;
                this.attackType = Math.random() > 0.5 ? 'punch' : 'kick';
                this.attackTimer = this.attackType === 'punch' ? 0.3 : 0.35;
            } else {
                // Not close enough, reset cooldown
                this.attackCooldown = this._randomAttackCooldown();
            }
        }
    }

    _updateAttacking(dt) {
        this.attackTimer -= dt;
        const duration = this.attackType === 'punch' ? 0.3 : 0.35;
        const progress = 1 - (this.attackTimer / duration);

        if (this.attackType === 'punch') {
            this.bikeModel.animatePunch(clamp(progress, 0, 1));
        } else {
            this.bikeModel.animateKick(clamp(progress, 0, 1));
        }

        if (this.attackTimer <= 0) {
            this.bikeModel.resetPose();
            this.attackType = null;
            this.attackCooldown = this._randomAttackCooldown();
            this.state = AIState.RACING;
        }
    }

    _updateRecovering(dt) {
        // After being hit, briefly slower and no attacks
        this.attackCooldown = Math.max(this.attackCooldown, 1.0);
        if (this.stunTimer <= 0) {
            this.state = AIState.RACING;
        }
    }

    /**
     * Position the AI mesh based on its trackT + lateral offset.
     */
    _updateTransformFromT() {
        const t = clamp(this.trackT, 0.001, 0.999);
        const frame = getFrenetFrame(this.centreline, t);

        // Position: centreline point + lateral offset
        this.position.copy(frame.point);
        this.position.addScaledVector(frame.binormal, this.laneOffset);
        this.position.y += VEHICLE.RIDE_HEIGHT;

        // Heading from tangent
        this.heading = Math.atan2(frame.tangent.x, frame.tangent.z);

        // Visual lean based on lane drift
        const laneChangeRate = (this.targetLaneOffset - this.laneOffset);
        const speedFactor = clamp(this.velocity / this._baseSpeed, 0, 1);
        const targetLean = -Math.sign(laneChangeRate) * 0.15 * speedFactor;
        this.currentLean = damp(this.currentLean, targetLean, 4.0, 1/60);

        // Apply to mesh
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.heading;
        this.bikeModel.setLean(this.currentLean);
    }

    /**
     * Take damage from combat.
     */
    takeDamage(amount) {
        this.health -= amount;
        this.velocity *= VEHICLE.HIT_SPEED_PENALTY;
        this.stunTimer = VEHICLE.HIT_STUN_DURATION * 1.5; // AI stuns slightly longer
        this.state = AIState.RECOVERING;
        if (this.health <= 0) {
            this.health = 0;
        }
    }
}
