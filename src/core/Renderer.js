/**
 * Renderer.js — PS1-style low-resolution rendering pipeline.
 * Renders to a small WebGLRenderTarget, then blits to screen with NearestFilter upscale.
 */
import * as THREE from 'three';
import { GAME } from '../config/GameConfig.js';

export class Renderer {
    /**
     * @param {HTMLElement} container - DOM element to mount the canvas into
     */
    constructor(container) {
        this.container = container;

        // Main WebGL renderer — NO anti-aliasing for PS1 crunch
        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: 'high-performance',
        });
        this.renderer.setPixelRatio(1); // Force 1:1 pixel ratio
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(GAME.CLEAR_COLOR);
        this.renderer.shadowMap.enabled = false; // PS1 didn't have shadow maps
        container.appendChild(this.renderer.domElement);

        // Low-res render target — the core of the PS1 look
        this.renderTarget = new THREE.WebGLRenderTarget(
            GAME.RENDER_WIDTH,
            GAME.RENDER_HEIGHT,
            {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
            }
        );

        // Fullscreen quad for blitting the low-res target to screen
        this.quadScene = new THREE.Scene();
        this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quadMaterial = new THREE.MeshBasicMaterial({
            map: this.renderTarget.texture,
        });
        const quadGeo = new THREE.PlaneGeometry(2, 2);
        this.quad = new THREE.Mesh(quadGeo, this.quadMaterial);
        this.quadScene.add(this.quad);

        // Handle resize
        window.addEventListener('resize', () => this._onResize());
    }

    /**
     * Render the scene at low resolution, then blit to screen.
     * @param {THREE.Scene} scene
     * @param {THREE.Camera} camera
     */
    render(scene, camera) {
        // Pass 1: Render scene to low-res target
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(scene, camera);

        // Pass 2: Blit low-res target to screen (NearestFilter upscale)
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.quadScene, this.quadCamera);
    }

    /**
     * Handle window resize — only update the screen blit, NOT the render target.
     */
    _onResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Get the underlying WebGLRenderer for direct access.
     */
    getWebGLRenderer() {
        return this.renderer;
    }

    dispose() {
        this.renderTarget.dispose();
        this.quadMaterial.dispose();
        this.renderer.dispose();
    }
}
