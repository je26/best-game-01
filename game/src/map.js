// The reef map: the winding path enemies follow, the sandy build spots, the
// Heart Coral, and the animated underwater background.
import { VIEW_W, VIEW_H, PAL } from './config.js';
import { rand } from './rng.js';

export const PATH = [
  { x: -40, y: 150 }, { x: 1050, y: 150 }, { x: 1050, y: 300 },
  { x: 230, y: 300 }, { x: 230, y: 450 }, { x: 1050, y: 450 },
  { x: 1050, y: 585 }, { x: 1130, y: 585 },
];
export const HEART = { x: 1168, y: 585, r: 30 };

// Cumulative segment lengths, computed once.
const SEGS = [];
export let PATH_LEN = 0;
for (let i = 0; i < PATH.length - 1; i++) {
  const dx = PATH[i + 1].x - PATH[i].x;
  const dy = PATH[i + 1].y - PATH[i].y;
  const len = Math.hypot(dx, dy);
  SEGS.push({ x: PATH[i].x, y: PATH[i].y, dx: dx / len, dy: dy / len, len, start: PATH_LEN });
  PATH_LEN += len;
}

export function pointAt(d) {
  const dist = Math.max(0, Math.min(PATH_LEN, d));
  for (let i = SEGS.length - 1; i >= 0; i--) {
    if (dist >= SEGS[i].start) {
      const t = dist - SEGS[i].start;
      return { x: SEGS[i].x + SEGS[i].dx * t, y: SEGS[i].y + SEGS[i].dy * t };
    }
  }
  return { x: PATH[0].x, y: PATH[0].y };
}

