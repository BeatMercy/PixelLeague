'use strict';
// ---------- Non-humanoid sprites + sprite registry ----------
// Quadruped (wolf / boar): canvas 30x18, feet at (14,17)
function drawQuad(x, f, c) {
  const P = (col, px, py, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const bob = f === 1 ? 1 : 0, lunge = f === 3 ? 3 : 0, dk = shade(c.body, 0.65), lt = shade(c.body, 1.3);
  const legs = f === 1 ? [6, 10, 16, 20] : f === 2 ? [8, 8, 18, 18] : [7, 9, 17, 19];
  legs.forEach((lx, i) => { P(i % 2 ? c.body : dk, lx + (i > 1 ? lunge : 0), 13, 2, 4); });
  if (c.kind === 'wolf') { P(dk, 1, 7 + bob, 5, 2); P(dk, 0, 6 + bob, 2, 2); }    // tail
  else P(dk, 3, 9 + bob, 2, 2);
  P(c.body, 5, 7 + bob, 17 + lunge, 7); P(dk, 5, 12 + bob, 17 + lunge, 2); P(lt, 7, 7 + bob, 12, 1);
  if (c.mane) P(c.mane, 15 + lunge, 6 + bob, 6, 6);
  const hx = 20 + lunge, hy = 5 + bob;                                              // head
  P(c.body, hx, hy, 6, 6); P(lt, hx + 1, hy, 4, 1);
  if (c.kind === 'wolf') { P(c.body, hx + 5, hy + 3, 4, 3); P('#1a1020', hx + 8, hy + 3, 1, 1); P(dk, hx + 1, hy - 2, 2, 2); P(dk, hx + 4, hy - 2, 2, 2); }
  else { P(shade(c.body, 1.15), hx + 5, hy + 2, 3, 4); P('#f0e8d0', hx + 6, hy + 5, 1, 2); P(dk, hx + 1, hy - 1, 2, 2); }
  if (f === 3) P('#f0f0f0', hx + 6, hy + 6, 3, 1);
  P(c.eye || '#ffdd44', hx + 4, hy + 2, 1, 1);
}

// Golem / colossus: canvas 30x30, feet at (15,29)
function drawGolem(x, f, c) {
  const P = (col, px, py, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const bob = f === 1 ? 1 : 0, dk = shade(c.body, 0.65), lt = shade(c.body, 1.25);
  const l1 = f === 1 ? 8 : f === 2 ? 11 : 9, l2 = f === 1 ? 18 : f === 2 ? 15 : 17;
  P(dk, l1, 23, 5, 6); P(c.body, l2, 23, 5, 6);
  P(c.body, 7, 9 + bob, 16, 15); P(dk, 7, 19 + bob, 16, 5); P(lt, 9, 9 + bob, 10, 2);
  P(c.rune, 13, 14 + bob, 4, 3); P(shade(c.rune, 1.4), 14, 15 + bob, 2, 1);
  P(c.body, 11, 3 + bob, 8, 7); P(lt, 12, 3 + bob, 5, 1); P(c.rune, 16, 6 + bob, 2, 1);
  P(dk, 3, 10 + bob, 5, 10);                                                        // back arm
  if (f === 3) { P(c.body, 22, 8, 7, 5); P(lt, 24, 4, 6, 6); }                       // raised fist
  else { P(c.body, 22, 10 + bob, 5, 9); P(lt, 22, 18 + bob, 6, 5); }
}

// Wisp: canvas 20x22, feet at (10,21) (shadow point)
function drawWisp(x, f, c) {
  const P = (col, px, py, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const fl = f === 1 ? -1 : f === 2 ? 1 : 0, lt = shade(c.body, 1.5);
  P(shade(c.body, 0.7), 8 + fl, 15, 4, 2); P(shade(c.body, 0.7), 9 - fl, 17, 2, 2);
  P(c.body, 5, 5, 10, 10); P(c.body, 6, 4, 8, 12); P(lt, 7, 5, 4, 3);
  P('#ffffff', 8, 9, 2, 2); P('#ffffff', 12, 9, 2, 2);
  if (f === 3) { P(lt, 3, 3, 2, 2); P(lt, 15, 3, 2, 2); P(lt, 15, 13, 2, 2); P(lt, 3, 13, 2, 2); }
}

// Siege cart: canvas 28x18, feet at (13,17)
function drawCannon(x, f, c) {
  const P = (col, px, py, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const rec = f === 3 ? -2 : 0;
  P('#6a4a2a', 4, 9, 18, 4); P('#8a6a3a', 4, 9, 18, 1);
  P(c.body, 8 + rec, 4, 14, 5); P(shade(c.body, 1.4), 9 + rec, 4, 12, 1); P('#1a1020', 21 + rec, 5, 2, 3);
  const wo = f === 1 ? 1 : 0;
  P('#3a2a1a', 5, 12, 5, 5); P('#3a2a1a', 16, 12, 5, 5); P('#b09060', 7, 13 + wo, 1, 3); P('#b09060', 18, 14 - wo, 1, 3);
  P(c.trim || '#c03030', 4, 9, 2, 3);
  if (f === 3) { P('#ffcc44', 23, 5, 3, 3); P('#ffffff', 24, 6, 1, 1); }
}

// Appearance configs. type: h=humanoid q=quad g=golem w=wisp c=cannon
const SPRITE_CFG = {
  kestrel: { type: 'h', skin: '#f0c8a0', hair: '#3a2416', hairStyle: 'pony', body: '#3a5fa8', legs: '#2a3a5a', boots: '#5a3a22', trim: '#e8c050', cape: '#6a8ad0', weapon: 'bow', wcol: '#8a5a2a' },
  vela: { type: 'h', skin: '#f4d0b0', hair: '#24203a', hairStyle: 'short', body: '#d8dce8', legs: '#3a3a5a', boots: '#2a2a3a', trim: '#4060c0', weapon: 'rapier', wcol: '#b8c8e0', head: 'band' },
  fortune: { type: 'h', skin: '#f0c8a0', hair: '#9a2430', hairStyle: 'long', body: '#b83a45', legs: '#30243a', boots: '#482632', trim: '#f0c050', weapon: 'pistols', wcol: '#7a8290', head: 'band' },
  caitlyn: { type: 'h', skin: '#f0c8a0', hair: '#5a3825', hairStyle: 'long', body: '#527aa3', legs: '#35445a', boots: '#4a3828', trim: '#d8c080', cape: '#405c7a', weapon: 'bow', wcol: '#b09a70', head: 'band' },
  aldric: { type: 'h', skin: '#e8c098', head: 'helm', helm: '#a8b0c0', plume: '#3a5fa8', body: '#3a5fa8', legs: '#6a7080', boots: '#4a4a5a', trim: '#e8c050', cape: '#2a4a90', weapon: 'sword', wcol: '#c8d0e0', bulk: 1, shield: '#3a5fa8' },
  thug: { type: 'h', skin: '#d8a880', head: 'hood', hood: '#6a4a3a', body: '#8a6a4a', legs: '#4a3a2a', boots: '#2a1a10', weapon: 'club', wcol: '#7a5a3a' },
  archer: { type: 'h', skin: '#d8a880', head: 'hood', hood: '#3a5a2a', body: '#4a6a3a', legs: '#3a3a2a', boots: '#2a1a10', weapon: 'bow', wcol: '#6a4a2a' },
  mage: { type: 'h', skin: '#c8b0c0', head: 'hood', hood: '#5a2a7a', body: '#6a3a8a', legs: '#3a2a4a', boots: '#2a1a2a', trim: '#c080ff', weapon: 'staff', wcol: '#5a3a2a', orb: '#c070ff' },
  knight: { type: 'h', skin: '#a0a0a0', head: 'helm', helm: '#5a5a6a', plume: '#8a2a2a', body: '#4a4a5a', legs: '#3a3a4a', boots: '#2a2a2a', trim: '#8a2a2a', weapon: 'sword', wcol: '#8a8a9a', bulk: 1 },
  wolf: { type: 'q', kind: 'wolf', body: '#6a6a7a' },
  boar: { type: 'q', kind: 'boar', body: '#7a4a32', mane: '#4a2a1a', eye: '#ff4422' },
  golem: { type: 'g', body: '#7a7a6a', rune: '#40d0c0' },
  wisp: { type: 'w', body: '#60c0ff' },
  cannon: { type: 'c', body: '#5a5a6a', trim: '#c03030' },
  b_chief: { type: 'h', s: 1.5, skin: '#d8a880', head: 'crown', hair: '#8a2a1a', hairStyle: 'spiky', body: '#8a3a2a', legs: '#4a3a2a', boots: '#2a1a10', trim: '#f0c040', cape: '#5a1a1a', weapon: 'club', wcol: '#6a6a6a', bulk: 1 },
  b_warlock: { type: 'h', s: 1.5, skin: '#b0a0c0', head: 'hood', hood: '#2a1a4a', body: '#3a1a5a', legs: '#2a1a3a', boots: '#1a0a1a', trim: '#ff60c0', cape: '#5a1a6a', weapon: 'staff', wcol: '#3a2a2a', orb: '#ff40a0' },
  b_wolf: { type: 'q', s: 1.6, kind: 'wolf', body: '#3a3a4a', mane: '#d0d0e0', eye: '#ff3030' },
  b_golem: { type: 'g', s: 1.5, body: '#8a7a5a', rune: '#ffa030' },
  b_champ: { type: 'h', s: 1.6, skin: '#9098a8', head: 'helm', helm: '#3a3a4a', plume: '#40ffb0', body: '#2a2a3a', legs: '#1a1a2a', boots: '#101018', trim: '#40ffb0', cape: '#1a3a30', weapon: 'sword', wcol: '#60ffc0', bulk: 1, shield: '#2a2a3a' },
};
const SPR = {};
const SPRITE_SIZE = {
  h: { w: 32, h: 26, ax: 12, ay: 25 }, q: { w: 30, h: 18, ax: 14, ay: 17 },
  g: { w: 30, h: 30, ax: 15, ay: 29 }, w: { w: 20, h: 22, ax: 10, ay: 21 },
  c: { w: 28, h: 18, ax: 13, ay: 17 },
};
function loadSpriteFrame(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load character asset: ${src}`));
    image.src = src;
  });
}
async function buildAllSprites() {
  await Promise.all(Object.entries(SPRITE_CFG).map(async ([key, config]) => {
    const size = SPRITE_SIZE[config.type], scale = config.s || 1, base = `assets/character/${key}/`;
    const frames = await Promise.all(['idle', 'walk-a', 'walk-b', 'attack'].map(async name => ({ r: await loadSpriteFrame(`${base}${name}.svg`) })));
    SPR[key] = {
      frames, ax: Math.round(size.ax * scale), ay: Math.round(size.ay * scale),
      w: Math.round(size.w * scale), h: Math.round(size.h * scale), s: scale,
      portrait: `${base}portrait.svg`,
    };
  }));
}
