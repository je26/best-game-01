// Particles, floating damage numbers and screen shake. Fixed pools, no
// allocation in the hot loop beyond small reused objects.
import { S } from './state.js';
import { rand } from './rng.js';

const MAX_PARTICLES = 420;
const MAX_FLOATERS = 60;

export function spawnBurst(x, y, color, n, speed, life, size) {
  for (let i = 0; i < n; i++) {
    if (S.particles.length >= MAX_PARTICLES) return;
    const a = rand(0, Math.PI * 2);
    const sp = speed * (0.3 + rand(0, 1) * 0.9);
    S.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 14,
      t: 0, life: life * (0.6 + rand(0, 1) * 0.7), size: size * (0.6 + rand(0, 1) * 0.8),
      color, drag: 0.92, grav: 26, ring: false,
    });
  }
}

export function spawnRing(x, y, color, maxR, life) {
  if (S.particles.length >= MAX_PARTICLES) return;
  S.particles.push({ x, y, vx: 0, vy: 0, t: 0, life, size: maxR, color, drag: 1, grav: 0, ring: true });
}

export function spawnBubbles(x, y, n) {
  for (let i = 0; i < n; i++) {
    if (S.particles.length >= MAX_PARTICLES) return;
    S.particles.push({
      x: x + rand(-8, 8), y: y + rand(-4, 4), vx: rand(-8, 8), vy: -rand(24, 60),
      t: 0, life: rand(0.5, 1.1), size: rand(2, 5), color: 'bubble',
      drag: 0.99, grav: -14, ring: false,
    });
  }
}

export function spawnFloater(x, y, str, color, size) {
  if (S.floaters.length >= MAX_FLOATERS) S.floaters.shift();
  S.floaters.push({ x: x + rand(-6, 6), y, str, color, t: 0, life: 0.9, size: size || 15 });
}

export function addShake(amount) {
  S.shake = Math.min(14, S.shake + amount);
}

export function updateParticles(dt) {
  for (let i = S.particles.length - 1; i >= 0; i--) {
    const p = S.particles[i];
    p.t += dt;
    if (p.t >= p.life) {
      S.particles[i] = S.particles[S.particles.length - 1];
      S.particles.pop();
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= p.drag;
    p.vy = p.vy * p.drag + p.grav * dt;
  }
  for (let i = S.floaters.length - 1; i >= 0; i--) {
    const f = S.floaters[i];
    f.t += dt;
    f.y -= 34 * dt;
    if (f.t >= f.life) {
      S.floaters[i] = S.floaters[S.floaters.length - 1];
      S.floaters.pop();
    }
  }
  S.shake = Math.max(0, S.shake - 26 * dt);
}

export function drawParticles(ctx) {
  for (const p of S.particles) {
    const f = 1 - p.t / p.life;
    if (p.ring) {
      ctx.globalAlpha = f * 0.8;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * f + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - f * f) + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.color === 'bubble') {
      ctx.globalAlpha = f * 0.7;
      ctx.strokeStyle = '#cfeeff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = f;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * f + 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

export function drawFloaters(ctx) {
  for (const f of S.floaters) {
    const a = 1 - f.t / f.life;
    ctx.globalAlpha = a;
    ctx.font = '700 ' + f.size + "px 'Trebuchet MS', Verdana, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(4, 14, 26, 0.85)';
    ctx.strokeText(f.str, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.str, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}
