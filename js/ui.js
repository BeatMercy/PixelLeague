'use strict';
// ---------- Full-screen UI: title, hero select, talent cards, camp, pause, results, armory ----------
const UI = { cards: null, onCardsDone: null, shop: [], ended: false };
function screen(html, cls = '') {
  const s = $('screen'); s.className = cls; s.innerHTML = html; hideTip();
  s.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); UI_ACT[b.dataset.act](b.dataset.arg, b); }));
  s.querySelectorAll('[data-tip]').forEach(b => bindTip(b, () => b.dataset.tip));
  return s;
}
function closeScreen() { $('screen').className = 'hidden'; $('screen').innerHTML = ''; hideTip(); }
const btn = (label, act, arg = '', cls = '') => `<button class="btn ${cls}" data-act="${act}" data-arg="${arg}">${label}</button>`;
function spriteImg(sprKey, scale) {
  const f = SPR[sprKey].frames[0].r;
  return `<img class="pix" src="${f.toDataURL()}" style="width:${f.width * scale}px;height:${f.height * scale}px">`;
}

// ---- title ----
function showTitle() {
  G.state = 'title'; showHUD(false); const m = loadMeta();
  screen(`<div class="title">
    <div class="logo">PIXEL LEAGUE</div><div class="sublogo">The Silverfield Outskirts</div>
    <div class="heroes">${HEROES.map(h => spriteImg(h.spr, 4)).join('')}</div>
    <div class="menu">${btn('▶ New Run', 'select')}${btn(`🛡️ Armory <small>(${m.shards} shards)</small>`, 'armory')}${btn('❔ How to Play', 'help')}</div>
    <div class="foot">Runs ${m.runs} · Victories ${m.wins} · Best stage ${Math.min(m.best || 0, STAGES.length)}${m.wins ? ' ★' : ''}</div>
  </div>`, 'full');
}
function showHelp(back = 'title') {
  screen(`<div class="panel help"><h2>How to Play</h2>
    <p>Survive waves across ${STAGES.length} regions of the Demacian outskirts and defeat each region's champion.</p>
    <table>
      <tr><td>Right-click</td><td>Move / attack an enemy (hold to keep moving)</td></tr>
      <tr><td>A + Left-click</td><td>Attack-move (attack anything near the target point)</td></tr>
      <tr><td>Q W E R</td><td>Cast skills (aim with the mouse)</td></tr>
      <tr><td>Shift + Q/W/E/R</td><td>Spend a skill point (or click + on a skill)</td></tr>
      <tr><td>D / F</td><td>Flash / Heal</td></tr>
      <tr><td>S</td><td>Stop</td></tr>
      <tr><td>Space / Y</td><td>Center camera / toggle camera lock</td></tr>
      <tr><td>Items</td><td>Walk over loot to pick up · Right-click a slot to sell · Shift+click to drop</td></tr>
      <tr><td>Esc</td><td>Pause</td></tr>
    </table>
    <p>Every level (max 18) grants a skill point and a <b>talent card</b>: stats, special effects or auto-cast <span style="color:${CARD_COL.skill}">bonus skills</span>.</p>
    ${btn('Back', back)}</div>`, back === 'title' ? 'full' : 'dim');
}

// ---- hero select ----
function showSelect() {
  G.state = 'select';
  const bar = (v, max) => `<div class="sbar"><div style="width:${clamp(v / max * 100, 5, 100)}%"></div></div>`;
  screen(`<div class="select"><h2>Choose your Champion</h2><div class="hcards">${HEROES.map((h, i) => `
    <div class="hcard" style="--hc:${h.color}" data-act="pick" data-arg="${i}">
      <div class="hspr">${spriteImg(h.spr, 5)}</div>
      <div class="hname">${h.name}</div><div class="htitle">${h.title}</div><div class="hrole">${h.role}</div>
      <div class="hstats"><span>Health</span>${bar(h.base.hp, 750)}<span>Attack</span>${bar(h.base.ad, 70)}
        <span>Range</span>${bar(h.base.range, 5.5)}<span>Speed</span>${bar(h.base.ms, 3.4)}</div>
      <div class="hpass" data-tip="${h.passive.desc.replace(/"/g, '&quot;')}">${h.passive.icon} ${h.passive.name}</div>
      <div class="hskills">${['Q', 'W', 'E', 'R'].map(k => `<span data-tip="<div class='tt-title'>${h.skills[k].icon} ${h.skills[k].name} [${k}]</div><div class='tt-desc'>${h.skills[k].desc(1).replace(/"/g, '&quot;')}</div>">${h.skills[k].icon}</span>`).join('')}</div>
    </div>`).join('')}</div>${btn('Back', 'title')}</div>`, 'full');
}

