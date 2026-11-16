// The orchestrator: input routing, the simulation step, rendering order and
// run lifecycle (start, win, lose, restart). Modes: title, howto, play,
// victory, defeat; pause and draft overlay play.
import { S, resetRun } from './state.js';
import { VIEW_W, VIEW_H, TOWER_ORDER, MAX_WAVE, STEP } from './config.js';
import { pollClicks, pollKeys, mouse, keyDown } from './input.js';
import { seedRng } from './rng.js';
import { drawBackground, drawPath, drawSpots, drawHeartCoral, SPOTS } from './map.js';
import { updateEnemies, drawEnemies } from './enemies.js';
import { updateTowers, drawTowers, drawPlacementGhost, placeTower, upgradeTower, sellTower, canPlace, spotTaken } from './towers.js';
import { updateHero, drawHero, heroDash, heroShockwave } from './hero.js';
import { updateProjectiles, drawProjectiles } from './projectiles.js';
import { updateParticles, drawParticles, drawFloaters } from './particles.js';
import { startWave, updateWaves } from './waves.js';
import { applyBoon } from './draft.js';
import { beginFrame, uiClick, drawHUD, drawTitle, drawHowto, drawDraft, drawPause, drawEndScreen, drawBanner } from './ui.js';
import { setMuted, setVolume, setIntensity, sfx, initAudio } from './audio.js';
import { recordResult, saveSave } from './save.js';
import { rand } from './rng.js';

export function newRun(difficulty) {
  const seed = (Date.now() % 2147483647) || 1;
  seedRng(seed);
  resetRun(difficulty, seed);
  S.banner = { text: 'DEFEND THE HEART REEF', sub: 'Place towers, then start wave 1.', t: 0, dur: 2.6 };
  setIntensity(0.15);
}

function endRun(won) {
  const stars = !won ? 0 : S.lives >= 15 ? 3 : S.lives >= 8 ? 2 : 1;
  const newBest = S.score > S.best.score;
  S.result = {
    won, stars, starT: 0,
    stats: {
      score: S.score, waves: S.wave, kills: S.kills,
      goldEarned: S.goldEarned, towers: S.towersBuilt, time: S.time, newBest,
    },
  };
  recordResult(won);
  S.mode = won ? 'victory' : 'defeat';
  S.paused = false;
  S.draft = null;
  setIntensity(won ? 0.2 : 0);
  sfx(won ? 'victory' : 'defeat');
}

// One fixed simulation step. Exported so shot staging can run the real sim.
export function stepSim(dt) {
  S.time += dt;
  updateWaves(dt);
  updateEnemies(dt);
  updateTowers(dt);
  updateHero(dt);
  updateProjectiles(dt);
  updateParticles(dt);
  if (S.banner) {
    S.banner.t += dt;
    if (S.banner.t >= S.banner.dur) S.banner = null;
  }
  if (S.phase === 'done' && S.mode === 'play') endRun(true);
  else if (S.lives <= 0 && S.mode === 'play') endRun(false);
}

function simulating() {
  return S.mode === 'play' && !S.paused && !S.draft && !S.frozen;
}

