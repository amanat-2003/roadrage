/**
 * TrackUtils.js — Frenet frame helpers and boundary projection for track physics.
 */
import * as THREE from 'three';

const _tangent = new THREE.Vector3();
const _normal  = new THREE.Vector3();
const _binormal = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _pointOnCurve = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);

/**
 * Find the approximate t parameter on the curve closest to a world position.
 * Uses a two-pass search: coarse sweep then binary refinement.
 *
 * @param {THREE.CatmullRomCurve3} curve
 * @param {THREE.Vector3} position - world position to project
 * @param {number} [samples=200] - coarse sweep samples
 * @returns {number} t in [0, 1]
 */
export function findNearestT(curve, position, samples = 200) {
    let bestT = 0;
    let bestDist = Infinity;

    // Coarse sweep
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        curve.getPointAt(t, _pointOnCurve);
        const dist = _pointOnCurve.distanceToSquared(position);
        if (dist < bestDist) {
            bestDist = dist;
            bestT = t;
        }
    }

    // Binary refinement (5 iterations)
    let lo = Math.max(0, bestT - 1 / samples);
    let hi = Math.min(1, bestT + 1 / samples);
    for (let iter = 0; iter < 5; iter++) {
        const mid1 = lo + (hi - lo) / 3;
        const mid2 = hi - (hi - lo) / 3;

        curve.getPointAt(mid1, _pointOnCurve);
        const d1 = _pointOnCurve.distanceToSquared(position);

        curve.getPointAt(mid2, _pointOnCurve);
        const d2 = _pointOnCurve.distanceToSquared(position);

        if (d1 < d2) {
            hi = mid2;
        } else {
            lo = mid1;
        }
    }

    return (lo + hi) / 2;
}

/**
 * Compute the Frenet-like frame at parameter t on the curve.
 * Returns { point, tangent, normal (up-ish), binormal (lateral) }.
 *
 * @param {THREE.CatmullRomCurve3} curve
 * @param {number} t - parameter in [0, 1]
 * @returns {{ point: THREE.Vector3, tangent: THREE.Vector3, binormal: THREE.Vector3, normal: THREE.Vector3 }}
 */
export function getFrenetFrame(curve, t) {
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();

    // Binormal = tangent × worldUp (gives the lateral direction)
    const binormal = new THREE.Vector3().crossVectors(tangent, _worldUp).normalize();

    // If tangent is nearly vertical, fallback
    if (binormal.lengthSq() < 0.001) {
        binormal.set(1, 0, 0);
    }

    // Normal = binormal × tangent (gives the "up" relative to the track)
    const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

    return { point, tangent, binormal, normal };
}

/**
 * Compute the lateral offset of a position from the track centreline.
 * Positive = right of centreline (when looking along tangent), negative = left.
 *
 * @param {THREE.CatmullRomCurve3} curve
 * @param {THREE.Vector3} position
 * @param {number} t - pre-computed nearest t
 * @returns {{ offset: number, frame: object }} lateral offset and the Frenet frame used
 */
export function getLateralOffset(curve, position, t) {
    const frame = getFrenetFrame(curve, t);
    _toPlayer.subVectors(position, frame.point);
    const offset = _toPlayer.dot(frame.binormal);
    return { offset, frame };
}

/**
 * Clamp position to within track boundaries and return corrected position.
 *
 * @param {THREE.Vector3} position - player position (will be modified in-place)
 * @param {THREE.CatmullRomCurve3} curve
 * @param {number} halfWidth - half the road width
 * @returns {{ clamped: boolean, offset: number, frame: object }}
 */
export function clampToTrack(position, curve, halfWidth) {
    const t = findNearestT(curve, position);
    const { offset, frame } = getLateralOffset(curve, position, t);
    let clamped = false;

    if (Math.abs(offset) > halfWidth) {
        const sign = Math.sign(offset);
        const correction = (Math.abs(offset) - halfWidth) * sign;
        position.addScaledVector(frame.binormal, -correction);
        clamped = true;
    }

    return { clamped, offset, frame, t };
}