// ---- level-up talent cards ----
function openCards(onDone) {
  G.state = 'cards'; UI.onCardsDone = onDone || null;
  UI.cards = genCards(G.player, 3); renderCards();
}
function cardHTML(c, i) {
  const col = CARD_COL[c.rar] || CARD_COL.common, tag = c.kind === 'extra' ? 'Bonus Skill' : c.id[1] === '_' ? 'Champion' : c.rar;
  return `<div class="card rar-${c.rar}" style="--cc:${col}" data-act="card" data-arg="${i}">
    <div class="ckey">${i + 1}</div><div class="cicon">${c.icon}</div><div class="cname">${c.name}</div>
    <div class="crar">${tag}</div><div class="cdesc">${cardDesc(c)}</div></div>`;
}
function renderCards() {
  const p = G.player, R = G.run;
  screen(`<div class="cards-wrap"><h2>Level ${p.level - R.pendingCards + 1} — Choose a Talent</h2>
    <div class="sub">${R.pendingCards > 1 ? `${R.pendingCards} picks pending · ` : ''}${p.skillPts > 0 ? `${p.skillPts} skill point${p.skillPts > 1 ? 's' : ''} to spend (Shift+Q/W/E/R)` : ''}</div>
    <div class="cards">${UI.cards.map(cardHTML).join('')}</div>
    <div class="row">${btn(`🎲 Reroll (${R.rerolls}) [T]`, 'reroll', '', R.rerolls > 0 ? '' : 'off')}</div></div>`, 'dim');
}
function pickCard(i) {
  const c = UI.cards && UI.cards[i]; if (!c) return;
  const p = G.player; applyCard(p, c); G.hudDirty = true;
  burst(p.x, p.y, [CARD_COL[c.rar], '#ffffff'], 16, 2, 18, 0.6);
  if (G.run.pendingCards > 0) G.run.pendingCards--;
  const done = UI.onCardsDone;
  if (!done && G.run.pendingCards > 0) { UI.cards = genCards(p, 3); renderCards(); return; }
  UI.cards = null; UI.onCardsDone = null;
  if (done) done(); else { closeScreen(); G.state = 'play'; }
}
function rerollCards() { if (G.run.rerolls <= 0) return; G.run.rerolls--; UI.cards = genCards(G.player, 3); renderCards(); }

