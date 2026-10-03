'use strict';
// ---------- Meta progression: Petricite Shards persisted in localStorage ----------
const META_KEY = 'pixelLeague.meta.v1';
const META_UP = [
  { id: 'might', name: 'Might of Demacia', icon: '⚔️', cost: 30, max: 5, desc: n => `+${4 * n}% damage dealt`, st: n => ({ dmgPct: 4 * n }) },
  { id: 'vigor', name: 'Vigor', icon: '❤️', cost: 25, max: 5, desc: n => `+${60 * n} max health`, st: n => ({ hp: 60 * n }) },
  { id: 'guard', name: 'Petricite Guard', icon: '🛡️', cost: 25, max: 5, desc: n => `+${4 * n} armor and magic resist`, st: n => ({ armor: 4 * n, mr: 4 * n }) },
  { id: 'swift', name: 'Swiftness', icon: '👟', cost: 30, max: 5, desc: n => `+${3 * n}% move speed`, st: n => ({ ms: 3 * n }) },
  { id: 'haste', name: 'Focus', icon: '🌀', cost: 35, max: 5, desc: n => `+${4 * n} ability haste`, st: n => ({ haste: 4 * n }) },
  { id: 'greed', name: 'Greed', icon: '💰', cost: 20, max: 5, desc: n => `+${10 * n}% gold gain`, st: n => ({ goldPct: 10 * n }) },
  { id: 'wisdom', name: 'Wisdom', icon: '📜', cost: 35, max: 5, desc: n => `+${8 * n}% XP gain`, st: n => ({ xpPct: 8 * n }) },
  { id: 'luck', name: 'Fortune', icon: '🍀', cost: 40, max: 5, desc: n => `Rarer talent cards (+${15 * n}% weight)`, st: () => ({}) },
  { id: 'reroll', name: 'Foresight', icon: '🎲', cost: 45, max: 5, desc: n => `+${n} card rerolls per run`, st: () => ({}) },
];
function defaultMeta() { return { shards: 0, up: {}, runs: 0, wins: 0, best: 0, bestTime: 0 }; }
function loadMeta() {
  let m = defaultMeta();
  try { const raw = localStorage.getItem(META_KEY); if (raw) m = Object.assign(m, JSON.parse(raw)); } catch (e) { /* storage blocked */ }
  m.up = m.up || {};
  m.bonus = { luck: m.up.luck || 0, bossHp: 0 };
  return m;
}
function saveMeta(m) {
  const { bonus, ...data } = m;
  try { localStorage.setItem(META_KEY, JSON.stringify(data)); } catch (e) { /* storage blocked */ }
}
function metaStats() {
  const m = loadMeta(), out = {};
  for (const u of META_UP) { const n = m.up[u.id] || 0; if (!n) continue; const s = u.st(n); for (const k in s) out[k] = (out[k] || 0) + s[k]; }
  return out;
}
const metaCost = (u, n) => Math.round(u.cost * (1 + n * 0.8));
function buyMeta(id) {
  const m = loadMeta(), u = META_UP.find(x => x.id === id), n = m.up[id] || 0;
  if (!u || n >= u.max || m.shards < metaCost(u, n)) return false;
  m.shards -= metaCost(u, n); m.up[id] = n + 1; saveMeta(m); return true;
}
// Called once when a run ends. Returns the breakdown for the results screen.
function awardShards(win) {
  const R = G.run, m = loadMeta();
  const parts = [['Foes slain', Math.floor(R.kills / 8)], ['Stages reached', (R.stage - 1) * 8], ['Champions', R.shards], ['Level reached', G.player.level]];
  if (win) parts.push(['Victory', 60]);
  const total = parts.reduce((s, x) => s + x[1], 0);
  m.shards += total; m.runs++; if (win) m.wins++;
  m.best = Math.max(m.best || 0, win ? STAGES.length + 1 : R.stage);
  if (win && (!m.bestTime || R.time < m.bestTime)) m.bestTime = R.time;
  saveMeta(m);
  return { parts, total, shards: m.shards };
}
