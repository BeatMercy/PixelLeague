'use strict';
// ---------- Procedural pixel-art sprite generation (humanoids + helpers) ----------
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function shade(hex, f) { // f < 1 darker, f > 1 lighter
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 1) { r *= f; g *= f; b *= f; } else { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; }
  return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
}
// 1px dark outline around all opaque pixels
function outline(c, col = '#140c1c') {
  const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
  const o = mkCanvas(w, h), ox = o.getContext('2d');
  const op = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 0;
  ox.fillStyle = col;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
    if (!op(i, j) && (op(i - 1, j) || op(i + 1, j) || op(i, j - 1) || op(i, j + 1))) ox.fillRect(i, j, 1, 1);
  ox.drawImage(c, 0, 0);
  return o;
}
function flipH(c) { const o = mkCanvas(c.width, c.height), x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o; }
function whiteOut(c) { const o = mkCanvas(c.width, c.height), x = o.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height); return o; }

// Sprite set with 4 frames: 0 idle, 1 walk A, 2 walk B, 3 attack. Drawn facing right.
function buildSprite(w, h, ax, ay, draw, s = 1) {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    let c = mkCanvas(w, h);
    draw(c.getContext('2d'), f);
    c = outline(c);
    if (s !== 1) {
      const sc = mkCanvas(Math.round(w * s), Math.round(h * s)), sx = sc.getContext('2d');
      sx.imageSmoothingEnabled = false; sx.drawImage(c, 0, 0, sc.width, sc.height); c = sc;
    }
    const l = flipH(c);
    frames.push({ r: c, l, wr: whiteOut(c), wl: whiteOut(l) });
  }
  return { frames, ax: Math.round(ax * s), ay: Math.round(ay * s), w: Math.round(w * s), s };
}
function drawSprite(spr, frame, x, y, faceLeft, flash, alpha = 1) {
  const f = spr.frames[frame];
  const img = flash ? (faceLeft ? f.wl : f.wr) : (faceLeft ? f.l : f.r);
  const ax = faceLeft ? spr.w - spr.ax - Math.round(spr.s) : spr.ax;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.drawImage(img, Math.round(x - ax), Math.round(y - spr.ay));
  if (alpha !== 1) ctx.globalAlpha = 1;
}