// ---- camp between stages ----
function openCamp() {
  const p = G.player, R = G.run;
  p.hp = p.st.hp; p.mp = p.st.mp; for (const k in p.cd) p.cd[k] = 0;
  for (const d of G.drops) if (d.kind === 'gold') R.gold += d.v; G.drops = [];
  UI.shop = []; for (let i = 0; i < 4; i++) UI.shop.push(rollItem('shop', R.stage + 1));
  UI.wisdom = false; UI.rerollCost = 30; renderCamp();
}
const shopPrice = it => Math.round(it.value * 2.2);
const wisdomCost = () => 60 + 40 * G.run.stage;
function renderCamp() {
  G.state = 'camp'; const p = G.player, R = G.run, full = p.items.length >= 6;
  screen(`<div class="panel camp"><h2>🔥 Camp — next: ${BIOMES[STAGES[R.stage].biome].name}</h2>
    <div class="sub">You rest by the fire. Health and mana restored. Gold: <b class="gold">${R.gold}</b></div>
    <div class="shop">${UI.shop.map((it, i) => it ? `<div class="sitem" style="--rc:${RARITY[it.rarity].col}">
      <div class="sicon">${it.icon}</div><div class="sinfo">${itemHTML(it).replace(/<div class="tt-val">.*?<\/div>/, '')}</div>
      ${btn(`${shopPrice(it)}g`, 'buy', i, R.gold >= shopPrice(it) && !full ? '' : 'off')}</div>` : '<div class="sitem sold">SOLD</div>').join('')}</div>
    ${full ? '<div class="warn">Inventory full — right-click an item below to sell it.</div>' : ''}
    <div class="campinv">${p.items.map((it, i) => `<div class="islot" style="border-color:${RARITY[it.rarity].col}" data-act="sell" data-arg="${i}" data-tip="${(itemHTML(it) + '<div class=tt-sub>Click to sell</div>').replace(/"/g, '&quot;')}">${it.icon}</div>`).join('')}</div>
    <div class="row">${btn(`🎲 Reroll shop (${UI.rerollCost}g)`, 'shopReroll', '', R.gold >= UI.rerollCost ? '' : 'off')}
      ${btn(`📜 Seek Wisdom (${wisdomCost()}g)`, 'wisdom', '', !UI.wisdom && R.gold >= wisdomCost() ? '' : 'off')}
      ${btn('Continue ▶', 'nextStage', '', 'go')}</div></div>`, 'dim');
}

// ---- pause / results / armory ----
function showPause(force) {
  if (G.state !== 'play' && !force) return; G.state = 'pause';
  screen(`<div class="panel pause"><h2>Paused</h2>${btn('Resume [Esc]', 'resume', '', 'go')}${btn('How to Play', 'helpPause')}${btn('Abandon Run', 'abandon', '', 'bad')}</div>`, 'dim');
}
function resume() { closeScreen(); G.state = 'play'; }
function endRun(win) {
  if (UI.ended) return; UI.ended = true;
  G.state = 'over'; const R = G.run, p = G.player, aw = awardShards(win);
  showHUD(false);
  const stat = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
  screen(`<div class="panel results ${win ? 'win' : 'lose'}">
    <h2>${win ? '🏆 Demacia Stands!' : '☠️ Defeated'}</h2>
    <div class="sub">${win ? 'All champions of the outskirts have fallen.' : `Fell in ${BIOMES[STAGES[R.stage - 1].biome].name}, wave ${R.wave}.`}</div>
    <div class="rstats">${stat('Champion', p.hero.name)}${stat('Level', p.level)}${stat('Time', fmtT(R.time))}
      ${stat('Kills', R.kills)}${stat('Champions slain', R.bossKills)}${stat('Gold', R.gold)}</div>
    <div class="ritems">${p.items.map(it => `<span style="border-color:${RARITY[it.rarity].col}">${it.icon}</span>`).join('')}</div>
    <div class="shards">${aw.parts.map(([k, v]) => `<div><span>${k}</span><b>+${v}</b></div>`).join('')}
      <div class="tot"><span>Petricite Shards earned</span><b>+${aw.total}</b></div></div>
    <div class="row">${btn('▶ Play Again', 'select', '', 'go')}${btn(`🛡️ Armory (${aw.shards})`, 'armory')}${btn('Title', 'title')}</div></div>`, 'dim');
}
function showArmory() {
  const m = loadMeta(); G.state = 'armory';
  screen(`<div class="panel armory"><h2>🛡️ The Armory</h2><div class="sub">Spend Petricite Shards on permanent upgrades. You have <b class="gold">${m.shards}</b>.</div>
    <div class="ups">${META_UP.map(u => {
      const n = m.up[u.id] || 0, c = metaCost(u, n), maxed = n >= u.max;
      return `<div class="up"><div class="uicon">${u.icon}</div><div class="uname">${u.name}</div>
        <div class="upips">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(u.max - n)}</div>
        <div class="udesc">${u.desc(Math.max(1, n))}${n ? '' : ' (at rank 1)'}</div>
        ${maxed ? '<div class="umax">MAX</div>' : btn(`${c} ◆`, 'buyMeta', u.id, m.shards >= c ? '' : 'off')}</div>`;
    }).join('')}</div>${btn('Back', 'title')}</div>`, 'full');
}

// ---- button actions + keyboard for UI states ----
const UI_ACT = {
  title: showTitle, select: showSelect, help: () => showHelp(), armory: showArmory,
  helpPause: () => showHelp('pauseBack'), pauseBack: () => showPause(true),
  pick: i => { UI.ended = false; closeScreen(); startRun(HEROES[+i]); },
  card: i => pickCard(+i), reroll: rerollCards, resume,
  abandon: () => { closeScreen(); endRun(false); },
  buyMeta: id => { if (buyMeta(id)) showArmory(); },
  buy: i => {
    const p = G.player, R = G.run, it = UI.shop[+i]; if (!it || p.items.length >= 6 || R.gold < shopPrice(it)) return;
    R.gold -= shopPrice(it); p.items.push(it); UI.shop[+i] = null; p.recalc(); G.hudDirty = true; renderCamp();
  },
  sell: i => { G.player.sellItem(+i); renderCamp(); },
  shopReroll: () => {
    const R = G.run; if (R.gold < UI.rerollCost) return;
    R.gold -= UI.rerollCost; UI.rerollCost += 20;
    UI.shop = UI.shop.map(() => rollItem('shop', R.stage + 1)); renderCamp();
  },
  wisdom: () => {
    const R = G.run; if (UI.wisdom || R.gold < wisdomCost()) return;
    R.gold -= wisdomCost(); UI.wisdom = true; R.pendingCards++; openCards(renderCamp);
  },
  nextStage: () => { closeScreen(); startStage(G.run.stage + 1); G.state = 'play'; G.hudDirty = true; },
};
function uiKey(e) {
  const st = G.state;
  if (st === 'cards') {
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
    if (n !== undefined) pickCard(n);
    else if (e.code === 'KeyT') rerollCards();
    else if (e.shiftKey && ['KeyQ', 'KeyW', 'KeyE', 'KeyR'].includes(e.code)) { if (G.player.rankUp(e.code[3])) { G.hudDirty = true; renderCards(); } }
  } else if (st === 'pause' && e.code === 'Escape') resume();
  else if (st === 'title' && e.code === 'Enter') showSelect();
  else if ((st === 'select' || st === 'armory') && e.code === 'Escape') showTitle();
}
