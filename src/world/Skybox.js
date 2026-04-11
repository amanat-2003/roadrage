/**
 * Skybox.js — Gradient hemisphere sky for PS1 atmosphere.
 * No cubemap needed — shader-based gradient from horizon to zenith.
 */
import * as THREE from 'three';

export class Skybox {
    /**
     * Create the sky dome mesh.
     * @returns {THREE.Mesh}
     */
    create() {
        const geometry = new THREE.SphereGeometry(500, 16, 16);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                topColor:    { value: new THREE.Color(0x0a0015) },   // deep dark purple
                horizonColor:{ value: new THREE.Color(0x3a1a0a) },   // warm orange-brown
                bottomColor: { value: new THREE.Color(0x1a0a05) },   // dark ground
                offset:      { value: 20 },
                exponent:    { value: 0.6 },
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 horizonColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    if (h > 0.0) {
                        float t = pow(h, exponent);
                        gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
                    } else {
                        float t = pow(abs(h), 0.5);
                        gl_FragColor = vec4(mix(horizonColor, bottomColor, t), 1.0);
                    }
                }
            `,
            side: THREE.BackSide,
            depthWrite: false,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = -1;
        return mesh;
    }
}
