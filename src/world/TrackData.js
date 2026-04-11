/**
 * TrackData.js — Raw control points for the point-to-point track.
 * Each point is [x, y, z]. Y = elevation. Track goes roughly along -Z then curves back.
 */
import * as THREE from 'three';

/**
 * Track 1: "Coastal Ridge"
 * A winding mountain road with sweeping curves, hills, and dips.
 * Point-to-point: start at origin, finish ~600 units away.
 */
export const TRACK_1_POINTS = [
    new THREE.Vector3(0,      0,     0),        // START LINE
    new THREE.Vector3(10,     1,    -60),       // gentle opening straight
    new THREE.Vector3(15,     3,   -130),       // slight rise
    new THREE.Vector3(40,     8,   -200),       // first hill crest
    new THREE.Vector3(80,     4,   -260),       // sweeping right curve, descending
    new THREE.Vector3(130,    0,   -300),       // valley floor
    new THREE.Vector3(180,   -2,   -310),       // dip
    new THREE.Vector3(230,    2,   -280),       // climb out, curve left
    new THREE.Vector3(260,   10,   -220),       // big hill
    new THREE.Vector3(270,   12,   -160),       // crest
    new THREE.Vector3(260,    6,   -100),       // descending S-curve
    new THREE.Vector3(230,    3,    -50),       // continuing S-curve
    new THREE.Vector3(200,    0,     0),        // flatten out
    new THREE.Vector3(180,    1,     50),       // gentle left
    new THREE.Vector3(200,    5,    110),       // final climb
    new THREE.Vector3(240,    8,    160),       // approaching finish
    new THREE.Vector3(280,    6,    200),       // FINISH LINE
];

/**
 * Returns the default track points.
 */
export function getTrackPoints() {
    return TRACK_1_POINTS;
}
