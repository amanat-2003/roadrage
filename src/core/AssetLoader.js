/**
 * AssetLoader.js — Centralized GLTF, Texture, Audio preloader.
 * Phase 2 — when real models replace procedural geometry.
 */
import * as THREE from 'three';

export class AssetLoader {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.loadedTextures = new Map();
        this.loadedModels = new Map();
    }

    /**
     * Load a texture with PS1-style filtering.
     * @param {string} path
     * @returns {THREE.Texture}
     */
    loadTexture(path) {
        if (this.loadedTextures.has(path)) {
            return this.loadedTextures.get(path);
        }

        const texture = this.textureLoader.load(path);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        this.loadedTextures.set(path, texture);
        return texture;
    }

    /**
     * Load a GLTF model.
     * @param {string} path
     * @returns {Promise<THREE.Group>}
     */
    async loadModel(path) {
        // Phase 2: import GLTFLoader and load model
        // const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        // const loader = new GLTFLoader();
        // ...
        console.warn('AssetLoader.loadModel: Not yet implemented. Using procedural geometry.');
        return null;
    }
}
