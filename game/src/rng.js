// Seeded random numbers (mulberry32). All gameplay randomness flows through
// here so a shot scene can replay the same layout from its seed.
let s = 0x9e3779b9;

export function seedRng(seed) {
  s = (seed >>> 0) || 0x9e3779b9;
}

export function rng() {
  s = (s + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rand(a, b) {
  return a + rng() * (b - a);
}

export function randInt(a, b) {
  return a + Math.floor(rng() * (b - a + 1));
}

export function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function chance(p) {
  return rng() < p;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}
