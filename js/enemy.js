'use strict';
// ---------- Enemy minions and AI ----------
class Enemy extends Unit {
  constructor(key, x, y, stage, wave, elite, defOverride) {
    const d = defOverride || ENEMY_DEF[key];
    super(x, y, d.r * (elite ? 1.15 : 1));
    const sc = enemyScale(stage, wave), em = elite ? { hp: 3.5, ad: 1.5 } : { hp: 1, ad: 1 };
    this.key = key; this.def = d; this.spr = SPR[d.spr]; this.ai = d.ai; this.elite = elite;
    this.st = { hp: Math.round(d.hp * sc.hp * em.hp), ad: d.ad * sc.ad * em.ad, armor: d.armor * sc.def, mr: d.mr * sc.def, as: d.as, ms: d.ms, range: d.range };
    this.hp = this.st.hp; this.xpReward = d.xp * sc.xp * (elite ? 4 : 1); this.goldReward = Math.round(d.gold * sc.gold * (elite ? 4 : 1));
    this.ccRes = elite ? 0.7 : 1; this.spawnT = 0.6; this.chargeCd = rand(2, 4); this.stage = stage;
    this.partCol = { wolf: '#5a5a6a', boar: '#6a3a22', golem: '#8a8a7a', wisp: '#60c0ff', cannon: '#5a4a3a' }[key] || '#a02020';
    this.atkCd = rand(0.3, 1);
  }
  update(dt) {
    this.tickStatus(dt); this.animT += dt; this.moving = false;
    if (this.spawnT > 0) { this.spawnT -= dt; return; }
    if (this.def.fly) this.z = 4 + Math.sin(G.time * 4 + this.x) * 2;
    if (this.stun > 0 || this.knock) return;
    this.atkCd -= dt; this.chargeCd -= dt;
    const p = G.player, d = dist(this, p);
    if (this.charge) return this.doCharge(dt);
    if (this.windup > 0) { this.windup -= dt; if (this.windup <= 0) this.doAttack(); return; }
    if (this.special && this.special(dt, d)) return;
    const reach = this.st.range + this.r + p.r, sight = los(this.x, this.y, p.x, p.y);
    if (this.ai === 'charger' && d < 5 && d > 1.5 && this.chargeCd <= 0 && sight) {
      this.charge = { tele: 0.55, ang: Math.atan2(p.y - this.y, p.x - this.x), t: 0.5, hit: false };
      teleFx(this.x + Math.cos(this.charge.ang) * 2, this.y + Math.sin(this.charge.ang) * 2, 0.7, '#ff4030', 0.55);
      return;
    }
    if (d <= reach && (this.ai === 'melee' || this.ai === 'charger' || sight)) {
      this.faceTo(p.x);
      if (this.atkCd <= 0) { this.windup = this.boss ? 0.45 : 0.35; this.atkAnim = this.windup + 0.12; this.atkCd = 1 / this.st.as; }
      if ((this.ai === 'ranged' || this.ai === 'caster') && d < this.st.range * 0.45) this.walk(-1, dt, 0.6);
      return;
    }
    this.walk(1, dt, 1, sight);
  }
  walk(dirSign, dt, mul = 1, sight) {
    const p = G.player; let vx, vy;
    if (dirSign < 0 || sight || dist(this, p) < 1.5) { const d = dist(this, p) || 1; vx = (p.x - this.x) / d * dirSign; vy = (p.y - this.y) / d * dirSign; }
    else { const f = flowDir(this); if (!f) return; vx = f.x; vy = f.y; }
    // separation from other enemies
    for (const o of G.enemies) {
      if (o === this || !o.alive) continue;
      const dx = this.x - o.x, dy = this.y - o.y, dd = dx * dx + dy * dy, rr = (this.r + o.r) * 1.1;
      if (dd < rr * rr && dd > 1e-4) { const k = (rr - Math.sqrt(dd)) * 3; vx += dx * k; vy += dy * k; }
    }
    const l = Math.hypot(vx, vy) || 1, s = this.speed * mul * dt;
    moveUnit(this, vx / l * s, vy / l * s); this.moving = true;
    if (dirSign > 0) this.faceTo(this.x + vx); else this.faceTo(p.x);
  }
  doAttack() {
    const p = G.player, d = dist(this, p);
    if (this.blind > 0) { ftext(this.x, this.y, 'MISS', '#aaaaaa'); return; }
    if (this.ai === 'melee' || this.ai === 'charger') {
      if (d <= this.st.range + this.r + p.r + 0.5) { dealDamage(this, p, this.st.ad, 'physical', { attack: true }); slashFx(p.x, p.y, Math.atan2(p.y - this.y, p.x - this.x), 0.6, '#ff8080'); }
    } else if (this.ai === 'siege') {
      const x = p.x, y = p.y; teleFx(x, y, 1.1, '#ff6030', 0.9);
      later(0.9, () => { if (!this.alive && !this.boss) return; aoe(this, x, y, 1.1, this.st.ad, 'physical', {}); burst(x, y, ['#ff8030', '#3a3a3a'], 14, 3, 4, 0.5); });
    } else {
      const ang = Math.atan2(p.y - this.y, p.x - this.x), magic = this.def.magic;
      skillshot(this, ang, magic ? 7 : 9, this.st.range + 2, 0.25, this.def.pcol || '#ddd', t => dealDamage(this, t, this.st.ad, magic ? 'magic' : 'physical', { attack: true }), { size: magic ? 3 : 1, trail: magic });
    }
  }
  doCharge(dt) {
    const c = this.charge, p = G.player;
    if (c.tele > 0) { c.tele -= dt; this.atkAnim = 0.1; return; }
    c.t -= dt; this.moving = true;
    const ok = moveUnit(this, Math.cos(c.ang) * 9 * dt, Math.sin(c.ang) * 9 * dt);
    if (!c.hit && dist(this, p) < this.r + p.r + 0.2) { c.hit = true; dealDamage(this, p, this.st.ad * 1.5, 'physical', { attack: true }); p.knockTo(Math.cos(c.ang) * 0.8, Math.sin(c.ang) * 0.8, 0.15); }
    if (c.t <= 0 || !ok) { this.charge = null; this.chargeCd = rand(4, 6); }
  }
  onDeath() {
    G.run.kills++; gainXP(this.xpReward);
    const gm = 1 + (G.player.st.goldPct || 0) / 100, g = Math.max(1, Math.round(this.goldReward * gm));
    const n = Math.min(5, Math.ceil(g / 6));
    for (let i = 0; i < n; i++) G.drops.push({ kind: 'gold', v: Math.ceil(g / n), x: this.x + rand(-0.3, 0.3), y: this.y + rand(-0.3, 0.3), z: 6, vz: rand(30, 60) });
    if (chance(0.035)) G.drops.push({ kind: 'potion', x: this.x, y: this.y, z: 6, vz: 40 });
    const ic = this.boss ? 2 : this.elite ? 1 : chance(0.06) ? 1 : 0;
    for (let i = 0; i < ic; i++) G.drops.push({ kind: 'item', item: rollItem(this.boss ? 'boss' : this.elite ? 'elite' : 'minion', this.stage), x: this.x + rand(-0.6, 0.6), y: this.y + rand(-0.6, 0.6), z: 10, vz: 50 });
  }
}
