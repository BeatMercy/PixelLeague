'use strict';
// ---------- Map generation, collision, A* pathing and enemy flow field ----------
const MC = MAP_W >> 1;
function genMap(biomeKey) {
  const b = BIOMES[biomeKey], N = MAP_W * MAP_H;
  const m = { biome: b, tile: new Uint8Array(N), block: new Uint8Array(N), props: [], flow: new Int16Array(N) };
  const id = (i, j) => j * MAP_W + i, inb = (i, j) => i >= 0 && j >= 0 && i < MAP_W && j < MAP_H;
  const place = (i, j, k) => { if (!inb(i, j) || m.block[id(i, j)]) return; m.block[id(i, j)] = 1; m.props.push({ x: i + 0.5, y: j + 0.5, k }); };
  // roads from centre outward
  const dirs = shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]).slice(0, 3);
  for (const [dx, dy] of dirs) {
    let x = MC, y = MC;
    while (inb(x, y)) {
      for (let a = 0; a < 2; a++) if (inb(x + a * dy, y + a * dx)) m.tile[id(x + a * dy, y + a * dx)] = 1;
      x += dx; y += dy;
      if (chance(0.25)) { x += dy * (chance(0.5) ? 1 : -1); y += dx * (chance(0.5) ? 1 : -1); }
    }
  }
  // border ring
  for (let j = 0; j < MAP_H; j++) for (let i = 0; i < MAP_W; i++)
    if (i < 2 || j < 2 || i >= MAP_W - 2 || j >= MAP_H - 2) place(i, j, b.border);
  // obstacle clusters
  const nearC = (i, j) => Math.abs(i - MC) < 5 && Math.abs(j - MC) < 5;
  for (let n = 0; n < 26; n++) {
    let i = randi(3, MAP_W - 4), j = randi(3, MAP_H - 4);
    const k = pick(b.cluster), len = k === 'house' || k === 'well' || k === 'statue' ? 1 : randi(2, 6);
    for (let s = 0; s < len; s++) {
      if (!nearC(i, j) && inb(i, j) && m.tile[id(i, j)] !== 1) place(i, j, k === 'fence' || chance(0.75) ? k : pick(b.cluster));
      if (k === 'fence') i += 1; else { i += randi(-1, 1); j += randi(-1, 1); }
    }
  }
  for (let n = 0; n < 30; n++) { const i = randi(3, MAP_W - 4), j = randi(3, MAP_H - 4); if (!nearC(i, j) && m.tile[id(i, j)] !== 1) place(i, j, pick(b.cluster)); }
  for (let k = 0; k < N; k++) if (!m.tile[k] && !m.block[k] && chance(0.07)) m.tile[k] = 2;
  // seal unreachable pockets
  const seen = new Uint8Array(N), q = [id(MC, MC)]; seen[q[0]] = 1;
  while (q.length) {
    const c = q.pop(), ci = c % MAP_W, cj = (c / MAP_W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = ci + dx, nj = cj + dy, nk = id(ni, nj);
      if (inb(ni, nj) && !seen[nk] && !m.block[nk]) { seen[nk] = 1; q.push(nk); }
    }
  }
  for (let k = 0; k < N; k++) if (!m.block[k] && !seen[k]) place(k % MAP_W, (k / MAP_W) | 0, 'bush');
  m.tiles = buildTiles(b);
  return m;
}

function blockedT(i, j) { return i < 0 || j < 0 || i >= MAP_W || j >= MAP_H || G.map.block[j * MAP_W + i] === 1; }
function blockedAt(x, y) { return blockedT(Math.floor(x), Math.floor(y)); }
function freeCircle(x, y, r) {
  return !blockedAt(x - r, y - r) && !blockedAt(x + r, y - r) && !blockedAt(x - r, y + r) && !blockedAt(x + r, y + r);
}
// Move with axis-separated collision; returns true if fully moved
function moveUnit(u, dx, dy) {
  let ok = true;
  if (freeCircle(u.x + dx, u.y, u.r)) u.x += dx; else ok = false;
  if (freeCircle(u.x, u.y + dy, u.r)) u.y += dy; else ok = false;
  return ok;
}
function los(ax, ay, bx, by, r = 0) {
  const d = distXY(ax, ay, bx, by), n = Math.ceil(d / 0.25);
  for (let k = 1; k < n; k++) {
    const t = k / n, x = lerp(ax, bx, t), y = lerp(ay, by, t);
    if (r ? !freeCircle(x, y, r) : blockedAt(x, y)) return false;
  }
  return true;
}