export function distToPath(x, y) {
  let best = Infinity;
  for (let i = 0; i < PATH.length - 1; i++) {
    const ax = PATH[i].x, ay = PATH[i].y;
    const bx = PATH[i + 1].x, by = PATH[i + 1].y;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = ((x - ax) * dx + (y - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, py = ay + t * dy;
    best = Math.min(best, Math.hypot(x - px, y - py));
  }
  return best;
}

// Build spots: sandy rings placed beside the path, clear of the HUD bars.
export const SPOTS = (() => {
  const spots = [];
  const rows = [
    { y: 88, xs: [150, 330, 510, 690, 870] },
    { y: 225, xs: [120, 330, 510, 690, 870, 1150] },
    { y: 375, xs: [120, 420, 600, 780, 950, 1150] },
    { y: 525, xs: [120, 330, 510, 690, 870] },
    { y: 650, xs: [330, 510, 690, 870] },
  ];
  for (const row of rows) {
    for (const x of row.xs) {
      if (distToPath(x, row.y) > 52 && Math.hypot(x - HEART.x, row.y - HEART.y) > 70) {
        spots.push({ x, y: row.y, r: 26 });
      }
    }
  }
  return spots;
})();

// Fixed decorations, generated once from the seeded rng at load.
const DECOR = (() => {
  const saved = [];
  for (let i = 0; i < 26; i++) {
    const x = 20 + rand(0, 1) * (VIEW_W - 40);
    const y = 70 + rand(0, 1) * (VIEW_H - 180);
    if (distToPath(x, y) < 46) continue;
    saved.push({ x, y, kind: i % 3, s: 0.6 + rand(0, 1) * 0.9, ph: rand(0, 6.28) });
  }
  return saved;
})();

const FISH = (() => {
  const arr = [];
  for (let i = 0; i < 9; i++) {
    arr.push({ y: 80 + rand(0, 1) * 480, speed: 12 + rand(0, 1) * 22, off: rand(0, 1400), s: 0.7 + rand(0, 1) * 0.7, hue: i % 3 });
  }
  return arr;
})();

export function drawBackground(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, PAL.waterTop);
  g.addColorStop(0.55, PAL.water);
  g.addColorStop(1, PAL.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // God rays.
  ctx.save();
  ctx.globalAlpha = 0.05 + 0.015 * Math.sin(t * 0.4);
  ctx.fillStyle = '#bfefff';
  for (let i = 0; i < 4; i++) {
    const x = 180 + i * 300 + Math.sin(t * 0.13 + i) * 24;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 90, 0);
    ctx.lineTo(x + 190, VIEW_H);
    ctx.lineTo(x + 40, VIEW_H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Sandy floor wash under the path rows.
  ctx.fillStyle = 'rgba(201, 168, 106, 0.09)';
  for (const y of [150, 300, 450, 585]) {
    ctx.beginPath();
    ctx.ellipse(600, y + 26, 620, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ambient bubbles rising through the water (deterministic drift).
  ctx.strokeStyle = 'rgba(207, 238, 255, 0.35)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 22; k++) {
    const bx = ((k * 173) % 1240) + 20 + Math.sin(t * 0.5 + k) * 8;
    const by = VIEW_H - ((t * (14 + (k % 5) * 6) + k * 67) % (VIEW_H + 40)) + 20;
    ctx.beginPath();
    ctx.arc(bx, by, 2 + (k % 3), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Distant reef silhouettes.
  ctx.fillStyle = 'rgba(10, 42, 68, 0.9)';
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 190;
    const h = 40 + ((i * 37) % 50);
    ctx.beginPath();
    ctx.moveTo(x - 70, VIEW_H);
    ctx.quadraticCurveTo(x - 30, VIEW_H - h - 30, x, VIEW_H - h);
    ctx.quadraticCurveTo(x + 30, VIEW_H - h - 24, x + 70, VIEW_H);
    ctx.closePath();
    ctx.fill();
  }

  // Decorations: seaweed, shells, small corals.
  for (const d of DECOR) {
    const sway = Math.sin(t * 0.9 + d.ph) * 3 * d.s;
    if (d.kind === 0) {
      ctx.strokeStyle = 'rgba(46, 196, 182, 0.55)';
      ctx.lineWidth = 3 * d.s;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y + 14);
      ctx.quadraticCurveTo(d.x + sway, d.y, d.x + sway * 2, d.y - 20 * d.s);
      ctx.stroke();
    } else if (d.kind === 1) {
      ctx.fillStyle = 'rgba(255, 125, 89, 0.5)';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 6 * d.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 93, 143, 0.5)';
      ctx.beginPath();
      ctx.arc(d.x + 8 * d.s, d.y + 3, 4 * d.s, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(201, 168, 106, 0.6)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 7 * d.s, 4 * d.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Background fish.
  for (const f of FISH) {
    const x = ((f.off + t * f.speed) % 1400) - 60;
    const y = f.y + Math.sin(t * 0.8 + f.off) * 6;
    ctx.fillStyle = ['rgba(127, 212, 255, 0.35)', 'rgba(255, 214, 102, 0.3)', 'rgba(179, 136, 255, 0.3)'][f.hue];
    ctx.beginPath();
    ctx.ellipse(x, y, 10 * f.s, 5 * f.s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 9 * f.s, y);
    ctx.lineTo(x - 16 * f.s, y - 5 * f.s);
    ctx.lineTo(x - 16 * f.s, y + 5 * f.s);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawPath(ctx, t) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Soft sandy channel: layered strokes, no hard edges, no road markings.
  ctx.strokeStyle = 'rgba(160, 130, 80, 0.45)';
  ctx.lineWidth = 46;
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();
  ctx.strokeStyle = '#a8894f';
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(226, 199, 138, 0.4)';
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();
  // Pebbles resting on the channel floor (fixed positions).
  ctx.fillStyle = 'rgba(90, 70, 40, 0.5)';
  for (let k = 0; k < 26; k++) {
    const p = pointAt((k + 0.5) * (PATH_LEN / 26));
    const off = ((k * 37) % 17) - 8;
    ctx.beginPath();
    ctx.arc(p.x + off * 0.4, p.y + off * 0.7, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // A slow current: light motes drifting toward the Heart.
  ctx.fillStyle = 'rgba(255, 246, 227, 0.5)';
  for (let k = 0; k < 9; k++) {
    const p = pointAt((t * 42 + k * (PATH_LEN / 9)) % PATH_LEN);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawSpots(ctx, highlight) {
  for (let i = 0; i < SPOTS.length; i++) {
    const sp = SPOTS[i];
    ctx.fillStyle = highlight === i ? 'rgba(255, 197, 61, 0.4)' : 'rgba(201, 168, 106, 0.26)';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = highlight === i ? PAL.gold : 'rgba(226, 199, 138, 0.55)';
    ctx.lineWidth = highlight === i ? 2.5 : 1.5;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawHeartCoral(ctx, t, livesFrac) {
  const { x, y } = HEART;
  const pulse = 1 + Math.sin(t * 1.6) * 0.06;
  const glowR = 70 * pulse * (0.5 + livesFrac * 0.5);
  const g = ctx.createRadialGradient(x, y, 4, x, y, glowR);
  g.addColorStop(0, 'rgba(255, 125, 89, 0.55)');
  g.addColorStop(1, 'rgba(255, 125, 89, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();
  // Coral branches.
  ctx.strokeStyle = PAL.coral;
  ctx.lineCap = 'round';
  const branches = [[-16, -26, -22, -44], [-6, -28, -4, -52], [6, -28, 10, -50], [16, -24, 24, -40], [0, -20, 0, -34]];
  for (const [x1, y1, x2, y2] of branches) {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x + x1, y + y1);
    ctx.quadraticCurveTo(x + x1 * 1.4, y + (y1 + y2) / 2, x + x2, y + y2);
    ctx.stroke();
    ctx.fillStyle = PAL.coralPink;
    ctx.beginPath();
    ctx.arc(x + x2, y + y2, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // The heart gem.
  ctx.fillStyle = '#ffd9c9';
  ctx.beginPath();
  ctx.arc(x, y - 16, 9 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAL.coral;
  ctx.beginPath();
  ctx.arc(x, y - 16, 5.5 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Base rock.
  ctx.fillStyle = '#3d5a73';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}
