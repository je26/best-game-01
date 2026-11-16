// Deterministic screenshot staging: ?shot=<scene>&seed=<n> builds a fixed
// scene through the real game code (real placement, real spawning, real
// fixed-step simulation), freezes it, and lets the renderer take the shot.
// Scenes: title, play (cover), boss, victory.
import { S, resetRun } from './state.js';
import { seedRng } from './rng.js';
import { mouse } from './input.js';
import { placeTower, upgradeTower } from './towers.js';
import { spawnEnemy } from './enemies.js';
import { heroShockwave } from './hero.js';
import { stepSim } from './game.js';
import { SPOTS } from './map.js';

function buildTower(id, spot, tier) {
  if (placeTower(id, spot)) {
    const t = S.towers[S.towers.length - 1];
    while (t.tier < tier) {
      S.gold = 9999;
      upgradeTower(t);
    }
    t.pop = 0;
    t.cd = 0;
  }
}

function stagePlay(seed) {
  seedRng(seed);
  resetRun('current', seed);
  S.wave = 7;
  S.phase = 'combat';
  S.gold = 9999;
  buildTower('anemone', 1, 2);
  buildTower('mortar', 3, 2);
  buildTower('jelly', 6, 1);
  buildTower('urchin', 8, 2);
  buildTower('clam', 12, 3);
  buildTower('star', 14, 1);
  buildTower('anemone', 18, 3);
  S.gold = 420;
  S.lives = 17;
  S.score = 2340;
  S.kills = 96;
  S.time = 512;
  const pack = [
    ['drifter', 120], ['drifter', 260], ['swiftfin', 400], ['drifter', 540],
    ['bulwark', 700], ['drifter', 840], ['splitter', 980], ['swiftfin', 1120],
    ['mender', 1260], ['drifter', 1400], ['wraith', 1560], ['drifter', 1720],
    ['spitter', 1880], ['swiftfin', 2040], ['drifter', 2200], ['bulwark', 2380],
    ['splitter', 2560], ['wraith', 2740],
  ];
  for (const [kind, dist] of pack) spawnEnemy(kind, dist);
  S.hero.x = 640;
  S.hero.y = 255;
  mouse.x = 720;
  mouse.y = 175;
  mouse.down = true;
  S.banner = { text: 'WAVE 7', sub: 'The tide rises.', t: 0.5, dur: 2.4 };
  S.animT = 3.2;
  for (let i = 0; i < 100; i++) {
    S.animT += 1 / 60;
    stepSim(1 / 60);
  }
  mouse.down = false;
  S.shake = 0;
  S.banner = null; // HUD already names the wave; keep the battlefield clean.
}

function stageBoss(seed) {
  seedRng(seed);
  resetRun('current', seed);
  S.wave = 10;
  S.phase = 'combat';
  S.gold = 9999;
  buildTower('anemone', 0, 3);
  buildTower('mortar', 2, 3);
  buildTower('jelly', 5, 2);
  buildTower('urchin', 7, 2);
  buildTower('clam', 11, 3);
  buildTower('star', 13, 2);
  buildTower('mortar', 16, 2);
  buildTower('anemone', 20, 2);
  S.gold = 310;
  S.lives = 12;
  S.score = 8930;
  S.kills = 210;
  S.time = 980;
  const boss = spawnEnemy('leviathan', 1500);
  boss.hp = Math.round(boss.maxHp * 0.62);
  for (const [kind, dist] of [['drifter', 1300], ['swiftfin', 1380], ['mender', 1420], ['drifter', 1620], ['swiftfin', 1700], ['splitter', 1780]]) {
    spawnEnemy(kind, dist);
  }
  S.hero.x = 700;
  S.hero.y = 420;
  S.hero.hp = 64;
  mouse.x = 790;
  mouse.y = 300;
  mouse.down = true;
  S.banner = { text: 'LEVIATHAN', sub: 'Focus everything on it!', t: 0.3, dur: 2.0 };
  S.animT = 5.1;
  for (let i = 0; i < 70; i++) {
    S.animT += 1 / 60;
    stepSim(1 / 60);
  }
  heroShockwave();
  for (let i = 0; i < 12; i++) {
    S.animT += 1 / 60;
    stepSim(1 / 60);
  }
  mouse.down = false;
  S.shake = 0;
}

function stageVictory(seed) {
  seedRng(seed);
  resetRun('current', seed);
  S.gold = 9999;
  buildTower('anemone', 1, 3);
  buildTower('mortar', 3, 3);
  buildTower('jelly', 6, 2);
  buildTower('star', 14, 2);
  buildTower('clam', 18, 3);
  S.mode = 'victory';
  S.wave = 15;
  S.score = 18740;
  S.kills = 312;
  S.goldEarned = 5230;
  S.towersBuilt = 19;
  S.lives = 14;
  S.time = 1104;
  S.gold = 640;
  S.result = {
    won: true, stars: 3, starT: 2,
    stats: { score: 18740, waves: 15, kills: 312, goldEarned: 5230, towers: 19, time: 1104, newBest: true },
  };
  S.animT = 6.0;
}

function stageTitle(seed) {
  seedRng(seed);
  resetRun('current', seed);
  S.mode = 'title';
  S.best = { score: 18420, wave: 15, wins: 2 };
  S.difficulty = 'current';
  S.animT = 4.0;
}

export function setupShot(scene, seed) {
  S.shot = scene;
  if (scene === 'play') stagePlay(seed);
  else if (scene === 'boss') stageBoss(seed);
  else if (scene === 'victory') stageVictory(seed);
  else stageTitle(seed);
  S.frozen = true;
}

export function shotScene() {
  return S.shot;
}
