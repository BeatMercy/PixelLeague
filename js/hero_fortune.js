'use strict';
// ---------- Miss Fortune, the Bounty Hunter (ranged gunslinger) ----------
const fortuneText = (en, zh) => I18N.locale === 'zh' ? zh : en;
const HERO_FORTUNE = {
  id: 'fortune', name: 'Miss Fortune', title: 'Bounty Hunter', role: 'Gunslinger · Ranged', spr: 'fortune', color: '#c43d48',
  ranged: true, projCol: '#ffd070',
  base: { hp: 570, mp: 310, ad: 60, armor: 25, mr: 28, as: 0.7, ms: 2.76, range: 5.1, regen: 1.8, mregen: 2.1 },
  grow: { hp: 88, mp: 24, ad: 3.4, armor: 3.4, mr: 1.5, as: 3.2, regen: 0.16, mregen: 0.15 },
  passive: { name: 'Lucky Break', icon: '🍀', desc: 'Your first attack against each enemy every 4s deals bonus physical damage.' },
  skills: {
    Q: { name: 'Deadeye Ricochet', icon: '🎯', cd: [8, 7.5, 7, 6.5, 6], cost: [40, 45, 50, 55, 60], range: 8.5, aim: 'point',
      desc: r => fortuneText(`Fire a shot dealing <b>${45 + 25 * r} (+85% AD)</b> physical damage. It ricochets to ${1 + (r >= 4 ? 1 : 0)} nearby target${r >= 4 ? 's' : ''} for reduced damage.`, `射出弹丸造成 <b>${45 + 25 * r}（+85% 攻击力）</b>物理伤害，并弹射至${r >= 4 ? '两个' : '一个'}附近目标，造成递减伤害。`),
      cast(p, tx, ty, r) {
        const a = Math.atan2(ty - p.y, tx - p.x), target = nearestEnemy(tx, ty, 1.8);
        if (!target || dist(p, target) > 9) { ftext(p.x, p.y, 'No target', '#aaa'); return false; }
        skillshot(p, a, 15, 9, 0.32, '#ffd070', first => {
          dealDamage(p, first, 45 + 25 * r + p.st.ad * 0.85, 'physical', { spell: true });
          const hit = new Set([first]); let from = first;
          const bounces = 1 + (r >= 4 ? 1 : 0) + (p.taken.m_bounce ? 1 : 0);
          for (let i = 0; i < bounces; i++) {
            const next = nearestEnemy(from.x, from.y, 3.6, hit);
            if (!next) break;
            hit.add(next); lineFx(from.x, from.y, next.x, next.y, '#ffd070', 0.16, 2);
            burst(next.x, next.y, ['#ffd070', '#fff0c0'], 4, 1.4, 8, 0.25);
            dealDamage(p, next, (32 + 17 * r + p.st.ad * 0.55) * Math.pow(0.72, i), 'physical', { spell: true });
            from = next;
          }
          burst(first.x, first.y, ['#ffd070', '#fff0c0'], 8, 2, 10, 0.35);
        }, { size: 3, trail: true });
      } },
    W: { name: 'Strut', icon: '🏃', cd: [18, 17, 16, 15, 14], cost: [35, 35, 35, 35, 35], aim: 'self',
      desc: r => fortuneText(`Gain <b>${24 + 5 * r}% attack speed</b> and <b>20% move speed</b> for 3s. Takedowns extend the effect.`, `获得 <b>${24 + 5 * r}% 攻击速度</b>与 <b>20% 移动速度</b>，持续 3 秒；击杀会延长持续时间。`),
      cast(p, tx, ty, r) {
        const bonus = p.taken.m_strut ? 12 : 0;
        p.addBuff('fortuneStride', 3, { as: 24 + 5 * r + bonus, ms: 20 + (p.taken.m_strut ? 8 : 0) });
        p.atkCd = Math.min(p.atkCd, 0.08);
        ringFx(p.x, p.y, 0.75, '#ffd070', 0.35); burst(p.x, p.y, '#ffd070', 8, 1.8, 10, 0.35);
      } },
    E: { name: 'Bullet Rain', icon: '💥', cd: [16, 15, 14, 13, 12], cost: [55, 60, 65, 70, 75], range: 7, area: 1.9, aim: 'point',
      desc: r => fortuneText(`Bombard an area for 2.5s, slowing enemies by <b>30%</b> and dealing <b>${14 + 8 * r} (+18% AD)</b> physical damage every 0.5s.`, `轰击一片区域，持续 2.5 秒。敌人被减速 <b>30%</b>，每 0.5 秒受到 <b>${14 + 8 * r}（+18% 攻击力）</b>物理伤害。`),
      cast(p, tx, ty, r) {
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), range = 7;
        if (d > range) { tx = p.x + dx / d * range; ty = p.y + dy / d * range; }
        const radius = 1.9;
        aoe(p, tx, ty, radius, 24 + 15 * r + p.st.ad * 0.25, 'physical', { spell: true }, e => e.slow(0.3, 0.8));
        addZone({ x: tx, y: ty, r: radius, t: 2.5, col: '#e0783038', tickT: 0, tick(z, dt) {
          z.tickT -= dt;
          if (z.tickT > 0) return;
          z.tickT = 0.5;
          for (const e of G.enemies) if (e.alive && distXY(z.x, z.y, e.x, e.y) < z.r + e.r) {
            dealDamage(p, e, 14 + 8 * r + p.st.ad * 0.18, 'physical', { spell: true }); e.slow(0.3, 0.8);
            burst(e.x, e.y, ['#e07830', '#ffd070'], 3, 1, 6, 0.22);
          }
        } });
        ringFx(tx, ty, radius, '#ffb060', 0.35); discFx(tx, ty, radius, '#e0783038', 2.5);
      } },
    R: { name: 'Full Salvo', icon: '🔫', cd: [75, 62, 50], cost: [100, 100, 100], range: 8.5, aim: 'self',
      desc: r => fortuneText(`Fire a broad cone of bullets. Each hit deals <b>${18 + 12 * r} (+18% AD)</b> physical damage; bullets pierce through enemies.`, `朝前方扇形区域倾泻弹幕。每次命中造成 <b>${18 + 12 * r}（+18% 攻击力）</b>物理伤害，子弹可穿透敌人。`),
      cast(p, tx, ty, r) {
        const angle = Math.atan2(ty - p.y, tx - p.x), count = 9 + 2 * r + (p.taken.m_barrage ? 4 : 0), spread = 0.88;
        p.faceTo(tx); p.channel = 0.32;
        for (let i = 0; i < count; i++) {
          const shotAngle = angle + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread);
          skillshot(p, shotAngle, 14, 8.5, 0.28, i % 3 ? '#ffb040' : '#ffe090', t => {
            dealDamage(p, t, 18 + 12 * r + p.st.ad * 0.18, 'physical', { spell: true });
            burst(t.x, t.y, ['#ffd070', '#ffffff'], 2, 0.8, 6, 0.2);
          }, { size: 2, pierce: 2, trail: true });
        }
        lineFx(p.x, p.y, p.x + Math.cos(angle) * 4, p.y + Math.sin(angle) * 4, '#ffd070', 0.3, 2);
        G.shake = Math.max(G.shake, 0.18);
      } },
  },
  cards: [
    { id: 'm_bounce', name: 'Second Mark', icon: '🎯', desc: 'Deadeye Ricochet bounces to one additional enemy.' },
    { id: 'm_strut', name: 'Easy Escape', icon: '👢', desc: 'Strut grants more attack and move speed; takedowns extend it by 1s.' },
    { id: 'm_barrage', name: 'Lead Storm', icon: '🔫', desc: 'Full Salvo fires 4 additional bullets.' },
  ],
  onAttack(p, t, ctx) {
    if (!t.fortuneMarkUntil || G.time >= t.fortuneMarkUntil) {
      t.fortuneMarkUntil = G.time + 4;
      ctx.phys += 22 + p.level * 6 + p.st.ad * 0.35;
      ctx.onHit.push(e => { burst(e.x, e.y, ['#ffd070', '#fff0c0'], 7, 1.8, 9, 0.32); ringFx(e.x, e.y, 0.45, '#ffd070', 0.22); });
    }
  },
  onKill(p) {
    const stride = p.buffs.fortuneStride;
    if (stride && p.taken.m_strut) stride.t = Math.min(6, stride.t + 1);
  },
};