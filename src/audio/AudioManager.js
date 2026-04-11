/**
 * AudioManager.js — All game audio via Web Audio API.
 * Fully procedural — zero external audio files required.
 * Engine: sawtooth oscillator with pitch mapped to speed.
 * Wind: filtered white noise scaling with speed.
 * Combat SFX: short bursts synthesised on demand.
 */

export class AudioManager {
    constructor() {
        /** @type {AudioContext} */
        this.ctx = null;

        // Engine
        this._engineOsc = null;
        this._engineGain = null;
        this._engineFilter = null;

        // Wind
        this._windSource = null;
        this._windGain = null;

        // Ambient
        this._ambientSource = null;
        this._ambientGain = null;

        this._started = false;
    }

    /**
     * Initialise audio context and start persistent sounds.
     * Must be called from a user-gesture event (click/keydown).
     */
    start() {
        if (this._started) return;

        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._started = true;

        this._initEngine();
        this._initWind();
        this._initAmbient();
    }

    /**
     * Engine: sawtooth oscillator → lowpass filter → gain.
     * Base frequency ~60Hz, pitch increases with speed.
     */
    _initEngine() {
        this._engineOsc = this.ctx.createOscillator();
        this._engineOsc.type = 'sawtooth';
        this._engineOsc.frequency.value = 60;

        this._engineFilter = this.ctx.createBiquadFilter();
        this._engineFilter.type = 'lowpass';
        this._engineFilter.frequency.value = 400;
        this._engineFilter.Q.value = 2;

        this._engineGain = this.ctx.createGain();
        this._engineGain.gain.value = 0.12;

        this._engineOsc.connect(this._engineFilter);
        this._engineFilter.connect(this._engineGain);
        this._engineGain.connect(this.ctx.destination);
        this._engineOsc.start();
    }

    /**
     * Wind: white noise buffer → bandpass filter → gain.
     */
    _initWind() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        this._windSource = this.ctx.createBufferSource();
        this._windSource.buffer = buffer;
        this._windSource.loop = true;

        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.value = 800;
        windFilter.Q.value = 0.5;

        this._windGain = this.ctx.createGain();
        this._windGain.gain.value = 0;

        this._windSource.connect(windFilter);
        windFilter.connect(this._windGain);
        this._windGain.connect(this.ctx.destination);
        this._windSource.start();
    }

    /**
     * Ambient: very quiet brown noise for atmosphere.
     */
    _initAmbient() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Compensate for volume loss
        }

        this._ambientSource = this.ctx.createBufferSource();
        this._ambientSource.buffer = buffer;
        this._ambientSource.loop = true;

        this._ambientGain = this.ctx.createGain();
        this._ambientGain.gain.value = 0.04;

        this._ambientSource.connect(this._ambientGain);
        this._ambientGain.connect(this.ctx.destination);
        this._ambientSource.start();
    }

    /**
     * Update audio parameters based on game state.
     * Call every physics tick or render frame.
     * @param {number} speed - current player speed (0 to MAX_SPEED)
     * @param {number} maxSpeed - vehicle max speed for normalisation
     */
    update(speed, maxSpeed) {
        if (!this._started || !this.ctx) return;

        const speedNorm = Math.abs(speed) / maxSpeed; // 0 to 1

        // Engine: pitch rises with speed (60Hz idle → ~200Hz at max)
        const baseFreq = 60;
        const maxFreq = 200;
        const targetFreq = baseFreq + speedNorm * (maxFreq - baseFreq);
        this._engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);

        // Engine filter opens up with speed
        this._engineFilter.frequency.setTargetAtTime(
            400 + speedNorm * 1200,
            this.ctx.currentTime,
            0.05
        );

        // Engine volume: louder when accelerating
        const engineVol = 0.08 + speedNorm * 0.12;
        this._engineGain.gain.setTargetAtTime(engineVol, this.ctx.currentTime, 0.05);

        // Wind: fades in at higher speeds
        const windVol = Math.max(0, speedNorm - 0.3) * 0.15;
        this._windGain.gain.setTargetAtTime(windVol, this.ctx.currentTime, 0.1);
    }

    /**
     * Play a punch sound effect.
     */
    playPunch() {
        if (!this._started) return;
        this._playImpact(300, 0.08, 0.1);
    }

    /**
     * Play a kick sound effect (lower, heavier).
     */
    playKick() {
        if (!this._started) return;
        this._playImpact(150, 0.12, 0.15);
    }

    /**
     * Play a "hit received" thud.
     */
    playHitReceived() {
        if (!this._started) return;
        this._playImpact(80, 0.15, 0.2);
    }

    /**
     * Generic impact sound: noise burst + sine thud.
     * @param {number} freq - sine frequency
     * @param {number} volume - peak gain
     * @param {number} duration - seconds
     */
    _playImpact(freq, volume, duration) {
        const now = this.ctx.currentTime;

        // Noise burst
        const noiseLen = this.ctx.sampleRate * duration;
        const noiseBuf = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseLen; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
        }

        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = noiseBuf;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = freq * 3;
        noiseFilter.Q.value = 1;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(volume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noiseSource.start(now);
        noiseSource.stop(now + duration);

        // Sine thud
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(volume * 0.8, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    /**
     * Resume audio context if suspended (browser autoplay policy).
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    dispose() {
        if (this.ctx) {
            this.ctx.close();
        }
    }
}