const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
const canStep = (i, j, dx, dy) => !blockedT(i + dx, j + dy) && (dx === 0 || dy === 0 || (!blockedT(i + dx, j) && !blockedT(i, j + dy)));

// A* from world point to world point; returns array of waypoints (smoothed)
function findPath(sx, sy, tx, ty, r) {
  let ti = Math.floor(tx), tj = Math.floor(ty);
  if (blockedT(ti, tj)) { // snap target to nearest open tile
    let best = null, bd = 1e9;
    for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++)
      if (!blockedT(ti + di, tj + dj) && di * di + dj * dj < bd) { bd = di * di + dj * dj; best = [ti + di, tj + dj]; }
    if (!best) return null;
    [ti, tj] = best; tx = ti + 0.5; ty = tj + 0.5;
  }
  if (los(sx, sy, tx, ty, r)) return [{ x: tx, y: ty }];
  const si = Math.floor(sx), sj = Math.floor(sy), N = MAP_W * MAP_H;
  const gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = [], h = (i, j) => Math.hypot(i - ti, j - tj);
  const push = (k, f) => { heap.push([f, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, rr = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
  const s = sj * MAP_W + si, goal = tj * MAP_W + ti;
  gs[s] = 0; push(s, h(si, sj));
  let found = false, it = 0;
  while (heap.length && it++ < 4000) {
    const [, k] = pop(); if (closed[k]) continue; closed[k] = 1;
    if (k === goal) { found = true; break; }
    const i = k % MAP_W, j = (k / MAP_W) | 0;
    for (const [dx, dy, c] of D8) {
      if (!canStep(i, j, dx, dy)) continue;
      const nk = (j + dy) * MAP_W + i + dx, ng = gs[k] + c;
      if (ng < gs[nk]) { gs[nk] = ng; from[nk] = k; push(nk, ng + h(i + dx, j + dy)); }
    }
  }
  if (!found) return null;
  const pts = [];
  for (let k = goal; k !== s && k >= 0; k = from[k]) pts.push({ x: (k % MAP_W) + 0.5, y: ((k / MAP_W) | 0) + 0.5 });
  pts.reverse(); pts[pts.length - 1] = { x: tx, y: ty };
  const out = []; let cx = sx, cy = sy, idx = 0; // string-pull smoothing
  while (idx < pts.length) {
    let far = idx;
    for (let k = pts.length - 1; k > idx; k--) if (los(cx, cy, pts[k].x, pts[k].y, r)) { far = k; break; }
    out.push(pts[far]); cx = pts[far].x; cy = pts[far].y; idx = far + 1;
  }
  return out;
}

// BFS distance field from the player's tile (used by every enemy)
function updateFlow(px, py) {
  const f = G.map.flow; f.fill(-1);
  const s = Math.floor(py) * MAP_W + Math.floor(px); if (s < 0 || s >= f.length) return;
  const q = new Int32Array(MAP_W * MAP_H); let qh = 0, qt = 0; q[qt++] = s; f[s] = 0;
  while (qh < qt) {
    const k = q[qh++], i = k % MAP_W, j = (k / MAP_W) | 0;
    for (const [dx, dy] of D8) {
      if (!canStep(i, j, dx, dy)) continue;
      const nk = (j + dy) * MAP_W + i + dx;
      if (f[nk] < 0) { f[nk] = f[k] + 1; q[qt++] = nk; }
    }
  }
}
function flowDir(u) {
  const i = Math.floor(u.x), j = Math.floor(u.y), f = G.map.flow;
  let best = null, bv = f[j * MAP_W + i]; if (bv < 0) bv = 1e9;
  for (const [dx, dy] of D8) {
    if (!canStep(i, j, dx, dy)) continue;
    const v = f[(j + dy) * MAP_W + i + dx];
    if (v >= 0 && v < bv) { bv = v; best = [dx, dy]; }
  }
  if (!best) return null;
  const tx = i + best[0] + 0.5, ty = j + best[1] + 0.5, d = distXY(u.x, u.y, tx, ty) || 1;
  return { x: (tx - u.x) / d, y: (ty - u.y) / d };
}
function randomSpawnPoint(minD, maxD) {
  const p = G.player;
  for (let t = 0; t < 200; t++) {
    const a = rand(0, TAU), d = rand(minD, maxD), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    const k = Math.floor(y) * MAP_W + Math.floor(x);
    if (x > 2 && y > 2 && x < MAP_W - 2 && y < MAP_H - 2 && !blockedAt(x, y) && G.map.flow[k] >= 0) return { x, y };
  }
  return { x: MC + 0.5, y: MC + 0.5 };
}
