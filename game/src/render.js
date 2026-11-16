// Small canvas drawing helpers shared by every screen: panels, bars, icons,
// outlined text. All art is procedural; there are no image assets.
import { PAL } from './config.js';

export function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function panel(ctx, x, y, w, h, r) {
  ctx.fillStyle = PAL.panel;
  rr(ctx, x, y, w, h, r || 14);
  ctx.fill();
  ctx.strokeStyle = PAL.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

export function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back || 'rgba(0,0,0,0.55)';
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    ctx.fillStyle = fill;
    rr(ctx, x, y, Math.max(h, w * f), h, h / 2);
    ctx.fill();
  }
}

export function text(ctx, str, x, y, size, color, align, weight, font) {
  ctx.font = (weight || 600) + ' ' + size + 'px ' + (font || "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif");
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color || PAL.cream;
  ctx.fillText(str, x, y);
}

export function outlineText(ctx, str, x, y, size, color, align, weight) {
  ctx.font = (weight || 700) + ' ' + size + 'px ' + "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif";
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 7);
  ctx.strokeStyle = 'rgba(4, 14, 26, 0.85)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color || PAL.cream;
  ctx.fillText(str, x, y);
}

export function drawHeart(ctx, x, y, s, color) {
  ctx.fillStyle = color || PAL.danger;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.45, x - s * 0.35, y - s, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.35, y - s, x + s, y - s * 0.45, x, y + s * 0.35);
  ctx.closePath();
  ctx.fill();
}

export function drawCoin(ctx, x, y, r) {
  ctx.fillStyle = '#b8860b';
  circle(ctx, x, y + 1.5, r);
  ctx.fill();
  ctx.fillStyle = PAL.gold;
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.strokeStyle = '#8a5f00';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#8a5f00';
  ctx.font = '700 ' + Math.round(r * 1.3) + 'px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('G', x, y + 1);
}

export function drawStar(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
