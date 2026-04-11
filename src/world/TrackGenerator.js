/**
 * TrackGenerator.js — Builds the visual track mesh from control points.
 * CatmullRomCurve3 centreline → ExtrudeGeometry road surface.
 */
import * as THREE from 'three';
import { getTrackPoints } from './TrackData.js';
import { GAME } from '../config/GameConfig.js';

export class TrackGenerator {
    constructor() {
        /** @type {THREE.CatmullRomCurve3} */
        this.centreline = null;
        /** @type {THREE.Mesh} */
        this.trackMesh = null;
        /** @type {THREE.Group} */
        this.group = new THREE.Group();

        // Start / finish markers
        this.startMarker = null;
        this.finishMarker = null;
    }

    /**
     * Generate the full track and add to the group.
     * @returns {THREE.Group}
     */
    generate() {
        const points = getTrackPoints();

        // Build the centreline spline (NOT closed — point-to-point)
        this.centreline = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

        // Build road mesh
        this._buildRoadMesh();

        // Build ground plane beneath the track
        this._buildGroundPlane();

        // Build start/finish markers
        this._buildMarkers();

        return this.group;
    }

    /**
     * Create the extruded road mesh with a procedural asphalt texture.
     */
    _buildRoadMesh() {
        const halfW = GAME.ROAD_HALF_WIDTH;
        const segments = GAME.TRACK_SEGMENTS;

        // Sample centreline and build a flat ribbon (quad strip)
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        const worldUp = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = this.centreline.getPointAt(t);
            const tangent = this.centreline.getTangentAt(t).normalize();

            // Binormal = tangent × worldUp → gives lateral direction
            const binormal = new THREE.Vector3().crossVectors(tangent, worldUp).normalize();
            if (binormal.lengthSq() < 0.001) binormal.set(1, 0, 0);

            // Normal = binormal × tangent → gives "up" along the road surface
            const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

            // Left and right edge vertices
            const left = point.clone().addScaledVector(binormal, -halfW);
            const right = point.clone().addScaledVector(binormal, halfW);

            positions.push(left.x, left.y, left.z);
            positions.push(right.x, right.y, right.z);

            normals.push(normal.x, normal.y, normal.z);
            normals.push(normal.x, normal.y, normal.z);

            // UVs: U goes across the road (0→1), V goes along the road
            const v = t * segments / 10; // repeat texture along road
            uvs.push(0, v);
            uvs.push(1, v);

            // Build quad indices (two triangles per segment)
            if (i < segments) {
                const base = i * 2;
                indices.push(base, base + 1, base + 2);
                indices.push(base + 1, base + 3, base + 2);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);

        // Procedural road texture
        const texture = this._createRoadTexture();

        const material = new THREE.MeshLambertMaterial({
            map: texture,
            side: THREE.DoubleSide,
        });

        this.trackMesh = new THREE.Mesh(geometry, material);
        this.group.add(this.trackMesh);
    }

    /**
     * Create a procedural asphalt + lane-line texture via Canvas.
     * @returns {THREE.CanvasTexture}
     */
    _createRoadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Asphalt base — visible grey
        ctx.fillStyle = '#777777';
        ctx.fillRect(0, 0, 128, 128);

        // Noise grain for asphalt feel
        for (let i = 0; i < 800; i++) {
            const x = Math.random() * 128;
            const y = Math.random() * 128;
            const brightness = 50 + Math.random() * 40;
            ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
            ctx.fillRect(x, y, 1, 1);
        }

        // Centre dashed line
        ctx.fillStyle = '#cccc44';
        for (let y = 0; y < 128; y += 20) {
            ctx.fillRect(62, y, 4, 12);
        }

        // Edge lines
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, 0, 2, 128);
        ctx.fillRect(116, 0, 2, 128);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, GAME.TRACK_SEGMENTS / 10);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;

        return texture;
    }

    /**
     * Large ground plane so the track doesn't float in the void.
     */
    _buildGroundPlane() {
        const geometry = new THREE.PlaneGeometry(2000, 2000);
        const material = new THREE.MeshLambertMaterial({
            color: 0x0f0805, // very dark brown earth
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -2;
        plane.receiveShadow = true;
        this.group.add(plane);
    }

    /**
     * Place checkered banners at start and finish.
     */
    _buildMarkers() {
        const startPoint = this.centreline.getPointAt(0);
        const finishPoint = this.centreline.getPointAt(1);

        this.startMarker = this._createBanner(0x00ff00, startPoint, 0);
        this.finishMarker = this._createBanner(0xff0000, finishPoint, 1);

        this.group.add(this.startMarker);
        this.group.add(this.finishMarker);
    }

    /**
     * Create a simple arch banner at a track position.
     */
    _createBanner(color, position, t) {
        const group = new THREE.Group();
        const tangent = this.centreline.getTangentAt(t);
        const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

        const halfW = GAME.ROAD_HALF_WIDTH + 2;
        const poleHeight = 6;

        // Two poles
        const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, poleHeight, 4);
        const poleMat = new THREE.MeshLambertMaterial({ color: 0x888888 });

        const leftPole = new THREE.Mesh(poleGeo, poleMat);
        leftPole.position.copy(position).addScaledVector(binormal, -halfW);
        leftPole.position.y += poleHeight / 2;

        const rightPole = new THREE.Mesh(poleGeo, poleMat);
        rightPole.position.copy(position).addScaledVector(binormal, halfW);
        rightPole.position.y += poleHeight / 2;

        // Crossbar
        const barGeo = new THREE.BoxGeometry(halfW * 2, 0.8, 0.3);
        const barMat = new THREE.MeshLambertMaterial({ color });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.copy(position);
        bar.position.y += poleHeight;

        // Align to track direction
        const angle = Math.atan2(tangent.x, tangent.z);
        leftPole.rotation.y = angle;
        rightPole.rotation.y = angle;
        bar.rotation.y = angle;

        group.add(leftPole, rightPole, bar);
        return group;
    }
}
