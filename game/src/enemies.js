// Enemies: spawning, movement along the path, special behaviours (healing,
// shimmer, splitting, shooting), boss phases and drawing.
import { S } from './state.js';
import { ENEMIES, DIFFICULTIES, WAVE_HP_GROWTH, PAL } from './config.js';
import { pointAt, PATH_LEN } from './map.js';
import { healEnemy, leakEnemy } from './combat.js';
import { spawnBurst, spawnBubbles } from './particles.js';
import { rand, chance } from './rng.js';

export function spawnEnemy(kind, dist) {
  const def = ENEMIES[kind];
  const diff = DIFFICULTIES[S.difficulty];
  const hpMul = (1 + WAVE_HP_GROWTH * (S.wave - 1)) * diff.hp;
  const p = pointAt(dist || 0);
  const e = {
    kind, x: p.x, y: p.y, dist: dist || 0,
    hp: Math.round(def.hp * hpMul), maxHp: Math.round(def.hp * hpMul),
    speed: def.speed * diff.speed * rand(0.94, 1.06),
    radius: def.radius, slowT: 0, slowMul: 1, flashT: 0,
    shimmerT: 0, shimmerCd: rand(1.5, 3), shootT: rand(1, 2.4),
    stopT: 0, phase: 0, dead: false, boss: !!def.boss, wob: rand(0, 6.28),
  };
  S.enemies.push(e);
  return e;
}

export function updateEnemies(dt) {
  // Minis queued by splitter deaths join the wave.
  while (S.pendingSpawns.length) {
    const p = S.pendingSpawns.pop();
    spawnEnemy(p.kind, p.dist);
  }
  for (let i = S.enemies.length - 1; i >= 0; i--) {
    const e = S.enemies[i];
    if (e.dead) {
      S.enemies[i] = S.enemies[S.enemies.length - 1];
      S.enemies.pop();
      continue;
    }
    e.flashT = Math.max(0, e.flashT - dt);
    e.slowT = Math.max(0, e.slowT - dt);
    if (e.slowT <= 0) e.slowMul = 1;

    const def = ENEMIES[e.kind];
    // Wraith shimmer: briefly untargetable.
    if (def.shimmer) {
      e.shimmerCd -= dt;
      if (e.shimmerCd <= 0 && e.shimmerT <= 0) { e.shimmerT = 0.9; e.shimmerCd = 3.2; }
      e.shimmerT = Math.max(0, e.shimmerT - dt);
    }
    // Mender heals neighbours.
    if (def.heals) {
      for (const o of S.enemies) {
        if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 75) healEnemy(o, def.heals * dt);
      }
      if (chance(dt * 2)) spawnBurst(e.x, e.y - 10, '#f4a7c3', 1, 20, 0.5, 2);
    }
    // Spitter stops to fire a glob at the hero.
    if (def.shoots && S.hero && !S.hero.dead) {
      e.shootT -= dt;
      if (e.shootT <= 0) {
        e.shootT = 2.6;
        e.stopT = 0.45;
        S.projectiles.push({
          kind: 'glob', x: e.x, y: e.y, tx: S.hero.x, ty: S.hero.y,
          speed: 240, damage: 9, radius: 6, dead: false, trail: 0,
        });
      }
    }
    if (e.stopT > 0) { e.stopT -= dt; continue; }

    // Boss phases: shed minis at 2/3 and 1/3 health.
    if (e.boss) {
      const frac = e.hp / e.maxHp;
      if ((e.phase === 0 && frac < 0.66) || (e.phase === 1 && frac < 0.33)) {
        e.phase++;
        for (let k = 0; k < 3; k++) S.pendingSpawns.push({ kind: 'mini', dist: e.dist - 10 + k * 10 });
        spawnBurst(e.x, e.y, PAL.enemy, 24, 150, 0.6, 4);
      }
    }

    const slow = e.slowMul * (e.boss ? 1 - (1 - e.slowMul) * 0.4 : 1);
    e.dist += e.speed * slow * dt;
    const p = pointAt(e.dist);
    e.x = p.x;
    e.y = p.y + Math.sin(S.animT * 3 + e.wob) * 2;
    if (chance(dt * 0.5)) spawnBubbles(e.x, e.y - e.radius, 1);
    if (e.dist >= PATH_LEN) leakEnemy(e);
  }
}

