/**
 * GameConfig.js — Global game constants.
 * Centralised so every system pulls from the same source of truth.
 */

export const GAME = {
    // ── Physics ──
    FIXED_STEP: 1 / 60,            // seconds per physics tick
    MAX_SUBSTEPS: 5,                // prevent spiral-of-death

    // ── Rendering ──
    RENDER_WIDTH: 480,              // internal render resolution
    RENDER_HEIGHT: 270,
    FOG_COLOR: 0x1a0a2e,            // dark purple-black
    FOG_NEAR: 30,
    FOG_FAR: 180,
    CLEAR_COLOR: 0x1a0a2e,

    // ── Track ──
    ROAD_WIDTH: 14,                 // total width in world units
    ROAD_HALF_WIDTH: 7,
    TRACK_SEGMENTS: 500,            // ExtrudeGeometry steps

    // ── Scenery ──
    SCENERY_DENSITY: 0.6,           // objects per unit of track length (approx)
    SCENERY_SPREAD_MIN: 10,         // min distance from track centre
    SCENERY_SPREAD_MAX: 30,         // max distance from track centre
};
