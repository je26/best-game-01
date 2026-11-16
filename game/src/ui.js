// All screens and HUD, drawn on the canvas: title, how-to, HUD, tower bar,
// draft overlay, pause, victory and defeat. Immediate-mode buttons: drawn
// each frame, clicks tested against the previous frame's list.
import { S } from './state.js';
import { VIEW_W, VIEW_H, PAL, TOWERS, TOWER_ORDER, DIFFICULTIES, MAX_WAVE, MAX_LIVES } from './config.js';
import { panel, rr, text, outlineText, bar, drawHeart, drawCoin, drawStar, glow, circle } from './render.js';
import { mouse } from './input.js';
import { towerCost, upgradeCost, towerRange } from './towers.js';

let buttons = [];
let prevButtons = [];

export function beginFrame() {
  prevButtons = buttons;
  buttons = [];
}

export function uiClick(x, y) {
  for (let i = prevButtons.length - 1; i >= 0; i--) {
    const b = prevButtons[i];
    if (!b.disabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      b.onClick();
      return true;
    }
  }
  return false;
}

function button(ctx, id, x, y, w, h, label, opts) {
  const o = opts || {};
  const hover = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
  const disabled = !!o.disabled;
  ctx.fillStyle = disabled ? 'rgba(40, 60, 80, 0.85)' : hover ? 'rgba(46, 196, 182, 0.9)' : o.accent ? 'rgba(255, 125, 89, 0.9)' : 'rgba(14, 58, 92, 0.92)';
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = disabled ? 'rgba(255,255,255,0.15)' : hover ? '#fff6e3' : 'rgba(127, 231, 220, 0.5)';
  ctx.lineWidth = hover && !disabled ? 2.5 : 1.5;
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, o.size || 18, disabled ? 'rgba(255,246,227,0.45)' : PAL.cream, 'center', 700);
  buttons.push({ id, x, y, w, h, disabled, onClick: o.onClick || (() => {}) });
  return hover;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

// ---------------- HUD ----------------

