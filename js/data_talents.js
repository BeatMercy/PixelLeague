'use strict';
// ---------- Level-up talent cards ----------
STAT_INFO.sv = ['Spell Vamp', '%'];
const TALENTS = [
  { id: 'ad1', name: 'Sharpened Steel', icon: '🗡️', rar: 'common', st: { ad: 10 } },
  { id: 'ad2', name: 'Brutal Edge', icon: '🗡️', rar: 'rare', st: { ad: 22 } },
  { id: 'ap1', name: 'Arcane Study', icon: '📘', rar: 'common', st: { ap: 20 } },
  { id: 'ap2', name: 'Forbidden Lore', icon: '📕', rar: 'rare', st: { ap: 45 } },
  { id: 'as1', name: 'Quickened Hands', icon: '🏹', rar: 'common', st: { as: 12 } },
  { id: 'as2', name: 'Frenzy', icon: '💢', rar: 'rare', st: { as: 25 } },
  { id: 'hp1', name: 'Vitality', icon: '❤️', rar: 'common', st: { hp: 150 } },
  { id: 'hp2', name: 'Titan Blood', icon: '💗', rar: 'rare', st: { hp: 350 } },
  { id: 'ar1', name: 'Iron Skin', icon: '🛡️', rar: 'common', st: { armor: 15, mr: 10 } },
  { id: 'ar2', name: 'Fortress', icon: '🏰', rar: 'rare', st: { armor: 30, mr: 25 } },
  { id: 'cr1', name: 'Keen Eye', icon: '🎯', rar: 'common', st: { crit: 10 } },
  { id: 'cr2', name: "Assassin's Focus", icon: '🎯', rar: 'rare', st: { crit: 18, ad: 8 } },
  { id: 'ms1', name: 'Fleet Footwork', icon: '👟', rar: 'common', st: { ms: 8 } },
  { id: 'ha1', name: 'Clarity', icon: '🔹', rar: 'common', st: { haste: 12 } },
  { id: 'ha2', name: 'Transcendence', icon: '🌀', rar: 'rare', st: { haste: 25, mp: 100 } },
  { id: 'ls1', name: 'Bloodlust', icon: '🩸', rar: 'rare', st: { ls: 8 } },
  { id: 'sv1', name: 'Spell Vamp', icon: '🦇', rar: 'rare', st: { sv: 10 } },
  { id: 'rg1', name: 'Second Wind', icon: '🍃', rar: 'common', st: { regen: 4 } },
  { id: 'gd1', name: 'Treasure Hunter', icon: '💰', rar: 'rare', st: { goldPct: 30, magnet: 60 } },
  { id: 'xp1', name: 'Fast Learner', icon: '📜', rar: 'rare', st: { xpPct: 20 } },
  { id: 'dm1', name: 'Conqueror', icon: '👑', rar: 'epic', st: { dmgPct: 12 } },
  { id: 'dr1', name: 'Unbreakable', icon: '🗿', rar: 'epic', st: { drPct: 10, hp: 150 } },
  { id: 'gs1', name: 'Giant Slayer', icon: '🪓', rar: 'epic', st: { slayer: 30 } },
  { id: 'all', name: 'Demacian Resolve', icon: '🦁', rar: 'epic', st: { ad: 12, ap: 20, hp: 150, armor: 10, mr: 10 } },
  { id: 'coup', name: 'Coup de Grace', icon: '💀', rar: 'epic', once: true, flag: 'coup', desc: 'Deal +15% damage to enemies below 40% HP.' },
  { id: 'phase', name: 'Phase Rush', icon: '💨', rar: 'rare', once: true, flag: 'phase', desc: 'Gain 40% move speed for 2s after casting a skill.' },
  { id: 'reroll', name: 'Fate Weaver', icon: '🎲', rar: 'rare', desc: '+2 card rerolls.', fn: () => { G.run.rerolls += 2; } },
  { id: 'font', name: 'Healing Font', icon: '⛲', rar: 'common', st: { hp: 60 }, desc: '+60 Health and fully heal.', fn: p => { p.recalc(); p.hp = p.st.hp; } },
];
const CARD_COL = { common: '#c8c8c8', rare: '#4aa0ff', epic: '#c060ff', legendary: '#ffa020', skill: '#40e0a0' };
const CARD_W = { common: 50, rare: 30, epic: 12, legendary: 6 };

function cardDesc(c) {
  if (c.desc) return c.desc;
  return Object.entries(c.st).map(([k, v]) => statLine(k, v)).join('<br>');
}
function extraCards(p) {
  const out = [];
  for (const k in EXTRAS) {
    const E = EXTRAS[k], lv = p.extras[k] || 0;
    if (lv >= 5) continue;
    if (!lv && Object.keys(p.extras).length >= p.maxExtras) continue;
    out.push({ id: 'x_' + k, kind: 'extra', key: k, name: E.name, icon: E.icon, rar: 'skill', lvl: lv + 1,
      desc: (lv ? `<b>Lv ${lv} → ${lv + 1}</b><br>` : '<b>NEW SKILL</b><br>') + E.desc(lv + 1) });
  }
  return out;
}
function genCards(p, n = 3) {
  const pool = TALENTS.filter(c => !(c.once && p.taken[c.id]));
  const hero = (p.hero.cards || []).filter(c => !p.taken[c.id]).map(c => ({ ...c, rar: 'legendary', once: true }));
  const xs = extraCards(p), luck = 1 + (G.run.meta.luck || 0) * 0.15;
  const res = [];
  if (xs.length) res.push(xs.splice(randi(0, xs.length - 1), 1)[0]);
  const all = [...pool, ...hero, ...xs];
  const wf = c => c.rar === 'skill' ? 22 : c.rar === 'common' ? CARD_W.common : CARD_W[c.rar] * luck;
  while (res.length < n && all.length) {
    const c = weighted(all, wf); all.splice(all.indexOf(c), 1);
    if (!res.some(r => r.id === c.id)) res.push(c);
  }
  return shuffle(res);
}
function applyCard(p, c) {
  if (c.kind === 'extra') { p.extras[c.key] = (p.extras[c.key] || 0) + 1; p.extraState[c.key] = p.extraState[c.key] || {}; }
  else {
    if (c.st) for (const k in c.st) p.tstats[k] = (p.tstats[k] || 0) + c.st[k];
    if (c.flag) p.flags[c.flag] = true;
    p.taken[c.id] = (p.taken[c.id] || 0) + 1;
  }
  p.recalc();
  if (c.fn) c.fn(p);
}
