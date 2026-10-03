'use strict';
// ---------- Player per-frame update, attacks, pickups, inventory ----------
Player.prototype.update = function (dt) {
  this.tickStatus(dt);
  for (const id in this.buffs) { const b = this.buffs[id]; b.t -= dt; if (b.t <= 0) delete this.buffs[id]; }
  this.recalc();
  for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] = Math.max(0, this.cd[k] - dt);
  this.hp = Math.min(this.st.hp, this.hp + this.st.regen * dt);
  this.mp = Math.min(this.st.mp, this.mp + this.st.mregen * dt);
  this.atkCd -= dt; this.animT += dt; this.moving = false;
  if (this.hero.tick) this.hero.tick(this, dt);
  for (const k in this.extras) EXTRAS[k].tick(this, this.extras[k], this.extraState[k], dt);
  this.itemTick(dt);
  if (this.dash) {
    const d = this.dash; d.t -= dt;
    const done = this.stepToward(d.x, d.y, dt, d.spd);
    if (chance(0.7)) burst(this.x, this.y, '#d0e0ff', 1, 0.3, 6, 0.25);
    if (done || d.t <= 0 || distXY(this.x, this.y, d.x, d.y) < 0.05) {
      this.dash = null; if (d.onEnd) d.onEnd();
      if (!this.dash && this.order && this.order.type !== 'attack') this.path = findPath(this.x, this.y, this.order.x, this.order.y, this.r) || [];
    }
    this.pickups(dt); return;
  }
  if (this.channel > 0) { this.channel -= dt; this.pickups(dt); return; }
  if (this.stun > 0) { this.pickups(dt); return; }
  if (this.hero.canAct && !this.hero.canAct(this)) { this.pickups(dt); return; }
  if (this.windup > 0) {
    this.windup -= dt;
    const t = this.order && this.order.t;
    if (this.windup <= 0 && t && t.alive) { playerAttack(this, t); this.atkAnim = 0.12; }
    this.pickups(dt); return;
  }
  const o = this.order;
  if (o && o.type === 'amove') {
    const t = nearestEnemy(this.x, this.y, this.st.range + 2.5);
    if (t) { this.order = { type: 'attack', t, amove: { x: o.x, y: o.y } }; this.path = []; }
    else if (this.followPath(dt)) this.order = null;
  } else if (o && o.type === 'move') {
    if (this.followPath(dt)) this.order = null;
  } else if (o && o.type === 'attack') {
    const t = o.t;
    if (!t.alive) {
      this.order = o.amove ? { type: 'amove', ...o.amove } : null;
      if (o.amove) this.path = findPath(this.x, this.y, o.amove.x, o.amove.y, this.r) || [];
    } else if (dist(this, t) <= this.st.range + t.r + this.r) {
      this.faceTo(t.x);
      if (this.atkCd <= 0 && (!this.hero.canAttack || this.hero.canAttack(this))) {
        const iv = 1 / this.st.as; this.atkCd = iv; this.windup = Math.min(0.25, iv * 0.3); this.atkAnim = this.windup + 0.1;
      }
    } else this.chase(t, dt);
  } else if (!o) {
    // idle: auto-acquire enemies that come close, like a MOBA champion
    const t = nearestEnemy(this.x, this.y, Math.max(2.5, this.st.range + 0.5));
    if (t && this.atkCd <= 0) this.order = { type: 'attack', t };
  }
  this.pickups(dt);
};
Player.prototype.itemTick = function (dt) {
  const pa = this.passives;
  if (pa.sunfire) {
    this._sf = (this._sf || 0) - dt;
    if (this._sf <= 0) { this._sf = 1; aoe(this, this.x, this.y, 2, 12 + this.st.hp * 0.01, 'magic', { dot: true }); discFx(this.x, this.y, 2, '#ff803030', 0.6); }
  }
  if (pa.warmog && G.time - this.lastHurt > 4) heal(this, this.st.hp * 0.03 * dt, false);
};
Player.prototype.pickups = function (dt) {
  const mag = 1.4 * (1 + (this.st.magnet || 0) / 100);
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const d = G.drops[i], dd = dist(this, d);
    if (d.z > 0 || (d.lock && d.lock > G.time)) continue;
    const want = d.kind !== 'item' || this.items.length < 6;
    if (want && dd < (d.kind === 'item' ? 1.1 : mag)) {
      if (dd > 0.35) { const s = Math.max(6, 12 - dd * 2) * dt; d.x += (this.x - d.x) / dd * s; d.y += (this.y - d.y) / dd * s; continue; }
      G.drops.splice(i, 1);
      if (d.kind === 'gold') { G.run.gold += d.v; ftext(this.x, this.y, '+' + d.v + 'g', '#ffd040'); }
      else if (d.kind === 'potion') { heal(this, this.st.hp * 0.2); this.mp = Math.min(this.st.mp, this.mp + this.st.mp * 0.2); }
      else if (d.kind === 'item') { this.items.push(d.item); this.recalc(); ftext(this.x, this.y, d.item.name, RARITY[d.item.rarity].col, true); G.hudDirty = true; }
    } else if (!want && dd < 1 && !d.warned) { d.warned = true; ftext(this.x, this.y, 'Inventory full (right-click item to sell)', '#ff9090'); }
  }
};
Player.prototype.sellItem = function (idx) {
  const it = this.items[idx]; if (!it) return;
  this.items.splice(idx, 1); G.run.gold += it.value; this.recalc(); G.hudDirty = true;
  ftext(this.x, this.y, '+' + it.value + 'g', '#ffd040');
};
Player.prototype.dropItem = function (idx) {
  const it = this.items[idx]; if (!it) return;
  this.items.splice(idx, 1); this.recalc(); G.hudDirty = true;
  G.drops.push({ kind: 'item', item: it, x: this.x + rand(-1, 1), y: this.y + 1.2, z: 6, vz: 30, lock: G.time + 4 });
};