export function drawHUD(ctx, actions) {
  // Top bar.
  ctx.fillStyle = 'rgba(6, 24, 40, 0.88)';
  ctx.fillRect(0, 0, VIEW_W, 52);
  ctx.strokeStyle = 'rgba(127, 231, 220, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 52.5);
  ctx.lineTo(VIEW_W, 52.5);
  ctx.stroke();

  drawCoin(ctx, 30, 27, 11);
  text(ctx, String(S.gold), 48, 28, 21, PAL.gold, 'left', 800);
  drawHeart(ctx, 130, 27, 11);
  text(ctx, S.lives + '/' + MAX_LIVES, 148, 28, 21, PAL.cream, 'left', 800);
  text(ctx, 'WAVE ' + Math.max(1, S.wave) + '/' + MAX_WAVE, 280, 28, 20, PAL.aqua, 'left', 800);
  if (S.mode === 'play' && S.phase === 'combat') {
    text(ctx, 'Foes left: ' + S.waveLeft, 430, 28, 16, PAL.pale, 'left', 600);
  } else if (S.mode === 'play' && S.phase === 'build' && S.wave > 0) {
    text(ctx, 'Build phase', 430, 28, 16, PAL.aqua, 'left', 600);
  }
  text(ctx, 'SCORE ' + S.score, 640, 28, 20, PAL.cream, 'center', 800);
  text(ctx, 'Kills ' + S.kills, 830, 28, 16, PAL.pale, 'left', 600);
  text(ctx, fmtTime(S.time), 930, 28, 16, PAL.pale, 'left', 600);

  button(ctx, 'speed', 1010, 9, 62, 34, S.speed === 2 ? '2x ▸▸' : '1x ▸', { size: 15, onClick: actions.toggleSpeed });
  button(ctx, 'mute', 1082, 9, 62, 34, S.muted ? 'Muted' : 'Sound', { size: 15, onClick: actions.toggleMute });
  button(ctx, 'pause', 1154, 9, 100, 34, 'Pause (P)', { size: 15, onClick: actions.pause });

  // Bottom bar: tower cards.
  ctx.fillStyle = 'rgba(6, 24, 40, 0.9)';
  ctx.fillRect(0, 624, VIEW_W, 96);
  ctx.strokeStyle = 'rgba(127, 231, 220, 0.25)';
  ctx.beginPath();
  ctx.moveTo(0, 624.5);
  ctx.lineTo(VIEW_W, 624.5);
  ctx.stroke();

  let cx = 14;
  for (let i = 0; i < TOWER_ORDER.length; i++) {
    const id = TOWER_ORDER[i];
    const def = TOWERS[id];
    const cost = towerCost(id);
    const afford = S.gold >= cost;
    const sel = S.selected === id;
    const w = 108, h = 78, y = 633;
    ctx.fillStyle = sel ? 'rgba(255, 197, 61, 0.25)' : afford ? 'rgba(14, 58, 92, 0.9)' : 'rgba(20, 34, 50, 0.9)';
    rr(ctx, cx, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = sel ? PAL.gold : 'rgba(127, 231, 220, 0.35)';
    ctx.lineWidth = sel ? 2.5 : 1.2;
    ctx.stroke();
    // Mini tower glyph, distinct per kind.
    drawTowerGlyph(ctx, id, cx + w / 2, y + 22, afford);
    text(ctx, def.name, cx + w / 2, y + 46, 13, afford ? PAL.cream : 'rgba(255,246,227,0.45)', 'center', 700);
    drawCoin(ctx, cx + w / 2 - 16, y + 62, 7);
    text(ctx, String(cost), cx + w / 2 - 5, y + 63, 14, afford ? PAL.gold : 'rgba(255,197,61,0.45)', 'left', 800);
    text(ctx, '[' + (i + 1) + ']', cx + w - 8, y + 12, 11, 'rgba(255,246,227,0.5)', 'right', 600);
    buttons.push({
      id: 'tower-' + id, x: cx, y, w, h, disabled: false,
      onClick: () => actions.selectTower(id),
    });
    cx += w + 8;
  }

  // Hero panel.
  const hx = cx + 4, hw = 218;
  panel(ctx, hx, 633, hw, 78, 10);
  const h = S.hero;
  text(ctx, 'REEFKEEPER', hx + 12, 647, 12, PAL.aqua, 'left', 800);
  if (h && !h.dead) {
    bar(ctx, hx + 12, 658, 120, 10, h.hp / h.maxHp, '#7fe7dc');
    text(ctx, Math.ceil(h.hp) + ' HP', hx + 138, 663, 12, PAL.cream, 'left', 700);
  } else {
    text(ctx, 'Reviving… ' + Math.ceil(h ? h.respawnT : 0) + 's', hx + 12, 663, 13, PAL.danger, 'left', 700);
  }
  // Ability chips: dash + shockwave with cooldown sweeps.
  abilityChip(ctx, hx + 12, 676, 96, 26, 'Dash [Space]', h ? h.dashCd : 0, 3, actions.dash);
  abilityChip(ctx, hx + 116, 676, 90, 26, 'Shock [Q]', h ? h.shockCd : 0, 8, actions.shock);

  // Start wave button / countdown / status panel.
  const bx = hx + hw + 10, bw = VIEW_W - bx - 14;
  if (S.mode !== 'play') {
    panel(ctx, bx, 633, bw, 78, 10);
    text(ctx, 'RUN COMPLETE', bx + bw / 2, 674, 16, PAL.gold, 'center', 800);
  } else if (S.phase === 'build' && !S.draft) {
    const label = S.wave === 0 ? 'START WAVE 1' : 'START WAVE ' + (S.wave + 1);
    const sub = S.autoStart > 0 ? 'auto in ' + Math.ceil(S.autoStart) + 's' : 'or press Enter';
    const hover = button(ctx, 'startWave', bx, 633, bw, 78, label, { size: 20, accent: true, onClick: actions.startWave });
    text(ctx, sub, bx + bw / 2, 700, 13, hover ? PAL.cream : 'rgba(255,246,227,0.75)', 'center', 600);
  } else if (S.phase === 'combat') {
    panel(ctx, bx, 633, bw, 78, 10);
    text(ctx, 'WAVE ' + S.wave + ' RUNNING', bx + bw / 2, 664, 16, PAL.aqua, 'center', 800);
    text(ctx, S.waveLeft + ' foes left', bx + bw / 2, 688, 14, PAL.pale, 'center', 600);
  } else {
    panel(ctx, bx, 633, bw, 78, 10);
    text(ctx, 'CHOOSE A BOON', bx + bw / 2, 674, 16, PAL.gold, 'center', 800);
  }

  // Selected tower popup: upgrade / sell.
  if (S.pickedTower) drawTowerPopup(ctx, actions);
}

function drawTowerGlyph(ctx, id, x, y, afford) {
  const def = TOWERS[id];
  const c = afford ? def.color : 'rgba(255,255,255,0.3)';
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  if (id === 'anemone') {
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x + Math.cos(a) * 12, y + 8 + Math.sin(a) * 12);
      ctx.stroke();
    }
    circle(ctx, x, y + 8, 4);
    ctx.fill();
  } else if (id === 'mortar') {
    circle(ctx, x, y + 2, 9);
    ctx.fill();
    ctx.fillStyle = '#8d4a3a';
    ctx.fillRect(x - 2.5, y - 12, 5, 11);
  } else if (id === 'jelly') {
    ctx.beginPath();
    ctx.arc(x, y + 2, 10, Math.PI, 0);
    ctx.fill();
    ctx.lineWidth = 1.8;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * 6, y + 2);
      ctx.lineTo(x + k * 6, y + 10);
      ctx.stroke();
    }
  } else if (id === 'urchin') {
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
      ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
      ctx.stroke();
    }
    ctx.fillStyle = '#2a2140';
    circle(ctx, x, y, 5);
    ctx.fill();
  } else if (id === 'clam') {
    ctx.fillStyle = afford ? '#e8dcc8' : 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c;
    circle(ctx, x, y - 1, 5);
    ctx.fill();
  } else if (id === 'star') {
    drawStar(ctx, x, y, 11, c);
  }
}

