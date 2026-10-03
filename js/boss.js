'use strict';
// ---------- Bosses: telegraphed ability rotation ----------
class Boss extends Enemy {
  constructor(key, x, y, stage) {
    const d = BOSS_DEF[key];
    super(key, x, y, stage, 0, false, d);
    this.boss = true; this.ccRes = 0.4; this.name = d.name;
    this.st.hp = Math.round(d.hp * (1 + (G.run.meta.bossHp || 0))); this.hp = this.st.hp;
    this.st.ad = d.ad; this.st.armor = d.armor; this.st.mr = d.mr;
    this.xpReward = d.xp; this.goldReward = d.gold;
    this.abT = 4; this.abI = 0; this.cast = null; this.enraged = false; this.partCol = '#ffd040';
  }
  special(dt, d) {
    if (!this.enraged && this.hp < this.st.hp * 0.4) {
      this.enraged = true; this.st.as *= 1.3; this.st.ms *= 1.15;
      ftext(this.x, this.y, 'ENRAGED', '#ff4040', true); ringFx(this.x, this.y, 2, '#ff4040', 0.6);
    }
    if (this.cast) {
      this.cast.t -= dt; this.atkAnim = 0.1; this.faceTo(G.player.x);
      if (this.cast.t <= 0) { const c = this.cast; this.cast = null; c.fn(); }
      return true;
    }
    this.abT -= dt;
    if (this.abT > 0 || d > 9) return false;
    const ab = this.def.ab[this.abI++ % this.def.ab.length];
    this.abT = (this.enraged ? 3.2 : 4.5) + rand(0, 1.5);
    this['ab_' + ab]();
    return true;
  }
  ab_slam() {
    const p = G.player, x = p.x, y = p.y, r = 2;
    teleFx(x, y, r, '#ff3020', 1.0);
    this.cast = { t: 1.0, fn: () => {
      aoe(this, x, y, r, this.st.ad * 2.2, 'physical', {}, t => t.stunFor(0.6));
      discFx(x, y, r, '#ff8040', 0.4); burst(x, y, ['#8a6a4a', '#ff8040', '#3a2a1a'], 26, 4, 4, 0.7); G.shake = 0.4;
    } };
  }
  ab_charge() {
    const p = G.player, ang = Math.atan2(p.y - this.y, p.x - this.x);
    for (let k = 1; k <= 4; k++) teleFx(this.x + Math.cos(ang) * k * 1.4, this.y + Math.sin(ang) * k * 1.4, 0.7, '#ff4030', 0.7);
    this.cast = { t: 0.7, fn: () => { this.charge = { tele: 0, ang, t: 0.65, hit: false }; } };
  }
  ab_summon() {
    const n = 3 + Math.floor(G.run.stage / 2);
    ringFx(this.x, this.y, 2.5, '#c060ff', 0.6);
    this.cast = { t: 0.6, fn: () => {
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n, s = snapFree(this.x + Math.cos(a) * 1.8, this.y + Math.sin(a) * 1.8, 0.3);
        if (s) { const e = new Enemy(this.def.adds, s.x, s.y, G.run.stage, 3, false); G.enemies.push(e); burst(s.x, s.y, '#c060ff', 8, 2, 6, 0.4); }
      }
    } };
  }
  ab_nova() {
    const n = 16; ringFx(this.x, this.y, 1.5, '#ff60c0', 0.8);
    this.cast = { t: 0.8, fn: () => {
      const off = rand(0, TAU);
      for (let i = 0; i < n; i++) skillshot(this, off + i * TAU / n, 5.5, 9, 0.3, this.def.pcol || '#ff60c0', t => dealDamage(this, t, this.st.ad * 0.9, 'magic', {}), { size: 3, wall: false });
    } };
  }
  ab_volley() {
    const p = G.player, ang = Math.atan2(p.y - this.y, p.x - this.x);
    for (let k = 1; k <= 3; k++) teleFx(this.x + Math.cos(ang) * k * 1.6, this.y + Math.sin(ang) * k * 1.6, 0.5, '#ffa040', 0.6);
    this.cast = { t: 0.6, fn: () => {
      for (let i = -3; i <= 3; i++) skillshot(this, ang + i * 0.16, 9, 10, 0.25, this.def.pcol || '#ffa040', t => dealDamage(this, t, this.st.ad * 0.8, this.def.magic ? 'magic' : 'physical', {}), { size: 2 });
    } };
  }
  onDeath() {
    super.onDeath();
    G.shake = 0.8; burst(this.x, this.y, ['#ffd040', '#ffffff', '#ff8040'], 50, 5, 20, 1.2);
    G.onBossDead && G.onBossDead(this);
  }
}