function nearestSpot(x, y, maxD) {
  let best = -1, bestD = maxD;
  for (let i = 0; i < SPOTS.length; i++) {
    const d = Math.hypot(SPOTS[i].x - x, SPOTS[i].y - y);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function towerAtPoint(x, y) {
  for (const t of S.towers) {
    if (Math.hypot(t.x - x, t.y - y) < 30) return t;
  }
  return null;
}

function handlePlayClick(c) {
  if (c.button === 2) {
    if (S.selected) { S.selected = null; return; }
    if (S.pickedTower) { S.pickedTower = null; return; }
    heroShockwave();
    return;
  }
  if (c.button !== 0) return;
  if (S.selected) {
    const spot = nearestSpot(c.x, c.y, 48);
    if (spot >= 0 && !spotTaken(spot)) {
      // Keep the type selected for rapid building while affordable.
      if (placeTower(S.selected, spot) && !canPlace(S.selected, nearestSpot(c.x, c.y, 48))) {
        S.selected = null;
      }
    } else {
      const t = towerAtPoint(c.x, c.y);
      if (t) { S.selected = null; S.pickedTower = t; }
      else sfx('deny');
    }
    return;
  }
  const t = towerAtPoint(c.x, c.y);
  S.pickedTower = t;
}

function handleKeys(codes) {
  for (const code of codes) {
    if (code === 'KeyM') { setMuted(!S.muted); saveSave(); continue; }
    if (S.mode === 'title') {
      if (code === 'Enter' || code === 'Space') { initAudio(); newRun(S.difficulty); }
      else if (code === 'KeyH') S.mode = 'howto';
      continue;
    }
    if (S.mode === 'howto') {
      if (code === 'Escape' || code === 'Enter') S.mode = S.paused ? 'play' : 'title';
      continue;
    }
    if (S.mode === 'victory' || S.mode === 'defeat') {
      if (code === 'Enter' || code === 'Space') newRun(S.difficulty);
      else if (code === 'Escape') { S.mode = 'title'; setIntensity(0.15); }
      continue;
    }
    if (S.mode !== 'play') continue;
    if (S.draft) {
      const idx = ['Digit1', 'Digit2', 'Digit3'].indexOf(code);
      if (idx >= 0 && S.draft.options[idx]) applyBoon(S.draft.options[idx]);
      continue;
    }
    if (code === 'Escape' || code === 'KeyP') {
      if (S.selected) S.selected = null;
      else if (S.pickedTower) S.pickedTower = null;
      else { S.paused = !S.paused; sfx('click'); }
      continue;
    }
    if (S.paused) {
      if (code === 'Enter') S.paused = false;
      continue;
    }
    if (code === 'KeyF') { S.speed = S.speed === 1 ? 2 : 1; continue; }
    if (code === 'Enter') { if (S.phase === 'build') startWave(); continue; }
    if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') { heroDash(); continue; }
    if (code === 'KeyQ' || code === 'KeyE') { heroShockwave(); continue; }
    if (code === 'KeyU' && S.pickedTower) { upgradeTower(S.pickedTower); continue; }
    if ((code === 'Delete' || code === 'Backspace') && S.pickedTower) { sellTower(S.pickedTower); continue; }
    const ti = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(code);
    if (ti >= 0) {
      const id = TOWER_ORDER[ti];
      S.selected = S.selected === id ? null : id;
      S.pickedTower = null;
      sfx('click');
    }
  }
}

const actions = {
  start: () => { initAudio(); sfx('click'); newRun(S.difficulty); },
  howto: () => { S.mode = 'howto'; sfx('click'); },
  back: () => { S.mode = S.paused ? 'play' : 'title'; S.paused = false; sfx('click'); },
  quit: () => { S.mode = 'title'; S.paused = false; setIntensity(0.15); sfx('click'); },
  restart: () => { S.paused = false; newRun(S.difficulty); sfx('click'); },
  again: () => { newRun(S.difficulty); sfx('click'); },
  resume: () => { S.paused = false; sfx('click'); },
  pause: () => { S.paused = true; sfx('click'); },
  toggleMute: () => { setMuted(!S.muted); saveSave(); },
  toggleSpeed: () => { S.speed = S.speed === 1 ? 2 : 1; sfx('click'); },
  setDifficulty: (d) => { S.difficulty = d; saveSave(); sfx('click'); },
  selectTower: (id) => { S.selected = S.selected === id ? null : id; S.pickedTower = null; sfx('click'); },
  upgrade: () => { if (S.pickedTower) upgradeTower(S.pickedTower); },
  sell: () => { if (S.pickedTower) sellTower(S.pickedTower); },
  dash: () => heroDash(),
  shock: () => heroShockwave(),
  startWave: () => startWave(),
  chooseBoon: (b) => applyBoon(b),
  setVolume: (v) => { setVolume(v); saveSave(); },
};

export function autoPause() {
  if (S.mode === 'play' && S.phase === 'combat' && !S.draft) S.paused = true;
}

export function update(dt) {
  handleKeys(pollKeys());
  const clicks = pollClicks();
  for (const c of clicks) {
    if (uiClick(c.x, c.y)) continue;
    if (S.mode === 'play' && !S.paused && !S.draft) handlePlayClick(c);
  }
  // Hover spot highlight while placing.
  S.hoverSpot = S.selected && S.mode === 'play' && !S.paused && !S.draft
    ? nearestSpot(mouse.x, mouse.y, 48) : -1;
  // End-screen star animation + banner timers run outside the sim.
  if (S.result && (S.mode === 'victory' || S.mode === 'defeat')) S.result.starT += dt;
  if (S.mode === 'play' && S.phase === 'build' && !S.draft && S.wave > 0 && S.autoStart > 0) {
    S.autoStart -= dt;
    if (S.autoStart <= 0) startWave();
  }
  if (!simulating()) return;
  for (let i = 0; i < S.speed; i++) {
    stepSim(STEP);
    if (S.mode !== 'play') break;
  }
}

export function render(ctx) {
  beginFrame();
  const t = S.animT;
  // Screen shake.
  let sx = 0, sy = 0;
  if (S.shake > 0) {
    sx = rand(-S.shake, S.shake) * 0.5;
    sy = rand(-S.shake, S.shake) * 0.5;
  }
  ctx.save();
  ctx.translate(sx, sy);
  drawBackground(ctx, t);
  drawPath(ctx, t);
  drawSpots(ctx, S.hoverSpot);
  drawHeartCoral(ctx, t, S.lives / 20);
  if (S.mode !== 'title' && S.mode !== 'howto') {
    drawTowers(ctx, t);
    drawEnemies(ctx, t);
    drawHero(ctx, t);
    drawProjectiles(ctx);
    drawParticles(ctx);
    drawFloaters(ctx);
    if (S.selected && S.mode === 'play' && !S.paused && !S.draft && mouse.y > 52 && mouse.y < 624) {
      drawPlacementGhost(ctx, mouse.x, mouse.y, S.selected);
    }
  }
  ctx.restore();

  if (S.mode === 'title') drawTitle(ctx, actions, t);
  else if (S.mode === 'howto') drawHowto(ctx, actions);
  else if (S.mode === 'play') {
    drawHUD(ctx, actions);
    if (S.draft) drawDraft(ctx, actions);
    if (S.paused) drawPause(ctx, actions);
    drawBanner(ctx);
  } else if (S.mode === 'victory' || S.mode === 'defeat') {
    drawHUD(ctx, actions);
    drawEndScreen(ctx, actions, S.mode === 'victory', S.result ? S.result.starT : 0);
  }
}
