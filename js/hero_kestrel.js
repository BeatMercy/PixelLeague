'use strict';
// ---------- Kestrel, the Dawnguard Ranger (marksman, Quinn-inspired) ----------
const HERO_KESTREL = {
  id: 'kestrel', name: 'Kestrel', title: 'Wings of the Dawnguard', role: 'Marksman · Ranged', spr: 'kestrel', color: '#6a8ad0',
  ranged: true, projCol: '#f0e0a0',
  base: { hp: 560, mp: 320, ad: 58, armor: 24, mr: 28, as: 0.68, ms: 3.2, range: 5.2, regen: 1.6, mregen: 2.2 },
  grow: { hp: 90, mp: 25, ad: 3.2, armor: 3.5, mr: 1.4, as: 3.0, regen: 0.15, mregen: 0.15 },
  passive: { name: 'Harrier', icon: '🦅', desc: 'Your hawk periodically marks the nearest enemy as <b>Vulnerable</b>. Attacking a Vulnerable enemy deals bonus physical damage and consumes the mark.' },
  skills: {
    Q: { name: 'Blinding Assault', icon: '🎯', cd: [10, 9, 8, 7, 6], cost: [50, 55, 60, 65, 70], range: 8, aim: 'point',
      desc: r => `Fire an arrow that explodes on the first enemy hit, dealing <b>${30 + 45 * r} (+90% AD)</b> physical damage around it and <b>blinding</b> enemies for 1.5s (their attacks miss).`,
      cast(p, tx, ty, r) {
        const a0 = Math.atan2(ty - p.y, tx - p.x), angs = p.taken.k_twin ? [a0 - 0.28, a0, a0 + 0.28] : [a0];
        for (const a of angs) skillshot(p, a, 13, 8, 0.3, '#ffe070', t => {
          aoe(p, t.x, t.y, 1.5, 30 + 45 * r + p.st.ad * 0.9, 'physical', { spell: true }, e => { e.blind = 1.5; });
          discFx(t.x, t.y, 1.5, '#ffe070', 0.3); burst(t.x, t.y, ['#ffe070', '#ffffff'], 12, 3, 8, 0.4);
        }, { size: 3, trail: true });
      } },
    W: { name: 'Heightened Senses', icon: '👁️', cd: [16, 15, 14, 13, 12], cost: [40, 40, 40, 40, 40], aim: 'self',
      desc: r => `Passive: consuming Vulnerable grants <b>${20 + 8 * r}%</b> attack speed and 15% move speed for 2s.<br>Active: mark the <b>${2 + r}</b> nearest enemies as Vulnerable and gain ${30 + 10 * r}% attack speed for 4s.`,
      cast(p, tx, ty, r) {
        const near = G.enemies.filter(e => e.alive && dist(p, e) < 7).sort((a, b) => dist(p, a) - dist(p, b)).slice(0, 2 + r);
        for (const e of near) { e.vuln = 5; ringFx(e.x, e.y, 0.6, '#ffe070', 0.4); }
        p.addBuff('sensesA', 4, { as: 30 + 10 * r }); ringFx(p.x, p.y, 7, '#ffe07066', 0.5);
      } },
    E: { name: 'Vault', icon: '🪽', cd: [12, 11, 10, 9, 8], cost: [50, 50, 50, 50, 50], range: 4.5, aim: 'unit',
      desc: r => `Dash to an enemy, dealing <b>${40 + 30 * r} (+40% AD)</b> physical damage, slowing it 50% and marking it Vulnerable, then vault backwards.`,
      cast(p, tx, ty, r) {
        const t = nearestEnemy(tx, ty, 1.8);
        if (!t || dist(p, t) > 5.2) { ftext(p.x, p.y, 'No target', '#aaa'); return false; }
        const ox = p.x, oy = p.y;
        p.dashTo(t.x, t.y, 16, () => {
          if (t.alive) { dealDamage(p, t, 40 + 30 * r + p.st.ad * 0.4, 'physical', { spell: true }); t.slow(0.5, 2); t.vuln = 5; }
          burst(p.x, p.y, '#a0c0ff', 10, 2.5, 8, 0.4);
          const a = Math.atan2(oy - t.y, ox - t.x);
          p.dashTo(p.x + Math.cos(a) * 2.2, p.y + Math.sin(a) * 2.2, 10);
        }, 0.6);
      } },
    R: { name: 'Skystrike', icon: '🌅', cd: [60, 50, 40], cost: [100, 100, 100], aim: 'self',
      desc: r => `Your hawk lifts you up: gain <b>${50 + 20 * r}%</b> move speed for 6s. When it ends, strike all nearby enemies for <b>${120 + 100 * r} (+70% AD)</b> physical damage.`,
      cast(p, tx, ty, r) { p.addBuff('sky', 6, { ms: 50 + 20 * r }); p.sky = 6; p.skyR = r; ringFx(p.x, p.y, 1.5, '#ffe070', 0.5); } },
  },
  cards: [
    { id: 'k_twin', name: 'Twin Talons', icon: '🏹', desc: 'Blinding Assault fires 3 arrows in a spread.' },
    { id: 'k_harrier', name: 'Keen Hawk', icon: '🦅', desc: 'Harrier marks twice as often and Vulnerable deals +50% damage.' },
    { id: 'k_wind', name: 'Tailwind', icon: '🌪️', desc: "Vault's cooldown resets whenever you kill an enemy." },
  ],
  tick(p, dt) {
    p.hs = (p.hs || 0) - dt;
    if (p.hs <= 0) {
      const t = G.enemies.filter(e => e.alive && !(e.vuln > 0) && dist(p, e) < 7).sort((a, b) => dist(p, a) - dist(p, b))[0];
      if (t) { t.vuln = 5; burst(t.x, t.y, '#ffe070', 5, 1, 18, 0.4); }
      p.hs = Math.max(2.5, 8 - p.level * 0.3) * (p.taken.k_harrier ? 0.5 : 1);
    }
    if (p.sky > 0) {
      p.sky -= dt; if (chance(0.5)) burst(p.x, p.y, '#ffe8a0', 1, 0.5, 4, 0.4);
      if (p.sky <= 0) {
        aoe(p, p.x, p.y, 2.8, 120 + 100 * p.skyR + p.st.ad * 0.7, 'physical', { spell: true });
        discFx(p.x, p.y, 2.8, '#ffe070', 0.4); ringFx(p.x, p.y, 2.8, '#ffffff', 0.5); G.shake = 0.3;
      }
    }
  },
  onAttack(p, t, ctx) {
    if (t.vuln > 0) {
      t.vuln = 0; ctx.phys += (12 + 7 * p.level + p.st.ad * 0.3) * (p.taken.k_harrier ? 1.5 : 1);
      ctx.onHit.push(e => burst(e.x, e.y, '#ffe070', 8, 2, 10, 0.4));
      if (p.ranks.W > 0) p.addBuff('senses', 2, { as: 20 + 8 * p.ranks.W, ms: 15 });
    }
  },
  onKill(p) { if (p.taken.k_wind) p.cd.E = 0; },
};
