'use strict';

const COL = {
  secure: '#4ade80',
  warn:   '#ffd166',
  drop:   '#ff6b6b',
  accent: '#5ad1e6',
};

// font stack with CJK fallbacks so canvas labels render in Chinese too
function fmono(px) {
  return px + 'px ui-monospace, "SF Mono", "PingFang SC", "Microsoft YaHei", monospace';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// amber → red as a force fraction t∈[0,1] climbs
function forceColor(frac) {
  const g = Math.round(lerp(209, 107, clamp(frac, 0, 1)));
  const b = Math.round(lerp(102, 107, clamp(frac, 0, 1)));
  return `rgb(255, ${g}, ${b})`;
}

function drawBackdrop(ctx) {
  const g = ctx.createRadialGradient(VIEW_W * 0.42, VIEW_H * 0.4, 60, VIEW_W * 0.42, VIEW_H * 0.4, VIEW_W * 0.8);
  g.addColorStop(0, 'rgba(28, 40, 62, 0.55)');
  g.addColorStop(1, 'rgba(10, 13, 20, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.strokeStyle = 'rgba(120, 140, 180, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= VIEW_W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); }
  for (let y = 0; y <= VIEW_H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); }
  ctx.stroke();
}

function drawPedestal(ctx, tableY) {
  const x0 = 388, x1 = 600;
  ctx.fillStyle = '#131825';
  ctx.fillRect(x0, tableY, x1 - x0, 16);
  ctx.strokeStyle = '#2a3346';
  ctx.strokeRect(x0 + 0.5, tableY + 0.5, x1 - x0 - 1, 15);
  ctx.strokeStyle = 'rgba(90, 209, 230, 0.35)';
  ctx.beginPath();
  ctx.moveTo(x0, tableY + 0.5);
  ctx.lineTo(x1, tableY + 0.5);
  ctx.stroke();
}

function drawBall(ctx, ball, tableY) {
  const height = tableY - (ball.y + ball.r);
  const sh = clamp(1 - height / 260, 0.15, 1);
  ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * sh})`;
  ctx.beginPath();
  ctx.ellipse(ball.x, tableY + 8, ball.r * (0.55 + 0.45 * sh), 8 * sh + 2, 0, 0, TAU);
  ctx.fill();

  const c = ball.cols;
  const g = ctx.createRadialGradient(
    ball.x - ball.r * 0.35, ball.y - ball.r * 0.35, ball.r * 0.15,
    ball.x, ball.y, ball.r
  );
  g.addColorStop(0, c[0]);
  g.addColorStop(0.6, c[1]);
  g.addColorStop(1, c[2]);
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = ball.held ? 'rgba(255, 209, 102, 0.85)' : 'rgba(0, 0, 0, 0.25)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ball.x - ball.r * 0.34, ball.y - ball.r * 0.36, ball.r * 0.16, 0, TAU);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fill();

  // payload label + weight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = fmono(11);
  ctx.textAlign = 'center';
  ctx.fillText(t('mat.' + ball.key) + ' · ' + ball.weight + 'N', ball.x, ball.y + ball.r + 20);
  ctx.textAlign = 'left';
}

function drawArmAndPalm(ctx, hand) {
  const o = hand.origin;
  ctx.fillStyle = '#2b3346';
  roundRect(ctx, o.x - 330, o.y - 40, 215, 80, 14);
  ctx.fill();
  ctx.strokeStyle = '#3c465e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(o.x - 116, o.y, 24, 0, TAU);
  ctx.fillStyle = '#1a2130';
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 209, 230, 0.5)';
  ctx.stroke();
  ctx.fillStyle = '#39435a';
  roundRect(ctx, o.x - 126, o.y - 94, 132, 188, 18);
  ctx.fill();
  ctx.strokeStyle = '#4c5873';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90, 209, 230, 0.18)';
  roundRect(ctx, o.x - 112, o.y - 80, 104, 160, 12);
  ctx.stroke();
  ctx.fillStyle = 'rgba(140, 160, 200, 0.5)';
  ctx.font = fmono(10);
  ctx.fillText('HRH-01', o.x - 104, o.y + 70);
}

function drawFinger(ctx, f, bodyColor, outlineColor) {
  const pts = f.points;
  ctx.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = f.widths[i] + 4;
    ctx.strokeStyle = outlineColor;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = f.widths[i];
    ctx.strokeStyle = bodyColor;
    ctx.stroke();
  }
  for (let i = 0; i < pts.length - 1; i++) {
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, f.widths[i] * 0.34, 0, TAU);
    ctx.fillStyle = '#10151f';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(90, 209, 230, 0.55)';
    ctx.stroke();
  }
  const tip = pts[pts.length - 1];
  if (f.contact) {
    const frac = clamp(f.force / f.maxForce, 0, 1);
    const col = forceColor(frac);
    ctx.save();
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.25 + 0.5 * frac;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 6 + frac * 9, 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 10 + frac * 14;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 5, 0, TAU);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 3.4, 0, TAU);
    ctx.fillStyle = '#8fa0bf';
    ctx.fill();
  }
}

function drawForceGauge(ctx, hud) {
  const x = VIEW_W - 30, w = 13;
  const y0 = 72, y1 = VIEW_H - 48;
  const h = y1 - y0;
  roundRect(ctx, x, y0, w, h, 6);
  ctx.fillStyle = 'rgba(20, 26, 38, 0.9)';
  ctx.fill();
  ctx.strokeStyle = '#2a3346';
  ctx.lineWidth = 1;
  ctx.stroke();

  const frac = clamp(hud.gripForce / hud.gaugeMax, 0, 1);
  const fh = h * frac;
  const col = hud.holdSecure ? COL.secure : (hud.gripForce > 0.5 ? COL.warn : '#3a4763');
  if (fh > 1) {
    roundRect(ctx, x, y1 - fh, w, fh, 6);
    ctx.fillStyle = col;
    ctx.fill();
  }
  // required-force threshold for the current payload
  const ty = y1 - h * clamp(hud.requiredForce / hud.gaugeMax, 0, 1);
  ctx.strokeStyle = COL.drop;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x - 5, ty);
  ctx.lineTo(x + w + 5, ty);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(140, 160, 200, 0.7)';
  ctx.font = fmono(9);
  ctx.textAlign = 'right';
  ctx.fillText(t('gauge.grip'), x + w, y0 - 8);
  ctx.fillText(hud.gripForce.toFixed(0) + 'N', x + w, y1 + 14);
  ctx.fillStyle = 'rgba(255, 107, 107, 0.85)';
  ctx.fillText(t('gauge.min'), x - 9, ty + 3);
  ctx.textAlign = 'left';
}

function drawScene(ctx, hand, ball, env) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawBackdrop(ctx);
  drawPedestal(ctx, env.tableY);
  drawArmAndPalm(ctx, hand);

  const [index, middle, ring, pinky] = hand.fingers;
  drawFinger(ctx, pinky,  '#39455b', '#1d2433');
  drawFinger(ctx, ring,   '#424e66', '#1d2433');
  drawFinger(ctx, middle, '#4b576f', '#202839');
  drawFinger(ctx, index,  '#4b576f', '#202839');
  drawBall(ctx, ball, env.tableY);
  drawFinger(ctx, hand.thumb, '#566380', '#222a3c');

  drawForceGauge(ctx, env);

  ctx.fillStyle = 'rgba(140, 160, 200, 0.55)';
  ctx.font = fmono(11);
  ctx.fillText(t('canvas.overlay'), 16, 26);
}
