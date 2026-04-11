/**
 * Game.js — Master orchestrator.
 * Owns the scene, game loop, and wires all systems together.
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
import { CameraController } from '../ui/CameraController.js';
import { AudioManager } from '../audio/AudioManager.js';
import { HUD } from '../ui/HUD.js';

export class Game {
    constructor() {
        // Container
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
        this.clock = new THREE.Clock();

        // Camera controller
        this.cameraController = new CameraController(this.camera);

        // World
        this.trackGenerator = null;
        this.player = null;

        // Game loop accumulator
        this._accumulator = 0;

        // Audio started flag (needs user gesture)
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

        // Subtle fill from below for PS1-era flat lighting feel
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
        this.player = new PlayerController(
            this.trackGenerator.centreline,
            this.trackGenerator.trackMesh
        );
        this.scene.add(this.player.mesh);

        // ── Camera init ──
        this.cameraController.init(this.player.position, this.player.heading);

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

        // ── Start game loop ──
        this.clock.start();
        this._loop();
    }

    /**
     * Main game loop — fixed-timestep physics + render.
     */
    _loop() {
        requestAnimationFrame(this._loop);

        const rawDelta = this.clock.getDelta();
        this._accumulator += rawDelta;

        // Prevent spiral of death
        if (this._accumulator > GAME.FIXED_STEP * GAME.MAX_SUBSTEPS) {
            this._accumulator = GAME.FIXED_STEP * GAME.MAX_SUBSTEPS;
        }

        // Fixed-timestep physics updates
        while (this._accumulator >= GAME.FIXED_STEP) {
            this.input.poll();

            // Camera toggle
            if (this.input.justPressed(Actions.CAMERA_TOGGLE)) {
                this.cameraController.toggleMode();
            }

            // Combat SFX
            if (this.input.justPressed(Actions.PUNCH)) {
                this.audio.playPunch();
                this.cameraController.shake(0.15);
            }
            if (this.input.justPressed(Actions.KICK)) {
                this.audio.playKick();
                this.cameraController.shake(0.2);
                this.cameraController.fovPunch();
            }

            // Player physics
            this.player.fixedUpdate(GAME.FIXED_STEP, this.input);

            // Audio update
            this.audio.update(this.player.velocity, VEHICLE.MAX_SPEED);

            this._accumulator -= GAME.FIXED_STEP;
        }

        // Interpolation alpha for smooth rendering
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

        // HUD
        this.hud.render({
            speed: this.player.velocity,
            maxSpeed: VEHICLE.MAX_SPEED,
            health: this.player.health,
            maxHealth: VEHICLE.HEALTH,
            progress: this.player.trackT,
            cameraMode: this.cameraController.mode,
        });
    }
}
