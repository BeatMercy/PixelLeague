'use strict';
// ---------- Run / stage / wave flow ----------
function startRun(hero) {
  const meta = loadMeta();
  G.run = { hero, stage: 0, wave: 0, gold: 0, kills: 0, time: 0, rerolls: 2 + (meta.up.reroll || 0), meta: meta.bonus, phase: 'break',
    waveT: 0, queue: [], spawnT: 0, flowT: 0, pendingCards: 0, portal: null, boss: null, shards: 0, bossKills: 0 };
  G.player = new Player(hero);
  startStage(1);
  G.state = 'play'; showHUD(true); buildHUD();
}
function startStage(n) {
  const S = STAGES[n - 1], R = G.run;
  G.map = genMap(S.biome); buildProps(G.map.biome); G.ground = renderGround(G.map); G.minimapBg = null;
  for (const k of ['enemies', 'projs', 'zones', 'drops', 'fx', 'parts', 'texts', 'timers']) G[k] = [];
  const p = G.player; p.x = MC + 0.5; p.y = MC + 0.5; p.stop(); p.dash = null;
  G.cam.x = isoX(p.x, p.y); G.cam.y = isoY(p.x, p.y);
  updateFlow(p.x, p.y);
  Object.assign(R, { stage: n, wave: 0, phase: 'break', waveT: 4, queue: [], portal: null, boss: null });
  banner(`Stage ${n} — ${G.map.biome.name}`, `${S.waves} waves, then a champion awaits`);
}
function startWave() {
  const R = G.run, S = STAGES[R.stage - 1];
  R.wave++; R.phase = 'wave'; R.waveT = 32; R.spawnT = 0;
  const count = 4 + R.stage * 3 + R.wave * 2, elites = Math.floor((R.wave + R.stage) / 3);
  R.queue = [];
  for (let i = 0; i < count; i++) R.queue.push({ key: pick(S.pool), elite: false });
  for (let i = 0; i < elites; i++) R.queue.splice(randi(4, R.queue.length), 0, { key: pick(S.pool), elite: true });
  banner(`Wave ${R.wave} / ${S.waves}`, elites ? `${elites} elite${elites > 1 ? 's' : ''} incoming` : '');
}
function spawnBoss() {
  const R = G.run, S = STAGES[R.stage - 1], pt = randomSpawnPoint(6, 9);
  const b = new Boss(S.boss, pt.x, pt.y, R.stage); b.spawnT = 1.5;
  G.enemies.push(b); R.boss = b; R.phase = 'boss';
  teleFx(pt.x, pt.y, 2, '#ff3020', 1.5); G.shake = 0.5;
  banner(b.name, 'A champion of the outskirts appears!', '#ff6050');
}
function updateSpawner(dt) {
  const R = G.run, S = STAGES[R.stage - 1], p = G.player;
  R.time += dt;
  if ((R.flowT -= dt) <= 0) { R.flowT = 0.25; updateFlow(p.x, p.y); }
  if (R.phase === 'break') { if ((R.waveT -= dt) <= 0) startWave(); }
  else if (R.phase === 'wave') {
    R.waveT -= dt; R.spawnT -= dt;
    if (R.spawnT <= 0 && R.queue.length && G.enemies.length < 60) {
      R.spawnT = Math.max(1, 2.4 - R.stage * 0.2 - R.wave * 0.08); const pt = randomSpawnPoint(7, 12), n = Math.min(R.queue.length, randi(2, 2 + Math.min(3, R.stage)));
      for (let i = 0; i < n; i++) {
        const q = R.queue.shift(), s = snapFree(pt.x + rand(-0.8, 0.8), pt.y + rand(-0.8, 0.8), 0.35) || pt;
        G.enemies.push(new Enemy(q.key, s.x, s.y, R.stage, R.wave, q.elite));
      }
      ringFx(pt.x, pt.y, 1.2, '#a040ff', 0.6); burst(pt.x, pt.y, '#a040ff', 10, 2, 6, 0.6);
    }
    const alive = G.enemies.filter(e => e.alive).length;
    if (!R.queue.length && (alive <= 2 || (R.waveT <= 0 && alive < 10))) {
      if (R.wave < S.waves) { R.phase = 'break'; R.waveT = 3; }
      else if (alive === 0) spawnBoss();
    }
  } else if (R.phase === 'clear' && R.portal) {
    if (dist(p, R.portal) < 0.8) {
      R.portal = null;
      if (R.stage >= STAGES.length) endRun(true); else openCamp();
    }
  }
}
G.onBossDead = b => {
  const R = G.run; R.phase = 'clear'; R.bossKills++; R.shards += 15 * R.stage;
  for (const e of G.enemies) if (e.alive && e !== b) killUnit(e, G.player);
  const s = snapFree(b.x, b.y, 0.4) || { x: MC + 0.5, y: MC + 0.5 };
  R.portal = { x: s.x, y: s.y };
  heal(G.player, G.player.st.hp * 0.3);
  banner('Champion Defeated!', R.stage >= STAGES.length ? 'Step into the light to claim victory' : 'Collect your loot, then enter the portal', '#ffd040');
};
G.onLevelUp = () => {
  const p = G.player; p.skillPts++; G.run.pendingCards++;
  ringFx(p.x, p.y, 1.2, '#ffe070', 0.6); burst(p.x, p.y, ['#ffe070', '#ffffff'], 20, 2, 20, 0.8);
  ftext(p.x, p.y, 'LEVEL ' + p.level, '#ffe070', true);
  G.hudDirty = true;
};
G.onPlayerDead = () => { later(1.2, () => endRun(false)); G.run.dead = true; };
