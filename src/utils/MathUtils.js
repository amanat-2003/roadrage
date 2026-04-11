/**
 * MathUtils.js — Common math helpers used across the game.
 */

/**
 * Linear interpolation between a and b by factor t.
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Clamp value between min and max.
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Remap value from [inMin, inMax] to [outMin, outMax].
 */
export function remap(value, inMin, inMax, outMin, outMax) {
    const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
    return lerp(outMin, outMax, t);
}

/**
 * Smooth-damp style interpolation (framerate-independent lerp).
 * Returns the new value moving from current toward target.
 */
export function damp(current, target, smoothing, dt) {
    return lerp(current, target, 1 - Math.exp(-smoothing * dt));
}

/**
 * Random float in [min, max).
 */
export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Random integer in [min, max] (inclusive).
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
