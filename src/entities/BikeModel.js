/**
 * BikeModel.js — Procedural low-poly motorcycle + rider mesh.
 * Built from primitive geometry (boxes, cylinders, spheres).
 * Designed for drop-in GLTF replacement later.
 */
import * as THREE from 'three';

export class BikeModel {
    constructor() {
        /** @type {THREE.Group} Root group for the entire bike + rider */
        this.group = new THREE.Group();

        /** @type {THREE.Group} Rider group — for animating punch/kick */
        this.riderGroup = new THREE.Group();

        /** @type {THREE.Mesh} Left arm — for combat animation */
        this.leftArm = null;
        /** @type {THREE.Mesh} Right arm — for combat animation */
        this.rightArm = null;

        this._build();
    }

    _build() {
        const bikeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const chromeMat = new THREE.MeshLambertMaterial({ color: 0x888899 });
        const redMat = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xcc9966 });
        const clothMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
        const helmetMat = new THREE.MeshLambertMaterial({ color: 0x333344 });

        // ── BIKE BODY ──

        // Main frame / body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.5, 2.2),
            bikeMat
        );
        body.position.set(0, 0.5, 0);
        this.group.add(body);

        // Fuel tank
        const tank = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.35, 0.7),
            redMat
        );
        tank.position.set(0, 0.85, 0.2);
        this.group.add(tank);

        // Front wheel
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 8);
        const frontWheel = new THREE.Mesh(wheelGeo, chromeMat);
        frontWheel.rotation.z = Math.PI / 2;
        frontWheel.position.set(0, 0.4, 1.0);
        this.group.add(frontWheel);

        // Rear wheel
        const rearWheel = new THREE.Mesh(wheelGeo, chromeMat);
        rearWheel.rotation.z = Math.PI / 2;
        rearWheel.position.set(0, 0.4, -0.9);
        this.group.add(rearWheel);

        // Front fork
        const forkGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 4);
        const fork = new THREE.Mesh(forkGeo, chromeMat);
        fork.position.set(0, 0.75, 0.85);
        fork.rotation.x = -0.15;
        this.group.add(fork);

        // Handlebars
        const handleGeo = new THREE.BoxGeometry(1.0, 0.08, 0.08);
        const handle = new THREE.Mesh(handleGeo, chromeMat);
        handle.position.set(0, 1.1, 0.75);
        this.group.add(handle);

        // Exhaust pipe
        const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 4);
        const exhaust = new THREE.Mesh(exhaustGeo, chromeMat);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(0.25, 0.35, -0.5);
        this.group.add(exhaust);

        // Seat
        const seatGeo = new THREE.BoxGeometry(0.4, 0.12, 0.8);
        const seat = new THREE.Mesh(seatGeo, bikeMat);
        seat.position.set(0, 0.9, -0.3);
        this.group.add(seat);

        // ── RIDER ──

        // Torso
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.6, 0.3),
            clothMat
        );
        torso.position.set(0, 1.45, -0.1);
        this.riderGroup.add(torso);

        // Head (with helmet)
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 6, 6),
            helmetMat
        );
        head.position.set(0, 1.9, -0.05);
        this.riderGroup.add(head);

        // Left arm
        this.leftArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.5, 0.15),
            skinMat
        );
        this.leftArm.position.set(-0.35, 1.35, 0.15);
        this.leftArm.rotation.x = -0.6; // Reaching forward for handlebars
        this.riderGroup.add(this.leftArm);

        // Right arm
        this.rightArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.5, 0.15),
            skinMat
        );
        this.rightArm.position.set(0.35, 1.35, 0.15);
        this.rightArm.rotation.x = -0.6;
        this.riderGroup.add(this.rightArm);

        // Legs (simplified — boxes angled down)
        const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
        const leftLeg = new THREE.Mesh(legGeo, clothMat);
        leftLeg.position.set(-0.2, 0.95, -0.15);
        leftLeg.rotation.x = 0.3;
        this.riderGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, clothMat);
        rightLeg.position.set(0.2, 0.95, -0.15);
        rightLeg.rotation.x = 0.3;
        this.riderGroup.add(rightLeg);

        this.group.add(this.riderGroup);

        // Store default arm rotations for animation reset
        this._defaultArmRotX = -0.6;
    }

    /**
     * Animate a punch (right arm swings out to the side).
     * @param {number} progress - 0 to 1
     */
    animatePunch(progress) {
        const swing = Math.sin(progress * Math.PI);
        this.rightArm.rotation.x = this._defaultArmRotX + swing * 1.2;
        this.rightArm.rotation.z = -swing * 1.0;
    }

    /**
     * Animate a kick (right side, leg could extend but we animate arm for visual).
     * @param {number} progress - 0 to 1
     */
    animateKick(progress) {
        const swing = Math.sin(progress * Math.PI);
        this.rightArm.rotation.x = this._defaultArmRotX + swing * 0.5;
        this.rightArm.rotation.z = -swing * 1.5;
    }

    /**
     * Reset arms to default riding position.
     */
    resetPose() {
        this.rightArm.rotation.x = this._defaultArmRotX;
        this.rightArm.rotation.z = 0;
        this.leftArm.rotation.x = this._defaultArmRotX;
        this.leftArm.rotation.z = 0;
    }

    /**
     * Set the visual lean of the entire bike (for turning).
     * @param {number} angle - radians, positive = lean right
     */
    setLean(angle) {
        this.group.rotation.z = angle;
    }

    /**
     * Set a tint colour on the bike body (for AI colour-coding).
     * @param {number} color - hex colour
     */
    setColor(color) {
        // Tint the fuel tank
        this.group.children[1].material = new THREE.MeshLambertMaterial({ color });
    }
}