function drawBody(ctx, e, t) {
  const def = ENEMIES[e.kind];
  const bob = Math.sin(t * 2.4 + e.wob) * 2;
  ctx.save();
  ctx.translate(e.x, e.y + bob * 0.4);
  if (e.shimmerT > 0) ctx.globalAlpha = 0.35;
  const r = e.radius;
  // Dark outline ring so the body pops against the water.
  ctx.strokeStyle = 'rgba(4, 14, 26, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = e.flashT > 0 ? '#ffffff' : def.color;
  switch (e.kind) {
    case 'drifter': {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'swiftfin': {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.3, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(-r * 1.8, -r * 0.7);
      ctx.lineTo(-r * 1.8, r * 0.7);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'bulwark': {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 3;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(k * r * 0.5, -r * 0.7);
        ctx.lineTo(k * r * 0.5, r * 0.7);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffd9c9';
      ctx.beginPath();
      ctx.arc(-r * 0.7, -r * 0.4, 4, 0, Math.PI * 2);
      ctx.arc(r * 0.7, -r * 0.4, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'splitter':
    case 'mini': {
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + t;
        const rr = r * (0.85 + 0.25 * Math.sin(t * 3 + k));
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'mender': {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff6e3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.5);
      ctx.lineTo(0, r * 0.5);
      ctx.moveTo(-r * 0.5, 0);
      ctx.lineTo(r * 0.5, 0);
      ctx.stroke();
      break;
    }
    case 'wraith': {
      ctx.beginPath();
      ctx.arc(0, -r * 0.2, r * 0.8, Math.PI, 0);
      ctx.lineTo(r * 0.8, r * 0.8);
      ctx.lineTo(r * 0.4, r * 0.4);
      ctx.lineTo(0, r * 0.8);
      ctx.lineTo(-r * 0.4, r * 0.4);
      ctx.lineTo(-r * 0.8, r * 0.8);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'spitter': {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7c5cbf';
      ctx.beginPath();
      ctx.arc(4, -2, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'leviathan': {
      // Big eel-like boss: segmented body trailing behind the head.
      ctx.fillStyle = def.color;
      for (let s = 3; s >= 1; s--) {
        ctx.beginPath();
        ctx.arc(-s * 26, Math.sin(t * 2 + s) * 8, r - s * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a2033';
      ctx.beginPath();
      ctx.arc(10, -8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath();
      ctx.arc(11, -8, 3, 0, Math.PI * 2);
      ctx.fill();
      // Dorsal spikes.
      ctx.fillStyle = '#d9d4ff';
      for (let s = 0; s < 4; s++) {
        ctx.beginPath();
        ctx.moveTo(-s * 20 - 6, -r + 6);
        ctx.lineTo(-s * 20, -r - 14);
        ctx.lineTo(-s * 20 + 8, -r + 6);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    default: {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Eyes (except kinds that draw their own).
  if (e.kind !== 'bulwark' && e.kind !== 'leviathan' && e.kind !== 'spitter') {
    ctx.fillStyle = '#0a2033';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.25, 3.2, 0, Math.PI * 2);
    ctx.arc(r * 0.68, -r * 0.25, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.3 + 1, -r * 0.25 - 1, 1.1, 0, Math.PI * 2);
    ctx.arc(r * 0.68 + 1, -r * 0.25 - 1, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawEnemies(ctx, t) {
  const sorted = S.enemies.slice().sort((a, b) => a.y - b.y);
  for (const e of sorted) {
    drawBody(ctx, e, t);
    // Health bar (bosses get a wide bar above them).
    if (e.hp < e.maxHp) {
      const w = e.boss ? 90 : 30;
      const x = e.x - w / 2, y = e.y - e.radius - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = e.boss ? PAL.danger : '#7fe7dc';
      ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 4);
    }
    if (e.slowT > 0) {
      ctx.strokeStyle = 'rgba(127, 231, 220, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
