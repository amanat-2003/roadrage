/**
 * VehicleConfig.js — All tunable vehicle constants.
 * Pop the hood and tweak the engine. Wire to lil-gui for real-time tuning.
 */

export const VEHICLE = {
    // ── Acceleration & Speed ──
    MAX_SPEED:            120,      // units/sec
    ACCELERATION:         45,       // units/sec²
    BRAKING_FORCE:        80,       // units/sec² (deceleration when braking)
    DRAG_COEFFICIENT:     0.98,     // per-frame velocity multiplier (passive slowdown)
    OFF_ROAD_PENALTY:     0.4,      // speed multiplier when touching boundary

    // ── Steering & Handling ──
    TURN_SPEED:           2.5,      // radians/sec at low speed
    TURN_GRIP_CURVE:      0.6,      // 0→1; how much grip degrades at high speed
    LEAN_ANGLE_MAX:       0.45,     // radians — visual lean into turns
    LEAN_LERP_SPEED:      6.0,      // how fast the bike leans

    // ── Suspension & Ground Contact ──
    RIDE_HEIGHT:          0.6,      // offset above raycast hit point
    RAY_ORIGIN_OFFSET:    5.0,      // how high above bike to cast from
    NORMAL_ALIGN_SPEED:   8.0,      // how fast bike aligns to surface normal
    GRAVITY:              -30,      // units/sec² when airborne

    // ── Combat (fists only V1) ──
    PUNCH_RANGE:          2.5,      // world units
    KICK_RANGE:           3.0,
    PUNCH_DAMAGE:         10,
    KICK_DAMAGE:          18,
    HEALTH:               100,
    HIT_SPEED_PENALTY:    0.7,      // speed multiplier when hit
    HIT_STUN_DURATION:    0.3,      // seconds of reduced control

    // ── Camera ──
    CAM_FOLLOW_DISTANCE:  6,
    CAM_HEIGHT:           5.0,
    CAM_LERP_SPEED:       5.0,
    CAM_LOOK_AHEAD:       8,       // how far ahead of bike the camera targets
    CAM_SHAKE_INTENSITY:  0.4,
    CAM_SHAKE_DECAY:      3.0,

    // ── OTS Camera offsets ──
    OTS_OFFSET_X:         1.5,
    OTS_OFFSET_Y:         2.0,
    OTS_OFFSET_Z:         -4.0,
};
