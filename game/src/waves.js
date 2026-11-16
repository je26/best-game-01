// Waves: composition per wave, spawn scheduling, wave-clear bonuses and the
// boss waves at 5, 10 and 15.
import { S } from './state.js';
import { MAX_WAVE } from './config.js';
import { spawnEnemy } from './enemies.js';
import { rollBoons } from './draft.js';
import { setIntensity, sfx } from './audio.js';
import { rand, shuffle } from './rng.js';

function waveKinds(n) {
  const kinds = ['drifter'];
  if (n >= 2) kinds.push('swiftfin');
  if (n >= 3) kinds.push('bulwark');
  if (n >= 4) kinds.push('splitter');
  if (n >= 6) kinds.push('mender');
  if (n >= 8) kinds.push('wraith');
  if (n >= 9) kinds.push('spitter');
  return kinds;
}

export function buildWave(n) {
  const queue = [];
  const gap = Math.max(0.5, 1.15 - n * 0.04);
  const kinds = waveKinds(n);
  let count = 8 + n * 2;
  const isBoss = n % 5 === 0;
  if (isBoss) count = Math.round(count * 0.55);
  let t = 0.8;
  const bag = [];
  for (let i = 0; i < count; i++) {
    // Weight drifters early, specialists later; keep the mix varied.
    const weights = kinds.map((k, idx) => (k === 'drifter' ? 3 : 1) + (idx > 0 && n > 6 ? 1 : 0));
    let total = 0;
    for (const w of weights) total += w;
    let r = rand(0, total);
    let kind = kinds[0];
    for (let k = 0; k < kinds.length; k++) {
      r -= weights[k];
      if (r <= 0) { kind = kinds[k]; break; }
    }
    bag.push(kind);
  }
  shuffle(bag);
  // Never open with a tank wall: drifters lead.
  bag.sort((a, b) => (a === 'bulwark' ? 1 : 0) - (b === 'bulwark' ? 1 : 0));
  for (const kind of bag) {
    queue.push({ kind, at: t });
    t += gap * rand(0.7, 1.3);
  }
  if (isBoss) {
    queue.push({ kind: 'leviathan', at: t * 0.35 });
    queue.sort((a, b) => a.at - b.at);
  }
  return queue;
}

export function startWave() {
  if (S.phase !== 'build' || S.mode !== 'play') return;
  S.wave++;
  S.spawnQueue = buildWave(S.wave);
  S.spawnT = 0;
  S.phase = 'combat';
  S.autoStart = 0;
  const isBoss = S.wave % 5 === 0;
  S.banner = {
    text: isBoss ? 'LEVIATHAN APPROACHES' : 'WAVE ' + S.wave,
    sub: isBoss ? 'Wave ' + S.wave + ' — hold the Heart!' : waveSubtitle(S.wave),
    t: 0, dur: 2.4,
  };
  setIntensity(0.25 + (S.wave / MAX_WAVE) * 0.75);
  sfx(isBoss ? 'boss' : 'wave');
}

function waveSubtitle(n) {
  if (n === 1) return 'The pale tide stirs…';
  if (n === 5) return 'Something huge moves below.';
  if (n === 10) return 'The deep sends its champion.';
  if (n === MAX_WAVE) return 'The final night. Hold until dawn!';
  return 'The tide rises.';
}

export function updateWaves(dt) {
  if (S.phase !== 'combat') return;
  S.spawnT += dt;
  while (S.spawnQueue.length && S.spawnQueue[0].at <= S.spawnT) {
    const ev = S.spawnQueue.shift();
    spawnEnemy(ev.kind, 0);
    if (ev.kind === 'leviathan') {
      S.banner = { text: 'LEVIATHAN', sub: 'Focus everything on it!', t: 0, dur: 2.0 };
      sfx('boss');
    }
  }
  S.waveLeft = S.spawnQueue.length + S.enemies.length;
  if (S.spawnQueue.length === 0 && S.enemies.length === 0 && S.pendingSpawns.length === 0) {
    waveCleared();
  }
}

function waveCleared() {
  const bonus = 40 + 6 * S.wave;
  const interest = Math.min(50, Math.floor(S.gold * S.mods.interest));
  S.gold += bonus + interest;
  S.goldEarned += bonus + interest;
  S.score += 100 * S.wave;
  if (S.wave >= MAX_WAVE) {
    S.phase = 'done';
    return; // game.js detects the win
  }
  S.phase = 'build';
  S.draft = { options: rollBoons() };
  S.banner = {
    text: 'WAVE CLEARED',
    sub: '+' + bonus + 'g wave bonus  ·  +' + interest + 'g interest',
    t: 0, dur: 2.2,
  };
  sfx('draft');
}
