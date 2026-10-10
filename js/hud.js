'use strict';
// ---------- HUD: skill bar, bars, inventory, minimap, tooltips, banner ----------
const $ = id => document.getElementById(id);
const HUD = { el: {}, slots: {}, acc: 0, tipAcc: 0, bannerT: 0, invSig: '', exSig: '', bannerHTML: '' };
function showHUD(on) { $('hud').classList.toggle('hidden', !on); hideTip(); }
function setText(el, v) { v = I18N.t(v); if (el._v !== v) { el._v = v; el.textContent = v; } }
function setHTML(el, v) { v = I18N.html(v); if (el._h !== v) { el._h = v; el.innerHTML = v; } }

// ---- tooltip ----
let tipFn = null;
function placeTip(cx, cy) {
  const t = $('tooltip'), w = t.offsetWidth, h = t.offsetHeight;
  t.style.left = clamp(cx + 14, 4, innerWidth - w - 4) + 'px';
  t.style.top = clamp(cy - h - 14, 4, innerHeight - h - 4) + 'px';
}
function showTip(html, cx, cy) {
  const t = $('tooltip'); if (!html) return hideTip();
  t.innerHTML = I18N.html(html); t.classList.remove('hidden'); placeTip(cx, cy);
}
function hideTip() { $('tooltip').classList.add('hidden'); tipFn = null; }
function bindTip(el, fn) {
  el.addEventListener('mouseenter', e => { tipFn = fn; showTip(fn(), e.clientX, e.clientY); });
  el.addEventListener('mousemove', e => placeTip(e.clientX, e.clientY));
  el.addEventListener('mouseleave', hideTip);
}
function refreshTip() { if (tipFn) showTip(tipFn(), mouse.sx, mouse.sy); }

// ---- tooltip content ----
function skillTip(k) {
  const p = G.player, sk = p.hero.skills[k], r = p.ranks[k], rr = Math.max(1, r), max = k === 'R' ? 3 : 5;
  let h = `<div class="tt-title">${iconMarkup(sk.icon)} ${sk.name} <span class="tt-key">[${k}]</span></div><div class="tt-sub">Rank ${r} / ${max}</div>`;
  h += `<div class="tt-desc">${sk.desc(rr)}</div>`;
  const cd = (sk.cd[rr - 1] * 100 / (100 + p.st.haste)).toFixed(1);
  h += `<div class="tt-stat">Cooldown ${cd}s${p.hero.manaless ? '' : ` · Cost ${sk.cost[rr - 1]} mana`}</div>`;
  if (p.canRank(k)) h += `<div class="tt-val">Shift+${k} or click + to rank up</div>`;
  else if (r < max) h += `<div class="tt-sub">Next rank at level ${k === 'R' ? [6, 11, 16][r] : 2 * r + 1}</div>`;
  return h;
}
const passiveTip = () => { const P = G.player.hero.passive; return `<div class="tt-title">${iconMarkup(P.icon)} ${P.name}</div><div class="tt-sub">Passive</div><div class="tt-desc">${P.desc}</div>`; };
const summTip = k => { const s = SUMMONERS[k]; return `<div class="tt-title">${iconMarkup(s.icon)} ${s.name} <span class="tt-key">[${k}]</span></div><div class="tt-desc">${s.desc}</div><div class="tt-stat">Cooldown ${s.cd}s</div>`; };
const itemTip = i => { const it = G.player.items[i]; return it ? itemHTML(it) + '<div class="tt-sub">Right-click: sell · Shift+click: drop</div>' : ''; };
const extraTip = k => { const E = EXTRAS[k], lv = G.player.extras[k]; return `<div class="tt-title" style="color:${CARD_COL.skill}">${iconMarkup(E.icon)} ${E.name}</div><div class="tt-sub">Level ${lv} / 5 · auto-cast</div><div class="tt-desc">${E.desc(lv)}</div>`; };

