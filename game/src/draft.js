// Between-wave draft: roll three boons, apply the chosen one. Boons are the
// run's permanent upgrades; stackable ones may be taken repeatedly.
import { S } from './state.js';
import { BOONS, MAX_LIVES } from './config.js';
import { shuffle } from './rng.js';
import { sfx } from './audio.js';
import { spawnFloater } from './particles.js';

export function rollBoons() {
  const pool = BOONS.filter((b) => b.stack || !S.boons[b.id]);
  shuffle(pool);
  return pool.slice(0, 3);
}

export function applyBoon(boon) {
  S.boons[boon.id] = (S.boons[boon.id] || 0) + 1;
  const m = S.mods;
  switch (boon.id) {
    case 'sharpen': m.towerDamage *= 1.2; break;
    case 'longshot': m.towerRange *= 1.15; break;
    case 'rapid': m.towerRate *= 1.12; break;
    case 'gilded': m.goldMul *= 1.25; break;
    case 'crit': m.crit += 0.12; break;
    case 'chilling': m.slowMul *= 1.12; break;
    case 'pockets': S.gold += 120; S.goldEarned += 120; break;
    case 'heartwood': S.lives = Math.min(MAX_LIVES, S.lives + 4); break;
    case 'heroPower': m.heroDamage *= 1.35; break;
    case 'swift': m.cooldownMul *= 0.75; break;
    case 'builder': m.costMul *= 0.85; break;
    case 'interest': m.interest += 0.05; break;
    case 'regen': m.heroRegen += 6; break;
    case 'shock': m.shockMul *= 1.5; break;
    case 'salvage': m.sellRate = 0.9; break;
    case 'secondWind': m.respawn = 2; m.shieldOnRevive = 2; break;
    default: break;
  }
  S.draft = null;
  S.autoStart = 14;
  spawnFloater(640, 300, boon.name + '!', '#ffe66d', 24);
  sfx('upgrade');
}
