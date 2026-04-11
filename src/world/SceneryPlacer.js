/**
 * SceneryPlacer.js — Places roadside props (trees, rocks, barriers) using InstancedMesh.
 * All geometry is procedural — cone trees, box buildings, cylinder barrels.
 */
import * as THREE from 'three';
import { GAME } from '../config/GameConfig.js';
import { randomRange, randomInt } from '../utils/MathUtils.js';

export class SceneryPlacer {
    /**
     * @param {THREE.CatmullRomCurve3} centreline
     */
    constructor(centreline) {
        this.centreline = centreline;
        this.group = new THREE.Group();
    }

    /**
     * Generate all scenery and return the group.
     * @returns {THREE.Group}
     */
    generate() {
        const numSamples = Math.floor(this.centreline.getLength() * GAME.SCENERY_DENSITY);

        this._placeTrees(numSamples);
        this._placeRocks(Math.floor(numSamples * 0.3));
        this._placeBarriers(Math.floor(numSamples * 0.15));

        return this.group;
    }

    /**
     * Place cone-shaped trees along the track.
     */
    _placeTrees(count) {
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 4);
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a2a0a });

        // Canopy
        const canopyGeo = new THREE.ConeGeometry(1.5, 3, 5);
        const canopyMat = new THREE.MeshLambertMaterial({ color: 0x1a5a1a });

        const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
        const canopyInstanced = new THREE.InstancedMesh(canopyGeo, canopyMat, count);

        const dummy = new THREE.Object3D();
        const worldUp = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i < count; i++) {
            const t = Math.random();
            const point = this.centreline.getPointAt(t);
            const tangent = this.centreline.getTangentAt(t);
            const binormal = new THREE.Vector3().crossVectors(tangent, worldUp).normalize();

            const side = Math.random() > 0.5 ? 1 : -1;
            const dist = randomRange(GAME.SCENERY_SPREAD_MIN, GAME.SCENERY_SPREAD_MAX);
            const scale = randomRange(0.6, 1.4);

            const pos = point.clone().addScaledVector(binormal, side * dist);
            pos.y = point.y - 0.5; // Sit on ground level

            // Trunk
            dummy.position.copy(pos);
            dummy.position.y += 1 * scale;
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();
            trunkInstanced.setMatrixAt(i, dummy.matrix);

            // Canopy
            dummy.position.y += 2 * scale;
            dummy.updateMatrix();
            canopyInstanced.setMatrixAt(i, dummy.matrix);
        }

        trunkInstanced.instanceMatrix.needsUpdate = true;
        canopyInstanced.instanceMatrix.needsUpdate = true;

        this.group.add(trunkInstanced, canopyInstanced);
    }

    /**
     * Place box-shaped rocks.
     */
    _placeRocks(count) {
        const geo = new THREE.DodecahedronGeometry(0.8, 0);
        const mat = new THREE.MeshLambertMaterial({ color: 0x666655 });
        const instanced = new THREE.InstancedMesh(geo, mat, count);

        const dummy = new THREE.Object3D();
        const worldUp = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i < count; i++) {
            const t = Math.random();
            const point = this.centreline.getPointAt(t);
            const tangent = this.centreline.getTangentAt(t);
            const binormal = new THREE.Vector3().crossVectors(tangent, worldUp).normalize();

            const side = Math.random() > 0.5 ? 1 : -1;
            const dist = randomRange(GAME.SCENERY_SPREAD_MIN * 0.8, GAME.SCENERY_SPREAD_MAX * 0.6);
            const scale = randomRange(0.4, 1.2);

            dummy.position.copy(point).addScaledVector(binormal, side * dist);
            dummy.position.y = point.y - 0.3;
            dummy.scale.set(scale, scale * 0.6, scale);
            dummy.rotation.set(Math.random(), Math.random(), Math.random());
            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);
        }

        instanced.instanceMatrix.needsUpdate = true;
        this.group.add(instanced);
    }

    /**
     * Place cylindrical barrel obstacles near the road edges.
     */
    _placeBarriers(count) {
        const geo = new THREE.CylinderGeometry(0.4, 0.4, 1, 6);
        const mat = new THREE.MeshLambertMaterial({ color: 0xcc4422 });
        const instanced = new THREE.InstancedMesh(geo, mat, count);

        const dummy = new THREE.Object3D();
        const worldUp = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i < count; i++) {
            const t = Math.random();
            const point = this.centreline.getPointAt(t);
            const tangent = this.centreline.getTangentAt(t);
            const binormal = new THREE.Vector3().crossVectors(tangent, worldUp).normalize();

            const side = Math.random() > 0.5 ? 1 : -1;
            const dist = GAME.ROAD_HALF_WIDTH + randomRange(1, 3);

            dummy.position.copy(point).addScaledVector(binormal, side * dist);
            dummy.position.y = point.y + 0.5;
            dummy.scale.set(1, 1, 1);
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);
        }

        instanced.instanceMatrix.needsUpdate = true;
        this.group.add(instanced);
    }
}
