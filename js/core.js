'use strict';
// ---------- Core constants, math helpers, canvas, input, global state ----------
const TW = 32, TH = 16, HTW = 16, HTH = 8;   // isometric tile size (low-res pixels)
const MAP_W = 44, MAP_H = 44;
const TAU = Math.PI * 2;
const ISO_RX = HTW * Math.SQRT2, ISO_RY = HTH * Math.SQRT2; // projected radius of 1 tile

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const distXY = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const fmt = n => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n)));
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function weighted(list, wf) {
  let tot = 0; for (const it of list) tot += wf(it);
  let r = Math.random() * tot;
  for (const it of list) { r -= wf(it); if (r <= 0) return it; }
  return list[list.length - 1];
}

// Isometric projection: tile-space (x,y) -> projected pixels
const isoX = (x, y) => (x - y) * HTW;
const isoY = (x, y) => (x + y) * HTH;
function unIso(sx, sy) { const a = sx / HTW, b = sy / HTH; return { x: (a + b) / 2, y: (b - a) / 2 }; }

// Main canvas is full resolution; the world is rendered to a low-res buffer and upscaled.
const canvas = document.getElementById('game');
const sctx = canvas.getContext('2d');
const view = document.createElement('canvas');
const ctx = view.getContext('2d');
let SCALE = 3, VW = 480, VH = 270;
function resize() {
  SCALE = Math.max(2, Math.round(innerHeight / 300));
  VW = Math.ceil(innerWidth / SCALE); VH = Math.ceil(innerHeight / SCALE);
  view.width = VW; view.height = VH;
  canvas.width = innerWidth; canvas.height = innerHeight;
  ctx.imageSmoothingEnabled = false; sctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize); resize();

// Global game state
const G = {
  state: 'title', time: 0, player: null,
  enemies: [], projs: [], zones: [], drops: [], fx: [], parts: [], texts: [], timers: [],
  map: null, ground: null, cam: { x: 0, y: 0, lock: true },
  run: null, hoverEnemy: null, hoverDrop: null, shake: 0,
};
function later(t, fn) { G.timers.push({ t, fn }); }
function tickTimers(dt) {
  for (let i = G.timers.length - 1; i >= 0; i--) {
    const tm = G.timers[i]; tm.t -= dt;
    if (tm.t <= 0) { G.timers.splice(i, 1); tm.fn(); }
  }
}

// World <-> view (low-res) coordinates
const toVX = (x, y) => Math.round(isoX(x, y) - G.cam.x + VW / 2);
const toVY = (x, y, z = 0) => Math.round(isoY(x, y) - z - G.cam.y + VH / 2);

// Input
const keys = {};
const mouse = { sx: 0, sy: 0, wx: 0, wy: 0, right: false, left: false };
addEventListener('keydown', e => {
  if (['Space', 'Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyD', 'KeyF'].includes(e.code)) e.preventDefault();
  if (!e.repeat && G.onKeyDown) G.onKeyDown(e);
  keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.right = mouse.left = false; });
addEventListener('mousemove', e => { mouse.sx = e.clientX; mouse.sy = e.clientY; });
canvas.addEventListener('mousedown', e => {
  if (e.button === 2) mouse.right = true;
  if (e.button === 0) mouse.left = true;
  if (G.onMouseDown) G.onMouseDown(e);
});
addEventListener('mouseup', e => { if (e.button === 2) mouse.right = false; if (e.button === 0) mouse.left = false; });
document.addEventListener('contextmenu', e => e.preventDefault());
function updateMouseWorld() {
  const p = unIso(mouse.sx / SCALE - VW / 2 + G.cam.x, mouse.sy / SCALE - VH / 2 + G.cam.y);
  mouse.wx = p.x; mouse.wy = p.y;
}
