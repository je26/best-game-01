// Tuning, palette and all game data: towers, enemies, difficulties, boons.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;
export const MAX_WAVE = 15;
export const START_GOLD = 220;
export const START_LIVES = 20;
export const MAX_LIVES = 30;

export const PAL = {
  deep: '#07182b',
  water: '#0a2a44',
  waterTop: '#0e3a5c',
  sand: '#c9a86a',
  sandDark: '#a8894f',
  path: '#8d7346',
  coral: '#ff7a59',
  coralPink: '#ff5d8f',
  gold: '#ffc53d',
  cream: '#fff6e3',
  teal: '#2ec4b6',
  aqua: '#7fe7dc',
  enemy: '#b388ff',
  enemyDark: '#7c5cbf',
  pale: '#d9d4ff',
  danger: '#ff4d6d',
  hero: '#ffd166',
  star: '#ffe66d',
  panel: 'rgba(6, 24, 40, 0.92)',
  panelEdge: 'rgba(127, 231, 220, 0.35)',
};

export const DIFFICULTIES = {
  calm: { name: 'Calm', hp: 0.8, speed: 0.92, gold: 1.15, score: 1.0, desc: 'Gentle tide. Learn the reef.' },
  current: { name: 'Current', hp: 1.0, speed: 1.0, gold: 1.0, score: 1.25, desc: 'The intended challenge.' },
  storm: { name: 'Storm', hp: 1.3, speed: 1.08, gold: 0.9, score: 1.6, desc: 'Relentless. For wardens only.' },
};

// Towers: id, name, cost, range, rate (shots/s), damage, splash, slow, pierce,
// chain, buff, colour, short description. Tier multipliers in towers.js.
export const TOWERS = {
  anemone: { name: 'Anemone', cost: 60, range: 115, rate: 1.7, damage: 9, color: '#ff8fa3', desc: 'Fast stinging shots.' },
  mortar: { name: 'Coral Mortar', cost: 110, range: 155, rate: 0.75, damage: 24, splash: 55, color: '#ff7a59', desc: 'Splash damage shells.' },
  jelly: { name: 'Jelly Lantern', cost: 90, range: 95, rate: 1.0, damage: 6, slow: 0.3, color: '#7fe7dc', desc: 'Slows foes nearby.' },
  urchin: { name: 'Urchin', cost: 130, range: 175, rate: 1.1, damage: 15, pierce: true, color: '#b388ff', desc: 'Spines pierce a line.' },
  clam: { name: 'Clam Cannon', cost: 180, range: 205, rate: 0.45, damage: 65, splash: 42, color: '#ffc53d', desc: 'Slow, heavy pearls.' },
  star: { name: 'Star Warden', cost: 150, range: 115, rate: 0.9, damage: 11, chain: 3, buff: 0.22, color: '#ffe66d', desc: 'Bolts chain; buffs allies.' },
};
export const TOWER_ORDER = ['anemone', 'mortar', 'jelly', 'urchin', 'clam', 'star'];
export const TIER_COST = [0, 0.8, 1.3]; // fraction of base cost for tier 2 and 3
export const SELL_RATE = 0.7;

// Enemies: id, name, hp, speed (px/s), gold, score, radius, colour.
export const ENEMIES = {
  drifter: { name: 'Drifter', hp: 34, speed: 44, gold: 6, score: 50, radius: 13, color: '#b388ff' },
  swiftfin: { name: 'Swiftfin', hp: 22, speed: 70, gold: 7, score: 60, radius: 11, color: '#7fd4ff' },
  bulwark: { name: 'Bulwark Crab', hp: 150, speed: 27, gold: 12, score: 120, radius: 19, color: '#e07a5f' },
  splitter: { name: 'Splitter', hp: 55, speed: 38, gold: 8, score: 80, radius: 15, color: '#95d5b2', splits: true },
  mini: { name: 'Splinter', hp: 22, speed: 52, gold: 3, score: 25, radius: 9, color: '#b7efc5' },
  mender: { name: 'Mender', hp: 48, speed: 40, gold: 10, score: 90, radius: 13, color: '#f4a7c3', heals: 7 },
  wraith: { name: 'Gloom Wraith', hp: 40, speed: 56, gold: 11, score: 100, radius: 12, color: '#d9d4ff', shimmer: true },
  spitter: { name: 'Spitter', hp: 60, speed: 36, gold: 12, score: 110, radius: 14, color: '#ffd166', shoots: true },
  leviathan: { name: 'Leviathan', hp: 2400, speed: 21, gold: 260, score: 2500, radius: 34, color: '#5c6bc0', boss: true },
};
export const WAVE_HP_GROWTH = 0.17;

// Boons offered between waves. stack: may be taken more than once.
export const BOONS = [
  { id: 'sharpen', name: 'Sharpened Spines', desc: '+20% tower damage.', stack: true, icon: 'dmg' },
  { id: 'longshot', name: 'Far Sight', desc: '+15% tower range.', stack: true, icon: 'range' },
  { id: 'rapid', name: 'Quick Current', desc: '+12% tower fire rate.', stack: true, icon: 'rate' },
  { id: 'gilded', name: 'Gilded Tide', desc: '+25% gold from kills.', stack: true, icon: 'gold' },
  { id: 'crit', name: 'Lucky Pearl', desc: 'Towers crit 12% of the time for double damage.', stack: true, icon: 'crit' },
  { id: 'chilling', name: 'Cold Snap', desc: 'Slows are 12% stronger.', stack: true, icon: 'slow' },
  { id: 'pockets', name: 'Deep Pockets', desc: 'Gain 120 gold right now.', icon: 'coin' },
  { id: 'heartwood', name: 'Heartwood', desc: '+4 lives, up to 30.', icon: 'heart' },
  { id: 'heroPower', name: 'Heroic Bubbles', desc: '+35% hero damage.', stack: true, icon: 'hero' },
  { id: 'swift', name: 'Swift Fins', desc: 'Hero abilities recharge 25% faster.', icon: 'dash' },
  { id: 'builder', name: 'Master Builder', desc: 'Towers cost 15% less from now on.', icon: 'build' },
  { id: 'interest', name: 'Patient Reef', desc: '+5% interest on gold at each wave end.', icon: 'bank' },
  { id: 'regen', name: 'Warm Spring', desc: 'Hero regenerates +6 health per second.', icon: 'regen' },
  { id: 'shock', name: 'Storm Surge', desc: 'Shockwave +50% damage and radius.', icon: 'shock' },
  { id: 'salvage', name: 'Salvage Rights', desc: 'Selling towers refunds 90% instead of 70%.', icon: 'sell' },
  { id: 'secondWind', name: 'Second Wind', desc: 'Hero revives in 2s with a brief shield.', icon: 'wind' },
];

export const HERO = {
  speed: 235,
  hp: 100,
  regen: 4,
  regenDelay: 3,
  fireRate: 4,
  damage: 9,
  dashDist: 250,
  dashTime: 0.16,
  dashCd: 3,
  shockDamage: 35,
  shockRadius: 140,
  shockCd: 8,
  respawn: 4,
};