// Humanoid: canvas 32x26, feet at (12,25)
function drawHumanoid(x, f, c) {
  const P = (col, px, py, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const b = c.bulk || 0, bob = f === 1 ? 1 : 0, atk = f === 3;
  if (c.cape) { P(shade(c.cape, 0.75), 7 - b, 13 + bob, 3, 9 - bob); P(c.cape, 8 - b, 13 + bob, 2, 7); }
  P(shade(c.body, 0.55), 8 - b, 13 + bob, 2, 5);           // back arm
  P(shade(c.skin, 0.75), 8 - b, 18 + bob, 2, 1);
  let l1 = 10, l2 = 13;
  if (f === 1) { l1 = 9; l2 = 14; } else if (f === 2) { l1 = 11; l2 = 12; }
  P(shade(c.legs, 0.75), l1, 20 + bob, 2, 3 - bob); P(shade(c.boots, 0.75), l1, 23, 2, 2);
  P(c.legs, l2, 20 + bob, 2, 3 - bob); P(c.boots, l2, 23, 2, 2);
  P(c.body, 9 - b, 13 + bob, 7 + 2 * b, 7);                 // torso
  P(shade(c.body, 0.7), 9 - b, 13 + bob, 2, 7);
  P(shade(c.body, 1.3), 13, 13 + bob, 2 + b, 2);
  if (c.trim) { P(c.trim, 9 - b, 18 + bob, 7 + 2 * b, 1); P(c.trim, 12, 13 + bob, 1, 5); }
  if (c.shield) { P(shade(c.shield, 0.7), 5 - b, 13 + bob, 4, 7); P(c.shield, 6 - b, 14 + bob, 2, 5); P(c.trim || '#e8c050', 6 - b, 16 + bob, 2, 1); }
  const hy = 6 + bob;                                       // head
  P(c.skin, 10, hy, 6, 7); P(shade(c.skin, 0.8), 10, hy + 5, 6, 2);
  const hc = c.hair;
  if (c.hairStyle && hc) {
    P(hc, 10, hy - 1, 6, 2); P(hc, 10, hy + 1, 2, 3);
    if (c.hairStyle === 'long') P(hc, 9, hy + 1, 3, 7);
    if (c.hairStyle === 'pony') { P(hc, 8, hy, 2, 2); P(hc, 7, hy + 2, 2, 4); }
    if (c.hairStyle === 'spiky') { P(hc, 11, hy - 2, 1, 1); P(hc, 13, hy - 2, 1, 1); P(hc, 15, hy - 2, 1, 1); }
  }
  P('#1a1020', 14, hy + 3, 1, 2);                           // eye
  if (c.head === 'helm') {
    P(c.helm, 9, hy - 1, 8, 5); P(shade(c.helm, 1.35), 10, hy - 1, 5, 1); P('#1a1020', 13, hy + 2, 4, 1);
    if (c.plume) { P(c.plume, 10, hy - 3, 4, 2); P(c.plume, 9, hy - 2, 1, 3); }
  } else if (c.head === 'hood') {
    P(c.hood, 9, hy - 1, 7, 3); P(c.hood, 9, hy + 2, 3, 6); P(shade(c.skin, 0.55), 12, hy + 2, 4, 1);
  } else if (c.head === 'crown') {
    P('#f0c040', 10, hy - 2, 6, 1); P('#f0c040', 10, hy - 3, 1, 1); P('#f0c040', 12, hy - 3, 1, 1); P('#f0c040', 15, hy - 3, 1, 1);
  } else if (c.head === 'band') P(c.trim, 10, hy + 1, 6, 1);
  const ax = 15 + b;                                        // front arm + weapon
  let hx, hyy;
  if (atk) { P(c.body, ax, 14 + bob, 4, 2); hx = ax + 4; hyy = 14 + bob; }
  else { P(c.body, ax, 13 + bob, 2, 5); hx = ax + 1; hyy = 18 + bob; }
  drawWeapon(P, c, hx, hyy, atk);
  P(c.skin, hx, hyy, 1, 1);
}

function drawWeapon(P, c, hx, hy, atk) {
  const w = c.wcol || '#888', wl = shade(w, 1.4), wd = shade(w, 0.7);
  switch (c.weapon) {
    case 'bow': {
      const bx = atk ? hx : hx;
      P(w, bx + 2, hy - 4, 1, 5); P(w, bx + 1, hy - 6, 1, 2); P(w, bx + 1, hy + 1, 1, 2);
      P(wd, bx, hy - 7, 1, 1); P(wd, bx, hy + 3, 1, 1);
      P('#d8d8d0', bx, hy - 6, 1, 9);
      if (atk) { P('#c8a070', hx - 4, hy, 10, 1); P('#ffffff', hx + 6, hy, 1, 1); }
      break;
    }
    case 'rapier':
      if (atk) { P(wl, hx + 1, hy, 10, 1); P('#e8c050', hx + 1, hy - 1, 1, 3); }
      else { for (let i = 0; i < 9; i++) P(i < 2 ? wd : wl, hx + 1 + (i >> 1), hy - 1 - i); P('#e8c050', hx - 1, hy - 1, 3, 1); }
      break;
    case 'sword':
      if (atk) { P(w, hx + 2, hy - 1, 9, 2); P(wl, hx + 2, hy - 1, 9, 1); P('#e8c050', hx + 1, hy - 2, 1, 4); }
      else { P(w, hx, hy - 12, 2, 11); P(wl, hx, hy - 12, 1, 11); P('#e8c050', hx - 1, hy - 1, 4, 1); P('#5a3a22', hx, hy + 1, 1, 2); }
      break;
    case 'staff': {
      const sx = atk ? hx + 2 : hx;
      P(w, sx, hy - 10, 1, 16);
      P(c.orb || '#80c0ff', sx - 1, hy - 13, 3, 3); P('#ffffff', sx, hy - 12, 1, 1);
      if (atk) { P(shade(c.orb || '#80c0ff', 1.5), sx - 2, hy - 14, 5, 1); P(shade(c.orb || '#80c0ff', 1.5), sx - 2, hy - 10, 5, 1); }
      break;
    }
    case 'club':
      if (atk) { P(w, hx, hy, 5, 1); P(wd, hx + 4, hy - 2, 3, 4); P(wl, hx + 5, hy - 2, 1, 1); }
      else { P(w, hx, hy - 4, 1, 4); P(wd, hx - 1, hy - 7, 3, 4); P(wl, hx, hy - 7, 1, 1); }
      break;
  }
}
