'use strict';
// ---------- Biomes, ground tiles and props ----------
const BIOMES = {
  farm: { name: 'Farmlands', grass: ['#5a9a3a', '#62a242', '#549236'], speck: '#7ab84a', path: '#a88a5a', pspeck: '#8a6a40', flowers: ['#f0e060', '#ffffff', '#e05050'], leaf: '#4a8a32', roof: '#3a5fa8', border: 'tree', cluster: ['tree', 'tree', 'bush', 'hay', 'fence', 'rock'] },
  village: { name: 'Village Outskirts', grass: ['#5a8a3a', '#528236', '#5e9040'], speck: '#72a24a', path: '#9a968a', pspeck: '#7a766a', flowers: ['#ffffff', '#f0a0c0'], leaf: '#3e7a2e', roof: '#a04a3a', border: 'tree', cluster: ['house', 'house', 'fence', 'barrel', 'well', 'tree', 'crate'] },
  woods: { name: 'Whispering Woods', grass: ['#3a6a32', '#346030', '#2e5a2a'], speck: '#4a7a3a', path: '#6a5a3a', pspeck: '#5a4a2a', flowers: ['#80c0ff', '#c0a0ff'], leaf: '#2a5a2a', roof: '#5a3a2a', border: 'pine', cluster: ['pine', 'pine', 'tree', 'rock', 'bush'] },
  ruins: { name: 'Petricite Ruins', grass: ['#5a6a4a', '#526246', '#606e50'], speck: '#6a7a5a', path: '#7a7a70', pspeck: '#62625a', flowers: ['#d0d0a0'], leaf: '#4a5a3a', roof: '#5a5a5a', border: 'ruin', cluster: ['pillar', 'ruin', 'rock', 'statue', 'ruin'] },
  castle: { name: 'Castle Gates', grass: ['#8a8a90', '#82828a', '#8e8e96'], speck: '#76767e', path: '#a8a090', pspeck: '#908878', flowers: ['#6a6a72'], leaf: '#4a6a3a', roof: '#3a5fa8', border: 'wall', cluster: ['pillar', 'banner', 'crate', 'statue', 'barrel'] },
};

function makeTile(base, speck, density, dots, dark) {
  const c = mkCanvas(TW, TH), x = c.getContext('2d');
  for (let j = 0; j < TH; j++) {
    const hw = j < HTH ? (j + 1) * 2 : (TH - j) * 2;
    for (let i = HTW - hw; i < HTW + hw; i++) {
      let col = Math.random() < density ? speck : base;
      if (j >= HTH && (i === HTW - hw || i === HTW + hw - 1 || j === TH - 1)) col = shade(base, 0.85);
      x.fillStyle = dark ? shade(col, 0.45) : col; x.fillRect(i, j, 1, 1);
    }
  }
  if (dots) for (let k = 0; k < 3; k++) { x.fillStyle = pick(dots); x.fillRect(randi(10, 21), randi(5, 10), 1, 1); }
  return c;
}
function buildTiles(b) {
  return {
    grass: b.grass.map(g => makeTile(g, b.speck, 0.08)),
    path: [0, 1].map(() => makeTile(b.path, b.pspeck, 0.15)),
    flower: [0, 1].map(() => makeTile(b.grass[0], b.speck, 0.08, b.flowers)),
    dark: b.grass.map(g => makeTile(g, b.speck, 0.08, null, true)),
  };
}