function abilityChip(ctx, x, y, w, h, label, cd, maxCd, onClick) {
  const ready = cd <= 0;
  ctx.fillStyle = ready ? 'rgba(46, 196, 182, 0.35)' : 'rgba(20, 34, 50, 0.9)';
  rr(ctx, x, y, w, h, 7);
  ctx.fill();
  ctx.strokeStyle = ready ? PAL.teal : 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (!ready) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const f = cd / maxCd;
    rr(ctx, x, y, w * f, h, 7);
    ctx.fill();
  }
  text(ctx, ready ? label : label.split(' [')[0] + ' ' + cd.toFixed(1), x + w / 2, y + h / 2 + 1, 12, ready ? PAL.cream : 'rgba(255,246,227,0.6)', 'center', 700);
  buttons.push({ id: 'ability-' + label, x, y, w, h, disabled: !ready, onClick });
}

function drawTowerPopup(ctx, actions) {
  const t = S.pickedTower;
  const def = TOWERS[t.id];
  const w = 250, h = 118;
  let x = Math.max(8, Math.min(VIEW_W - w - 8, t.x - w / 2));
  let y = t.y - h - 30;
  if (y < 58) y = t.y + 34;
  panel(ctx, x, y, w, h, 12);
  text(ctx, def.name + '  ·  Tier ' + t.tier, x + 14, y + 22, 17, PAL.cream, 'left', 800);
  text(ctx, def.desc, x + 14, y + 44, 13, PAL.pale, 'left', 600);
  text(ctx, 'Range ' + Math.round(towerRange(t)) + '  ·  Invested ' + t.invested + 'g', x + 14, y + 64, 13, PAL.aqua, 'left', 600);
  if (t.tier < 3) {
    const cost = upgradeCost(t);
    button(ctx, 'upgrade', x + 14, y + 76, 106, 30, 'Upgrade ' + cost + 'g', {
      size: 14, disabled: S.gold < cost, onClick: actions.upgrade,
    });
  } else {
    text(ctx, 'Fully upgraded ★★★', x + 14, y + 91, 14, PAL.gold, 'left', 700);
  }
  const refund = Math.round(t.invested * S.mods.sellRate);
  button(ctx, 'sell', x + 130, y + 76, 106, 30, 'Sell +' + refund + 'g', { size: 14, onClick: actions.sell });
}

