'use strict';
// ---------- Aldric, the Might of the Realm (juggernaut, Garen-inspired) ----------
const HERO_ALDRIC = {
  id: 'aldric', name: 'Aldric', title: 'the Might of the Realm', role: 'Juggernaut · Melee', spr: 'aldric', color: '#3a5fa8',
  ranged: false, manaless: true,
  base: { hp: 720, mp: 0, ad: 62, armor: 38, mr: 32, as: 0.65, ms: 3.1, range: 1.2, regen: 2.5, mregen: 0 },
  grow: { hp: 120, ad: 3.6, armor: 4.6, mr: 2.2, as: 2.6, regen: 0.25 },
  passive: { name: 'Perseverance', icon: '💚', desc: 'After 4s without taking damage, regenerate <b>2% max HP</b> per second. No mana: your skills are free.' },
  skills: {
    Q: { name: 'Decisive Strike', icon: '⚡', cd: [8, 7.5, 7, 6.5, 6], cost: [0, 0, 0, 0, 0], aim: 'self',
      desc: r => `Cleanse slows and gain 35% move speed for ${1 + 0.4 * r}s. Your next attack deals <b>${30 + 30 * r} (+50% AD)</b> bonus physical damage and <b>stuns</b> for 1.2s (0.4s on bosses).`,
      cast(p, tx, ty, r) {
        p.slowT = 0; p.addBuff('dstrike', 1 + 0.4 * r, { ms: 35 }); p.dstrike = 4.5; p.dstrikeR = r; p.atkCd = Math.min(p.atkCd, 0.1);
        burst(p.x, p.y, '#ffe070', 8, 2, 10, 0.3);
      } },
    W: { name: 'Courage', icon: '🛡️', cd: [20, 18.5, 17, 15.5, 14], cost: [0, 0, 0, 0, 0], aim: 'self',
      desc: r => `Passive: kills permanently grant +0.25 armor and magic resist (max 40).<br>Active: take <b>30%</b> less damage for ${1.5 + 0.5 * r}s and gain a <b>${60 + 30 * r} (+15% bonus HP)</b> shield.`,
      cast(p, tx, ty, r) {
        p.courageT = 1.5 + 0.5 * r; p.addShield(60 + 30 * r + (p.st.hp - p.hero.base.hp - p.hero.grow.hp * (p.level - 1)) * 0.15, 2.5);
        ringFx(p.x, p.y, 0.9, '#ffe070', 0.5);
      } },
    E: { name: 'Judgment', icon: '🌀', cd: [11, 10, 9, 8, 7], cost: [0, 0, 0, 0, 0], aim: 'self',
      desc: r => `Spin your sword for 3s, dealing <b>${8 + 6 * r} (+${30 + 2 * r}% AD)</b> physical damage per tick around you. Ticks scale with attack speed. Can crit.`,
      cast(p, tx, ty, r) { p.spin = 3 * (p.taken.a_spin ? 1.4 : 1); p.spinR = r; p.spinTick = 0; } },
    R: { name: 'Demacian Justice', icon: '⚔️', cd: [80, 65, 50], cost: [0, 0, 0], range: 4, aim: 'unit',
      desc: r => `Call down the might of the realm on an enemy, dealing <b>${150 * r} + ${20 + 5 * r}% missing HP</b> true damage.`,
      cast(p, tx, ty, r) {
        const t = nearestEnemy(tx, ty, 2);
        if (!t || dist(p, t) > 5) { ftext(p.x, p.y, 'No target', '#aaa'); return false; }
        p.stop(); p.channel = 0.35; p.faceTo(t.x);
        lineFx(t.x, t.y - 0.01, t.x, t.y, '#ffe070', 0.5, 4);
        later(0.35, () => {
          if (!t.alive) return;
          const miss = t.st.hp - t.hp, dmg = 150 * r + miss * (0.2 + 0.05 * r) * (t.boss ? 0.6 : 1);
          dealDamage(p, t, dmg, 'true', { spell: true });
          discFx(t.x, t.y, 1.2, '#ffe070', 0.5); ringFx(t.x, t.y, 1.6, '#ffffff', 0.5);
          burst(t.x, t.y, ['#ffe070', '#ffffff', '#80c0ff'], 26, 3.5, 30, 0.8); G.shake = 0.4;
          if (p.taken.a_justice) aoe(p, t.x, t.y, 2.2, dmg * 0.5, 'true', { spell: true });
        });
      } },
  },
  cards: [
    { id: 'a_spin', name: 'Whirlwind', icon: '🌀', desc: 'Judgment lasts 40% longer and hits a wider area.' },
    { id: 'a_justice', name: 'Righteous Verdict', icon: '⚖️', desc: 'Demacian Justice also deals 50% of its damage to enemies around the target.' },
    { id: 'a_regen', name: 'Indomitable', icon: '💚', desc: 'Perseverance starts after 2s and heals twice as fast.' },
  ],
  statMod(p, st) { st.armor += p.courage || 0; st.mr += p.courage || 0; },
  tick(p, dt) {
    const wait = p.taken.a_regen ? 2 : 4;
    if (G.time - p.lastHurt > wait && p.hp < p.st.hp) {
      heal(p, p.st.hp * (p.taken.a_regen ? 0.04 : 0.02) * dt, false);
      if (chance(dt * 4)) burst(p.x, p.y, '#70ff70', 1, 0.3, 14, 0.5);
    }
    if (p.dstrike > 0) p.dstrike -= dt;
    if (p.courageT > 0) p.courageT -= dt;
    if (p.spin > 0) {
      p.spin -= dt; p.spinTick -= dt;
      if (p.spinTick <= 0) {
        p.spinTick = 0.5 / (1 + (p.st.asPct || 0) / 200);
        const rad = p.taken.a_spin ? 1.9 : 1.5, crit = chance(p.st.crit / 100);
        aoe(p, p.x, p.y, rad, (8 + 6 * p.spinR + p.st.ad * (0.3 + 0.02 * p.spinR)) * (crit ? critMul(p) : 1), 'physical', { spell: true, crit });
        slashFx(p.x, p.y, G.time * 12, rad, '#e0e8ff', 0.18); slashFx(p.x, p.y, G.time * 12 + Math.PI, rad, '#e0e8ff', 0.18);
        p.face = -p.face;
      }
    }
  },
  canAttack(p) { return !(p.spin > 0); },
  dmgTaken(p, amt) { return p.courageT > 0 ? amt * 0.7 : amt; },
  onAttack(p, t, ctx) {
    if (p.dstrike > 0) {
      p.dstrike = 0; ctx.phys += 30 + 30 * p.dstrikeR + p.st.ad * 0.5;
      ctx.onHit.push(e => { e.stunFor(e.boss ? 0.4 : 1.2); burst(e.x, e.y, '#ffe070', 10, 2, 10, 0.4); });
      p.removeBuff('dstrike');
    }
  },
  onKill(p) { if (p.ranks.W > 0) p.courage = Math.min(40, (p.courage || 0) + 0.25); },
};
const HEROES = [HERO_KESTREL, HERO_VELA, HERO_ALDRIC];