// Props: drawn into small canvases, anchored bottom-centre on the tile centre
const PROP_DEF = {
  tree: [24, 34, (P, b) => { const l = b.leaf; P('#5a3a22', 10, 22, 4, 10); P(shade(l, 0.7), 2, 10, 20, 13); P(l, 4, 3, 16, 17); P(l, 2, 9, 20, 9); P(shade(l, 1.3), 6, 4, 7, 4); P(shade(l, 1.15), 4, 9, 4, 3); }],
  pine: [20, 36, (P, b) => { const l = b.leaf; P('#4a2a1a', 9, 28, 3, 6); for (let k = 0; k < 3; k++) for (let r = 0; r < 9; r++) { const w = 2 + r + k * 2, y = 3 + k * 7 + r; P(r > 6 ? shade(l, 0.7) : l, 10 - (w >> 1), y, w, 1); } P(shade(l, 1.3), 9, 4, 2, 4); }],
  rock: [18, 13, P => { P('#5a5a62', 2, 4, 14, 7); P('#7a7a82', 4, 2, 9, 5); P('#9a9aa2', 5, 2, 4, 1); P('#4a4a50', 2, 9, 14, 2); }],
  bush: [16, 13, (P, b) => { P(shade(b.leaf, 0.7), 1, 4, 14, 7); P(b.leaf, 2, 2, 12, 7); P(shade(b.leaf, 1.3), 4, 3, 4, 2); P('#c03040', 10, 6, 1, 1); P('#c03040', 5, 8, 1, 1); }],
  hay: [18, 14, P => { P('#c8a040', 2, 3, 14, 10); P('#e0c060', 3, 3, 12, 2); P('#a08030', 2, 7, 14, 1); P('#a08030', 2, 11, 14, 1); }],
  fence: [22, 15, P => { for (const fx of [2, 10, 18]) P('#7a5a32', fx, 2, 2, 12); P('#9a7a42', 1, 4, 20, 2); P('#9a7a42', 1, 9, 20, 2); }],
  house: [32, 34, (P, b) => { P('#d8c8a0', 4, 16, 24, 16); P('#b8a880', 4, 16, 5, 16); for (let r = 0; r < 13; r++) P(r < 2 ? shade(b.roof, 1.3) : b.roof, 14 - r, 3 + r, 4 + r * 2, 1); P(shade(b.roof, 0.7), 2, 15, 28, 2); P('#6a4a2a', 18, 23, 5, 9); P('#4a6a9a', 9, 20, 5, 4); P('#6a4a2a', 9, 22, 5, 1); }],
  barrel: [12, 15, P => { P('#8a5a2a', 2, 2, 8, 12); P('#aa7a3a', 3, 2, 3, 12); P('#5a4a3a', 2, 4, 8, 1); P('#5a4a3a', 2, 11, 8, 1); }],
  crate: [14, 15, P => { P('#9a7a42', 1, 2, 12, 12); P('#7a5a32', 1, 2, 12, 1); P('#7a5a32', 1, 8, 12, 1); P('#7a5a32', 6, 2, 1, 12); P('#b89a5a', 2, 3, 4, 1); }],
  well: [20, 21, P => { P('#8a8a90', 3, 11, 14, 8); P('#6a6a70', 3, 16, 14, 3); P('#3a6aaa', 5, 11, 10, 2); P('#6a4a2a', 3, 3, 2, 9); P('#6a4a2a', 15, 3, 2, 9); P('#a04a3a', 2, 1, 16, 3); }],
  pillar: [14, 33, P => { P('#c8c8c0', 4, 5, 6, 24); P('#a0a098', 4, 5, 2, 24); P('#e0e0d8', 2, 2, 10, 3); P('#a0a098', 2, 28, 10, 3); P('#80a0a8', 7, 12, 1, 6); }],
  ruin: [22, 27, P => { P('#8a8a80', 2, 7, 18, 18); P('#6a6a62', 2, 7, 4, 18); P('#8a8a80', 6, 3, 4, 4); P('#8a8a80', 14, 5, 4, 2); P('#6a6a62', 6, 13, 14, 1); P('#6a6a62', 10, 19, 10, 1); P('#4a7a3a', 2, 21, 7, 3); }],
  statue: [16, 31, P => { P('#8a8a82', 2, 23, 12, 7); P('#b0b0a8', 5, 9, 6, 14); P('#b0b0a8', 6, 3, 4, 6); P('#d8d8d0', 11, 2, 1, 15); P('#e8c050', 10, 15, 3, 1); P('#909088', 5, 9, 2, 14); }],
  banner: [12, 33, (P, b) => { P('#6a4a2a', 2, 1, 2, 30); P(b.roof, 4, 3, 7, 14); P('#e8c050', 4, 3, 7, 1); P('#e8c050', 6, 8, 3, 3); P(b.roof, 4, 17, 3, 2); P(b.roof, 8, 17, 3, 2); }],
  wall: [32, 31, P => { P('#7a7a82', 2, 9, 28, 20); P('#5a5a62', 2, 9, 6, 20); for (const mx of [2, 13, 24]) P('#8a8a92', mx, 4, 6, 5); for (let r = 13; r < 29; r += 5) P('#5a5a62', 8, r, 22, 1); }],
};
let PROPS = {};
function buildProps(b) {
  PROPS = {};
  for (const k in PROP_DEF) {
    const [w, h, fn] = PROP_DEF[k];
    let c = mkCanvas(w + 2, h + 2); const x = c.getContext('2d');
    fn((col, px, py, pw = 1, ph = 1) => { x.fillStyle = col; x.fillRect(px + 1, py + 1, pw, ph); }, b);
    c = outline(c);
    PROPS[k] = { img: c, ax: (w + 2) >> 1, ay: h - 1 };
  }
}

// Pre-render the whole ground into one big canvas
function renderGround(map) {
  const PAD = 10, tiles = map.tiles;
  const minX = isoX(-PAD, MAP_H + PAD) - HTW, maxX = isoX(MAP_W + PAD, -PAD) + HTW;
  const minY = isoY(-PAD, -PAD), maxY = isoY(MAP_W + PAD, MAP_H + PAD) + TH;
  const c = mkCanvas(maxX - minX, maxY - minY), x = c.getContext('2d');
  for (let j = -PAD; j < MAP_H + PAD; j++) for (let i = -PAD; i < MAP_W + PAD; i++) {
    let img;
    if (i < 0 || j < 0 || i >= MAP_W || j >= MAP_H) img = tiles.dark[(i * 7 + j * 13 + 999) % tiles.dark.length];
    else {
      const t = map.tile[j * MAP_W + i];
      img = t === 1 ? tiles.path[(i + j) & 1] : t === 2 ? tiles.flower[(i * j) & 1] : tiles.grass[(i * 3 + j * 5) % tiles.grass.length];
    }
    x.drawImage(img, isoX(i, j) - HTW - minX, isoY(i, j) - minY);
  }
  return { img: c, ox: minX, oy: minY };
}
