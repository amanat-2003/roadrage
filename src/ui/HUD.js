/**
 * HUD.js — Canvas-rendered retro heads-up display.
 * Renders speed, track progress, and health onto a Canvas overlay.
 * Uses monospace font for authentic retro feel.
 */
import { VEHICLE } from '../config/VehicleConfig.js';

export class HUD {
    constructor() {
        // Create full-screen overlay canvas
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
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * Render the HUD overlay.
     * @param {object} data
     * @param {number} data.speed - current speed
     * @param {number} data.maxSpeed - max speed for gauge
     * @param {number} data.health - current health
     * @param {number} data.maxHealth - max health
     * @param {number} data.progress - track progress 0-1
     * @param {string} data.cameraMode - 'chase' or 'ots'
     */
    render(data) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Font setup
        const fontSize = Math.max(14, Math.floor(w / 50));
        ctx.font = `${fontSize}px "Courier New", monospace`;
        ctx.textBaseline = 'top';

        // ── SPEED (bottom-left) ──
        const speedKmh = Math.floor(Math.abs(data.speed) * 3.6); // Convert to km/h-ish
        const speedStr = `${speedKmh} KM/H`;

        // Speed bar background
        const barX = 20;
        const barY = h - 60;
        const barW = 180;
        const barH = 20;
        const speedFraction = Math.abs(data.speed) / data.maxSpeed;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barW, barH);

        // Speed bar fill (green → yellow → red)
        const r = Math.floor(255 * speedFraction);
        const g = Math.floor(255 * (1 - speedFraction * 0.6));
        ctx.fillStyle = `rgb(${r}, ${g}, 50)`;
        ctx.fillRect(barX + 2, barY + 2, (barW - 4) * speedFraction, barH - 4);

        // Speed text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(speedStr, barX, barY - fontSize - 4);

        // ── HEALTH (bottom-right) ──
        const healthBarW = 180;
        const healthBarX = w - healthBarW - 20;
        const healthBarY = h - 60;
        const healthFraction = data.health / data.maxHealth;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(healthBarX, healthBarY, healthBarW, barH);

        // Health bar fill (green when healthy, red when low)
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
        ctx.fillRect(progBarX + 2, progBarY + 2, (progBarW - 4) * data.progress, progBarH - 4);

        // Start / Finish labels
        ctx.fillStyle = '#888888';
        const smallFont = Math.max(10, Math.floor(fontSize * 0.7));
        ctx.font = `${smallFont}px "Courier New", monospace`;
        ctx.fillText('START', progBarX, progBarY + progBarH + 4);
        ctx.textAlign = 'right';
        ctx.fillText('FINISH', progBarX + progBarW, progBarY + progBarH + 4);
        ctx.textAlign = 'left';

        // Progress percentage
        const progPct = Math.floor(data.progress * 100);
        ctx.font = `${fontSize}px "Courier New", monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${progPct}%`, w / 2, progBarY + progBarH + 6);
        ctx.textAlign = 'left';

        // ── CAMERA MODE indicator (top-left) ──
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = `${smallFont}px "Courier New", monospace`;
        ctx.fillText(`CAM: ${data.cameraMode.toUpperCase()} [C]`, 20, 20);

        // ── CONTROLS hint (top-right, subtle) ──
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.textAlign = 'right';
        ctx.fillText('WASD/Arrows: Drive  J: Punch  K: Kick', w - 20, 20);
        ctx.textAlign = 'left';
    }

    dispose() {
        this.canvas.remove();
    }
}