// ---------------- Title / how-to ----------------

export function drawTitle(ctx, actions, t) {
  ctx.fillStyle = 'rgba(4, 14, 26, 0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  glow(ctx, 640, 250, 300, 'rgba(255, 125, 89, 0.25)', 0.5);
  const bob = Math.sin(t * 1.2) * 6;
  outlineText(ctx, 'CORALHOLD', 640, 196 + bob, 84, '#ffd9c9', 'center', 900);
  outlineText(ctx, 'Defend the Heart Reef', 640, 258 + bob, 30, PAL.aqua, 'center', 700);
  text(ctx, 'A tower-defence with a hero you swim. Place coral towers, draft boons,', 640, 308, 17, PAL.cream, 'center', 600);
  text(ctx, 'and hold the reef through 15 waves — then dawn breaks.', 640, 332, 17, PAL.cream, 'center', 600);

  // Difficulty pills.
  text(ctx, 'DIFFICULTY', 640, 386, 14, PAL.aqua, 'center', 800);
  const diffs = ['calm', 'current', 'storm'];
  let dx = 640 - (diffs.length * 170 + (diffs.length - 1) * 12) / 2;
  for (const d of diffs) {
    const sel = S.difficulty === d;
    ctx.fillStyle = sel ? 'rgba(255, 197, 61, 0.3)' : 'rgba(14, 58, 92, 0.9)';
    rr(ctx, dx, 398, 170, 52, 10);
    ctx.fill();
    ctx.strokeStyle = sel ? PAL.gold : 'rgba(127, 231, 220, 0.35)';
    ctx.lineWidth = sel ? 2.5 : 1.2;
    ctx.stroke();
    text(ctx, DIFFICULTIES[d].name, dx + 85, 416, 18, PAL.cream, 'center', 800);
    text(ctx, DIFFICULTIES[d].desc, dx + 85, 438, 11, PAL.pale, 'center', 600);
    buttons.push({ id: 'diff-' + d, x: dx, y: 398, w: 170, h: 52, disabled: false, onClick: () => actions.setDifficulty(d) });
    dx += 182;
  }

  button(ctx, 'start', 490, 478, 300, 56, '▶  START THE DEFENCE', { size: 22, accent: true, onClick: actions.start });
  button(ctx, 'howto', 490, 546, 300, 44, 'How to Play', { size: 17, onClick: actions.howto });
  button(ctx, 'mute-title', 1150, 16, 104, 34, S.muted ? 'Muted' : 'Sound', { size: 14, onClick: actions.toggleMute });

  if (S.best.score > 0 || S.best.wins > 0) {
    text(ctx, 'Best score ' + S.best.score + '  ·  Best wave ' + S.best.wave + '  ·  Reefs saved ' + S.best.wins,
      640, 632, 16, PAL.gold, 'center', 700);
  }
  text(ctx, 'Keyboard + mouse  ·  WASD swim  ·  Hold mouse to shoot  ·  1-6 towers  ·  Space dash  ·  Q shockwave',
    640, 686, 14, 'rgba(255, 246, 227, 0.65)', 'center', 600);
}

