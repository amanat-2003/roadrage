/**
 * InputManager.js — Keyboard (and future gamepad) input abstraction.
 * Tracks pressed state per key, provides clean API for game systems.
 */

// Action names — game logic references these, not raw key codes
export const Actions = {
    ACCELERATE: 'accelerate',
    BRAKE:      'brake',
    TURN_LEFT:  'turnLeft',
    TURN_RIGHT: 'turnRight',
    PUNCH:      'punch',
    KICK:       'kick',
    CAMERA_TOGGLE: 'cameraToggle',
    PAUSE:      'pause',
};

// Default key bindings
const DEFAULT_BINDINGS = {
    'KeyW':       Actions.ACCELERATE,
    'ArrowUp':    Actions.ACCELERATE,
    'KeyS':       Actions.BRAKE,
    'ArrowDown':  Actions.BRAKE,
    'KeyA':       Actions.TURN_LEFT,
    'ArrowLeft':  Actions.TURN_LEFT,
    'KeyD':       Actions.TURN_RIGHT,
    'ArrowRight': Actions.TURN_RIGHT,
    'KeyJ':       Actions.PUNCH,
    'KeyK':       Actions.KICK,
    'KeyC':       Actions.CAMERA_TOGGLE,
    'Escape':     Actions.PAUSE,
};

export class InputManager {
    constructor() {
        /** @type {Map<string, boolean>} Current held state per action */
        this._held = new Map();

        /** @type {Map<string, boolean>} Actions pressed this frame (rising edge) */
        this._justPressed = new Map();

        /** @type {Map<string, boolean>} Raw key-down state for edge detection */
        this._rawDown = new Map();

        this._bindings = { ...DEFAULT_BINDINGS };

        // Initialise all actions to false
        for (const action of Object.values(Actions)) {
            this._held.set(action, false);
            this._justPressed.set(action, false);
        }

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    /**
     * Call at the start of each physics tick to update edge-detection state.
     */
    poll() {
        // Clear justPressed — it only lasts one tick
        for (const action of Object.values(Actions)) {
            this._justPressed.set(action, false);
        }

        // Build per-action OR of all raw key states
        const actionRaw = new Map();
        for (const action of Object.values(Actions)) {
            actionRaw.set(action, false);
        }
        for (const [code, action] of Object.entries(this._bindings)) {
            if (this._rawDown.get(code)) {
                actionRaw.set(action, true);
            }
        }

        // Detect rising edges and update held state
        for (const action of Object.values(Actions)) {
            const raw = actionRaw.get(action);
            const wasHeld = this._held.get(action);
            if (raw && !wasHeld) {
                this._justPressed.set(action, true);
            }
            this._held.set(action, raw);
        }
    }

    /**
     * Is the action currently held down?
     * @param {string} action - from Actions enum
     * @returns {boolean}
     */
    isHeld(action) {
        return this._held.get(action) || false;
    }

    /**
     * Was the action just pressed this tick? (single-fire)
     * @param {string} action - from Actions enum
     * @returns {boolean}
     */
    justPressed(action) {
        return this._justPressed.get(action) || false;
    }

    /** @private */
    _onKeyDown(e) {
        this._rawDown.set(e.code, true);
        // Prevent default for game keys (no scrolling, etc.)
        if (this._bindings[e.code]) {
            e.preventDefault();
        }
    }

    /** @private */
    _onKeyUp(e) {
        this._rawDown.set(e.code, false);
    }

    dispose() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }
}
