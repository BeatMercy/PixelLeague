'use strict';
// ---------- Stats & equipment ----------
const STAT_INFO = {
  hp: ['Health', ''], mp: ['Mana', ''], ad: ['Attack Damage', ''], ap: ['Ability Power', ''],
  armor: ['Armor', ''], mr: ['Magic Resist', ''], as: ['Attack Speed', '%'], ms: ['Move Speed', '%'],
  crit: ['Crit Chance', '%'], ls: ['Life Steal', '%'], haste: ['Ability Haste', ''], regen: ['HP Regen', '/s'],
  dmgPct: ['Damage', '%'], drPct: ['Damage Reduction', '%'], goldPct: ['Gold Gain', '%'], xpPct: ['XP Gain', '%'],
  slayer: ['Dmg vs Elites/Bosses', '%'], magnet: ['Pickup Radius', '%'],
};
const RARITY = {
  common: { name: 'Common', col: '#c8c8c8', val: 30 },
  rare: { name: 'Rare', col: '#4aa0ff', val: 70 },
  epic: { name: 'Epic', col: '#c060ff', val: 150 },
  legendary: { name: 'Legendary', col: '#ffa020', val: 320 },
};
// [name, icon, stat, min, max]
const BASE_ITEMS = [
  ['Long Sword', '🗡️', 'ad', 8, 14], ['Heavy Pickaxe', '⛏️', 'ad', 13, 19], ['Swift Dagger', '🔪', 'as', 10, 18],
  ['Agility Cloak', '🧣', 'crit', 8, 13], ['Vampiric Rod', '🩸', 'ls', 6, 10], ['Amplifying Tome', '📘', 'ap', 16, 26],
  ['Cloth Armor', '🥋', 'armor', 10, 18], ['Chain Vest', '🦺', 'armor', 18, 28], ['Ruby Crystal', '💎', 'hp', 80, 140],
  ["Giant's Belt", '🎗️', 'hp', 170, 250], ['Null Mantle', '🧥', 'mr', 12, 22], ['Swift Boots', '👢', 'ms', 7, 12],
  ['Glowing Mote', '✨', 'haste', 8, 14], ['Rejuv Bead', '📿', 'regen', 2, 4], ['Sapphire Shard', '🔷', 'mp', 80, 130],
];
const EXTRA_POOL = ['ad', 'as', 'hp', 'armor', 'mr', 'crit', 'ap', 'haste', 'ms', 'ls', 'regen'];
const EXTRA_RANGE = { ad: [5, 10], as: [6, 12], hp: [60, 120], armor: [6, 14], mr: [6, 14], crit: [4, 8], ap: [10, 18], haste: [5, 10], ms: [3, 6], ls: [3, 6], regen: [1, 3] };
const LEGENDARIES = [
  { name: 'Endless Edge', icon: '⚔️', stats: { ad: 50, crit: 20 }, passive: 'ie', desc: 'Critical strikes deal +40% damage.' },
  { name: 'Sunflare Aegis', icon: '☀️', stats: { hp: 350, armor: 30 }, passive: 'sunfire', desc: 'Burn nearby enemies for 12 + 1% max HP magic damage per second.' },
  { name: 'Thornplate', icon: '🌵', stats: { armor: 60, hp: 200 }, passive: 'thorns', desc: 'Reflect 30% of damage taken from attacks as magic damage.' },
  { name: "Guardian's Grace", icon: '👼', stats: { ad: 30, armor: 30 }, passive: 'ga', desc: 'Once per run, revive with 50% HP on death.' },
  { name: 'Ruinblade', icon: '🗡️', stats: { ad: 30, as: 25, ls: 10 }, passive: 'botrk', desc: 'Attacks deal 6% of the target\'s current HP as bonus physical damage.' },
  { name: 'Archmage Crown', icon: '🎩', stats: { ap: 100 }, passive: 'rabadon', desc: 'Increases total Ability Power by 35%.' },
  { name: 'Krakenfang', icon: '🦑', stats: { ad: 35, as: 30 }, passive: 'kraken', desc: 'Every 3rd attack deals 60 + 40% AD bonus true damage.' },
  { name: 'Tri-Edge', icon: '🔱', stats: { ad: 30, as: 25, hp: 200, haste: 15 }, passive: 'spellblade', desc: 'After using a skill, your next attack deals +100% base AD bonus damage.' },
  { name: "Titan's Heart", icon: '❤️', stats: { hp: 800 }, passive: 'warmog', desc: 'Regenerate 3% max HP per second after 4s without taking damage.' },
  { name: 'Static Shiv', icon: '⚡', stats: { as: 35, ms: 6, crit: 15 }, passive: 'statikk', desc: 'Every 4th attack chains lightning to 5 enemies for 50 + 30% AD magic damage.' },
  { name: 'Hexflame Torment', icon: '🔥', stats: { ap: 70, hp: 250 }, passive: 'liandry', desc: 'Skills burn enemies for 2% max HP per second for 3s.' },
  { name: 'Blood Chalice', icon: '🏆', stats: { ad: 55, ls: 18 }, passive: 'bloodthirster', desc: 'Life steal can overheal into a shield of up to 150.' },
];
const RARITY_WEIGHTS = {
  minion: { common: 78, rare: 19, epic: 3, legendary: 0.4 },
  elite: { common: 20, rare: 50, epic: 24, legendary: 6 },
  boss: { common: 0, rare: 10, epic: 55, legendary: 35 },
  shop: { common: 35, rare: 40, epic: 20, legendary: 5 },
};
let itemUid = 1;
function rollItem(src, stage) {
  const w = RARITY_WEIGHTS[src], rar = weighted(Object.keys(w), k => w[k]);
  const lv = 1 + (stage - 1) * 0.3;
  if (rar === 'legendary') {
    const L = pick(LEGENDARIES), stats = {}, ls = 1 + (stage - 1) * 0.15;
    for (const k in L.stats) stats[k] = Math.round(L.stats[k] * ls);
    return { uid: itemUid++, name: L.name, icon: L.icon, rarity: rar, stats, passive: L.passive, desc: L.desc, value: Math.round(RARITY[rar].val * lv) };
  }
  const [name, icon, st, a, b] = pick(BASE_ITEMS);
  const mul = { common: 1, rare: 1.25, epic: 1.55 }[rar] * lv, stats = {};
  stats[st] = Math.round(rand(a, b) * mul);
  const extras = { common: 0, rare: 1, epic: 2 }[rar];
  const pool = shuffle(EXTRA_POOL.filter(k => k !== st));
  for (let i = 0; i < extras; i++) { const k = pool[i], [x, y] = EXTRA_RANGE[k]; stats[k] = Math.round(rand(x, y) * lv); }
  const prefix = { common: '', rare: 'Fine ', epic: 'Exalted ' }[rar];
  return { uid: itemUid++, name: prefix + name, icon, rarity: rar, stats, value: Math.round(RARITY[rar].val * lv) };
}
function statLine(k, v) { const [n, suf] = STAT_INFO[k] || [k, '']; return `+${v}${suf} ${n}`; }
function itemHTML(it) {
  const r = RARITY[it.rarity];
  let h = `<div class="tt-title" style="color:${r.col}">${it.icon} ${it.name}</div><div class="tt-sub">${r.name}</div>`;
  for (const k in it.stats) h += `<div class="tt-stat">${statLine(k, it.stats[k])}</div>`;
  if (it.desc) h += `<div class="tt-desc">${it.desc}</div>`;
  return h + `<div class="tt-val">Sell: ${it.value} gold</div>`;
}
