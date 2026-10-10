'use strict';
// ---------- Shared skill helpers + the Player ----------
function aoe(src, x, y, r, dmg, type, o, fn) {
  const tg = src === G.player ? G.enemies.slice() : foesOf(src);
  for (const e of tg) if (e.alive && distXY(x, y, e.x, e.y) < r + e.r) { dealDamage(src, e, dmg, type, o); if (fn) fn(e); }
}
function addZone(z) { z.max = z.t; G.zones.push(z); }
function snapFree(x, y, r) {
  if (freeCircle(x, y, r)) return { x, y };
  for (let d = 0.25; d < 3; d += 0.25) for (let a = 0; a < TAU; a += 0.5) {
    const nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d; if (freeCircle(nx, ny, r)) return { x: nx, y: ny };
  }
  return null;
}
const SUMMONERS = {
  D: { name: 'Flash', icon: '✴️', cd: 30, desc: 'Teleport a short distance toward your cursor. Can pass over obstacles.' },
  F: { name: 'Heal', icon: '💖', cd: 45, desc: 'Restore 25% max HP and gain 30% move speed for 2s.' },
};

class Player extends Unit {
  constructor(hero) {
    super(MC + 0.5, MC + 0.5, 0.3);
    Object.assign(this, { hero, spr: SPR[hero.spr], level: 1, xp: 0, ranks: { Q: 0, W: 0, E: 0, R: 0 }, skillPts: 1,
      cd: { Q: 0, W: 0, E: 0, R: 0, D: 0, F: 0 }, cdMax: { Q: 1, W: 1, E: 1, R: 1, D: 1, F: 1 }, items: [], tstats: {}, mstats: metaStats(),
      buffs: {}, extras: {}, extraState: {}, maxExtras: 4, taken: {}, flags: {}, passives: {}, order: null, path: [], repath: 0,
      dash: null, channel: 0, walkPhase: 0, _kk: 0, _ss: 0, spellblade: 0, partCol: '#c03030' });
    this.recalc(); this.hp = this.st.hp; this.mp = this.st.mp;
  }
  recalc() {
    const h = this.hero, L = this.level - 1, st = { ap: 0, crit: 0, ls: 0, sv: 0, haste: 0, range: h.base.range };
    for (const k of ['hp', 'mp', 'ad', 'armor', 'mr', 'regen', 'mregen']) st[k] = (h.base[k] || 0) + (h.grow[k] || 0) * L;
    const bonus = {}, add = o => { for (const k in o) bonus[k] = (bonus[k] || 0) + o[k]; };
    this.passives = {};
    for (const it of this.items) { add(it.stats); if (it.passive) this.passives[it.passive] = true; }
    add(this.tstats); add(this.mstats); for (const id in this.buffs) add(this.buffs[id].st);
    for (const k in bonus) if (k !== 'as' && k !== 'ms') st[k] = (st[k] || 0) + bonus[k];
    st.asPct = (h.grow.as || 0) * L + (bonus.as || 0);
    st.as = Math.min(2.5, h.base.as * (1 + st.asPct / 100));
    st.ms = Math.min(6.5, h.base.ms * (1 + (bonus.ms || 0) / 100));
    if (this.passives.rabadon) st.ap *= 1.35;
    st.crit = Math.min(100, st.crit);
    if (h.manaless) st.mp = 0;
    if (h.statMod) h.statMod(this, st);
    this.baseAd = h.base.ad + h.grow.ad * L; this.bonusAd = Math.max(0, st.ad - this.baseAd);
    const prev = this.st.hp; this.st = st;
    if (prev && st.hp > prev) this.hp += st.hp - prev;
    this.hp = Math.min(this.hp, st.hp); this.mp = Math.min(this.mp, st.mp);
  }
  addBuff(id, t, st) { this.buffs[id] = { t, st }; }
  removeBuff(id) { delete this.buffs[id]; }
  canRank(k) {
    const r = this.ranks[k];
    if (this.skillPts <= 0) return false;
    if (k === 'R') return r < 3 && this.level >= [6, 11, 16][r];
    return r < 5 && r < Math.ceil(this.level / 2);
  }
  rankUp(k) { if (!this.canRank(k)) return false; this.ranks[k]++; this.skillPts--; return true; }
  // ---- orders ----
  cancelWindup() { if (this.windup > 0) { this.windup = 0; this.atkCd = 0; } }
  moveTo(x, y) { this.cancelWindup(); this.order = { type: 'move', x, y }; this.path = findPath(this.x, this.y, x, y, this.r) || []; }
  attackUnit(t) { if (this.order && this.order.t === t) return; this.order = { type: 'attack', t }; this.path = []; this.repath = 0; }
  attackMove(x, y) { this.cancelWindup(); this.order = { type: 'amove', x, y }; this.path = findPath(this.x, this.y, x, y, this.r) || []; }
  stop() { this.cancelWindup(); this.order = null; this.path = []; }
  dashTo(x, y, spd, onEnd, maxT = 0.5) { this.cancelWindup(); this.dash = { x, y, spd, onEnd, t: maxT }; }
  stepToward(tx, ty, dt, spd = this.speed) {
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy), s = spd * dt;
    this.faceTo(tx);
    const move = (mx, my) => {
      const x = this.x, y = this.y;
      moveUnit(this, mx, my);
      const traveled = distXY(x, y, this.x, this.y);
      this.moving = traveled > 0.001;
      this.walkPhase += traveled / 1.2;
    };
    if (d <= s) { move(dx, dy); return true; }
    move(dx / d * s, dy / d * s); return false;
  }
  followPath(dt) {
    if (!this.path.length) return true;
    if (this.stepToward(this.path[0].x, this.path[0].y, dt)) this.path.shift();
    return !this.path.length;
  }
  chase(t, dt) {
    this.repath -= dt;
    if (los(this.x, this.y, t.x, t.y, this.r)) { this.path = []; this.stepToward(t.x, t.y, dt); return; }
    if (this.repath <= 0 || !this.path.length) { this.path = findPath(this.x, this.y, t.x, t.y, this.r) || []; this.repath = 0.4; }
    this.followPath(dt);
  }
  // ---- skills ----
  cast(k, confirmAim = false) {
    if (!confirmAim && this.aimSkill === k) { this.aimSkill = null; return; }
    const sk = this.hero.skills[k], r = this.ranks[k];
    if (!r) { ftext(this.x, this.y, 'Not learned', '#aaa'); return; }
    if (this.cd[k] > 0 || this.stun > 0 || this.silence > 0 || this.dash || this.channel > 0) return;
    if (this.hero.canAct && !this.hero.canAct(this)) return;
    const cost = this.hero.manaless ? 0 : sk.cost[r - 1];
    if (this.mp < cost) { ftext(this.x, this.y, 'No mana', '#60a0ff'); return; }
    if (!confirmAim && SETTINGS.castMode === 'indicator') { this.aimSkill = k; return; }
    let tx = mouse.wx, ty = mouse.wy;
    if (sk.aim === 'unit' && G.hoverEnemy) { tx = G.hoverEnemy.x; ty = G.hoverEnemy.y; }
    this.cancelWindup(); this.faceTo(tx);
    if (sk.cast(this, tx, ty, r) === false) return;
    this.aimSkill = null;
    this.mp -= cost; this.cd[k] = this.cdMax[k] = sk.cd[r - 1] * 100 / (100 + this.st.haste);
    if (this.passives.spellblade) this.spellblade = 1;
    if (this.flags.phase) this.addBuff('phase', 2, { ms: 40 });
    this.atkAnim = 0.15;
  }
  summoner(k) {
    if (this.cd[k] > 0 || this.stun > 0) return;
    if (k === 'D') {
      const a = Math.atan2(mouse.wy - this.y, mouse.wx - this.x), d = Math.min(3.5, distXY(this.x, this.y, mouse.wx, mouse.wy));
      let ok = null;
      for (let dd = d; dd >= 0; dd -= 0.2) { const x = this.x + Math.cos(a) * dd, y = this.y + Math.sin(a) * dd; if (freeCircle(x, y, this.r)) { ok = { x, y }; break; } }
      if (!ok) return;
      burst(this.x, this.y, '#ffe080', 12, 2, 10, 0.4); this.x = ok.x; this.y = ok.y; this.dash = null;
      burst(this.x, this.y, '#ffe080', 12, 2, 10, 0.4); ringFx(this.x, this.y, 0.7, '#ffe080', 0.3);
      if (this.order && this.order.type !== 'attack') this.path = findPath(this.x, this.y, this.order.x, this.order.y, this.r) || [];
    } else { heal(this, this.st.hp * 0.25); this.addBuff('heal', 2, { ms: 30 }); burst(this.x, this.y, '#70ff70', 14, 2, 12, 0.6); }
    this.cd[k] = this.cdMax[k] = SUMMONERS[k].cd;
  }
}
