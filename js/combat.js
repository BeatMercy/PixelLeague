'use strict';
// ---------- Damage pipeline, healing, projectiles, item procs ----------
function dealDamage(src, t, amt, type = 'physical', o = {}) {
  if (!t.alive || t.invuln > 0 || amt <= 0) return 0;
  const P = G.player;
  if (type !== 'true') amt *= 100 / (100 + Math.max(0, type === 'physical' ? t.st.armor : t.st.mr));
  if (src === P) {
    amt *= 1 + (P.st.dmgPct || 0) / 100;
    if ((t.elite || t.boss) && P.st.slayer) amt *= 1 + P.st.slayer / 100;
    if (P.flags.coup && t.hp < t.st.hp * 0.4) amt *= 1.15;
  }
  if (t === P) {
    amt *= 1 - Math.min(60, P.st.drPct || 0) / 100;
    if (P.hero.dmgTaken) amt = P.hero.dmgTaken(P, amt, src, o);
    if (amt <= 0) return 0;
  }
  amt = Math.max(1, Math.round(amt));
  let left = amt;
  if (t.shield > 0) { const a = Math.min(t.shield, left); t.shield -= a; left -= a; }
  t.hp -= left; t.flash = 0.08; t.lastHurt = G.time;
  if (src === P || t === P) {
    const col = t === P ? '#ff5050' : o.crit ? '#ffd030' : type === 'magic' ? '#c890ff' : type === 'true' ? '#ffffff' : '#f0e8e0';
    if (!o.dot || amt >= 4) ftext(t.x, t.y, o.crit ? amt + '!' : amt, col, !!o.crit);
  }
  if (src === P) onPlayerDealt(t, amt, type, o);
  if (t === P && src && src.alive && !o.dot) onPlayerHurt(src, amt, o);
  if (t.hp <= 0) killUnit(t, src);
  return amt;
}
function onPlayerDealt(t, amt, type, o) {
  const P = G.player, pa = P.passives;
  const vamp = o.dot ? 0 : (o.attack ? P.st.ls : o.spell ? P.st.sv : 0) || 0;
  if (vamp > 0) {
    const over = heal(P, amt * vamp / 100, false);
    if (pa.bloodthirster && over > 0) P.shield = Math.min(150, P.shield + over), P.shieldT = 6;
  }
  if (o.attack) {
    if (pa.kraken && ++P._kk >= 3) { P._kk = 0; later(0.05, () => dealDamage(P, t, 60 + P.st.ad * 0.4, 'true', { proc: true })); }
    if (pa.statikk && ++P._ss >= 4) { P._ss = 0; chainLightning(P, t, 5, 50 + P.st.ad * 0.3, 4, '#d0e0ff'); }
  }
  if (o.spell && pa.liandry) t.dot(P, t.st.hp * 0.02 * (t.boss ? 0.4 : 1), 3, 'magic', 'liandry');
  if (P.hero.onDealt) P.hero.onDealt(P, t, amt, type, o);
}
function onPlayerHurt(src, amt, o) {
  const P = G.player;
  if (P.passives.thorns && o.attack) dealDamage(P, src, amt * 0.3 + P.st.armor * 0.2, 'magic', { dot: true });
  if (P.hero.onHurt) P.hero.onHurt(P, src, amt, o);
}
// returns overheal amount
function heal(t, amt, show = true) {
  const prev = t.hp; t.hp = Math.min(t.st.hp, t.hp + amt);
  const got = t.hp - prev;
  if (show && got >= 1) ftext(t.x, t.y, '+' + Math.round(got), '#70ff70');
  return amt - got;
}
function killUnit(u, src) {
  const P = G.player;
  if (u === P) {
    if (P.passives.ga && !P.gaUsed) {
      P.gaUsed = true; P.hp = P.st.hp * 0.5; P.invuln = 2;
      ringFx(P.x, P.y, 2, '#ffe080', 0.8); burst(P.x, P.y, ['#ffe080', '#ffffff'], 30, 3, 10, 1);
      ftext(P.x, P.y, 'REVIVED', '#ffe080', true); return;
    }
    u.hp = 0; u.alive = false; G.onPlayerDead && G.onPlayerDead(src); return;
  }
  u.hp = 0; u.alive = false;
  if (u.onDeath) u.onDeath(src);
  if (P.hero.onKill) P.hero.onKill(P, u);
}
function gainXP(v) {
  const p = G.player;
  if (p.level >= 18) { G.run.gold += Math.ceil(v / 10); return; }
  p.xp += Math.round(v * (1 + (p.st.xpPct || 0) / 100));
  while (p.level < 18 && p.xp >= XP_REQ(p.level)) { p.xp -= XP_REQ(p.level); p.level++; G.onLevelUp && G.onLevelUp(); }
  if (p.level >= 18) p.xp = 0;
}
function enemiesNear(x, y, r) { return G.enemies.filter(e => e.alive && distXY(x, y, e.x, e.y) < r + e.r); }
function nearestEnemy(x, y, r, exclude) {
  let best = null, bd = r;
  for (const e of G.enemies) { if (!e.alive || (exclude && exclude.has(e))) continue; const d = distXY(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function chainLightning(src, origin, n, dmg, range, col) {
  const hit = new Set([origin]); let last = origin;
  for (let i = 0; i < n; i++) {
    const nx = nearestEnemy(last.x, last.y, range, hit); if (!nx) break; hit.add(nx);
    lineFx(last.x, last.y, nx.x, nx.y, col, 0.25, 1, true);
    dealDamage(src, nx, dmg, 'magic', { proc: true }); last = nx;
  }
}
const critMul = p => (p.passives.ie ? 2.15 : 1.75);

// Basic attack for the player
function playerAttack(p, t) {
  const ctx = { phys: p.st.ad, magic: 0, tru: 0, crit: chance(p.st.crit / 100), critMul: critMul(p), onHit: [] };
  if (p.passives.botrk) ctx.phys += Math.min(t.hp * 0.06, 40 + p.st.ad);
  if (p.spellblade > 0) { ctx.phys += p.baseAd; p.spellblade = 0; ctx.blade = true; }
  if (p.hero.onAttack) p.hero.onAttack(p, t, ctx);
  const crit = ctx.crit;
  const apply = tt => {
    if (!tt.alive) return;
    dealDamage(p, tt, ctx.phys * (crit ? ctx.critMul : 1), 'physical', { attack: true, crit });
    if (ctx.magic) dealDamage(p, tt, ctx.magic, 'magic', { onhit: true });
    if (ctx.tru) dealDamage(p, tt, ctx.tru, 'true', { onhit: true });
    for (const f of ctx.onHit) f(tt);
    if (ctx.blade) ringFx(tt.x, tt.y, 0.6, '#a0e0ff', 0.25);
  };
  if (p.hero.ranged) homingProj(p, t, 11, p.hero.projCol, apply, 2);
  else { apply(t); slashFx(t.x, t.y, Math.atan2(t.y - p.y, t.x - p.x), 0.7, crit ? '#ffd030' : '#ffffff'); }
}

// Projectiles. Homing (basic attacks, never miss) and skillshots (straight line).
function homingProj(src, tgt, spd, col, onHit, size = 1) {
  G.projs.push({ homing: true, x: src.x, y: src.y, z: 9, spd, col, src, tgt, onHit, size, life: 4 });
}
function skillshot(src, ang, spd, range, r, col, onHit, o = {}) {
  G.projs.push({ x: src.x, y: src.y, z: 8, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r, col, src, onHit, life: range / spd,
    pierce: o.pierce || 0, hit: new Set(), size: o.size || 2, wall: o.wall !== false, onEnd: o.onEnd, trail: o.trail });
}
function tickProjs(dt) {
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const p = G.projs[i]; p.life -= dt;
    if (p.homing) {
      const t = p.tgt;
      if (!t.alive || p.life <= 0) { G.projs.splice(i, 1); continue; }
      const d = dist(p, t), step = p.spd * dt;
      if (d <= step + 0.15) { G.projs.splice(i, 1); p.onHit(t); continue; }
      p.x += (t.x - p.x) / d * step; p.y += (t.y - p.y) / d * step; p.ang = Math.atan2(t.y - p.y, t.x - p.x);
      continue;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.trail && chance(0.6)) burst(p.x, p.y, p.col, 1, 0.3, 8, 0.3);
    let dead = p.life <= 0 || (p.wall && blockedAt(p.x, p.y));
    if (!dead) {
      const tg = p.src === G.player ? G.enemies : [G.player];
      for (const t of tg) {
        if (!t.alive || p.hit.has(t) || dist(p, t) > p.r + t.r) continue;
        p.hit.add(t); p.onHit(t, p);
        if (--p.pierce < 0) { dead = true; break; }
      }
    }
    if (dead) { G.projs.splice(i, 1); if (p.onEnd) p.onEnd(p.x, p.y); }
  }
}
