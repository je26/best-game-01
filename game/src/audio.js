// Procedural WebAudio: every sound effect is synthesized, and the music is a
// small generative sequencer. No audio files. The context starts on the first
// player gesture (browser autoplay rules).
import { S } from './state.js';
import { rng } from './rng.js';

let ctx = null;
let master = null;
let musicGain = null;
let musicTimer = null;
let step = 0;
let intensity = 0; // 0 calm .. 1 storm, follows the wave number

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const ROOT = 220; // A3

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = S.muted ? 0 : S.volume;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(master);
    startMusic();
  } catch (e) { ctx = null; }
}

export function setMuted(m) {
  S.muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : S.volume, ctx.currentTime, 0.02);
}

export function setVolume(v) {
  S.volume = v;
  if (master && ctx && !S.muted) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
}

export function setIntensity(v) {
  intensity = Math.max(0, Math.min(1, v));
}

function tone(freq, dur, type, vol, slideTo, when) {
  if (!ctx) return;
  const t = when || ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol, filterFreq, when) {
  if (!ctx) return;
  const t = when || ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (rng() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq || 1200;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
}

export function sfx(name) {
  if (!ctx || S.muted) return;
  switch (name) {
    case 'shoot': tone(880, 0.07, 'triangle', 0.08, 520); break;
    case 'hit': tone(220, 0.05, 'square', 0.05, 160); break;
    case 'pop': tone(520, 0.12, 'sine', 0.16, 120); noise(0.08, 0.08, 900); break;
    case 'coin': tone(1320, 0.09, 'sine', 0.1); tone(1760, 0.12, 'sine', 0.08, 0, ctx.currentTime + 0.05); break;
    case 'place': tone(180, 0.12, 'sine', 0.2, 90); noise(0.06, 0.1, 500); break;
    case 'upgrade': tone(660, 0.1, 'triangle', 0.12); tone(880, 0.1, 'triangle', 0.12, 0, ctx.currentTime + 0.08); tone(1320, 0.16, 'triangle', 0.12, 0, ctx.currentTime + 0.16); break;
    case 'sell': tone(520, 0.1, 'triangle', 0.1, 380); break;
    case 'wave': tone(196, 0.3, 'sawtooth', 0.1, 196); tone(294, 0.3, 'sawtooth', 0.08, 294, ctx.currentTime + 0.12); break;
    case 'boss': tone(82, 0.7, 'sawtooth', 0.22, 55); noise(0.5, 0.12, 300); break;
    case 'leak': tone(300, 0.25, 'sawtooth', 0.14, 110); break;
    case 'dash': noise(0.16, 0.14, 2400); tone(600, 0.12, 'sine', 0.06, 900); break;
    case 'shock': tone(140, 0.35, 'sine', 0.3, 40); noise(0.25, 0.18, 700); break;
    case 'hurt': tone(160, 0.15, 'square', 0.1, 90); break;
    case 'draft': tone(523, 0.12, 'sine', 0.1); tone(784, 0.2, 'sine', 0.1, 0, ctx.currentTime + 0.1); break;
    case 'click': tone(740, 0.05, 'triangle', 0.08); break;
    case 'deny': tone(200, 0.12, 'square', 0.07, 150); break;
    case 'victory':
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.28, 'triangle', 0.14, 0, ctx.currentTime + i * 0.14));
      break;
    case 'defeat':
      [392, 370, 349, 311].forEach((f, i) => tone(f, 0.4, 'sine', 0.14, 0, ctx.currentTime + i * 0.22));
      break;
    default: break;
  }
}

function noteAt(semi, t, dur, vol) {
  const f = ROOT * Math.pow(2, semi / 12);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.value = f;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(musicGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function startMusic() {
  if (musicTimer || !ctx) return;
  const stepDur = 0.24;
  let nextT = ctx.currentTime + 0.1;
  musicTimer = setInterval(() => {
    if (!ctx || S.muted) { nextT = Math.max(nextT, ctx ? ctx.currentTime + 0.1 : 0); return; }
    while (nextT < ctx.currentTime + 0.35) {
      const s16 = step % 16;
      const bar = Math.floor(step / 16) % 4;
      // Bass on beats 0 and 8, root moves per bar: A, F, C, G.
      const roots = [0, -4, 3, -2];
      if (s16 === 0 || s16 === 8) noteAt(roots[bar] - 12, nextT, 0.5, 0.16);
      // Sparse pluck melody, denser as intensity rises.
      const density = 0.3 + intensity * 0.5;
      if (rng() < density && s16 % 2 === 0) {
        const semi = SCALE[Math.floor(rng() * SCALE.length)] + (bar === 1 ? -4 : 0);
        noteAt(semi, nextT, 0.32, 0.09);
      }
      // Soft sparkle on the off-beats at high intensity.
      if (intensity > 0.55 && s16 % 4 === 2 && rng() < 0.6) noteAt(24, nextT, 0.2, 0.05);
      step++;
      nextT += stepDur;
    }
  }, 90);
}
