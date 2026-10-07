'use strict';
// ---------- Particles, floating combat text, ground rings, beams ----------
function burst(x, y, col, n = 8, spd = 2, z = 6, life = 0.5) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(0.3, 1) * spd;
    G.parts.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(10, 40), life: rand(0.5, 1) * life, col: Array.isArray(col) ? pick(col) : col, sz: chance(0.3) ? 2 : 1 });
  }
}
function ftext(x, y, text, col = '#fff', big = false) {
  const sourceText = String(text);
  G.texts.push({ x: x + rand(-0.2, 0.2), y, z: 22, text: sourceText, sourceText, col, life: big ? 1.1 : 0.8, max: big ? 1.1 : 0.8, big });
}
function addFx(o) { o.max = o.life; G.fx.push(o); return o; }
const ringFx = (x, y, r, col, life = 0.35) => addFx({ type: 'ring', x, y, r, col, life });
const discFx = (x, y, r, col, life = 0.3) => addFx({ type: 'disc', x, y, r, col, life });
const lineFx = (x1, y1, x2, y2, col, life = 0.2, w = 1, zig = false) => addFx({ type: 'line', x: x1, y: y1, x2, y2, col, life, w, zig });
const slashFx = (x, y, ang, r, col, life = 0.15) => addFx({ type: 'slash', x, y, ang, r, col, life });
const teleFx = (x, y, r, col, life) => addFx({ type: 'tele', x, y, r, col, life });

function updateFx(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i]; p.life -= dt;
    if (p.life <= 0) { G.parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 120 * dt;
    if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; }
  }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.z += 18 * dt; if (t.life <= 0) G.texts.splice(i, 1); }
  for (let i = G.fx.length - 1; i >= 0; i--) { const f = G.fx[i]; f.life -= dt; if (f.life <= 0) G.fx.splice(i, 1); }
}

function isoEllipse(x, y, r) { ctx.beginPath(); ctx.ellipse(toVX(x, y), toVY(x, y), r * ISO_RX, r * ISO_RY, 0, 0, TAU); }
function drawFxGround() {
  for (const f of G.fx) {
    const t = f.life / f.max;
    if (f.type === 'tele') {
      ctx.globalAlpha = 0.25; ctx.fillStyle = f.col; isoEllipse(f.x, f.y, f.r); ctx.fill();
      ctx.globalAlpha = 0.5; isoEllipse(f.x, f.y, f.r * (1 - t)); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = f.col; isoEllipse(f.x, f.y, f.r); ctx.stroke();
    } else if (f.type === 'ring') {
      ctx.globalAlpha = t; ctx.strokeStyle = f.col; ctx.lineWidth = 2; isoEllipse(f.x, f.y, f.r * (1.15 - t * 0.4)); ctx.stroke(); ctx.lineWidth = 1;
    } else if (f.type === 'disc') {
      ctx.globalAlpha = t * 0.55; ctx.fillStyle = f.col; isoEllipse(f.x, f.y, f.r); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
function drawFxTop() {
  for (const f of G.fx) {
    const t = f.life / f.max;
    if (f.type === 'line') {
      ctx.globalAlpha = Math.min(1, t * 2); ctx.strokeStyle = f.col; ctx.lineWidth = f.w;
      const ax = toVX(f.x, f.y), ay = toVY(f.x, f.y, 8), bx = toVX(f.x2, f.y2), by = toVY(f.x2, f.y2, 8);
      ctx.beginPath(); ctx.moveTo(ax, ay);
      if (f.zig) for (let k = 1; k < 6; k++) ctx.lineTo(lerp(ax, bx, k / 6) + rand(-4, 4), lerp(ay, by, k / 6) + rand(-4, 4));
      ctx.lineTo(bx, by); ctx.stroke(); ctx.lineWidth = 1;
      if (f.zig) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 80); ctx.stroke(); }
    } else if (f.type === 'slash') {
      ctx.globalAlpha = t; ctx.strokeStyle = f.col; ctx.lineWidth = 2;
      const cx = toVX(f.x, f.y), cy = toVY(f.x, f.y, 8), sa = Math.atan2(isoY(Math.cos(f.ang), Math.sin(f.ang)), isoX(Math.cos(f.ang), Math.sin(f.ang)));
      ctx.beginPath(); ctx.ellipse(cx, cy, f.r * ISO_RX, f.r * ISO_RY, 0, sa - 1.1 + (1 - t), sa + 1.1 - (1 - t) * 0.5); ctx.stroke(); ctx.lineWidth = 1;
    } else if (f.type === 'hpbar-break') {
      const age = f.max - f.life, cx = toVX(f.x, f.y) + f.offsetX, cy = toVY(f.x, f.y, f.z) - f.yOff;
      ctx.globalAlpha = t;
      for (const p of f.pieces) {
        ctx.save(); ctx.translate(cx + p.x + p.vx * age, cy + p.vy * age); ctx.rotate(p.angle + p.spin * age);
        ctx.fillStyle = '#0a0d13'; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.strokeStyle = '#f5d98b'; ctx.lineWidth = 1; ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }
  }
  ctx.globalAlpha = 1;
  for (const p of G.parts) {
    ctx.globalAlpha = Math.min(1, p.life * 3); ctx.fillStyle = p.col;
    ctx.fillRect(toVX(p.x, p.y), toVY(p.x, p.y, p.z), p.sz, p.sz);
  }
  ctx.globalAlpha = 1;
}
// Text is drawn on the full-resolution canvas for readability
function drawTexts() {
  sctx.textAlign = 'center';
  for (const t of G.texts) {
    const a = t.life / t.max, sz = (t.big ? 13 : 9) * SCALE / 3 * (a > 0.8 ? 1.25 : 1);
    sctx.font = `${Math.round(sz) * 2}px VT323, monospace`;
    sctx.globalAlpha = Math.min(1, a * 2.5);
    const x = toVX(t.x, t.y) * SCALE, y = toVY(t.x, t.y, t.z) * SCALE;
    const text = I18N.t(t.sourceText || t.text);
    sctx.fillStyle = '#000'; sctx.fillText(text, x + 2, y + 2);
    sctx.fillStyle = t.col; sctx.fillText(text, x, y);
  }
  sctx.globalAlpha = 1;
}
