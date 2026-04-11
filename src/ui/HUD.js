/**
 * HUD.js — Canvas-rendered retro heads-up display.
 * Renders speed, track progress, health, wrong-way warning, finish overlay onto a Canvas.
 */
import { VEHICLE } from '../config/VehicleConfig.js';

export class HUD {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'hud-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        `;
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this._resize();
        window.addEventListener('resize', () => this._resize());

        // Wrong-way flash animation
        this._wrongWayFlash = 0;
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * Format seconds into M:SS.ms
     */
    _formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
    }

    /**
     * Convert number to ordinal string.
     */
    _ordinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    /**
     * Render the HUD overlay.
     * @param {object} data
     * @param {number} data.speed
     * @param {number} data.maxSpeed
     * @param {number} data.health
     * @param {number} data.maxHealth
     * @param {number} data.progress - track progress 0-1
     * @param {string} data.cameraMode
     * @param {boolean} data.isWrongWay
     * @param {boolean} data.finished
     * @param {number} data.raceTime
     * @param {number} data.finishTime
     * @param {boolean} data.isOffRoad
     */
    render(data) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        const fontSize = Math.max(14, Math.floor(w / 50));
        ctx.font = `${fontSize}px "Courier New", monospace`;
        ctx.textBaseline = 'top';

        // ── SPEED (bottom-left) ──
        const speedKmh = Math.floor(Math.abs(data.speed) * 3.6);
        const speedStr = `${speedKmh} KM/H`;

        const barX = 20;
        const barY = h - 60;
        const barW = 180;
        const barH = 20;
        const speedFraction = Math.min(1, Math.abs(data.speed) / data.maxSpeed);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barW, barH);

        const r = Math.floor(255 * speedFraction);
        const g = Math.floor(255 * (1 - speedFraction * 0.6));
        ctx.fillStyle = `rgb(${r}, ${g}, 50)`;
        ctx.fillRect(barX + 2, barY + 2, (barW - 4) * speedFraction, barH - 4);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(speedStr, barX, barY - fontSize - 4);

        // ── HEALTH (bottom-right) ──
        const healthBarW = 180;
        const healthBarX = w - healthBarW - 20;
        const healthBarY = h - 60;
        const healthFraction = Math.max(0, data.health / data.maxHealth);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(healthBarX, healthBarY, healthBarW, barH);

        const hr = Math.floor(255 * (1 - healthFraction));
        const hg = Math.floor(200 * healthFraction);
        ctx.fillStyle = `rgb(${hr}, ${hg}, 30)`;
        ctx.fillRect(healthBarX + 2, healthBarY + 2, (healthBarW - 4) * healthFraction, barH - 4);

        ctx.fillStyle = '#ffffff';
        ctx.fillText('HEALTH', healthBarX, healthBarY - fontSize - 4);

        // ── TRACK PROGRESS (top-centre) ──
        const progBarW = Math.min(400, w * 0.5);
        const progBarX = (w - progBarW) / 2;
        const progBarY = 20;
        const progBarH = 12;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(progBarX, progBarY, progBarW, progBarH);

        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(progBarX + 2, progBarY + 2, (progBarW - 4) * Math.min(1, data.progress), progBarH - 4);

        const smallFont = Math.max(10, Math.floor(fontSize * 0.7));
        ctx.fillStyle = '#888888';
        ctx.font = `${smallFont}px "Courier New", monospace`;
        ctx.fillText('START', progBarX, progBarY + progBarH + 4);
        ctx.textAlign = 'right';
        ctx.fillText('FINISH', progBarX + progBarW, progBarY + progBarH + 4);
        ctx.textAlign = 'left';

        const progPct = Math.floor(Math.min(100, data.progress * 100));
        ctx.font = `${fontSize}px "Courier New", monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${progPct}%`, w / 2, progBarY + progBarH + 6);
        ctx.textAlign = 'left';

        // ── RACE TIMER (bottom-centre) ──
        const timeStr = this._formatTime(data.finished ? data.finishTime : data.raceTime);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        const timerW = 120;
        const timerX = (w - timerW) / 2;
        const timerY = h - 50;
        ctx.fillRect(timerX, timerY, timerW, 30);
        ctx.fillStyle = data.finished ? '#ffcc00' : '#ffffff';
        ctx.font = `${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, w / 2, timerY + 6);
        ctx.textAlign = 'left';

        // ── RACE POSITION (left of speed, big) ──
        if (data.racePosition !== undefined) {
            const posStr = this._ordinal(data.racePosition);
            const totalStr = `/ ${data.totalRacers}`;

            // Large position number
            ctx.fillStyle = data.racePosition === 1 ? '#ffcc00' : '#ffffff';
            ctx.font = `bold ${fontSize * 2.5}px "Courier New", monospace`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(posStr, barX, barY - fontSize - 12);

            // Smaller total
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = `${fontSize}px "Courier New", monospace`;
            const posWidth = ctx.measureText(posStr).width;
            ctx.fillText(totalStr, barX + posWidth + 6, barY - fontSize - 16);
            ctx.textBaseline = 'top';
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = `${smallFont}px "Courier New", monospace`;
        ctx.fillText(`CAM: ${data.cameraMode.toUpperCase()} [C]`, 20, 20);

        // ── CONTROLS hint (top-right) ──
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.textAlign = 'right';
        ctx.fillText('WASD/Arrows: Drive  J: Punch  K: Kick', w - 20, 20);
        ctx.textAlign = 'left';

        // ── OFF-ROAD WARNING ──
        if (data.isOffRoad && !data.finished) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.6)';
            ctx.font = `bold ${fontSize * 1.2}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('⚠ OFF ROAD', w / 2, h / 2 + 60);
            ctx.textAlign = 'left';
        }

        // ── WRONG WAY WARNING (flashing) ──
        if (data.isWrongWay && !data.finished) {
            this._wrongWayFlash += 0.1;
            const alpha = 0.5 + 0.5 * Math.sin(this._wrongWayFlash * 8);

            // Red overlay
            ctx.fillStyle = `rgba(200, 0, 0, ${alpha * 0.2})`;
            ctx.fillRect(0, 0, w, h);

            // Big flashing text
            ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
            ctx.font = `bold ${fontSize * 3}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('WRONG WAY!', w / 2, h / 2);
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';

            ctx.font = `${fontSize}px "Courier New", monospace`;
            ctx.fillStyle = `rgba(255, 150, 150, ${alpha})`;
            ctx.textAlign = 'center';
            ctx.fillText('Turn around!', w / 2, h / 2 + fontSize * 2.5);
            ctx.textAlign = 'left';
        } else {
            this._wrongWayFlash = 0;
        }

        // ── FINISH OVERLAY ──
        if (data.finished) {
            // Dark overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, w, h);

            // "RACE COMPLETE" text
            ctx.fillStyle = '#ffcc00';
            ctx.font = `bold ${fontSize * 3}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RACE COMPLETE!', w / 2, h / 2 - 40);

            // Finish time
            ctx.fillStyle = '#ffffff';
            ctx.font = `${fontSize * 2}px "Courier New", monospace`;
            ctx.fillText(`TIME: ${this._formatTime(data.finishTime)}`, w / 2, h / 2 + 20);

            // Restart hint
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = `${fontSize}px "Courier New", monospace`;
            ctx.fillText('Press R to restart', w / 2, h / 2 + 70);
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';
        }
    }

    dispose() {
        this.canvas.remove();
    }
}
