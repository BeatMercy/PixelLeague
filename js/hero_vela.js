'use strict';
// ---------- Vela, the Silver Duelist (melee skirmisher, Fiora-inspired) ----------
const HERO_VELA = {
  id: 'vela', name: 'Vela', title: 'the Silver Duelist', role: 'Duelist · Melee', spr: 'vela', color: '#b8c8e0',
  ranged: false,
  base: { hp: 660, mp: 300, ad: 64, armor: 35, mr: 32, as: 0.72, ms: 2.8, range: 1.15, regen: 2.8, mregen: 2.0 },
  grow: { hp: 105, mp: 22, ad: 3.4, armor: 4.2, mr: 2, as: 3.2, regen: 0.2, mregen: 0.15 },
  passive: { name: "Duelist's Dance", icon: '✨', desc: 'Periodically reveal a <b>Vital</b> on a nearby enemy. Striking a Vital with an attack or skill deals bonus true damage (3% + 4% per 100 bonus AD of max HP), heals you and grants move speed.' },
  skills: {
    Q: { name: 'Lunge', icon: '🤺', cd: [9, 8, 7, 6, 5], cost: [20, 25, 30, 35, 40], range: 3.2, aim: 'point',
      desc: r => `Lunge toward a location and stab the nearest enemy for <b>${40 + 25 * r} (+100% bonus AD)</b> physical damage. Prefers Vitals. Refunds 50% cooldown on hit.`,
      cast(p, tx, ty, r) {
        const a = Math.atan2(ty - p.y, tx - p.x), d = Math.min(3.2, distXY(p.x, p.y, tx, ty));
        p.dashTo(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 18, () => {
          const c = G.enemies.filter(e => e.alive && dist(p, e) < 1.8);
          const t = c.find(e => e.vital > 0 || e.grand > 0) || c.sort((x, y) => dist(p, x) - dist(p, y))[0];
          if (!t) return;
          const hadVital = t.vital > 0 || t.grand > 0;
          dealDamage(p, t, 40 + 25 * r + p.bonusAd, 'physical', { spell: true });
          slashFx(t.x, t.y, a, 0.8, '#d8e8ff');
          p.cd.Q *= hadVital && p.taken.v_pierce ? 0 : 0.5;
        }, 0.35);
      } },
    W: { name: 'Riposte', icon: '🛡️', cd: [20, 18, 16, 14, 12], cost: [50, 50, 50, 50, 50], aim: 'point',
      desc: r => `Parry all damage and crowd control for 0.75s, then stab forward for <b>${50 + 40 * r} (+100% AD)</b> physical damage. If you parried an attack, enemies hit are <b>stunned</b> for 1.25s; otherwise slowed.`,
      cast(p, tx, ty, r) {
        p.parry = 0.75; p.parried = false; p.parryAng = Math.atan2(ty - p.y, tx - p.x); p.parryR = r;
        p.stop(); ringFx(p.x, p.y, 0.8, '#d8e8ff', 0.75);
      } },
    E: { name: 'Bladework', icon: '⚔️', cd: [11, 10, 9, 8, 7], cost: [40, 40, 40, 40, 40], aim: 'self',
      desc: r => `Your next 2 attacks gain <b>${50 + 10 * r}%</b> attack speed. The first slows by 40%; the second always <b>crits</b> for ${150 + 10 * r}% damage. Resets your attack timer.`,
      cast(p, tx, ty, r) { p.blade = 2; p.bladeR = r; p.atkCd = 0; p.addBuff('blade', 4, { as: 50 + 10 * r }); burst(p.x, p.y, '#d8e8ff', 6, 1.5, 12, 0.3); } },
    R: { name: 'Grand Challenge', icon: '👑', cd: [80, 65, 50], cost: [100, 100, 100], range: 5, aim: 'unit',
      desc: r => `Reveal all <b>4 Vitals</b> on an enemy. Striking all 4 (or killing it after striking one) creates a healing field restoring <b>${70 + 50 * r} (+60% bonus AD)</b> HP per second for 4s.`,
      cast(p, tx, ty, r) {
        const t = nearestEnemy(tx, ty, 2);
        if (!t || dist(p, t) > 6) { ftext(p.x, p.y, 'No target', '#aaa'); return false; }
        t.grand = 4; t.grandHit = 0; p.grandT = t; p.grandR = r; ringFx(t.x, t.y, 1.2, '#ffd060', 0.6);
      } },
  },
  cards: [
    { id: 'v_vital', name: 'Sixth Sense', icon: '✨', desc: 'Vitals appear twice as often and deal +50% damage.' },
    { id: 'v_parry', name: 'Perfect Parry', icon: '🛡️', desc: 'A successful Riposte refunds 60% of its cooldown and heals 10% max HP.' },
    { id: 'v_pierce', name: 'Ever Forward', icon: '🤺', desc: 'Lunging into a Vital fully refunds Lunge.' },
  ],
  popVital(p, t) {
    let pop = false;
    if (t.grand > 0) { t.grand--; t.grandHit++; pop = true; if (t.grand === 0) this.grandZone(p, t); }
    else if (t.vital > 0) { t.vital = 0; pop = true; }
    if (!pop) return;
    const bon = 0.03 + 0.04 * p.bonusAd / 100, dmg = Math.min(t.st.hp * bon, t.boss ? 250 + p.st.ad * 2 : 1e9) * (p.taken.v_vital ? 1.5 : 1);
    later(0.01, () => dealDamage(p, t, dmg, 'true', { proc: true }));
    heal(p, 30 + p.level * 8); p.addBuff('vitalms', 1.8, { ms: 20 + p.level });
    burst(t.x, t.y, ['#ffd060', '#ffffff'], 12, 2.5, 12, 0.5); ringFx(t.x, t.y, 0.7, '#ffd060', 0.3);
  },
  grandZone(p, t) {
    const r = p.grandR, x = t.x, y = t.y; p.grandT = null;
    ringFx(x, y, 2.5, '#80ff90', 0.6);
    addZone({ x, y, r: 2.5, t: 4, col: '#60ff8040', tickT: 0, tick(z, dt) {
      z.tickT -= dt; if (z.tickT > 0) return; z.tickT = 0.5;
      if (distXY(p.x, p.y, x, y) < 2.5) heal(p, (70 + 50 * r + p.bonusAd * 0.6) * 0.5);
    } });
  },
  tick(p, dt) {
    p.vt = (p.vt || 3) - dt;
    if (p.vt <= 0) {
      const c = G.enemies.filter(e => e.alive && !(e.vital > 0) && !(e.grand > 0) && dist(p, e) < 5);
      if (c.length) pick(c).vital = 6;
      p.vt = (p.taken.v_vital ? 2 : 4);
    }
    for (const e of G.enemies) if (e.vital > 0) e.vital -= dt;
    if (p.parry > 0) {
      p.parry -= dt;
      if (p.parry <= 0) {
        const a = p.parryAng, r = p.parryR, cx = p.x + Math.cos(a) * 1.2, cy = p.y + Math.sin(a) * 1.2;
        lineFx(p.x, p.y, p.x + Math.cos(a) * 2.4, p.y + Math.sin(a) * 2.4, '#d8e8ff', 0.25, 3);
        aoe(p, cx, cy, 1.2, 50 + 40 * r + p.st.ad, 'physical', { spell: true }, e => { if (p.parried) e.stunFor(1.25); else e.slow(0.5, 1.5); });
        if (p.parried && p.taken.v_parry) { p.cd.W *= 0.4; heal(p, p.st.hp * 0.1); }
      }
    }
  },
  dmgTaken(p, amt) {
    if (p.parry > 0) { if (!p.parried) ftext(p.x, p.y, 'PARRY', '#d8e8ff', true); p.parried = true; return 0; }
    return amt;
  },
  canAct(p) { return !(p.parry > 0); },
  onAttack(p, t, ctx) {
    if (p.blade > 0) {
      if (p.blade === 2) ctx.onHit.push(e => e.slow(0.4, 1.5));
      else { ctx.crit = true; ctx.critMul = 1.5 + 0.1 * p.bladeR; }
      if (--p.blade === 0) p.removeBuff('blade');
    }
  },
  onDealt(p, t, amt, type, o) { if (!o.proc && !o.dot && (o.attack || o.spell)) this.popVital(p, t); },
  onKill(p, u) { if (u === p.grandT && u.grandHit > 0) this.grandZone(p, u); },
};
