'use strict';
// ---------- Extra skills granted by talent cards (auto-cast, up to 4, max Lv 5) ----------
const EXTRAS = {
  blades: { name: 'Spinning Blades', icon: '🌟',
    desc: lv => `${2 + (lv >= 3) + (lv >= 5)} blades orbit you, dealing ${12 + 8 * lv} (+15% AD, +20% AP) magic damage on contact.`,
    tick(p, lv, s, dt) {
      s.a = (s.a || 0) + dt * 3.2; s.hit = s.hit || new Map();
      const n = 2 + (lv >= 3) + (lv >= 5);
      for (let i = 0; i < n; i++) {
        const a = s.a + i * TAU / n, bx = p.x + Math.cos(a) * 1.5, by = p.y + Math.sin(a) * 1.5;
        for (const e of G.enemies) {
          if (!e.alive || distXY(bx, by, e.x, e.y) > 0.35 + e.r) continue;
          if ((s.hit.get(e) || 0) > G.time) continue;
          s.hit.set(e, G.time + 0.5);
          dealDamage(p, e, 12 + 8 * lv + p.st.ad * 0.15 + p.st.ap * 0.2, 'magic', { proc: true });
        }
      }
    },
    draw(p, lv, s) {
      const n = 2 + (lv >= 3) + (lv >= 5);
      for (let i = 0; i < n; i++) {
        const a = (s.a || 0) + i * TAU / n, x = toVX(p.x + Math.cos(a) * 1.5, p.y + Math.sin(a) * 1.5), y = toVY(p.x + Math.cos(a) * 1.5, p.y + Math.sin(a) * 1.5, 7);
        ctx.fillStyle = '#140c1c'; ctx.fillRect(x - 2, y - 2, 5, 5);
        ctx.fillStyle = '#e0f0ff'; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#80c0ff'; ctx.fillRect(x, y, 1, 1);
      }
    } },
  smite: { name: 'Holy Smite', icon: '⚡',
    desc: lv => `Every ${(3.6 - 0.3 * lv).toFixed(1)}s, lightning strikes a nearby enemy for ${40 + 30 * lv} (+40% AP, +30% AD) magic damage.`,
    tick(p, lv, s, dt) {
      s.t = (s.t || 1) - dt; if (s.t > 0) return; s.t = 3.6 - 0.3 * lv;
      const c = G.enemies.filter(e => e.alive && dist(p, e) < 6); if (!c.length) { s.t = 0.3; return; }
      const t = pick(c);
      lineFx(t.x, t.y, t.x, t.y, '#ffffa0', 0.25, 2, true); burst(t.x, t.y, '#ffffa0', 8, 2, 4, 0.3);
      dealDamage(p, t, 40 + 30 * lv + p.st.ap * 0.4 + p.st.ad * 0.3, 'magic', { proc: true });
    } },
  nova: { name: 'Frost Nova', icon: '❄️',
    desc: lv => `Every 5s, release a frost ring dealing ${30 + 22 * lv} (+30% AP) magic damage and slowing by 40% for 1.5s.`,
    tick(p, lv, s, dt) {
      s.t = (s.t || 2) - dt; if (s.t > 0) return; s.t = 5;
      ringFx(p.x, p.y, 2.6, '#a0e0ff', 0.45); burst(p.x, p.y, ['#a0e0ff', '#ffffff'], 16, 4, 4, 0.5);
      aoe(p, p.x, p.y, 2.6, 30 + 22 * lv + p.st.ap * 0.3, 'magic', { proc: true }, e => e.slow(0.4, 1.5));
    } },
  daggers: { name: 'Phantom Daggers', icon: '🗡️',
    desc: lv => `Every 1.5s, throw ${1 + ((lv - 1) >> 1)} dagger(s) at the nearest enemies for ${18 + 12 * lv} (+30% AD) physical damage.`,
    tick(p, lv, s, dt) {
      s.t = (s.t || 1) - dt; if (s.t > 0) return; s.t = 1.5;
      const tg = G.enemies.filter(e => e.alive && dist(p, e) < 7).sort((a, b) => dist(p, a) - dist(p, b)).slice(0, 1 + ((lv - 1) >> 1));
      for (const t of tg) skillshot(p, Math.atan2(t.y - p.y, t.x - p.x), 15, 8, 0.25, '#c0c8ff', e => dealDamage(p, e, 18 + 12 * lv + p.st.ad * 0.3, 'physical', { proc: true }), { size: 1 });
    } },
  aura: { name: 'Searing Aura', icon: '🔥',
    desc: lv => `Burn enemies within ${(1.8 + 0.15 * lv).toFixed(1)} tiles for ${10 + 8 * lv} (+1% max HP) magic damage per second.`,
    tick(p, lv, s, dt) {
      s.t = (s.t || 0.5) - dt; if (s.t > 0) return; s.t = 0.5;
      const r = 1.8 + 0.15 * lv;
      aoe(p, p.x, p.y, r, (10 + 8 * lv + p.st.hp * 0.01) * 0.5, 'magic', { dot: true }, e => { if (chance(0.5)) burst(e.x, e.y, '#ff8040', 1, 0.5, 6, 0.3); });
      discFx(p.x, p.y, r, '#ff602020', 0.5);
    } },
  bulwark: { name: 'Bulwark', icon: '🔰',
    desc: lv => `Every 9s, gain a shield of ${40 + 30 * lv} (+6% max HP) for 4s.`,
    tick(p, lv, s, dt) {
      s.t = (s.t || 0) - dt; if (s.t > 0) return; s.t = 9;
      p.addShield(40 + 30 * lv + p.st.hp * 0.06, 4); ringFx(p.x, p.y, 0.8, '#e8e8ff', 0.4);
    } },
  meteor: { name: 'Meteor', icon: '☄️',
    desc: lv => `Every ${(7 - 0.5 * lv).toFixed(1)}s, call a meteor on the densest group of enemies for ${60 + 45 * lv} (+50% AP, +30% AD) magic damage.`,
    tick(p, lv, s, dt) {
      s.t = (s.t || 3) - dt; if (s.t > 0) return; s.t = 7 - 0.5 * lv;
      const c = G.enemies.filter(e => e.alive && dist(p, e) < 7); if (!c.length) { s.t = 0.5; return; }
      let best = c[0], bn = 0;
      for (const e of c) { const n = c.filter(o => dist(o, e) < 2).length; if (n > bn) { bn = n; best = e; } }
      const x = best.x, y = best.y; teleFx(x, y, 2, '#ff6020', 0.8);
      later(0.8, () => {
        aoe(p, x, y, 2, 60 + 45 * lv + p.st.ap * 0.5 + p.st.ad * 0.3, 'magic', { proc: true });
        discFx(x, y, 2, '#ffa040', 0.4); burst(x, y, ['#ff6020', '#ffd040', '#3a2a2a'], 24, 4, 6, 0.7); G.shake = Math.max(G.shake, 0.15);
      });
    } },
  chain: { name: 'Storm Call', icon: '🌩️',
    desc: lv => `Every 3s, lightning chains between ${2 + lv} nearby enemies for ${25 + 16 * lv} (+25% AP) magic damage.`,
    tick(p, lv, s, dt) {
      s.t = (s.t || 1.5) - dt; if (s.t > 0) return; s.t = 3;
      const t = nearestEnemy(p.x, p.y, 6); if (!t) { s.t = 0.3; return; }
      lineFx(p.x, p.y, t.x, t.y, '#c0d0ff', 0.25, 1, true);
      dealDamage(p, t, 25 + 16 * lv + p.st.ap * 0.25, 'magic', { proc: true });
      chainLightning(p, t, 1 + lv, 25 + 16 * lv + p.st.ap * 0.25, 3.5, '#c0d0ff');
    } },
};
