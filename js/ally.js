'use strict';
// ---------- Allied NPCs (LineAttack): spawn on the left of the screen, fight the enemy stream from the right ----------
const ALLY_DEF = {
  squire: { name: 'Vanguard Squire', spr: 'ally_sword', ai: 'melee', hp: 260, ad: 12, armor: 10, mr: 8, as: 0.8, range: 0.9, ms: 2.6, r: 0.32, xp: 0, gold: 0 },
  bowman: { name: 'Vanguard Bowman', spr: 'ally_archer', ai: 'ranged', hp: 160, ad: 11, armor: 5, mr: 5, as: 0.6, range: 5, ms: 2.4, r: 0.3, xp: 0, gold: 0, pcol: '#9ad0ff' },
  priest: { name: 'Vanguard Mage', spr: 'ally_mage', ai: 'caster', hp: 150, ad: 15, armor: 4, mr: 12, as: 0.45, range: 5.5, ms: 2.3, r: 0.3, xp: 0, gold: 0, pcol: '#80ffd0', magic: true },
};
const ALLY_POOL = ['squire', 'squire', 'bowman', 'priest'];
const ALLY_MAX = 4;

// Nearest living enemy-side target for an enemy: the player or any ally, allies only when they are close.
function pickEnemyTarget(e) {
  const p = G.player;
  let best = p, bd = p.alive ? dist(e, p) : 1e9;
  for (const a of G.allies) {
    if (!a.alive || a.spawnT > 0) continue;
    const d = dist(e, a);
    if (d < 8 && d < bd + 1.5) { best = a; bd = d; }
  }
  return best;
}
function foesOf(src) { return src === G.player || src.ally ? G.enemies : [G.player].concat(G.allies); }

class Ally extends Enemy {
  constructor(key, x, y, stage, wave) {
    super(key, x, y, stage, wave, false, ALLY_DEF[key]);
    this.ally = true; this.tgt = null;
    this.st.hp = Math.round(this.st.hp * 1.0); this.hp = this.st.hp;
    this.xpReward = 0; this.goldReward = 0; this.ccRes = 1; this.partCol = '#60a0ff';
  }
  target() {
    let best = null, bd = 16;
    for (const e of G.enemies) {
      if (!e.alive || e.spawnT > 0) continue;
      const d = dist(this, e); if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  update(dt) {
    this.tickStatus(dt); this.animT += dt; this.moving = false;
    if (this.spawnT > 0) { this.spawnT -= dt; return; }
    if (this.def.fly) this.z = 4 + Math.sin(G.time * 4 + this.x) * 2;
    if (this.stun > 0 || this.knock) return;
    this.atkCd -= dt;
    if (this.windup > 0) { this.windup -= dt; if (this.windup <= 0) this.doAttack(); return; }
    const t = this.tgt = this.target();
    if (!t) { // idle: stay near the player
      const p = G.player;
      if (p.alive && dist(this, p) > 3) { this.tgt = p; this.walk(1, dt, 1, los(this.x, this.y, p.x, p.y)); }
      return;
    }
    const d = dist(this, t), reach = this.st.range + this.r + t.r, sight = los(this.x, this.y, t.x, t.y);
    if (d <= reach && (this.ai === 'melee' || sight)) {
      this.faceTo(t.x);
      if (this.atkCd <= 0) { this.windup = 0.35; this.atkAnim = this.windup + 0.12; this.atkCd = 1 / this.st.as; }
      if (this.ai !== 'melee' && d < this.st.range * 0.45) this.walk(-1, dt, 0.6);
      return;
    }
    this.walk(1, dt, 1, sight);
  }
  walk(dirSign, dt, mul = 1, sight) {
    const t = this.tgt || G.player; let vx, vy;
    if (dirSign < 0 || sight || dist(this, t) < 1.5) { const d = dist(this, t) || 1; vx = (t.x - this.x) / d * dirSign; vy = (t.y - this.y) / d * dirSign; }
    else { const f = flowDir(this); if (!f) return; vx = f.x; vy = f.y; }
    for (const o of G.enemies.concat(G.allies)) {
      if (o === this || !o.alive) continue;
      const dx = this.x - o.x, dy = this.y - o.y, dd = dx * dx + dy * dy, rr = (this.r + o.r) * 1.1;
      if (dd < rr * rr && dd > 1e-4) { const k = (rr - Math.sqrt(dd)) * 3; vx += dx * k; vy += dy * k; }
    }
    const l = Math.hypot(vx, vy) || 1, s = this.speed * mul * dt;
    moveUnit(this, vx / l * s, vy / l * s); this.moving = true;
    if (dirSign > 0) this.faceTo(this.x + vx); else this.faceTo(t.x);
  }
  doAttack() {
    const t = this.tgt; if (!t || !t.alive) return;
    const d = dist(this, t);
    if (this.ai === 'melee') {
      if (d <= this.st.range + this.r + t.r + 0.5) { dealDamage(this, t, this.st.ad, 'physical', { attack: true }); slashFx(t.x, t.y, Math.atan2(t.y - this.y, t.x - this.x), 0.6, '#80c0ff'); }
    } else {
      const ang = Math.atan2(t.y - this.y, t.x - this.x), magic = this.def.magic;
      skillshot(this, ang, magic ? 7 : 9, this.st.range + 2, 0.25, this.def.pcol, h => dealDamage(this, h, this.st.ad, magic ? 'magic' : 'physical', { attack: true }), { size: magic ? 3 : 1, trail: magic });
    }
  }
  onDeath() {}
}

function allySpawnTick(dt) {
  const R = G.run;
  if (R.phase !== 'wave' && R.phase !== 'boss') return;
  R.allyT = (R.allyT === undefined ? 5 : R.allyT) - dt;
  if (R.allyT > 0) return;
  R.allyT = 11 + rand(0, 4);
  const alive = G.allies.filter(a => a.alive).length;
  if (alive >= ALLY_MAX) return;
  const n = Math.min(ALLY_MAX - alive, chance(0.3) ? 2 : 1), pt = randomSpawnPoint(6, 10, -1);
  for (let i = 0; i < n; i++) {
    const s = snapFree(pt.x + rand(-0.6, 0.6), pt.y + rand(-0.6, 0.6), 0.35) || pt;
    G.allies.push(new Ally(pick(ALLY_POOL), s.x, s.y, R.stage, Math.max(1, R.wave)));
  }
  ringFx(pt.x, pt.y, 1.2, '#40a0ff', 0.6); burst(pt.x, pt.y, '#60c0ff', 10, 2, 6, 0.6);
}
