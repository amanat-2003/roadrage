/**
 * AIPersonalities.js — Personality archetypes for AI racers.
 * Each archetype modifies base VehicleConfig values.
 */

export const AIPersonality = {
    AGGRESSIVE: 'aggressive',
    BALANCED:   'balanced',
    CAUTIOUS:   'cautious',
};

/**
 * Personality config modifiers (multipliers and overrides).
 */
export const PERSONALITY_CONFIGS = {
    [AIPersonality.AGGRESSIVE]: {
        speedMultiplier: 1.05,
        attackFrequencyMin: 2.0,    // seconds between attacks
        attackFrequencyMax: 4.0,
        draftingDistance: 3.0,      // how close they follow
        color: 0xcc2222,            // red tint
        name: 'Aggressive',
    },
    [AIPersonality.BALANCED]: {
        speedMultiplier: 1.0,
        attackFrequencyMin: 5.0,
        attackFrequencyMax: 8.0,
        draftingDistance: 5.0,
        color: 0xcccc22,            // neutral yellow
        name: 'Balanced',
    },
    [AIPersonality.CAUTIOUS]: {
        speedMultiplier: 0.95,
        attackFrequencyMin: 10.0,
        attackFrequencyMax: 20.0,   // rarely attacks
        draftingDistance: 8.0,
        color: 0x2244cc,            // blue tint
        name: 'Cautious',
    },
};

/**
 * Get a random personality, ensuring variety.
 * @param {number} index - racer index
 * @param {number} total - total racers
 * @returns {string} personality key
 */
export function getPersonalityForIndex(index, total) {
    const types = Object.values(AIPersonality);
    if (total >= 3 && index < 3) {
        // Guarantee one of each for first 3
        return types[index];
    }
    return types[Math.floor(Math.random() * types.length)];
}
