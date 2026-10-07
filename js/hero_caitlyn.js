'use strict';
// ---------- Caitlyn, the Sheriff of Piltover (long-range marksman) ----------
const caitlynText = (en, zh) => I18N.locale === 'zh' ? zh : en;
const HERO_CAITLYN = {
  id: 'caitlyn', name: 'Caitlyn', title: 'Sheriff of Piltover', role: 'Sniper · Ranged', spr: 'caitlyn', color: '#4c78a8',
  ranged: true, projCol: '#d8e8f0',
  base: { hp: 540, mp: 340, ad: 61, armor: 22, mr: 27, as: 0.64, ms: 2.68, range: 6.2, regen: 1.4, mregen: 2.3 },
  grow: { hp: 84, mp: 28, ad: 3.8, armor: 3.2, mr: 1.4, as: 2.8, regen: 0.14, mregen: 0.16 },
  passive: { name: 'Headshot', icon: '🎯', desc: 'Every 5th attack is a <b>Headshot</b>, dealing bonus physical damage. Trapped enemies are always Headshot targets.' },
  skills: {
    Q: { name: 'Piltover Peacemaker', icon: '🎯', cd: [9, 8.5, 8, 7.5, 7], cost: [45, 50, 55, 60, 65], range: 9, aim: 'point',
      desc: r => caitlynText(`Fire a long rifle shot that pierces enemies, dealing <b>${45 + 30 * r} (+85% AD)</b> physical damage. Damage falls off after the first target.`, `射出穿透弹道，造成 <b>${45 + 30 * r}（+85% 攻击力）</b>物理伤害。命中首个目标后伤害衰减。`),
      cast(p, tx, ty, r) {
        const angle = Math.atan2(ty - p.y, tx - p.x);
        p.faceTo(tx);
        skillshot(p, angle, 17, 9, 0.28, '#d8e8f0', (target, projectile) => {
          const falloff = projectile.hit.size === 1 ? 1 : 0.65;
          dealDamage(p, target, (45 + 30 * r + p.st.ad * 0.85) * falloff, 'physical', { spell: true });
          lineFx(target.x, target.y, target.x + Math.cos(angle) * 0.5, target.y + Math.sin(angle) * 0.5, '#ffffff', 0.12, 2);
          burst(target.x, target.y, ['#d8e8f0', '#ffffff'], 5, 1.6, 8, 0.25);
        }, { size: 3, pierce: 5, trail: true });
      } },
    W: { name: 'Yordle Snap Trap', icon: '🪤', cd: [18, 17, 16, 15, 14], cost: [45, 50, 55, 60, 65], range: 6, aim: 'point',
      desc: r => caitlynText(`Place a trap for 8s. The first enemy to enter is rooted for ${1 + 0.2 * r}s, revealed, and takes <b>${35 + 25 * r} (+55% AD)</b> physical damage.`, `放置持续 8 秒的陷阱。首个踏入的敌人被定身 ${1 + 0.2 * r} 秒、显形，并受到 <b>${35 + 25 * r}（+55% 攻击力）</b>物理伤害。`),
      cast(p, tx, ty, r) {
        const dx = tx - p.x, dy = ty - p.y, distance = Math.hypot(dx, dy), range = 6;
        if (distance > range) { tx = p.x + dx / distance * range; ty = p.y + dy / distance * range; }
        const trap = { x: tx, y: ty, r: 0.65, t: 8, col: '#d8e8f055', tick(z) {
          if (z.triggered) return;
          const target = G.enemies.find(enemy => enemy.alive && distXY(z.x, z.y, enemy.x, enemy.y) < z.r + enemy.r);
          if (!target) return;
          z.triggered = true; z.t = 0;
          target.stunFor(target.boss ? 0.35 : 1 + 0.2 * r);
          target.caitlynTrapped = 4;
          dealDamage(p, target, 35 + 25 * r + p.st.ad * 0.55, 'physical', { spell: true });
          ringFx(target.x, target.y, 1, '#d8e8f0', 0.35);
          burst(target.x, target.y, ['#d8e8f0', '#ffffff'], 12, 2, 10, 0.35);
        } };
        addZone(trap);
        ringFx(tx, ty, 0.65, '#d8e8f0', 0.35); discFx(tx, ty, 0.65, '#d8e8f033', 8);
      } },
    E: { name: '90 Caliber Net', icon: '🕸️', cd: [14, 13, 12, 11, 10], cost: [50, 55, 60, 65, 70], range: 5, aim: 'point',
      desc: r => caitlynText(`Fire a net for <b>${35 + 20 * r} (+45% AD)</b> physical damage and slow the first enemy hit by 50% for 1.5s. Recoil sends you backward.`, `发射网弹，对首个命中敌人造成 <b>${35 + 20 * r}（+45% 攻击力）</b>物理伤害并减速 50%，持续 1.5 秒；后坐力使你向后跃开。`),
      cast(p, tx, ty, r) {
        const angle = Math.atan2(ty - p.y, tx - p.x), range = 5;
        skillshot(p, angle, 13, range, 0.35, '#b8d8e8', target => {
          dealDamage(p, target, 35 + 20 * r + p.st.ad * 0.45, 'physical', { spell: true });
          target.slow(0.5, 1.5);
          burst(target.x, target.y, '#b8d8e8', 8, 1.8, 8, 0.3);
        }, { size: 3, trail: true });
        p.dashTo(p.x - Math.cos(angle) * 2, p.y - Math.sin(angle) * 2, 12);
      } },
    R: { name: 'Ace in the Hole', icon: '💥', cd: [75, 62, 50], cost: [100, 100, 100], range: 11, aim: 'unit',
      desc: r => caitlynText(`Lock onto a distant enemy and take aim. After a brief delay, deal <b>${120 + 80 * r} (+130% AD)</b> physical damage.`, `锁定远处敌人并短暂瞄准，随后造成 <b>${120 + 80 * r}（+130% 攻击力）</b>物理伤害。`),
      cast(p, tx, ty, r) {
        const target = nearestEnemy(tx, ty, 1.8);
        if (!target || dist(p, target) > 11) { ftext(p.x, p.y, 'No target', '#aaa'); return false; }
        p.stop(); p.channel = 0.55; p.faceTo(target.x);
        ringFx(target.x, target.y, 0.8, '#e8f0ff', 0.55);
        lineFx(p.x, p.y, target.x, target.y, '#e8f0ff88', 0.6, 1);
        later(0.55, () => {
          if (!target.alive) return;
          lineFx(p.x, p.y, target.x, target.y, '#ffffff', 0.22, 3);
          dealDamage(p, target, 120 + 80 * r + p.st.ad * 1.3, 'physical', { spell: true });
          burst(target.x, target.y, ['#ffffff', '#d8e8f0', '#ffe090'], 18, 3, 14, 0.45);
          ringFx(target.x, target.y, 1.2, '#ffffff', 0.3); G.shake = Math.max(G.shake, 0.25);
        });
      } },
  },
  cards: [
    { id: 'c_peacemaker', name: 'Longshot', icon: '🎯', desc: 'Piltover Peacemaker deals full damage to every target it pierces.' },
    { id: 'c_trap', name: 'Lethal Tempo', icon: '🪤', desc: 'Headshots against trapped enemies deal 50% more bonus damage.' },
    { id: 'c_net', name: 'Quickdraw', icon: '🕸️', desc: '90 Caliber Net cooldown is reduced by 30%.' },
  ],
  tick(p, dt) {
    for (const enemy of G.enemies) if (enemy.caitlynTrapped > 0) enemy.caitlynTrapped = Math.max(0, enemy.caitlynTrapped - dt);
    p.caitlynShots = p.caitlynShots || 0;
  },
  onAttack(p, target, ctx) {
    p.caitlynShots = (p.caitlynShots || 0) + 1;
    if (target.caitlynTrapped > 0 || p.caitlynShots >= 5) {
      p.caitlynShots = 0;
      ctx.phys += (24 + p.level * 7 + p.st.ad * 0.4) * (target.caitlynTrapped > 0 && p.taken.c_trap ? 1.5 : 1);
      ctx.onHit.push(enemy => { burst(enemy.x, enemy.y, ['#ffffff', '#ffe090'], 9, 2, 11, 0.35); ringFx(enemy.x, enemy.y, 0.55, '#e8f0ff', 0.25); });
    }
  },
  onKill(p) { if (p.taken.c_net) p.cd.E = Math.min(p.cd.E, 7); },
};