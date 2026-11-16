// Towers: placement on build spots, upgrades, selling, targeting and firing.
// Each kind has its own attack shape; tiers scale damage, range and rate.
import { S } from './state.js';
import { TOWERS, TIER_COST, PAL } from './config.js';
import { SPOTS } from './map.js';
import { fireAt, fireBeam, fireChain } from './projectiles.js';
import { spawnBurst, spawnRing } from './particles.js';
import { sfx } from './audio.js';

export function towerCost(id) {
  return Math.round(TOWERS[id].cost * S.mods.costMul);
}

export function upgradeCost(t) {
  return Math.round(TOWERS[t.id].cost * S.mods.costMul * TIER_COST[t.tier]);
}

export function towerStats(t) {
  const def = TOWERS[t.id];
  const tierMul = [1, 1.6, 2.6][t.tier - 1];
  const rateMul = [1, 1.15, 1.3][t.tier - 1];
  const rangeAdd = [0, 10, 20][t.tier - 1];
  let buff = 1;
  for (const o of S.towers) {
    if (o !== t && o.id === 'star' && Math.hypot(o.x - t.x, o.y - t.y) <= towerRange(o)) {
      buff += TOWERS.star.buff;
    }
  }
  return {
    damage: def.damage * tierMul * S.mods.towerDamage * buff,
    range: (def.range + rangeAdd) * S.mods.towerRange,
    rate: def.rate * rateMul * S.mods.towerRate,
    splash: def.splash || 0,
    slow: (def.slow || 0) * S.mods.slowMul,
  };
}

export function towerRange(t) {
  const def = TOWERS[t.id];
  const rangeAdd = [0, 10, 20][t.tier - 1];
  return (def.range + rangeAdd) * S.mods.towerRange;
}

export function spotTaken(i) {
  return S.towers.some((t) => t.spot === i);
}

export function canPlace(id, spotIndex) {
  return spotIndex >= 0 && !spotTaken(spotIndex) && S.gold >= towerCost(id);
}

export function placeTower(id, spotIndex) {
  if (!canPlace(id, spotIndex)) { sfx('deny'); return false; }
  const sp = SPOTS[spotIndex];
  S.gold -= towerCost(id);
  S.towers.push({
    id, spot: spotIndex, x: sp.x, y: sp.y, tier: 1,
    cd: 0, angle: -Math.PI / 2, invested: towerCost(id), pop: 0.25,
  });
  S.towersBuilt++;
  spawnBurst(sp.x, sp.y, TOWERS[id].color, 16, 110, 0.5, 3);
  spawnRing(sp.x, sp.y, TOWERS[id].color, 44, 0.35);
  sfx('place');
  return true;
}

export function upgradeTower(t) {
  if (t.tier >= 3) return false;
  const cost = upgradeCost(t);
  if (S.gold < cost) { sfx('deny'); return false; }
  S.gold -= cost;
  t.invested += cost;
  t.tier++;
  t.pop = 0.3;
  spawnBurst(t.x, t.y, PAL.gold, 20, 130, 0.6, 3.5);
  spawnRing(t.x, t.y, PAL.gold, 52, 0.4);
  sfx('upgrade');
  return true;
}

export function sellTower(t) {
  const refund = Math.round(t.invested * S.mods.sellRate);
  S.gold += refund;
  S.towers.splice(S.towers.indexOf(t), 1);
  if (S.pickedTower === t) S.pickedTower = null;
  spawnBurst(t.x, t.y, PAL.gold, 10, 90, 0.4, 3);
  sfx('sell');
  return refund;
}

function pickTarget(t, range) {
  // Prefer the enemy furthest along the path (closest to the Heart).
  let best = null, bestDist = -1;
  for (const e of S.enemies) {
    if (e.dead || e.shimmerT > 0) continue;
    if (Math.hypot(e.x - t.x, e.y - t.y) > range + e.radius) continue;
    if (e.dist > bestDist) { bestDist = e.dist; best = e; }
  }
  return best;
}

