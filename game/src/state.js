// The single game state object. Every system reads and writes S; createRun
// resets it for a fresh run. Nothing here touches the DOM.
import { START_GOLD, START_LIVES, HERO } from './config.js';

export const S = {
  mode: 'title', // title | howto | play | victory | defeat
  paused: false,
  draft: null, // { options: [boon, boon, boon] } while choosing
  difficulty: 'current',
  time: 0, // total simulated seconds in this run
  animT: 0, // wall-free animation clock (advances with sim + menus)
  gold: START_GOLD,
  lives: START_LIVES,
  score: 0,
  wave: 0,
  phase: 'build', // build | combat | done
  kills: 0,
  goldEarned: 0,
  towersBuilt: 0,
  leaked: 0,
  spawnQueue: [], // { kind, at } seconds into the wave
  spawnT: 0,
  waveLeft: 0, // enemies still to spawn + alive
  enemies: [],
  towers: [],
  projectiles: [],
  particles: [],
  floaters: [],
  pendingSpawns: [], // minis from splitters, spawned next step
  hero: null,
  selected: null, // tower id being placed, or null
  pickedTower: null, // placed tower selected for upgrade/sell
  hoverSpot: -1,
  banner: null, // { text, sub, t, dur }
  shake: 0,
  speed: 1, // 1x or 2x
  muted: false,
  volume: 0.7,
  boons: {}, // id -> times taken
  mods: null, // derived multipliers, rebuilt by applyMods
  best: { score: 0, wave: 0, wins: 0 },
  runSeed: 1,
  autoStart: 0, // countdown to next wave during build phase (0 = off)
  result: null, // { won, stars, stats } for end screens
  shot: null, // shot scene name while staging screenshots
  frozen: false, // shot mode: no sim steps, every frame identical
};

export function freshMods() {
  return {
    towerDamage: 1, towerRange: 1, towerRate: 1, goldMul: 1,
    crit: 0, slowMul: 1, costMul: 1, interest: 0.05,
    heroDamage: 1, cooldownMul: 1, heroRegen: 0,
    shockMul: 1, sellRate: 0.7, respawn: HERO.respawn, shieldOnRevive: 0,
  };
}

export function resetRun(difficulty, seed) {
  S.mode = 'play';
  S.paused = false;
  S.draft = null;
  S.difficulty = difficulty;
  S.time = 0;
  S.gold = START_GOLD;
  S.lives = START_LIVES;
  S.score = 0;
  S.wave = 0;
  S.phase = 'build';
  S.kills = 0;
  S.goldEarned = 0;
  S.towersBuilt = 0;
  S.leaked = 0;
  S.spawnQueue = [];
  S.spawnT = 0;
  S.waveLeft = 0;
  S.enemies.length = 0;
  S.towers.length = 0;
  S.projectiles.length = 0;
  S.particles.length = 0;
  S.floaters.length = 0;
  S.pendingSpawns.length = 0;
  S.hero = {
    x: 640, y: 360, vx: 0, vy: 0, hp: HERO.hp, maxHp: HERO.hp,
    fireT: 0, dashT: 0, dashCd: 0, dashDx: 0, dashDy: 0,
    shockCd: 0, dead: false, respawnT: 0, hurtT: 0, shieldT: 0, face: 1,
  };
  S.selected = null;
  S.pickedTower = null;
  S.hoverSpot = -1;
  S.banner = null;
  S.shake = 0;
  S.speed = 1;
  S.boons = {};
  S.mods = freshMods();
  S.runSeed = seed;
  S.autoStart = 0;
  S.result = null;
  S.frozen = false;
}
