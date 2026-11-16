// Keyboard + mouse state in logical canvas coordinates. The game polls this
// module; it never calls back into game code.
import { VIEW_W, VIEW_H } from './config.js';

export const keys = new Set();
export const mouse = { x: -100, y: -100, down: false, rdown: false };
export const clicks = []; // { x, y, button } queued since last poll
export const keyPresses = []; // code strings queued since last poll

const GAME_KEYS = new Set([
  'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyU', 'KeyF',
  'KeyM', 'KeyP', 'Escape', 'Enter', 'Digit1', 'Digit2', 'Digit3',
  'Digit4', 'Digit5', 'Digit6', 'ShiftLeft', 'ShiftRight', 'Delete',
  'Backspace',
]);

export function initInput(canvas) {
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (VIEW_W / r.width),
      y: (e.clientY - r.top) * (VIEW_H / r.height),
    };
  }
  canvas.addEventListener('mousemove', (e) => {
    const p = toLogical(e);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toLogical(e);
    mouse.x = p.x;
    mouse.y = p.y;
    if (e.button === 0) mouse.down = true;
    if (e.button === 2) mouse.rdown = true;
    clicks.push({ x: p.x, y: p.y, button: e.button });
    e.preventDefault();
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
    if (e.button === 2) mouse.rdown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mouseleave', () => { mouse.x = -100; mouse.y = -100; });
  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) {
      keys.add(e.code);
      keyPresses.push(e.code);
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; mouse.rdown = false; });
}

export function pollClicks() {
  return clicks.splice(0, clicks.length);
}

export function pollKeys() {
  return keyPresses.splice(0, keyPresses.length);
}

export function keyDown(code) {
  return keys.has(code);
}
