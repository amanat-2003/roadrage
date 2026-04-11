/**
 * CameraController.js — Chase cam + Over-the-Shoulder cam with combat shake.
 * Toggleable with C key. Smooth lerping follow with look-ahead.
 */
import * as THREE from 'three';
import { VEHICLE } from '../config/VehicleConfig.js';
import { damp, randomRange } from '../utils/MathUtils.js';

export const CameraMode = {
    CHASE: 'chase',
    OTS: 'ots',
};

export class CameraController {
    /**
     * @param {THREE.PerspectiveCamera} camera
     */
    constructor(camera) {
        this.camera = camera;
        this.mode = CameraMode.CHASE;

        // Smooth follow state
        this._currentPos = new THREE.Vector3();
        this._currentTarget = new THREE.Vector3();

        // Shake
        this._shakeIntensity = 0;
        this._shakeOffset = new THREE.Vector3();

        // FOV punch
        this._baseFOV = 70;
        this._currentFOV = 70;
        this._targetFOV = 70;

        this.camera.fov = this._baseFOV;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Toggle between Chase and OTS modes.
     */
    toggleMode() {
        this.mode = this.mode === CameraMode.CHASE ? CameraMode.OTS : CameraMode.CHASE;
    }

    /**
     * Trigger a combat shake.
     * @param {number} intensity - 0 to 1 scale
     */
    shake(intensity = VEHICLE.CAM_SHAKE_INTENSITY) {
        this._shakeIntensity = intensity;
    }

    /**
     * Trigger a FOV zoom punch (brief narrow FOV on impact).
     */
    fovPunch() {
        this._targetFOV = this._baseFOV - 8;
    }

    /**
     * Update camera position and orientation.
     * @param {THREE.Vector3} targetPosition - player bike position
     * @param {number} heading - player heading (yaw radians)
     * @param {number} speed - current speed for look-ahead
     * @param {number} dt - delta time
     */
    update(targetPosition, heading, speed, dt) {
        const sin = Math.sin(heading);
        const cos = Math.cos(heading);

        let desiredPos = new THREE.Vector3();
        let lookTarget = new THREE.Vector3();

        if (this.mode === CameraMode.CHASE) {
            // Behind and above
            desiredPos.set(
                targetPosition.x - sin * VEHICLE.CAM_FOLLOW_DISTANCE,
                targetPosition.y + VEHICLE.CAM_HEIGHT,
                targetPosition.z - cos * VEHICLE.CAM_FOLLOW_DISTANCE,
            );
            // Look ahead of bike
            lookTarget.set(
                targetPosition.x + sin * VEHICLE.CAM_LOOK_AHEAD,
                targetPosition.y + 1,
                targetPosition.z + cos * VEHICLE.CAM_LOOK_AHEAD,
            );
        } else {
            // Over-the-shoulder: offset to the right, lower, tighter
            const rightX = Math.cos(heading);
            const rightZ = -Math.sin(heading);

            desiredPos.set(
                targetPosition.x - sin * Math.abs(VEHICLE.OTS_OFFSET_Z) + rightX * VEHICLE.OTS_OFFSET_X,
                targetPosition.y + VEHICLE.OTS_OFFSET_Y,
                targetPosition.z - cos * Math.abs(VEHICLE.OTS_OFFSET_Z) + rightZ * VEHICLE.OTS_OFFSET_X,
            );
            lookTarget.set(
                targetPosition.x + sin * VEHICLE.CAM_LOOK_AHEAD * 0.8,
                targetPosition.y + 0.5,
                targetPosition.z + cos * VEHICLE.CAM_LOOK_AHEAD * 0.8,
            );
        }

        // Smooth follow
        this._currentPos.x = damp(this._currentPos.x, desiredPos.x, VEHICLE.CAM_LERP_SPEED, dt);
        this._currentPos.y = damp(this._currentPos.y, desiredPos.y, VEHICLE.CAM_LERP_SPEED, dt);
        this._currentPos.z = damp(this._currentPos.z, desiredPos.z, VEHICLE.CAM_LERP_SPEED, dt);

        this._currentTarget.x = damp(this._currentTarget.x, lookTarget.x, VEHICLE.CAM_LERP_SPEED * 1.5, dt);
        this._currentTarget.y = damp(this._currentTarget.y, lookTarget.y, VEHICLE.CAM_LERP_SPEED * 1.5, dt);
        this._currentTarget.z = damp(this._currentTarget.z, lookTarget.z, VEHICLE.CAM_LERP_SPEED * 1.5, dt);

        // Shake decay
        if (this._shakeIntensity > 0.001) {
            this._shakeOffset.set(
                randomRange(-1, 1) * this._shakeIntensity,
                randomRange(-1, 1) * this._shakeIntensity * 0.5,
                randomRange(-1, 1) * this._shakeIntensity * 0.3,
            );
            this._shakeIntensity *= Math.exp(-VEHICLE.CAM_SHAKE_DECAY * dt);
        } else {
            this._shakeOffset.set(0, 0, 0);
            this._shakeIntensity = 0;
        }

        // FOV lerp back to base
        this._targetFOV = damp(this._targetFOV, this._baseFOV, 4.0, dt);
        this._currentFOV = damp(this._currentFOV, this._targetFOV, 8.0, dt);
        this.camera.fov = this._currentFOV;
        this.camera.updateProjectionMatrix();

        // Apply
        this.camera.position.copy(this._currentPos).add(this._shakeOffset);
        this.camera.lookAt(this._currentTarget);
    }

    /**
     * Initialise camera at player's starting position.
     */
    init(position, heading) {
        const sin = Math.sin(heading);
        const cos = Math.cos(heading);
        this._currentPos.set(
            position.x - sin * VEHICLE.CAM_FOLLOW_DISTANCE,
            position.y + VEHICLE.CAM_HEIGHT,
            position.z - cos * VEHICLE.CAM_FOLLOW_DISTANCE,
        );
        this._currentTarget.set(
            position.x + sin * VEHICLE.CAM_LOOK_AHEAD,
            position.y + 1,
            position.z + cos * VEHICLE.CAM_LOOK_AHEAD,
        );
        this.camera.position.copy(this._currentPos);
        this.camera.lookAt(this._currentTarget);
    }
}