export function drawHowto(ctx, actions) {
  ctx.fillStyle = 'rgba(4, 14, 26, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 290, 84, 700, 552, 16);
  outlineText(ctx, 'HOW TO PLAY', 640, 128, 34, PAL.cream, 'center', 900);
  const lines = [
    ['Goal', 'The pale tide follows the sandy path to the Heart Coral. If 20 lives leak away, the reef falls. Survive all 15 waves to win.'],
    ['Towers', 'Pick a tower (keys 1-6 or click a card), then click a sandy ring to build it. Click a built tower to upgrade or sell it. Towers fire on their own.'],
    ['Hero', 'Swim with WASD or arrow keys. Hold the mouse button to shoot bubbles toward the cursor. Space dashes through danger; Q unleashes a shockwave.'],
    ['Waves', 'Press Enter or Start Wave when ready. Clearing a wave earns gold plus interest on what you banked. Bosses arrive on waves 5, 10 and 15.'],
    ['Boons', 'After each wave, draft 1 of 3 boons: permanent upgrades for towers, gold, lives or the hero. Choices stack across the run.'],
    ['Tips', 'Jelly Lanterns slow whole packs. Star Wardens buff neighbours. Save gold for interest — but never at the cost of a leak.'],
  ];
  let y = 168;
  for (const [head, body] of lines) {
    text(ctx, head, 322, y, 17, PAL.gold, 'left', 800);
    wrapText(ctx, body, 322, y + 22, 636, 15, PAL.cream);
    y += 66;
  }
  text(ctx, 'P pause  ·  F speed  ·  M mute  ·  Esc cancel / pause  ·  Right-click: shockwave (or cancel a build)',
    640, 584, 13, PAL.pale, 'center', 600);
  button(ctx, 'howto-back', 490, 596 - 22, 300, 44, 'Back', { size: 17, onClick: actions.back });
}

function wrapText(ctx, str, x, y, maxW, size, color) {
  ctx.font = '600 ' + size + "px 'Trebuchet MS', 'Segoe UI', Verdana, sans-serif";
  const words = str.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(line, x, yy);
      line = word;
      yy += size + 5;
    } else {
      line = test;
    }
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(line, x, yy);
}

// ---------------- Draft / pause ----------------

export function drawDraft(ctx, actions) {
  ctx.fillStyle = 'rgba(4, 14, 26, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  outlineText(ctx, 'WAVE ' + S.wave + ' CLEARED — CHOOSE A BOON', 640, 158, 32, PAL.gold, 'center', 900);
  text(ctx, 'One permanent upgrade. It stays for the whole run.', 640, 194, 16, PAL.cream, 'center', 600);
  const opts = S.draft.options;
  const cw = 250, ch = 240, gap = 24;
  let x = 640 - (opts.length * cw + (opts.length - 1) * gap) / 2;
  for (let i = 0; i < opts.length; i++) {
    const b = opts[i];
    const y = 232;
    const hover = mouse.x >= x && mouse.x <= x + cw && mouse.y >= y && mouse.y <= y + ch;
    ctx.fillStyle = hover ? 'rgba(46, 196, 182, 0.25)' : 'rgba(10, 42, 68, 0.95)';
    rr(ctx, x, y, cw, ch, 14);
    ctx.fill();
    ctx.strokeStyle = hover ? PAL.gold : 'rgba(127, 231, 220, 0.4)';
    ctx.lineWidth = hover ? 2.5 : 1.5;
    ctx.stroke();
    drawBoonIcon(ctx, b.icon, x + cw / 2, y + 52);
    text(ctx, b.name, x + cw / 2, y + 104, 19, PAL.cream, 'center', 800);
    wrapTextCenter(ctx, b.desc, x + cw / 2, y + 140, cw - 36, 15, PAL.pale);
    if (S.boons[b.id]) text(ctx, 'Owned x' + S.boons[b.id], x + cw / 2, y + 196, 13, PAL.aqua, 'center', 700);
    text(ctx, '[' + (i + 1) + ']', x + cw / 2, y + ch - 18, 13, 'rgba(255,246,227,0.5)', 'center', 600);
    buttons.push({ id: 'boon-' + i, x, y, w: cw, h: ch, disabled: false, onClick: () => actions.chooseBoon(b) });
    x += cw + gap;
  }
  text(ctx, 'Next wave starts when you choose. Gold ' + S.gold + '  ·  Lives ' + S.lives, 640, 516, 15, PAL.cream, 'center', 600);
}

