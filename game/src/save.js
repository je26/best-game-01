// Best score, victories and settings in localStorage. Guarded: private
// browsing or a blocked store must never break the game.
import { S } from './state.js';

const KEY = 'coralhold-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.best) S.best = { score: d.best.score | 0, wave: d.best.wave | 0, wins: d.best.wins | 0 };
    if (typeof d.muted === 'boolean') S.muted = d.muted;
    if (typeof d.volume === 'number') S.volume = Math.max(0, Math.min(1, d.volume));
    if (d.difficulty) S.difficulty = d.difficulty;
  } catch (e) { /* storage unavailable: play without saving */ }
}

export function saveSave() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      best: S.best, muted: S.muted, volume: S.volume, difficulty: S.difficulty,
    }));
  } catch (e) { /* ignore */ }
}

export function recordResult(won) {
  if (S.score > S.best.score) S.best.score = S.score;
  if (S.wave > S.best.wave) S.best.wave = S.wave;
  if (won) S.best.wins += 1;
  saveSave();
}
