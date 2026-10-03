'use strict';
// ---------- Base unit: position, statuses, animation ----------
class Unit {
  constructor(x, y, r) {
    this.x = x; this.y = y; this.r = r; this.z = 0;
    this.hp = 1; this.st = {}; this.alive = true;
    this.stun = 0; this.slowT = 0; this.slowAmt = 0; this.blind = 0; this.silence = 0; this.root = 0;
    this.shield = 0; this.shieldT = 0; this.invuln = 0; this.flash = 0; this.dots = [];
    this.face = 1; this.animT = 0; this.moving = false; this.atkAnim = 0; this.atkCd = 0; this.windup = 0;
    this.lastHurt = -99; this.knock = null;
  }
  get speed() { return this.st.ms * (this.slowT > 0 ? 1 - this.slowAmt : 1) * (this.root > 0 ? 0 : 1); }
  get disabled() { return this.stun > 0; }
  slow(amt, t) { if (amt >= this.slowAmt || this.slowT <= 0) { this.slowAmt = amt; } this.slowT = Math.max(this.slowT, t * (this.ccRes || 1)); }
  stunFor(t) { const d = t * (this.ccRes || 1); if (d > this.stun) this.stun = d; this.windup = 0; }
  addShield(v, t) { this.shield += v; this.shieldT = Math.max(this.shieldT, t); }
  dot(src, dps, t, type = 'magic', tag) {
    if (tag) { const ex = this.dots.find(d => d.tag === tag); if (ex) { ex.dps = Math.max(ex.dps, dps); ex.t = t; return; } }
    this.dots.push({ src, dps, t, type, tag, tick: 0.5 });
  }
  knockTo(dx, dy, dur) { this.knock = { vx: dx / dur, vy: dy / dur, t: dur }; }
  tickStatus(dt) {
    if (this.stun > 0) this.stun -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.blind > 0) this.blind -= dt;
    if (this.silence > 0) this.silence -= dt;
    if (this.root > 0) this.root -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.atkAnim > 0) this.atkAnim -= dt;
    if (this.shieldT > 0) { this.shieldT -= dt; if (this.shieldT <= 0) this.shield = 0; }
    if (this.knock) {
      moveUnit(this, this.knock.vx * dt, this.knock.vy * dt);
      this.knock.t -= dt; if (this.knock.t <= 0) this.knock = null;
    }
    for (let i = this.dots.length - 1; i >= 0; i--) {
      const d = this.dots[i]; d.t -= dt; d.tick -= dt;
      if (d.tick <= 0) { d.tick += 0.5; dealDamage(d.src, this, d.dps * 0.5, d.type, { dot: true }); }
      if (d.t <= 0) this.dots.splice(i, 1);
    }
  }
  animFrame() {
    if (this.atkAnim > 0) return 3;
    if (this.moving) return 1 + (Math.floor(this.animT * 8) & 1);
    return 0;
  }
  faceTo(x) { if (Math.abs(x - this.x) > 0.01) this.face = x < this.x ? -1 : 1; }
}

// HP bar drawn on the full-res canvas
function drawHpBar(u, w, col, yOff) {
  const x = toVX(u.x, u.y) * SCALE, y = (toVY(u.x, u.y, u.z) - yOff) * SCALE;
  const W = w * SCALE, H = Math.max(3, SCALE + 1), max = u.st.hp;
  sctx.fillStyle = '#000'; sctx.fillRect(x - W / 2 - 1, y - 1, W + 2, H + 2);
  sctx.fillStyle = '#3a1010'; sctx.fillRect(x - W / 2, y, W, H);
  const tot = Math.max(max, u.hp + u.shield);
  sctx.fillStyle = col; sctx.fillRect(x - W / 2, y, W * u.hp / tot, H);
  if (u.shield > 0) { sctx.fillStyle = '#e8e8e8'; sctx.fillRect(x - W / 2 + W * u.hp / tot, y, W * u.shield / tot, H); }
  if (u.stun > 0) { sctx.fillStyle = '#ffe060'; sctx.font = `${8 * SCALE}px VT323`; sctx.textAlign = 'center'; sctx.fillText('★', x, y - 2); }
}
