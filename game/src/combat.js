// Damage, healing and death. Every damage source funnels through here so
// gold, score, particles, splits and boss phases stay consistent.
import { S } from './state.js';
import { ENEMIES, DIFFICULTIES, PAL } from './config.js';
import { spawnBurst, spawnFloater, spawnRing, addShake } from './particles.js';
import { sfx } from './audio.js';
import { chance, rand } from './rng.js';

export function damageEnemy(e, amount, isCrit) {
  if (e.dead || e.shimmerT > 0) return 0;
  const dmg = Math.max(1, Math.round(amount));
  e.hp -= dmg;
  e.flashT = 0.08;
  spawnFloater(e.x, e.y - e.radius - 6, String(dmg), isCrit ? PAL.gold : '#ffffff', isCrit ? 23 : 17);
  if (e.hp <= 0) killEnemy(e);
  return dmg;
}

export function healEnemy(e, amount) {
  if (e.dead || e.hp >= e.maxHp) return;
  e.hp = Math.min(e.maxHp, e.hp + amount);
}

export function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  S.kills++;
  const def = ENEMIES[e.kind];
  const gold = Math.round(def.gold * S.mods.goldMul * DIFFICULTIES[S.difficulty].gold);
  S.gold += gold;
  S.goldEarned += gold;
  S.score += Math.round(def.score * DIFFICULTIES[S.difficulty].score);
  spawnBurst(e.x, e.y, def.color, e.boss ? 46 : 14, e.boss ? 190 : 120, 0.6, e.boss ? 5 : 3.5);
  spawnFloater(e.x, e.y - e.radius - 20, '+' + gold + 'g', PAL.gold, 15);
  if (e.boss) {
    spawnRing(e.x, e.y, PAL.gold, 150, 0.6);
    addShake(12);
    sfx('boss');
  } else {
    sfx('pop');
  }
  if (def.splits) {
    for (let i = 0; i < 2; i++) {
      S.pendingSpawns.push({ kind: 'mini', dist: Math.max(0, e.dist - 14 + i * 8) });
    }
  }
}

export function damageHero(amount) {
  const h = S.hero;
  if (!h || h.dead || h.dashT > 0 || h.shieldT > 0) return;
  h.hp -= amount;
  h.hurtT = 3;
  spawnBurst(h.x, h.y, PAL.danger, 8, 90, 0.4, 3);
  sfx('hurt');
  if (h.hp <= 0) {
    h.dead = true;
    h.respawnT = S.mods.respawn;
    spawnBurst(h.x, h.y, PAL.hero, 30, 160, 0.8, 4);
    spawnRing(h.x, h.y, PAL.hero, 90, 0.5);
    addShake(8);
  }
}

export function dealSplash(x, y, radius, damage, source) {
  for (const e of S.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d <= radius + e.radius) {
      const crit = chance(S.mods.crit);
      damageEnemy(e, damage * (crit ? 2 : 1), crit);
    }
  }
  if (source === 'hero') sfx('hit');
}

// Enemy reaches the Heart Coral.
export function leakEnemy(e) {
  e.dead = true;
  S.leaked++;
  const cost = e.boss ? 5 : 1;
  S.lives = Math.max(0, S.lives - cost);
  spawnBurst(e.x, e.y, PAL.danger, 18, 130, 0.6, 4);
  addShake(7);
  sfx('leak');
  spawnFloater(e.x, e.y - 30, '-' + cost + (cost === 1 ? ' life' : ' lives'), PAL.danger, 17);
}
