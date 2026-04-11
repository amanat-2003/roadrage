/**
 * PlayerController.js — Kinematic arcade physics for the player's bike.
 * Handles: acceleration, braking, turning, raycasting ground snap, boundary clamping.
 * Edge cases: off-road recovery, finish line detection, wrong-way detection.
 */
import * as THREE from 'three';
import { VEHICLE } from '../config/VehicleConfig.js';
import { GAME } from '../config/GameConfig.js';
import { BikeModel } from './BikeModel.js';
import { Actions } from '../core/InputManager.js';
import { clampToTrack, findNearestT } from '../utils/TrackUtils.js';
import { damp, clamp } from '../utils/MathUtils.js';

const _raycaster = new THREE.Raycaster();
const _downVec = new THREE.Vector3(0, -1, 0);
const _rayOrigin = new THREE.Vector3();

export class PlayerController {
    /**
     * @param {THREE.CatmullRomCurve3} centreline
     * @param {THREE.Mesh} trackMesh - the road mesh for raycasting
     */
    constructor(centreline, trackMesh) {
        this.centreline = centreline;
        this.trackMesh = trackMesh;

        // Visual model
        this.bikeModel = new BikeModel();
        this.mesh = this.bikeModel.group;

        // Physics state
        this.position = new THREE.Vector3();
        this.prevPosition = new THREE.Vector3();
        this.velocity = 0;
        this.heading = 0;
        this.targetLean = 0;
        this.currentLean = 0;
        this.isGrounded = true;
        this.verticalVelocity = 0;
        this.isOffRoad = false;

        // Combat state
        this.health = VEHICLE.HEALTH;
        this.stunTimer = 0;
        this.attackTimer = 0;
        this.attackType = null;

        // Progress tracking
        this.trackT = 0;
        this.prevTrackT = 0;
        this.finished = false;
        this.finishTime = 0;        // time when player crossed finish
        this.isWrongWay = false;
        this.raceTime = 0;          // total elapsed race time

        // Recovery state
        this._offTrackTimer = 0;    // how long off-track
        this._fallRecoveryNeeded = false;

        // Place at start
        this._initPosition();
    }

    _initPosition() {
        const startPoint = this.centreline.getPointAt(0.01);
        const tangent = this.centreline.getTangentAt(0.01);

        this.position.copy(startPoint);
        this.position.y += VEHICLE.RIDE_HEIGHT;
        this.prevPosition.copy(this.position);

        this.heading = Math.atan2(tangent.x, tangent.z);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.heading;
    }

