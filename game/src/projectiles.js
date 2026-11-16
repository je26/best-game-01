// Projectiles: tower shots, hero bubbles, enemy globs, beams and chains.
// Movement, homing-lite steering, impact and splash live here.
import { S } from './state.js';
import { PAL } from './config.js';
import { damageEnemy, damageHero, dealSplash } from './combat.js';
import { spawnBurst, spawnBubbles, spawnRing } from './particles.js';
import { sfx } from './audio.js';
import { chance } from './rng.js';

export function fireAt(x, y, target, opts) {
  S.projectiles.push({
    kind: opts.kind || 'shot', x, y, target,
    speed: opts.speed || 420, damage: opts.damage || 10,
    splash: opts.splash || 0, slow: opts.slow || 0, slowDur: opts.slowDur || 0,
    pierce: !!opts.pierce, hitSet: opts.pierce ? new Set() : null,
    dx: 0, dy: 0, radius: opts.radius || 5, color: opts.color || '#ffffff',
    dead: false, trail: 0, fromHero: !!opts.fromHero, life: 2.2,
  });
}

export function fireBeam(x, y, target, damage, color) {
  // Instant beam: damage now, visual fades in the projectile list.
  if (target && !target.dead) {
    const crit = chance(S.mods.crit);
    damageEnemy(target, damage * (crit ? 2 : 1), crit);
  }
  S.projectiles.push({
    kind: 'beam', x, y, target, speed: 0, damage: 0, radius: 0,
    color, dead: false, life: 0.12, trail: 0, beamT: 0,
  });
}

export function fireChain(x, y, first, damage, jumps, color) {
  let from = { x, y };
  let cur = first;
  const seen = new Set();
  for (let i = 0; i < jumps && cur && !cur.dead; i++) {
    seen.add(cur);
    const crit = chance(S.mods.crit);
    damageEnemy(cur, damage * (crit ? 2 : 1), crit);
    S.projectiles.push({
      kind: 'beam', x: from.x, y: from.y, target: cur, speed: 0, damage: 0,
      radius: 0, color, dead: false, life: 0.14, trail: 0, beamT: 0,
    });
    from = cur;
    let best = null, bestD = 130;
    for (const e of S.enemies) {
      if (e.dead || seen.has(e) || e.shimmerT > 0) continue;
      const d = Math.hypot(e.x - from.x, e.y - from.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    cur = best;
  }
}

function impact(p) {
  p.dead = true;
  if (p.splash > 0) {
    dealSplash(p.x, p.y, p.splash, p.damage, p.fromHero ? 'hero' : 'tower');
    spawnBurst(p.x, p.y, p.color, 10, 110, 0.4, 3);
    spawnRing(p.x, p.y, p.color, p.splash, 0.25);
    sfx('hit');
    return;
  }
  if (p.target && !p.target.dead) {
    const crit = chance(S.mods.crit);
    damageEnemy(p.target, p.damage * (crit ? 2 : 1), crit);
    if (p.slow > 0 && p.target.slowT !== undefined) {
      p.target.slowT = Math.max(p.target.slowT, p.slowDur);
      p.target.slowMul = Math.min(p.target.slowMul, 1 - p.slow);
    }
    spawnBurst(p.x, p.y, p.color, 4, 60, 0.25, 2);
  }
}

export function updateProjectiles(dt) {
  for (let i = S.projectiles.length - 1; i >= 0; i--) {
    const p = S.projectiles[i];
    if (p.kind === 'beam') {
      p.life -= dt;
      if (p.life <= 0) {
        S.projectiles[i] = S.projectiles[S.projectiles.length - 1];
        S.projectiles.pop();
      }
      continue;
    }
    p.life -= dt;
    if (p.life <= 0 || p.dead) {
      S.projectiles[i] = S.projectiles[S.projectiles.length - 1];
      S.projectiles.pop();
      continue;
    }
    if (p.kind === 'glob') {
      // Enemy glob flies at the hero's position when fired.
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step + 4) {
        if (S.hero && !S.hero.dead && Math.hypot(S.hero.x - p.tx, S.hero.y - p.ty) < 34) {
          damageHero(p.damage);
        }
        spawnBurst(p.x, p.y, '#ffd166', 6, 70, 0.3, 2.5);
        S.projectiles[i] = S.projectiles[S.projectiles.length - 1];
        S.projectiles.pop();
        continue;
      }
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
      continue;
    }
    // Free shots fly straight and damage the first enemy they cross.
    if (p.free) {
      p.x += p.dx * p.speed * dt;
      p.y += p.dy * p.speed * dt;
      for (const e of S.enemies) {
        if (e.dead || e.shimmerT > 0) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
          damageEnemy(e, p.damage, false);
          spawnBurst(p.x, p.y, p.color, 4, 60, 0.25, 2);
          p.dead = true;
          break;
        }
      }
      if (p.x < -20 || p.x > 1300 || p.y < -20 || p.y > 740) p.dead = true;
      if (p.dead) {
        S.projectiles[i] = S.projectiles[S.projectiles.length - 1];
        S.projectiles.pop();
      }
      continue;
    }
    // Steer toward the target's current position.
    const t = p.target;
    if (!t || t.dead) {
      if (p.splash > 0 && p.tx !== undefined) {
        // Mortar shells keep flying to the locked ground point.
      } else {
        S.projectiles[i] = S.projectiles[S.projectiles.length - 1];
        S.projectiles.pop();
        continue;
      }
    }
    let tx, ty;
    if (t && !t.dead) { tx = t.x; ty = t.y; }
    else { tx = p.tx; ty = p.ty; }
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (p.pierce) {
      // Pierce shots fly straight and damage everything they cross.
      if (p.dx === 0 && p.dy === 0) { p.dx = dx / (d || 1); p.dy = dy / (d || 1); }
      p.x += p.dx * step;
      p.y += p.dy * step;
      for (const e of S.enemies) {
        if (e.dead || e.shimmerT > 0 || p.hitSet.has(e)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius + 2) {
          p.hitSet.add(e);
          const crit = chance(S.mods.crit);
          damageEnemy(e, p.damage * (crit ? 2 : 1), crit);
          spawnBurst(p.x, p.y, p.color, 3, 50, 0.2, 2);
        }
      }
      if (p.x < -20 || p.x > 1300 || p.y < -20 || p.y > 740) p.dead = true;
    } else if (d <= step + (t ? t.radius : 6)) {
      p.x = tx; p.y = ty;
      impact(p);
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
    p.trail -= dt;
    if (p.trail <= 0 && (p.kind === 'bubble' || p.kind === 'shot')) {
      p.trail = 0.05;
      if (p.kind === 'bubble') spawnBubbles(p.x, p.y, 1);
    }
  }
}

export function drawProjectiles(ctx) {
  for (const p of S.projectiles) {
    if (p.kind === 'beam') {
      const t = p.target;
      const ex = t ? t.x : p.x, ey = t ? t.y : p.y;
      ctx.globalAlpha = Math.max(0, p.life / 0.14);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    if (p.kind === 'glob') {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7c5cbf';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (p.kind === 'bubble') {
      ctx.strokeStyle = 'rgba(230, 248, 255, 0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(207, 238, 255, 0.45)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    // Tower shots: glowing orbs; mortar shells are bigger with a dark core.
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(p.x - p.radius * 0.25, p.y - p.radius * 0.25, p.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
