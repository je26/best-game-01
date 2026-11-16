// The hero: a small guardian ray the player swims with WASD/arrows, aiming
// with the mouse. Bubble shots, a dash with invulnerability, and a shockwave.
import { S } from './state.js';
import { HERO, PAL } from './config.js';
import { mouse, keyDown } from './input.js';
import { fireAt } from './projectiles.js';
import { dealSplash } from './combat.js';
import { spawnBurst, spawnRing, spawnBubbles, addShake } from './particles.js';
import { sfx } from './audio.js';
import { rng } from './rng.js';

export function updateHero(dt) {
  const h = S.hero;
  if (!h) return;
  if (h.dead) {
    h.respawnT -= dt;
    if (h.respawnT <= 0) {
      h.dead = false;
      h.hp = h.maxHp;
      h.x = 640; h.y = 360;
      h.shieldT = S.mods.shieldOnRevive;
      spawnRing(h.x, h.y, PAL.hero, 70, 0.4);
    }
    return;
  }
  h.hurtT = Math.max(0, h.hurtT - dt);
  h.shieldT = Math.max(0, h.shieldT - dt);
  h.dashCd = Math.max(0, h.dashCd - dt);
  h.shockCd = Math.max(0, h.shockCd - dt);
  h.fireT = Math.max(0, h.fireT - dt);
  if (h.hurtT <= 0 && h.hp < h.maxHp) h.hp = Math.min(h.maxHp, h.hp + (HERO.regen + S.mods.heroRegen) * dt);

  // Movement.
  let mx = 0, my = 0;
  if (keyDown('KeyA') || keyDown('ArrowLeft')) mx -= 1;
  if (keyDown('KeyD') || keyDown('ArrowRight')) mx += 1;
  if (keyDown('KeyW') || keyDown('ArrowUp')) my -= 1;
  if (keyDown('KeyS') || keyDown('ArrowDown')) my += 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    h.face = mx !== 0 ? Math.sign(mx) : h.face;
  }
  if (h.dashT > 0) {
    h.dashT -= dt;
    const step = HERO.dashDist / HERO.dashTime * dt;
    h.x += h.dashDx * step;
    h.y += h.dashDy * step;
    if (rng() < 0.6) spawnBubbles(h.x, h.y, 1);
  } else {
    h.x += mx * HERO.speed * dt;
    h.y += my * HERO.speed * dt;
  }
  h.x = Math.max(24, Math.min(1256, h.x));
  h.y = Math.max(70, Math.min(612, h.y));

  // Bubble shots toward the mouse while held.
  if (mouse.down && h.fireT <= 0) {
    const dx = mouse.x - h.x, dy = mouse.y - h.y;
    const d = Math.hypot(dx, dy);
    if (d > 12) {
      h.fireT = 1 / HERO.fireRate;
      const target = nearestEnemyToward(h.x, h.y, dx / d, dy / d);
      const p = {
        kind: 'bubble', speed: 520, damage: HERO.damage * S.mods.heroDamage,
        radius: 7, color: '#cfeeff', fromHero: true,
      };
      if (target) {
        fireAt(h.x, h.y, target, p);
      } else {
        // Free shot: flies straight, dies on the first enemy crossed.
        S.projectiles.push({
          kind: 'bubble', x: h.x, y: h.y, target: null,
          tx: h.x + (dx / d) * 600, ty: h.y + (dy / d) * 600,
          dx: dx / d, dy: dy / d, speed: 520, damage: p.damage,
          radius: 7, color: p.color, dead: false, trail: 0, fromHero: true, life: 1.4, free: true,
        });
      }
      sfx('shoot');
    }
  }
}

function nearestEnemyToward(x, y, dx, dy) {
  let best = null, bestScore = Infinity;
  for (const e of S.enemies) {
    if (e.dead || e.shimmerT > 0) continue;
    const ex = e.x - x, ey = e.y - y;
    const along = ex * dx + ey * dy;
    if (along < 0) continue;
    const perp = Math.abs(ex * dy - ey * dx);
    const score = perp + along * 0.15;
    if (score < bestScore && perp < 90) { bestScore = score; best = e; }
  }
  return best;
}

export function heroDash() {
  const h = S.hero;
  if (!h || h.dead || h.dashCd > 0 || h.dashT > 0) return;
  let mx = 0, my = 0;
  if (keyDown('KeyA') || keyDown('ArrowLeft')) mx -= 1;
  if (keyDown('KeyD') || keyDown('ArrowRight')) mx += 1;
  if (keyDown('KeyW') || keyDown('ArrowUp')) my -= 1;
  if (keyDown('KeyS') || keyDown('ArrowDown')) my += 1;
  if (mx === 0 && my === 0) {
    const dx = mouse.x - h.x, dy = mouse.y - h.y;
    const d = Math.hypot(dx, dy) || 1;
    mx = dx / d; my = dy / d;
  } else {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
  }
  h.dashDx = mx; h.dashDy = my;
  h.dashT = HERO.dashTime;
  h.dashCd = HERO.dashCd * S.mods.cooldownMul;
  spawnBubbles(h.x, h.y, 6);
  sfx('dash');
}

export function heroShockwave() {
  const h = S.hero;
  if (!h || h.dead || h.shockCd > 0) return;
  h.shockCd = HERO.shockCd * S.mods.cooldownMul;
  const radius = HERO.shockRadius * S.mods.shockMul;
  const damage = HERO.shockDamage * S.mods.shockMul * S.mods.heroDamage;
  dealSplash(h.x, h.y, radius, damage, 'hero');
  for (const e of S.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - h.x, e.y - h.y);
    if (d < radius + e.radius) {
      // Knockback: push the enemy back along the path a little.
      e.dist = Math.max(0, e.dist - 26);
    }
  }
  spawnRing(h.x, h.y, PAL.hero, radius, 0.45);
  spawnBurst(h.x, h.y, PAL.hero, 22, 200, 0.5, 4);
  addShake(6);
  sfx('shock');
}

export function drawHero(ctx, t) {
  const h = S.hero;
  if (!h || h.dead) return;
  const flap = Math.sin(t * 8) * 0.25;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.scale(h.face * 1.25, 1.25);
  if (h.shieldT > 0) {
    ctx.strokeStyle = 'rgba(127, 231, 220, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Ray wings.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-16, -14 - flap * 10, -26, -10 - flap * 12);
  ctx.quadraticCurveTo(-14, 2, 0, 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-16, 14 + flap * 10, -26, 10 + flap * 12);
  ctx.quadraticCurveTo(-14, -2, 0, -4);
  ctx.closePath();
  ctx.fill();
  // Body.
  ctx.fillStyle = '#ffe3a3';
  ctx.beginPath();
  ctx.ellipse(2, 0, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail.
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(-20, Math.sin(t * 6) * 4, -28, Math.sin(t * 6 + 1) * 6);
  ctx.stroke();
  // Eye.
  ctx.fillStyle = '#0a2033';
  ctx.beginPath();
  ctx.arc(8, -2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Health bar.
  if (h.hp < h.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(h.x - 18, h.y - 26, 36, 4);
    ctx.fillStyle = '#7fe7dc';
    ctx.fillRect(h.x - 18, h.y - 26, 36 * Math.max(0, h.hp / h.maxHp), 4);
  }
}
