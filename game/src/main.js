// Coralhold entry point: canvas setup, fixed-step loop, shot mode.
import { S } from './state.js';
import { VIEW_W, VIEW_H } from './config.js';
import { initInput } from './input.js';
import { loadSave } from './save.js';
import { initAudio, setIntensity } from './audio.js';
import { update, render, autoPause } from './game.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H) * 0.98;
  canvas.style.width = Math.floor(VIEW_W * scale) + 'px';
  canvas.style.height = Math.floor(VIEW_H * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

initInput(canvas);
loadSave();

// First gesture unlocks audio (autoplay policy).
const unlock = () => initAudio();
window.addEventListener('pointerdown', unlock, { once: false });
window.addEventListener('keydown', unlock, { once: false });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) autoPause();
});
window.addEventListener('blur', autoPause);

// Screenshot staging: ?shot=title|play|boss|victory&seed=<n>
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  const seed = parseInt(params.get('seed') || '7', 10) || 7;
  setupShot(shot, seed);
} else {
  S.mode = 'title';
  setIntensity(0.15);
}

let last = performance.now();
let frames = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!S.frozen) {
    S.animT += dt;
    // One update per frame; the sim steps at a fixed 1/60 s inside it,
    // times the speed multiplier. Below 60 fps the game slows gracefully
    // instead of spiralling.
    update(dt);
  }
  render(ctx);
  frames++;
  if (S.shot && frames >= 3 && !window.__shotReady) window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
