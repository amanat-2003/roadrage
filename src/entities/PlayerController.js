/**
 * PlayerController.js — Kinematic arcade physics for the player's bike.
 * Handles: acceleration, braking, turning, raycasting ground snap, boundary clamping.
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
     * @param {THREE.Mesh} trackMesh - the extruded road mesh for raycasting
     */
    constructor(centreline, trackMesh) {
        this.centreline = centreline;
        this.trackMesh = trackMesh;

        // Visual model
        this.bikeModel = new BikeModel();
        this.mesh = this.bikeModel.group;

        // Physics state
        this.position = new THREE.Vector3();
        this.prevPosition = new THREE.Vector3(); // for interpolation
        this.velocity = 0;           // scalar speed (units/sec)
        this.heading = 0;            // yaw angle (radians)
        this.targetLean = 0;
        this.currentLean = 0;
        this.isGrounded = true;
        this.verticalVelocity = 0;
        this.isOffRoad = false;

        // Combat state
        this.health = VEHICLE.HEALTH;
        this.stunTimer = 0;
        this.attackTimer = 0;       // >0 means attack animation is playing
        this.attackType = null;     // 'punch' or 'kick'

        // Progress tracking
        this.trackT = 0;            // parameter on centreline [0, 1]
        this.finished = false;

        // Place at start
        this._initPosition();
    }

    _initPosition() {
        const startPoint = this.centreline.getPointAt(0);
        const tangent = this.centreline.getTangentAt(0);

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
        this.prevPosition.copy(this.position);

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

        // Off-road penalty
        if (this.isOffRoad) {
            this.velocity *= VEHICLE.OFF_ROAD_PENALTY;
        }

        // Clamp speed
        this.velocity = clamp(this.velocity, -10, VEHICLE.MAX_SPEED);

        // ── Steering ──
        const speedFactor = clamp(this.velocity / VEHICLE.MAX_SPEED, 0, 1);
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
            Math.sin(this.heading),
            0,
            Math.cos(this.heading)
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

            // Align to surface normal for hill tilt
            // (we store the normal for CameraController too)
            this._surfaceNormal = hit.face.normal.clone().transformDirection(this.trackMesh.matrixWorld);
        } else {
            this.isGrounded = false;
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
        if (this.trackT >= 0.99 && !this.finished) {
            this.finished = true;
        }

        // ── Attack animation timer ──
        if (this.attackTimer > 0) {
            this.attackTimer -= dt;
            const progress = 1 - (this.attackTimer / 0.3);
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
     * Interpolate visual position for smooth rendering.
     * @param {number} alpha - interpolation factor
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
            // TODO: Game over state
        }
    }

    /**
     * Get the forward direction vector.
     * @returns {THREE.Vector3}
     */
    getForward() {
        return new THREE.Vector3(
            Math.sin(this.heading),
            0,
            Math.cos(this.heading)
        );
    }
}