// ---- build ----
function mkSlot(parent, icon, key, cls = '') {
  const s = document.createElement('div'); s.className = 'slot ' + cls;
  s.innerHTML = `<div class="ic">${iconMarkup(icon)}</div><div class="cd"></div><div class="cd-mask"><div class="cd-hand"></div></div><div class="cdt"></div><div class="key">${key}</div>`;
  parent.appendChild(s);
  return { el: s, cd: s.querySelector('.cd'), mask: s.querySelector('.cd-mask'), hand: s.querySelector('.cd-hand'), cdt: s.querySelector('.cdt') };
}
function buildHUD() {
  const p = G.player, sk = $('skills'); sk.innerHTML = ''; HUD.slots = {};
  bindTip(mkSlot(sk, p.hero.passive.icon, '', 'passive').el, passiveTip);
  for (const k of ['Q', 'W', 'E', 'R']) {
    const s = mkSlot(sk, p.hero.skills[k].icon, k, k === 'R' ? 'ult' : '');
    s.pips = document.createElement('div'); s.pips.className = 'pips'; s.el.appendChild(s.pips);
    s.up = document.createElement('div'); s.up.className = 'up'; s.up.textContent = '+'; s.el.appendChild(s.up);
    s.up.addEventListener('mousedown', e => { e.stopPropagation(); if (p.rankUp(k)) { G.hudDirty = true; refreshTip(); } });
    bindTip(s.el, () => skillTip(k)); HUD.slots[k] = s;
  }
  const gap = document.createElement('div'); gap.className = 'gap'; sk.appendChild(gap);
  for (const k of ['D', 'F']) { const s = mkSlot(sk, SUMMONERS[k].icon, k, 'summ'); bindTip(s.el, () => summTip(k)); HUD.slots[k] = s; }
  // Portraits are standalone SVG assets.
  const hi = $('heroIcon'); hi.innerHTML = '';
  const portrait = document.createElement('img'); portrait.src = p.spr.portrait; portrait.alt = '';
  hi.appendChild(portrait); hi.style.borderColor = p.hero.color;
  // inventory
  const inv = $('inventory'); inv.innerHTML = ''; HUD.inv = [];
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div'); s.className = 'islot'; inv.appendChild(s); HUD.inv.push(s);
    bindTip(s, () => itemTip(i));
    s.addEventListener('mousedown', e => {
      e.stopPropagation(); if (!p.items[i]) return;
      if (e.button === 2) p.sellItem(i); else if (e.shiftKey) p.dropItem(i); else return;
      hideTip(); HUD.invSig = '';
    });
  }
  $('extrasPanel').innerHTML = ''; HUD.invSig = HUD.exSig = '';
  const el = HUD.el;
  for (const id of ['stageName', 'waveInfo', 'goldInfo', 'killInfo', 'timeInfo', 'statsPanel', 'lvl', 'bossBar']) el[id] = $(id);
  for (const id of ['hpBar', 'mpBar', 'xpBar']) el[id] = { fill: $(id).querySelector('.fill'), span: $(id).querySelector('span'), sh: $(id).querySelector('.shield') };
  el.mpBar.fill.parentNode.classList.toggle('manaless', !!p.hero.manaless);
  el.bossName = el.bossBar.querySelector('.name'); el.bossFill = el.bossBar.querySelector('.fill');
  bindMinimap(); G.hudDirty = true;
}