    /**
     * Fixed-timestep physics update.
     * @param {number} dt - fixed delta time
     * @param {import('../core/InputManager.js').InputManager} input
     */
    fixedUpdate(dt, input) {
        // Don't update physics if the race is finished
        if (this.finished) {
            // Gradually slow down after finish
            this.velocity *= 0.95;
            if (Math.abs(this.velocity) < 0.5) this.velocity = 0;

            const forward = new THREE.Vector3(
                Math.sin(this.heading), 0, Math.cos(this.heading)
            );
            this.position.addScaledVector(forward, this.velocity * dt);
            this.mesh.position.copy(this.position);
            return;
        }

        this.raceTime += dt;
        this.prevPosition.copy(this.position);
        this.prevTrackT = this.trackT;

        // Stun reduces control
        const controlFactor = this.stunTimer > 0 ? 0.3 : 1.0;
        if (this.stunTimer > 0) this.stunTimer -= dt;

        // ── Acceleration / Braking ──
        if (input.isHeld(Actions.ACCELERATE)) {
            this.velocity += VEHICLE.ACCELERATION * dt * controlFactor;
        }
        if (input.isHeld(Actions.BRAKE)) {
            this.velocity -= VEHICLE.BRAKING_FORCE * dt;
        }

        // Drag (passive slowdown)
        this.velocity *= VEHICLE.DRAG_COEFFICIENT;

        // Off-road penalty — apply once per tick, not multiplicatively
        if (this.isOffRoad) {
            // Apply a gentle braking force instead of multiplicative penalty
            this.velocity *= (1 - (1 - VEHICLE.OFF_ROAD_PENALTY) * dt * 3);
        }

        // Clamp speed
        this.velocity = clamp(this.velocity, -20, VEHICLE.MAX_SPEED);

        // ── Steering ──
        const speedFactor = clamp(Math.abs(this.velocity) / VEHICLE.MAX_SPEED, 0, 1);
        const gripFactor = 1 - speedFactor * VEHICLE.TURN_GRIP_CURVE;
        let turnInput = 0;

        if (input.isHeld(Actions.TURN_LEFT))  turnInput = 1;
        if (input.isHeld(Actions.TURN_RIGHT)) turnInput = -1;

        this.heading += turnInput * VEHICLE.TURN_SPEED * gripFactor * dt * controlFactor;

        // Visual lean
        this.targetLean = -turnInput * VEHICLE.LEAN_ANGLE_MAX * speedFactor;
        this.currentLean = damp(this.currentLean, this.targetLean, VEHICLE.LEAN_LERP_SPEED, dt);

        // ── Position integration ──
        const forward = new THREE.Vector3(
            Math.sin(this.heading), 0, Math.cos(this.heading)
        );

        this.position.addScaledVector(forward, this.velocity * dt);

        // ── Vertical: gravity or ground snap ──
        if (!this.isGrounded) {
            this.verticalVelocity += VEHICLE.GRAVITY * dt;
            this.position.y += this.verticalVelocity * dt;
        }

        // ── Raycasting — snap to track surface ──
        _rayOrigin.copy(this.position);
        _rayOrigin.y += VEHICLE.RAY_ORIGIN_OFFSET;
        _raycaster.set(_rayOrigin, _downVec);
        _raycaster.far = VEHICLE.RAY_ORIGIN_OFFSET + 10;

        const hits = _raycaster.intersectObject(this.trackMesh);
        if (hits.length > 0) {
            const hit = hits[0];
            this.position.y = hit.point.y + VEHICLE.RIDE_HEIGHT;
            this.isGrounded = true;
            this.verticalVelocity = 0;
            this._offTrackTimer = 0;
            this._fallRecoveryNeeded = false;

            this._surfaceNormal = hit.face.normal.clone().transformDirection(this.trackMesh.matrixWorld);
        } else {
            this.isGrounded = false;
            this._offTrackTimer += dt;
        }

        // ── Fall recovery — teleport back to track if fallen too far ──
        if (this.position.y < -20 || this._offTrackTimer > 2.0) {
            this._recoverToTrack();
        }

        // ── Track boundary enforcement ──
        const { clamped } = clampToTrack(
            this.position,
            this.centreline,
            GAME.ROAD_HALF_WIDTH
        );
        this.isOffRoad = clamped;

        // ── Track progress ──
        this.trackT = findNearestT(this.centreline, this.position, 100);

        // ── Wrong-way detection ──
        // If the player is moving and their trackT is decreasing, they're going backwards
        if (Math.abs(this.velocity) > 5) {
            const deltaT = this.trackT - this.prevTrackT;
            // Consider wrong way if deltaT is significantly negative (accounting for noise)
            this.isWrongWay = deltaT < -0.001;
        } else {
            this.isWrongWay = false;
        }

        // ── Finish line detection ──
        if (this.trackT >= 0.98 && !this.finished && this.velocity > 0) {
            this.finished = true;
            this.finishTime = this.raceTime;
        }

        // ── Prevent going past start line backwards ──
        if (this.trackT <= 0.005 && this.velocity < 0) {
            this.velocity = 0;
        }

        // ── Attack animation timer ──
        if (this.attackTimer > 0) {
            this.attackTimer -= dt;
            const duration = this.attackType === 'punch' ? 0.3 : 0.35;
            const progress = 1 - (this.attackTimer / duration);
            if (this.attackType === 'punch') {
                this.bikeModel.animatePunch(progress);
            } else {
                this.bikeModel.animateKick(progress);
            }
            if (this.attackTimer <= 0) {
                this.bikeModel.resetPose();
                this.attackType = null;
            }
        }

        // ── Combat input ──
        if (input.justPressed(Actions.PUNCH) && this.attackTimer <= 0) {
            this.attackTimer = 0.3;
            this.attackType = 'punch';
        }
        if (input.justPressed(Actions.KICK) && this.attackTimer <= 0) {
            this.attackTimer = 0.35;
            this.attackType = 'kick';
        }

        // ── Apply to mesh ──
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.heading;
        this.bikeModel.setLean(this.currentLean);
    }

    /**
     * Recover from falling off-track: teleport to the nearest point on centreline.
     */
    _recoverToTrack() {
        const t = clamp(this.trackT, 0.01, 0.99);
        const point = this.centreline.getPointAt(t);
        const tangent = this.centreline.getTangentAt(t);

        this.position.copy(point);
        this.position.y += VEHICLE.RIDE_HEIGHT + 1;
        this.heading = Math.atan2(tangent.x, tangent.z);
        this.velocity *= 0.3; // Severe speed penalty for recovery
        this.verticalVelocity = 0;
        this.isGrounded = true;
        this._offTrackTimer = 0;
        this._fallRecoveryNeeded = false;
    }

    /**
     * Interpolate visual position for smooth rendering.
     * @param {number} alpha
     */
    interpolate(alpha) {
        this.mesh.position.lerpVectors(this.prevPosition, this.position, alpha);
        this.mesh.rotation.y = this.heading;
    }

    /**
     * Apply damage to the player.
     * @param {number} amount
     */
    takeDamage(amount) {
        this.health -= amount;
        this.velocity *= VEHICLE.HIT_SPEED_PENALTY;
        this.stunTimer = VEHICLE.HIT_STUN_DURATION;
        if (this.health <= 0) {
            this.health = 0;
        }
    }

    /**
     * Get the forward direction vector.
     * @returns {THREE.Vector3}
     */
    getForward() {
        return new THREE.Vector3(
            Math.sin(this.heading), 0, Math.cos(this.heading)
        );
    }
}
