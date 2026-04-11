/**
 * Game.js — Master orchestrator.
 * Owns the scene, game loop, and wires all systems together.
 * Handles race lifecycle: start → racing → finish → restart.
 * Phase 2: AI opponents integrated.
 */
import * as THREE from 'three';
import { GAME } from '../config/GameConfig.js';
import { VEHICLE } from '../config/VehicleConfig.js';
import { Renderer } from './Renderer.js';
import { InputManager, Actions } from './InputManager.js';
import { TrackGenerator } from '../world/TrackGenerator.js';
import { SceneryPlacer } from '../world/SceneryPlacer.js';
import { Skybox } from '../world/Skybox.js';
import { PlayerController } from '../entities/PlayerController.js';
import { AIRacerManager } from '../entities/AIRacerManager.js';
import { CameraController } from '../ui/CameraController.js';
import { AudioManager } from '../audio/AudioManager.js';
import { HUD } from '../ui/HUD.js';

// Default AI count — user-selectable in Phase 4 via menu
const AI_COUNT = 6;

export class Game {
    constructor() {
        this.container = document.getElementById('game-container');

        // Three.js scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(GAME.FOG_COLOR, GAME.FOG_NEAR, GAME.FOG_FAR);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            70,
            GAME.RENDER_WIDTH / GAME.RENDER_HEIGHT,
            0.5,
            500
        );

        // Core systems
        this.renderer = new Renderer(this.container);
        this.input = new InputManager();
        this.audio = new AudioManager();
        this.hud = new HUD();

        // Camera controller
        this.cameraController = new CameraController(this.camera);

        // World
        this.trackGenerator = null;
        this.player = null;

        // AI
        this.aiManager = new AIRacerManager();

        // Timing
        this._lastTime = 0;
        this._accumulator = 0;

        // Audio started flag
        this._audioStarted = false;

        // Bind
        this._loop = this._loop.bind(this);
    }

    /**
     * Initialise the game world and start the loop.
     */
    init() {
        // ── Lighting ──
        const ambientLight = new THREE.AmbientLight(0x8877aa, 1.2);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffddaa, 1.5);
        dirLight.position.set(50, 80, 30);
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x334455, 0.5);
        fillLight.position.set(-20, -10, -30);
        this.scene.add(fillLight);

        // ── Track ──
        this.trackGenerator = new TrackGenerator();
        const trackGroup = this.trackGenerator.generate();
        this.scene.add(trackGroup);

        // ── Scenery ──
        const scenery = new SceneryPlacer(this.trackGenerator.centreline);
        this.scene.add(scenery.generate());

        // ── Skybox ──
        const skybox = new Skybox();
        this.scene.add(skybox.create());

        // ── Player ──
        this._spawnPlayer();

        // ── AI Racers ──
        this.aiManager.spawn(
            AI_COUNT,
            this.trackGenerator.centreline,
            this.trackGenerator.trackMesh,
            this.scene
        );

        // ── Audio: start on first user interaction ──
        const startAudio = () => {
            if (!this._audioStarted) {
                this.audio.start();
                this._audioStarted = true;
            }
            this.audio.resume();
        };
        window.addEventListener('keydown', startAudio, { once: false });
        window.addEventListener('click', startAudio, { once: false });

        // ── Restart key ──
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyR' && this.player && this.player.finished) {
                this._restartRace();
            }
        });

        // ── Start game loop ──
        this._lastTime = performance.now();
        requestAnimationFrame(this._loop);
    }

    _spawnPlayer() {
        if (this.player) {
            this.scene.remove(this.player.mesh);
        }

        this.player = new PlayerController(
            this.trackGenerator.centreline,
            this.trackGenerator.trackMesh
        );
        this.scene.add(this.player.mesh);
        this.cameraController.init(this.player.position, this.player.heading);
    }

    _restartRace() {
        this._spawnPlayer();
        // Re-spawn AI
        this.aiManager.spawn(
            AI_COUNT,
            this.trackGenerator.centreline,
            this.trackGenerator.trackMesh,
            this.scene
        );
    }

    /**
     * Main game loop — fixed-timestep physics + render.
     */
    _loop(now) {
        requestAnimationFrame(this._loop);

        const rawDelta = Math.min((now - this._lastTime) / 1000, 0.1);
        this._lastTime = now;

        this._accumulator += rawDelta;

        if (this._accumulator > GAME.FIXED_STEP * GAME.MAX_SUBSTEPS) {
            this._accumulator = GAME.FIXED_STEP * GAME.MAX_SUBSTEPS;
        }

        while (this._accumulator >= GAME.FIXED_STEP) {
            this.input.poll();

            // Camera toggle
            if (this.input.justPressed(Actions.CAMERA_TOGGLE)) {
                this.cameraController.toggleMode();
            }

            // Combat SFX (only during active racing)
            if (!this.player.finished) {
                if (this.input.justPressed(Actions.PUNCH)) {
                    this.audio.playPunch();
                    this.cameraController.shake(0.15);
                }
                if (this.input.justPressed(Actions.KICK)) {
                    this.audio.playKick();
                    this.cameraController.shake(0.2);
                    this.cameraController.fovPunch();
                }
            }

            // Player physics
            this.player.fixedUpdate(GAME.FIXED_STEP, this.input);

            // AI physics
            this.aiManager.fixedUpdate(
                GAME.FIXED_STEP,
                this.player.position,
                this.player.trackT
            );

            // Audio update
            this.audio.update(this.player.velocity, VEHICLE.MAX_SPEED);

            this._accumulator -= GAME.FIXED_STEP;
        }

        // Interpolation
        const alpha = this._accumulator / GAME.FIXED_STEP;
        this.player.interpolate(alpha);

        // Camera follow
        this.cameraController.update(
            this.player.mesh.position,
            this.player.heading,
            this.player.velocity,
            rawDelta
        );

        // Render
        this.renderer.render(this.scene, this.camera);

        // Race position
        const { position, totalRacers } = this.aiManager.getPlayerPosition(this.player.trackT);

        // HUD
        this.hud.render({
            speed: this.player.velocity,
            maxSpeed: VEHICLE.MAX_SPEED,
            health: this.player.health,
            maxHealth: VEHICLE.HEALTH,
            progress: this.player.trackT,
            cameraMode: this.cameraController.mode,
            isWrongWay: this.player.isWrongWay,
            finished: this.player.finished,
            raceTime: this.player.raceTime,
            finishTime: this.player.finishTime,
            isOffRoad: this.player.isOffRoad,
            racePosition: position,
            totalRacers: totalRacers,
        });
    }
}
