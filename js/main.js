'use strict';
// ---------- Main loop, input routing, camera ----------
const IN = { amove: false, rmbT: 0, last: 0, err: null };
const SETTINGS_KEY = 'pixelLeague.settings.v1';
const SETTINGS = (() => {
  try { return Object.assign({ castMode: 'smart' }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
  catch (e) { return { castMode: 'smart' }; }
})();
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch (e) { /* storage blocked */ }
}

// A drifting, empty world behind the menus
function initBackdrop() {
  const b = pick(Object.keys(BIOMES));
  G.map = genMap(b); G.map.backdrop = true; buildProps(G.map.biome); G.ground = renderGround(G.map); G.minimapBg = null;
  for (const k of ['enemies', 'projs', 'zones', 'drops', 'fx', 'parts', 'texts', 'timers']) G[k] = [];
  G.player = { x: MC, y: MC, alive: false, hp: 1, st: { hp: 1 }, extras: {}, extraState: {} };
  G.run = { portal: null, boss: null };
  G.cam.x = isoX(MC, MC); G.cam.y = isoY(MC, MC);
}

// ---- hover detection (projected sprite bounds) ----
function spriteHit(u, sx, sy) {
  const vx = toVX(u.x, u.y), vy = toVY(u.x, u.y, u.z || 0), s = u.spr, w = (s.w || 24) * 0.6;
  return sx > vx - w / 2 - 2 && sx < vx + w / 2 + 2 && sy > vy - s.ay && sy < vy + 3;
}
function updateHover() {
  const sx = mouse.sx / SCALE, sy = mouse.sy / SCALE;
  let best = null, bd = 1e9;
  for (const e of G.enemies) {
    if (!e.alive || e.spawnT > 0 || !spriteHit(e, sx, sy)) continue;
    const d = Math.abs(toVX(e.x, e.y) - sx) + Math.abs(toVY(e.x, e.y) - e.spr.ay / 2 - sy);
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) best = nearestEnemy(mouse.wx, mouse.wy, 0.6);
  G.hoverEnemy = best;
  G.hoverDrop = null;
  for (const d of G.drops) if (d.kind === 'item' && distXY(d.x, d.y, mouse.wx, mouse.wy) < 0.6) { G.hoverDrop = d; break; }
}

// ---- simulation ----
function stepPlay(dt) {
  const p = G.player, R = G.run;
  updateMouseWorld(); updateHover();
  if (mouse.right && p.alive && !G.hoverEnemy && (IN.rmbT -= dt) <= 0) { IN.rmbT = 0.12; p.moveTo(mouse.wx, mouse.wy); }
  if (p.alive) p.update(dt);
  for (const e of G.enemies) if (e.alive) e.update(dt);
  for (const e of G.enemies) if (!e.alive && !e.gone) {
    e.gone = true;
    if (e.elite && e.spawnT <= 0) spawnHpBarBreak(e, 22);
    burst(e.x, e.y, [e.boss ? '#ffd040' : '#a02020', '#3a1a1a'], e.boss ? 40 : 8, 2, 8, 0.6);
  }
  G.enemies = G.enemies.filter(e => e.alive);
  tickProjs(dt);
  for (let i = G.zones.length - 1; i >= 0; i--) { const z = G.zones[i]; z.t -= dt; if (z.tick) z.tick(z, dt); if (z.t <= 0) G.zones.splice(i, 1); }
  for (const d of G.drops) {
    if (d.z <= 0 && !d.vz) continue;
    d.vz -= 160 * dt; d.z += d.vz * dt;
    if (d.z <= 0) { d.z = 0; d.vz = 0; if (blockedAt(d.x, d.y)) { const s = snapFree(d.x, d.y, 0.2); if (s) { d.x = s.x; d.y = s.y; } } }
  }
  tickTimers(dt); updateFx(dt);
  if (!R.dead) updateSpawner(dt);
  if (G.moveMark) G.moveMark.t -= dt;
  G.shake = Math.max(0, G.shake - dt * 2);
  updateCamera(dt);
  updateHUD(dt); drawMinimap();
  if (R.pendingCards > 0 && p.alive && !R.dead && G.state === 'play') openCards();
}
function updateCamera(dt) {
  const p = G.player, c = G.cam;
  if (c.lock || keys.Space) {
    const tx = isoX(p.x, p.y), ty = isoY(p.x, p.y) - 10, k = 1 - Math.exp(-dt * 10);
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
  } else {
    const e = 6, sp = 260 * dt;
    if (mouse.sx < e || keys.ArrowLeft) c.x -= sp; if (mouse.sx > innerWidth - e || keys.ArrowRight) c.x += sp;
    if (mouse.sy < e || keys.ArrowUp) c.y -= sp; if (mouse.sy > innerHeight - e || keys.ArrowDown) c.y += sp;
  }
  c.x = clamp(c.x, -MAP_H * HTW, MAP_W * HTW); c.y = clamp(c.y, 0, (MAP_W + MAP_H) * HTH);
}

// ---- input ----
G.onMouseDown = e => {
  if (G.state !== 'play') return;
  const p = G.player; if (!p.alive) return;
  updateMouseWorld(); updateHover();
  if (e.button === 2) {
    p.aimSkill = null;
    IN.amove = false; IN.rmbT = 0.18;
    if (G.hoverEnemy) { p.attackUnit(G.hoverEnemy); G.moveMark = { x: G.hoverEnemy.x, y: G.hoverEnemy.y, t: 0.4, col: '#ff4040' }; }
    else { p.moveTo(mouse.wx, mouse.wy); G.moveMark = { x: mouse.wx, y: mouse.wy, t: 0.5, col: '#60ff60' }; }
  } else if (e.button === 0 && p.aimSkill) {
    p.cast(p.aimSkill, true);
  } else if (e.button === 0 && IN.amove) {
    IN.amove = false;
    if (G.hoverEnemy) p.attackUnit(G.hoverEnemy); else p.attackMove(mouse.wx, mouse.wy);
    G.moveMark = { x: mouse.wx, y: mouse.wy, t: 0.5, col: '#ff4040' };
  }
};
G.onKeyDown = e => {
  if (G.state !== 'play') return uiKey(e);
  const p = G.player, c = e.code;
  if (c === 'Escape') { if (p.aimSkill) p.aimSkill = null; else if (IN.amove) IN.amove = false; else showPause(); return; }
  if (!p.alive) return;
  updateMouseWorld(); updateHover();
  const k = { KeyQ: 'Q', KeyW: 'W', KeyE: 'E', KeyR: 'R' }[c];
  if (k) {
    if (e.shiftKey || e.ctrlKey) { if (p.rankUp(k)) { G.hudDirty = true; refreshTip(); ringFx(p.x, p.y, 0.8, '#ffe070', 0.3); } }
    else p.cast(k);
    return;
  }
  if (c === 'KeyD' || c === 'KeyF') p.summoner(c[3]);
  else if (c === 'KeyS') { p.stop(); IN.amove = false; }
  else if (c === 'KeyA') IN.amove = true;
  else if (c === 'KeyY') { G.cam.lock = !G.cam.lock; ftext(p.x, p.y, G.cam.lock ? 'Camera locked' : 'Camera free', '#ffffff'); }
  else if (c === 'Tab') $('statsPanel').classList.toggle('hidden');
};

// ---- loop ----
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - (IN.last || now)) / 1000)); IN.last = now;
  try {
    const st = G.state;
    if (st === 'play') stepPlay(dt);
    else if (st === 'title' || st === 'select' || st === 'armory') {
      if (!G.map || !G.map.backdrop) initBackdrop();
      G.cam.x += 9 * dt; G.cam.y += 4 * dt * Math.sin(G.time * 0.2);
      if (G.cam.x > MAP_W * HTW * 0.6) G.cam.x = -MAP_H * HTW * 0.6;
      updateFx(dt);
    }
    const menu = st === 'title' || st === 'select' || st === 'armory';
    if (st === 'play' || menu) G.time += dt; else updateHUD(0);
    if (G.map) renderWorld();
    canvas.style.cursor = st !== 'play' ? 'default' : G.player.aimSkill || IN.amove ? 'crosshair' : G.hoverEnemy ? 'pointer' : 'default';
    IN.err = null;
  } catch (err) {
    if (!IN.err) { console.error(err); IN.err = err; }
    sctx.fillStyle = '#ff5050'; sctx.font = '16px monospace'; sctx.fillText('Error: ' + err.message, 10, innerHeight - 10);
  }
  requestAnimationFrame(frame);
}
async function boot() {
  await buildAllSprites();
  showTitle();
  requestAnimationFrame(frame);
}
boot();