export function updateTowers(dt) {
  for (const t of S.towers) {
    t.pop = Math.max(0, t.pop - dt);
    t.cd -= dt;
    const st = towerStats(t);
    // Jelly Lantern slows everything in its aura, always.
    if (t.id === 'jelly') {
      for (const e of S.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) <= st.range + e.radius) {
          e.slowT = Math.max(e.slowT, 0.15);
          e.slowMul = Math.min(e.slowMul, 1 - st.slow);
        }
      }
    }
    if (t.cd > 0) continue;
    const target = pickTarget(t, st.range);
    if (!target) continue;
    t.angle = Math.atan2(target.y - t.y, target.x - t.x);
    t.cd = 1 / st.rate;
    const def = TOWERS[t.id];
    if (t.id === 'star') {
      fireChain(t.x, t.y - 14, target, st.damage, def.chain, def.color);
      sfx('shoot');
    } else if (t.id === 'jelly') {
      fireBeam(t.x, t.y - 14, target, st.damage, def.color);
      sfx('shoot');
    } else if (t.id === 'urchin') {
      fireAt(t.x, t.y - 12, target, {
        kind: 'shot', speed: 520, damage: st.damage, pierce: true,
        radius: 5, color: def.color,
      });
      sfx('shoot');
    } else if (t.id === 'mortar' || t.id === 'clam') {
      const p = { kind: 'shot', speed: t.id === 'clam' ? 380 : 340, damage: st.damage, splash: st.splash, radius: t.id === 'clam' ? 8 : 6, color: def.color };
      fireAt(t.x, t.y - 14, target, p);
      // Mortar shells remember the ground point in case the target dies.
      const pr = S.projectiles[S.projectiles.length - 1];
      pr.tx = target.x;
      pr.ty = target.y;
      sfx('shoot');
    } else {
      fireAt(t.x, t.y - 12, target, {
        kind: 'shot', speed: 460, damage: st.damage, radius: 5, color: def.color,
      });
      sfx('shoot');
    }
  }
}

function drawTowerBody(ctx, t, time) {
  const def = TOWERS[t.id];
  const pop = 1 + t.pop * 0.8;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(pop * 1.15, pop * 1.15);
  // Base rock.
  ctx.fillStyle = '#3d5a73';
  ctx.beginPath();
  ctx.ellipse(0, 8, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const sway = Math.sin(time * 1.8 + t.x) * 0.05;
  ctx.rotate(sway);
  if (t.id === 'anemone') {
    ctx.strokeStyle = def.color;
    ctx.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.32;
      const len = 20 + (k % 2) * 5 + t.tier * 2;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.quadraticCurveTo(Math.cos(a) * len * 0.6, 4 + Math.sin(a) * len * 0.6, Math.cos(a) * len, 4 + Math.sin(a) * len);
      ctx.stroke();
      ctx.fillStyle = '#ffd9c9';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * len, 4 + Math.sin(a) * len, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (t.id === 'mortar') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, -6, 13 + t.tier, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.rotate(t.angle + Math.PI / 2);
    ctx.fillStyle = '#8d4a3a';
    ctx.fillRect(-4, -26 - t.tier * 2, 8, 20);
    ctx.restore();
    ctx.fillStyle = '#ffd9c9';
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (t.id === 'jelly') {
    const bob = Math.sin(time * 2 + t.y) * 3;
    ctx.fillStyle = 'rgba(127, 231, 220, 0.85)';
    ctx.beginPath();
    ctx.arc(0, -16 + bob, 13, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(127, 231, 220, 0.7)';
    ctx.lineWidth = 2;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(k * 5, -16 + bob);
      ctx.quadraticCurveTo(k * 6, -4 + bob, k * 4 + Math.sin(time * 3 + k) * 2, 6);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff6e3';
    ctx.beginPath();
    ctx.arc(0, -16 + bob, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (t.id === 'urchin') {
    ctx.fillStyle = '#2a2140';
    ctx.beginPath();
    ctx.arc(0, -6, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + time * 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8, -6 + Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * 20, -6 + Math.sin(a) * 20);
      ctx.stroke();
    }
  } else if (t.id === 'clam') {
    ctx.fillStyle = '#e8dcc8';
    ctx.beginPath();
    ctx.ellipse(0, -4, 17, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, -8, 6 + t.tier, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6e3';
    ctx.beginPath();
    ctx.arc(-2, -10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (t.id === 'star') {
    ctx.fillStyle = def.color;
    ctx.save();
    ctx.translate(0, -14);
    ctx.rotate(time * 0.5);
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 === 0 ? 14 : 6;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff6e3';
    ctx.beginPath();
    ctx.arc(0, -14, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Tier pips.
  for (let k = 0; k < t.tier; k++) {
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.arc(t.x - 8 + k * 8, t.y + 16, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawTowers(ctx, time) {
  const sorted = S.towers.slice().sort((a, b) => a.y - b.y);
  for (const t of sorted) {
    if (t.id === 'jelly' || t.id === 'star') {
      ctx.fillStyle = t.id === 'jelly' ? 'rgba(127, 231, 220, 0.06)' : 'rgba(255, 230, 109, 0.06)';
      ctx.beginPath();
      ctx.arc(t.x, t.y, towerRange(t), 0, Math.PI * 2);
      ctx.fill();
    }
    drawTowerBody(ctx, t, time);
  }
  // Selected tower range ring.
  if (S.pickedTower) {
    const t = S.pickedTower;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.beginPath();
    ctx.arc(t.x, t.y, towerRange(t), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function drawPlacementGhost(ctx, x, y, id) {
  const def = TOWERS[id];
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.beginPath();
  ctx.arc(x, y, def.range * S.mods.towerRange, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 0.75;
  drawTowerBody(ctx, { id, x, y, tier: 1, angle: -Math.PI / 2, pop: 0 }, S.animT);
  ctx.globalAlpha = 1;
}
