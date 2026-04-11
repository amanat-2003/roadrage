/**
 * CombatSystem.js — Orchestrates punch/kick resolution.
 * Phase 3 implementation — stub for now.
 */

export class CombatSystem {
    constructor() {
        this.entities = [];
    }

    /**
     * Register an entity (player or AI) for combat.
     * @param {object} entity - must have position, attackTimer, attackType, health, takeDamage
     */
    register(entity) {
        this.entities.push(entity);
    }

    /**
     * Fixed-timestep combat update.
     * @param {number} dt
     */
    fixedUpdate(dt) {
        // Phase 3: resolve punch/kick hitbox overlaps between entities
    }
}