function drawBoonIcon(ctx, icon, x, y) {
  ctx.fillStyle = PAL.gold;
  if (icon === 'heart') drawHeart(ctx, x, y, 16, PAL.danger);
  else if (icon === 'gold' || icon === 'coin' || icon === 'bank') drawCoin(ctx, x, y, 16);
  else if (icon === 'range') { circle(ctx, x, y, 16); ctx.strokeStyle = PAL.gold; ctx.lineWidth = 3; ctx.stroke(); circle(ctx, x, y, 5); ctx.fill(); }
  else if (icon === 'rate') { for (let k = 0; k < 3; k++) { circle(ctx, x - 14 + k * 14, y, 5); ctx.fill(); } }
  else if (icon === 'crit') drawStar(ctx, x, y, 17, PAL.gold);
  else if (icon === 'slow') { ctx.fillStyle = '#7fe7dc'; circle(ctx, x, y, 15); ctx.fill(); ctx.fillStyle = '#0a2033'; text(ctx, '❄', x, y + 1, 20, '#0a2033', 'center', 700); }
  else if (icon === 'hero' || icon === 'dash' || icon === 'wind') { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.ellipse(x, y, 18, 9, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (icon === 'shock') { ctx.strokeStyle = PAL.gold; ctx.lineWidth = 3; circle(ctx, x, y, 15); ctx.stroke(); circle(ctx, x, y, 7); ctx.stroke(); }
  else if (icon === 'build') { ctx.fillStyle = '#ff8fa3'; circle(ctx, x, y, 14); ctx.fill(); }
  else if (icon === 'regen') { ctx.fillStyle = '#7fe7dc'; circle(ctx, x, y, 14); ctx.fill(); ctx.fillStyle = '#fff6e3'; text(ctx, '+', x, y + 1, 22, '#fff6e3', 'center', 800); }
  else if (icon === 'sell') { drawCoin(ctx, x, y, 13); }
  else drawStar(ctx, x, y, 16, PAL.gold);
}

function wrapTextCenter(ctx, str, cx, y, maxW, size, color) {
  ctx.font = '600 ' + size + "px 'Trebuchet MS', 'Segoe UI', Verdana, sans-serif";
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
    else line = test;
  }
  lines.push(line);
  lines.forEach((ln, i) => {
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ln, cx, y + i * (size + 6));
  });
}

export function drawPause(ctx, actions) {
  ctx.fillStyle = 'rgba(4, 14, 26, 0.65)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 440, 190, 400, 340, 16);
  outlineText(ctx, 'PAUSED', 640, 238, 36, PAL.cream, 'center', 900);
  text(ctx, 'Wave ' + S.wave + '  ·  Score ' + S.score, 640, 276, 16, PAL.pale, 'center', 600);
  button(ctx, 'resume', 490, 300, 300, 46, 'Resume', { size: 18, accent: true, onClick: actions.resume });
  button(ctx, 'restart', 490, 356, 300, 46, 'Restart Run', { size: 18, onClick: actions.restart });
  button(ctx, 'pause-howto', 490, 412, 300, 46, 'How to Play', { size: 18, onClick: actions.howto });
  // Volume slider.
  text(ctx, 'Volume', 490, 486, 15, PAL.cream, 'left', 700);
  const sx = 570, sw = 180;
  bar(ctx, sx, 478, sw, 12, S.volume, PAL.teal);
  buttons.push({
    id: 'volume', x: sx - 6, y: 470, w: sw + 12, h: 28, disabled: false,
    onClick: () => actions.setVolume(Math.max(0, Math.min(1, (mouse.x - sx) / sw))),
  });
  button(ctx, 'pause-mute', 760, 470, 60, 28, S.muted ? 'Off' : 'On', { size: 13, onClick: actions.toggleMute });
  button(ctx, 'quit', 490, 506 - 22, 300, 40, 'Quit to Title', { size: 16, onClick: actions.quit });
}

