/**
 * main.js — Vite entry point. Bootstraps the game.
 */
import { Game } from './core/Game.js';
import './style.css';

// Boot
const game = new Game();
game.init();
