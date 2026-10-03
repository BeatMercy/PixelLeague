'use strict';
// ---------- Enemies, bosses, stages ----------
// ai: melee | ranged | siege | charger | caster
const ENEMY_DEF = {
  thug: { name: 'Bandit Thug', spr: 'thug', ai: 'melee', hp: 110, ad: 12, armor: 8, mr: 5, as: 0.8, range: 0.9, ms: 2.4, r: 0.3, xp: 12, gold: 3 },
  archer: { name: 'Bandit Archer', spr: 'archer', ai: 'ranged', hp: 75, ad: 11, armor: 4, mr: 5, as: 0.6, range: 5, ms: 2.3, r: 0.3, xp: 12, gold: 3, pcol: '#d8c080' },
  boar: { name: 'Razorback', spr: 'boar', ai: 'charger', hp: 140, ad: 16, armor: 10, mr: 5, as: 0.7, range: 0.9, ms: 2.0, r: 0.38, xp: 15, gold: 4 },
  mage: { name: 'Hedge Mage', spr: 'mage', ai: 'caster', hp: 80, ad: 16, armor: 4, mr: 12, as: 0.45, range: 5.5, ms: 2.1, r: 0.3, xp: 16, gold: 4, pcol: '#c070ff', magic: true },
  cannon: { name: 'Siege Cart', spr: 'cannon', ai: 'siege', hp: 260, ad: 26, armor: 25, mr: 20, as: 0.3, range: 7, ms: 1.6, r: 0.42, xp: 30, gold: 9, pcol: '#3a3a3a' },
  wolf: { name: 'Murk Wolf', spr: 'wolf', ai: 'melee', hp: 85, ad: 11, armor: 5, mr: 5, as: 1.1, range: 0.8, ms: 3.4, r: 0.3, xp: 10, gold: 2 },
  wisp: { name: 'Lost Wisp', spr: 'wisp', ai: 'caster', hp: 70, ad: 15, armor: 2, mr: 20, as: 0.5, range: 4.5, ms: 2.6, r: 0.28, xp: 14, gold: 3, pcol: '#60c0ff', magic: true, fly: true },
  knight: { name: 'Fallen Knight', spr: 'knight', ai: 'melee', hp: 240, ad: 20, armor: 30, mr: 15, as: 0.7, range: 1.0, ms: 2.2, r: 0.34, xp: 22, gold: 6 },
  golem: { name: 'Petricite Golem', spr: 'golem', ai: 'melee', hp: 380, ad: 26, armor: 35, mr: 40, as: 0.5, range: 1.1, ms: 1.7, r: 0.45, xp: 35, gold: 9 },
};
const BOSS_DEF = {
  chief: { name: 'Rourke, Bandit King', spr: 'b_chief', ai: 'melee', hp: 2600, ad: 38, armor: 25, mr: 20, as: 0.8, range: 1.3, ms: 2.5, r: 0.55, xp: 320, gold: 80, ab: ['slam', 'charge', 'summon'], adds: 'thug' },
  warlock: { name: 'Varn the Hexcaller', spr: 'b_warlock', ai: 'caster', hp: 3400, ad: 42, armor: 20, mr: 40, as: 0.6, range: 6, ms: 2.2, r: 0.5, xp: 450, gold: 110, pcol: '#ff40a0', magic: true, ab: ['nova', 'volley', 'summon'], adds: 'mage' },
  wolf: { name: 'Fenrok, Alpha of the Murk', spr: 'b_wolf', ai: 'melee', hp: 4600, ad: 50, armor: 30, mr: 25, as: 1.1, range: 1.3, ms: 3.3, r: 0.6, xp: 600, gold: 140, ab: ['charge', 'charge', 'summon', 'slam'], adds: 'wolf' },
  golem: { name: 'The Ancient Colossus', spr: 'b_golem', ai: 'melee', hp: 7000, ad: 64, armor: 60, mr: 60, as: 0.55, range: 1.6, ms: 1.9, r: 0.75, xp: 800, gold: 180, ab: ['slam', 'nova', 'slam', 'summon'], adds: 'wisp' },
  champ: { name: 'Sir Malrec, the Fallen Champion', spr: 'b_champ', ai: 'melee', hp: 10500, ad: 78, armor: 70, mr: 60, as: 0.9, range: 1.5, ms: 2.9, r: 0.65, xp: 1200, gold: 300, ab: ['charge', 'slam', 'nova', 'volley', 'summon'], adds: 'knight', pcol: '#40ffb0' },
};
const STAGES = [
  { biome: 'farm', pool: ['thug', 'thug', 'archer', 'boar'], boss: 'chief', waves: 5 },
  { biome: 'village', pool: ['thug', 'archer', 'mage', 'thug', 'cannon'], boss: 'warlock', waves: 5 },
  { biome: 'woods', pool: ['wolf', 'wolf', 'wisp', 'boar', 'archer'], boss: 'wolf', waves: 6 },
  { biome: 'ruins', pool: ['golem', 'wisp', 'knight', 'mage', 'knight'], boss: 'golem', waves: 6 },
  { biome: 'castle', pool: ['knight', 'mage', 'cannon', 'archer', 'golem', 'knight'], boss: 'champ', waves: 6 },
];
function enemyScale(stage, wave) {
  const s = stage - 1;
  return { hp: 1 + s * 0.85 + wave * 0.07, ad: 0.8 + s * 0.45 + wave * 0.04, def: 1 + s * 0.25, xp: 1.25 + s * 0.3, gold: 1 + s * 0.3 };
}
const XP_REQ = L => 80 + 45 * L + 3 * L * L;