// ---------------- End screens ----------------

export function drawEndScreen(ctx, actions, won, starT) {
  ctx.fillStyle = won ? 'rgba(4, 14, 26, 0.55)' : 'rgba(20, 4, 12, 0.62)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 380, 130, 520, 460, 18);
  if (won) {
    for (let i = 0; i < 3; i++) {
      const lit = i < S.result.stars && starT > 0.25 + i * 0.3;
      const sc = lit ? 1 + Math.max(0, 0.3 - (starT - 0.25 - i * 0.3)) * 1.2 : 1;
      ctx.save();
      ctx.translate(540 + i * 100, 196);
      ctx.scale(sc, sc);
      drawStar(ctx, 0, 0, 30, lit ? PAL.star : 'rgba(255,255,255,0.18)');
      ctx.restore();
    }
    outlineText(ctx, 'DAWN BREAKS', 640, 258, 44, PAL.gold, 'center', 900);
    text(ctx, 'The reef endures. The Heart Coral shines on.', 640, 296, 16, PAL.cream, 'center', 600);
  } else {
    outlineText(ctx, 'THE LIGHT FADES', 640, 196, 40, PAL.danger, 'center', 900);
    text(ctx, 'The pale tide took the Heart Coral on wave ' + S.wave + '.', 640, 236, 16, PAL.cream, 'center', 600);
  }
  const st = S.result.stats;
  const rows = [
    ['Final score', String(st.score)],
    ['Waves held', st.waves + ' / ' + MAX_WAVE],
    ['Foes defeated', String(st.kills)],
    ['Gold gathered', String(st.goldEarned) + 'g'],
    ['Towers built', String(st.towers)],
    ['Time', fmtTime(st.time)],
    ['Difficulty', DIFFICULTIES[S.difficulty].name],
  ];
  let y = won ? 330 : 280;
  for (const [k, v] of rows) {
    text(ctx, k, 440, y, 16, PAL.pale, 'left', 600);
    text(ctx, v, 840, y, 16, PAL.cream, 'right', 800);
    y += 25;
  }
  if (st.newBest) text(ctx, '★ NEW BEST SCORE ★', 640, y + 2, 17, PAL.gold, 'center', 800);
  button(ctx, 'again', 420, 522, 240, 50, won ? '▶  PLAY AGAIN' : '↻  TRY AGAIN', { size: 19, accent: true, onClick: actions.again });
  button(ctx, 'end-title', 680, 522, 180, 50, 'Title', { size: 17, onClick: actions.quit });
}

// ---------------- Banner ----------------

export function drawBanner(ctx) {
  const b = S.banner;
  if (!b) return;
  const fadeIn = Math.min(1, b.t / 0.25);
  const fadeOut = Math.min(1, (b.dur - b.t) / 0.4);
  const a = Math.max(0, Math.min(fadeIn, fadeOut));
  ctx.globalAlpha = a;
  outlineText(ctx, b.text, 640, 100, 38, PAL.cream, 'center', 900);
  text(ctx, b.sub, 640, 134, 17, PAL.aqua, 'center', 700);
  ctx.globalAlpha = 1;
}