// ---- per-frame update ----
const fmtT = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function updateHUD(dt) {
  const p = G.player, R = G.run, el = HUD.el; if (!p || !el.lvl) return;
  // cooldowns / slots (every frame, cheap)
  for (const k in HUD.slots) {
    const s = HUD.slots[k], cd = p.cd[k], f = cd > 0 ? cd / p.cdMax[k] : 0;
    s.cd.style.height = (f * 100) + '%';
    s.mask.style.opacity = cd > 0 ? '1' : '0';
    s.hand.style.transform = `translate(-50%, -100%) rotate(${(1 - f) * 360}deg)`;
    setText(s.cdt, cd > 0 ? (cd < 1 ? cd.toFixed(1) : Math.ceil(cd)) : '');
    if (s.pips) {
      const r = p.ranks[k], sk = p.hero.skills[k];
      s.el.classList.toggle('locked', !r);
      s.el.classList.toggle('nomana', !!r && !p.hero.manaless && p.mp < sk.cost[r - 1]);
      s.el.classList.toggle('canup', p.canRank(k));
    }
  }
  const sh = p.shield > 0 ? p.shield : 0, tot = Math.max(p.st.hp, p.hp + sh);
  el.hpBar.fill.style.width = (p.hp / tot * 100) + '%';
  el.hpBar.sh.style.left = (p.hp / tot * 100) + '%'; el.hpBar.sh.style.width = (sh / tot * 100) + '%';
  el.mpBar.fill.style.width = (p.st.mp ? p.mp / p.st.mp * 100 : 0) + '%';
  el.xpBar.fill.style.width = (p.level >= 18 ? 100 : p.xp / XP_REQ(p.level) * 100) + '%';
  const B = R.boss;
  el.bossBar.classList.toggle('hidden', !(B && B.alive));
  if (B && B.alive) { setText(el.bossName, B.name + (B.enraged ? ' — ENRAGED' : '')); el.bossFill.style.width = (B.hp / B.st.hp * 100) + '%'; }
  if (HUD.bannerT > 0 && (HUD.bannerT -= dt) <= 0) $('banner').classList.remove('show');
  if ((HUD.tipAcc += dt) > 0.25) { HUD.tipAcc = 0; refreshTip(); }
  // text (throttled)
  if ((HUD.acc += dt) < 0.1 && !G.hudDirty) return;
  HUD.acc = 0; G.hudDirty = false;
  setText(el.hpBar.span, `${Math.ceil(p.hp)} / ${Math.round(p.st.hp)}` + (sh ? ` (+${Math.round(sh)})` : ''));
  setText(el.mpBar.span, p.hero.manaless ? 'Manaless' : `${Math.floor(p.mp)} / ${Math.round(p.st.mp)}`);
  setHTML(el.lvl, p.level + (p.skillPts > 0 ? `<b class="pts">+${p.skillPts}</b>` : ''));
  for (const k of ['Q', 'W', 'E', 'R']) {
    const max = k === 'R' ? 3 : 5, r = p.ranks[k];
    setHTML(HUD.slots[k].pips, '<i class="on"></i>'.repeat(r) + '<i></i>'.repeat(max - r));
  }
  const S = STAGES[R.stage - 1];
  setText(el.stageName, `Stage ${R.stage}/${STAGES.length} · ${G.map.biome.name}`);
  const alive = G.enemies.filter(e => e.alive).length;
  setText(el.waveInfo, R.phase === 'break' ? `Next wave in ${Math.ceil(R.waveT)}s` : R.phase === 'wave' ? `Wave ${R.wave}/${S.waves} · ${alive + R.queue.length} foes`
    : R.phase === 'boss' ? 'Champion fight!' : 'Enter the portal');
  setHTML(el.goldInfo, `${iconMarkup('💰')} ${fmt(R.gold)}`); setHTML(el.killInfo, `${iconMarkup('💀')} ${R.kills}`); setHTML(el.timeInfo, `${iconMarkup('⏱')} ${fmtT(R.time)}`);
  const st = p.st, row = (ic, n, v) => `<div title="${n}"><span>${iconMarkup(ic)}</span>${v}</div>`;
  setHTML(el.statsPanel, row('🗡️', 'Attack Damage', Math.round(st.ad)) + row('🔮', 'Ability Power', Math.round(st.ap)) +
    row('🛡️', 'Armor', Math.round(st.armor)) + row('🧿', 'Magic Resist', Math.round(st.mr)) +
    row('🏹', 'Attack Speed', st.as.toFixed(2)) + row('🎯', 'Crit Chance', Math.round(st.crit) + '%') +
    row('👟', 'Move Speed', Math.round(st.ms * 100)) + row('🌀', 'Ability Haste', Math.round(st.haste)) +
    row('🩸', 'Life Steal', Math.round(st.ls) + '%') + row('🎲', 'Rerolls', R.rerolls));
  // inventory + extras rebuild only on change
  const sig = p.items.map(it => it.uid).join(',');
  if (sig !== HUD.invSig) {
    HUD.invSig = sig;
    HUD.inv.forEach((s, i) => {
      const it = p.items[i];
      s.innerHTML = it ? `<span>${iconMarkup(it.icon)}</span>` : ''; s.style.borderColor = it ? RARITY[it.rarity].col : '';
      s.classList.toggle('leg', !!(it && it.passive));
    });
  }
  const xs = Object.keys(p.extras).map(k => k + p.extras[k]).join(',');
  if (xs !== HUD.exSig) {
    HUD.exSig = xs; const ep = $('extrasPanel'); ep.innerHTML = '';
    for (const k in p.extras) {
      const d = document.createElement('div'); d.className = 'xslot';
      d.innerHTML = `<span>${iconMarkup(EXTRAS[k].icon)}</span><b>${p.extras[k]}</b>`; bindTip(d, () => extraTip(k)); ep.appendChild(d);
    }
  }
}
function banner(title, sub = '', col = '#ffe8a0') {
  const b = $('banner'); HUD.bannerHTML = `<div class="bt" style="color:${col}">${title}</div>` + (sub ? `<div class="bs">${sub}</div>` : '');
  b.innerHTML = I18N.html(HUD.bannerHTML);
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); HUD.bannerT = 3.2;
}

// ---- minimap (iso diamond, matches the world view) ----
const MM = { S: 140, H: 74, oy: 2, k: 140 / (MAP_W + MAP_H) };
const mmX = (x, y) => (x - y + MAP_H) * MM.k * 1.0;
const mmY = (x, y) => (x + y) * MM.k * 0.5 + MM.oy;
function mmToWorld(px, py) { const a = px / MM.k - MAP_H, b = (py - MM.oy) / (MM.k * 0.5); return { x: (a + b) / 2, y: (b - a) / 2 }; }
function buildMinimapBg() {
  const c = mkCanvas(MM.S, MM.H), x = c.getContext('2d'), m = G.map, b = m.biome;
  x.fillStyle = '#0c0e14'; x.fillRect(0, 0, MM.S, MM.H);
  for (let j = 0; j < MAP_H; j++) for (let i = 0; i < MAP_W; i++) {
    const n = j * MAP_W + i;
    x.fillStyle = m.block[n] ? shade(b.leaf, 0.55) : m.tile[n] === 1 ? b.path : shade(b.grass[0], 0.8);
    x.beginPath(); x.moveTo(mmX(i, j), mmY(i, j)); x.lineTo(mmX(i + 1, j), mmY(i + 1, j));
    x.lineTo(mmX(i + 1, j + 1), mmY(i + 1, j + 1)); x.lineTo(mmX(i, j + 1), mmY(i, j + 1)); x.fill();
  }
  return c;
}
function drawMinimap() {
  const cv = $('minimap'), x = cv.getContext('2d');
  if (!G.minimapBg) G.minimapBg = buildMinimapBg();
  x.drawImage(G.minimapBg, 0, 0);
  const dot = (u, col, r) => { x.fillStyle = col; x.fillRect(Math.round(mmX(u.x, u.y) - r), Math.round(mmY(u.x, u.y) - r), r * 2, r * 2); };
  for (const d of G.drops) if (d.kind === 'item') dot(d, RARITY[d.item.rarity].col, 1.5);
  for (const e of G.enemies) if (e.alive && !e.boss) dot(e, e.elite ? '#ffa030' : '#ff3030', e.elite ? 2 : 1.5);
  if (G.run.boss && G.run.boss.alive) dot(G.run.boss, (G.time * 4 | 0) % 2 ? '#ff2020' : '#ffffff', 3.5);
  if (G.run.portal) dot(G.run.portal, (G.time * 3 | 0) % 2 ? '#ffe070' : '#80d0ff', 3);
  dot(G.player, '#40c0ff', 2.5); x.strokeStyle = '#ffffff'; x.lineWidth = 1;
  x.strokeRect(Math.round(mmX(G.player.x, G.player.y)) - 3.5, Math.round(mmY(G.player.x, G.player.y)) - 3.5, 7, 7);
  // camera frustum: the screen is a rect in iso space -> also a rect on the minimap
  const f = MM.k / HTW, w = VW * f, h = VH * f, cx = G.cam.x * f + MAP_H * MM.k, cy = G.cam.y * f + MM.oy;
  x.strokeStyle = 'rgba(255,255,255,0.5)'; x.strokeRect(Math.round(cx - w / 2) + 0.5, Math.round(cy - h / 2) + 0.5, Math.round(w), Math.round(h));
}
function bindMinimap() {
  const cv = $('minimap'); if (cv._bound) return; cv._bound = true;
  const at = e => { const r = cv.getBoundingClientRect(); return mmToWorld((e.clientX - r.left) * MM.S / r.width, (e.clientY - r.top) * MM.H / r.height); };
  const panTo = e => { const w = at(e); G.cam.lock = false; G.cam.x = isoX(w.x, w.y); G.cam.y = isoY(w.x, w.y); };
  cv.addEventListener('mousedown', e => {
    e.stopPropagation(); if (G.state !== 'play') return;
    const w = at(e);
    if (e.button === 2) { G.player.moveTo(w.x, w.y); G.moveMark = { x: w.x, y: w.y, t: 0.5, col: '#60ff60' }; }
    else if (e.button === 0) { cv._drag = true; panTo(e); }
  });
  cv.addEventListener('mousemove', e => { if (cv._drag && (e.buttons & 1)) panTo(e); });
  addEventListener('mouseup', () => { cv._drag = false; });
}
