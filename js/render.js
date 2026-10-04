'use strict';
// ---------- World rendering (low-res buffer, depth sorted), then upscale ----------
const RARITY_GLOW = { common: '#c8c8c8', rare: '#4aa0ff', epic: '#c060ff', legendary: '#ffa020' };
function shadow(x, y, r) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(toVX(x, y), toVY(x, y), r * ISO_RX * 1.1, r * ISO_RY * 1.1, 0, 0, TAU); ctx.fill(); }

function drawUnit(u) {
  const vx = toVX(u.x, u.y), vy = toVY(u.x, u.y, u.z);
  shadow(u.x, u.y, u.r);
  if (u.elite) { ctx.strokeStyle = `rgba(255,200,60,${0.5 + 0.3 * Math.sin(G.time * 6)})`; isoEllipse(u.x, u.y, u.r + 0.25); ctx.stroke(); }
  if (u === G.hoverEnemy) { ctx.strokeStyle = '#ff4040'; isoEllipse(u.x, u.y, u.r + 0.15); ctx.stroke(); }
  const alpha = u.spawnT > 0 ? 1 - u.spawnT / 0.6 : u.invuln > 0 && u === G.player ? 0.6 : 1;
  const prevFilter = ctx.filter;
  if (u === G.player) ctx.filter = 'saturate(1.08) brightness(1.04)';
  else ctx.filter = 'saturate(0.82) brightness(0.96)';
  drawSprite(u.spr, u.animFrame(), vx, vy, u.face < 0, u.flash > 0, Math.max(0, alpha));
  ctx.filter = prevFilter;
  const top = vy - u.spr.ay;
  if (u.vuln > 0) {
    ctx.save();
    const bodyCenterY = vy - Math.max(2, u.spr.ay * 0.52);
    const bodyRadius = Math.max(8, u.r * 18);
    ctx.shadowBlur = 12; ctx.shadowColor = '#ffe070';
    ctx.strokeStyle = '#ffe070'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(vx - bodyRadius, bodyCenterY); ctx.lineTo(vx + bodyRadius, bodyCenterY);
    ctx.moveTo(vx, bodyCenterY - bodyRadius * 0.9); ctx.lineTo(vx, bodyCenterY + bodyRadius * 0.9);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 230, 130, 0.12)';
    ctx.beginPath(); ctx.moveTo(vx, top + 2); ctx.lineTo(vx + bodyRadius * 0.8, bodyCenterY + 2); ctx.lineTo(vx, vy + 4); ctx.lineTo(vx - bodyRadius * 0.8, bodyCenterY + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 240, 180, 0.65)'; ctx.lineWidth = 1.25; ctx.beginPath(); ctx.moveTo(vx, top + 2); ctx.lineTo(vx + bodyRadius * 0.8, bodyCenterY + 2); ctx.lineTo(vx, vy + 4); ctx.lineTo(vx - bodyRadius * 0.8, bodyCenterY + 2); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  if (u.vital > 0 || u.grand > 0) {
    const n = u.grand > 0 ? u.grand : 1;
    for (let i = 0; i < n; i++) { const a = G.time * 2 + i * TAU / Math.max(n, 1), px = vx + Math.cos(a) * 9, py = vy - 8 + Math.sin(a) * 4; ctx.fillStyle = '#ffd060'; ctx.fillRect(px - 1, py - 1, 3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(px, py, 1, 1); }
  }
  if (u.slowT > 0 && u.slowAmt > 0) { ctx.fillStyle = '#80c0ff'; ctx.fillRect(vx - 4, vy - 1, 1, 1); ctx.fillRect(vx + 4, vy - 2, 1, 1); }
  if (u.shield > 0) { ctx.strokeStyle = 'rgba(230,230,255,0.6)'; ctx.beginPath(); ctx.ellipse(vx, vy - u.spr.ay / 2, 9, u.spr.ay / 2 + 2, 0, 0, TAU); ctx.stroke(); }
  if (u === G.player && u.parry > 0) { ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(vx, vy - 12, 12, 0, TAU); ctx.stroke(); }
}
function drawDrop(d) {
  const vx = toVX(d.x, d.y), vy = toVY(d.x, d.y, d.z + (d.z <= 0 ? Math.sin(G.time * 4 + d.x) * 1.5 + 1.5 : 0));
  shadow(d.x, d.y, 0.15);
  if (d.kind === 'gold') { ctx.fillStyle = '#8a6a10'; ctx.fillRect(vx - 1, vy - 2, 3, 3); ctx.fillStyle = '#ffd040'; ctx.fillRect(vx - 1, vy - 2, 2, 2); }
  else if (d.kind === 'potion') { ctx.fillStyle = '#140c1c'; ctx.fillRect(vx - 2, vy - 6, 5, 6); ctx.fillStyle = '#e03040'; ctx.fillRect(vx - 1, vy - 4, 3, 3); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(vx, vy - 6, 1, 2); }
  else {
    const c = RARITY_GLOW[d.item.rarity];
    if (d.item.rarity !== 'common') { ctx.globalAlpha = 0.35 + 0.15 * Math.sin(G.time * 5); ctx.fillStyle = c; ctx.fillRect(vx - 1, vy - 30, 3, 28); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#140c1c'; ctx.fillRect(vx - 4, vy - 8, 9, 8);
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(vx - 3, vy - 7, 7, 6); ctx.fillStyle = c; ctx.fillRect(vx - 3, vy - 7, 7, 2); ctx.fillRect(vx, vy - 5, 1, 2);
    if (d === G.hoverDrop) { ctx.strokeStyle = '#fff'; ctx.strokeRect(vx - 5.5, vy - 9.5, 11, 10); }
  }
}
function drawProj(p) {
  const vx = toVX(p.x, p.y), vy = toVY(p.x, p.y, p.z);
  if (p.homing && !p.src.boss && p.size <= 2) {
    const a = p.ang || 0, dx = isoX(Math.cos(a), Math.sin(a)), dy = isoY(Math.cos(a), Math.sin(a)), l = Math.hypot(dx, dy) || 1;
    ctx.strokeStyle = p.col; ctx.beginPath(); ctx.moveTo(vx - dx / l * 5, vy - dy / l * 5); ctx.lineTo(vx, vy); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(vx, vy, 1, 1); return;
  }
  const s = p.size || 2;
  ctx.fillStyle = '#140c1c'; ctx.fillRect(vx - s, vy - s, s * 2 + 1, s * 2 + 1);
  ctx.fillStyle = p.col; ctx.fillRect(vx - s + 1, vy - s + 1, s * 2 - 1, s * 2 - 1);
  ctx.fillStyle = '#fff'; ctx.fillRect(vx, vy, 1, 1);
}
function drawPortal(o) {
  const vx = toVX(o.x, o.y), vy = toVY(o.x, o.y);
  for (let i = 0; i < 3; i++) {
    const t = (G.time * 0.8 + i / 3) % 1;
    ctx.globalAlpha = 1 - t; ctx.strokeStyle = i % 2 ? '#80e0ff' : '#ffffff';
    ctx.beginPath(); ctx.ellipse(vx, vy - 14, 7 + t * 4, 14 + t * 6, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#80e0ff'; ctx.beginPath(); ctx.ellipse(vx, vy - 14, 6, 13, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  if (chance(0.3)) burst(o.x, o.y, ['#80e0ff', '#ffffff'], 1, 0.5, rand(0, 24), 0.8);
}

function renderWorld() {
  const b = G.map.biome, p = G.player;
  ctx.fillStyle = '#0c0a14'; ctx.fillRect(0, 0, VW, VH);
  const sx = G.shake > 0 ? Math.round(rand(-2, 2) * G.shake * 3) : 0, sy = G.shake > 0 ? Math.round(rand(-2, 2) * G.shake * 3) : 0;
  G.cam.x += sx; G.cam.y += sy;
  ctx.filter = 'saturate(0.82) brightness(0.96) contrast(0.98)';
  ctx.drawImage(G.ground.img, Math.round(G.ground.ox - G.cam.x + VW / 2), Math.round(G.ground.oy - G.cam.y + VH / 2));
  ctx.filter = 'none';
  for (const z of G.zones) { ctx.globalAlpha = 0.25 + 0.1 * Math.sin(G.time * 6); ctx.fillStyle = z.col; isoEllipse(z.x, z.y, z.r); ctx.fill(); ctx.globalAlpha = 1; }
  drawFxGround();
  if (IN.amove && p.alive) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(255, 208, 100, 0.08)';
    ctx.strokeStyle = 'rgba(255, 220, 120, 0.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    isoEllipse(p.x, p.y, (p.st.range || 4.5) * 0.95); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  if (G.moveMark && G.moveMark.t > 0) { ctx.globalAlpha = G.moveMark.t * 2; ctx.strokeStyle = G.moveMark.col; isoEllipse(G.moveMark.x, G.moveMark.y, 0.3 * G.moveMark.t * 2 + 0.1); ctx.stroke(); ctx.globalAlpha = 1; }
  const list = [];
  for (const pr of G.map.props) {
    const vx = toVX(pr.x, pr.y), vy = toVY(pr.x, pr.y);
    if (vx < -40 || vx > VW + 40 || vy < -10 || vy > VH + 50) continue;
    list.push({ d: pr.x + pr.y, k: 0, o: pr, vx, vy });
  }
  for (const e of G.enemies) if (e.alive) list.push({ d: e.x + e.y, k: 1, o: e });
  if (p.alive) list.push({ d: p.x + p.y, k: 1, o: p });
  for (const d of G.drops) list.push({ d: d.x + d.y, k: 2, o: d });
  for (const q of G.projs) list.push({ d: q.x + q.y + 0.5, k: 3, o: q });
  if (G.run.portal) list.push({ d: G.run.portal.x + G.run.portal.y, k: 4, o: G.run.portal });
  list.sort((a, c) => a.d - c.d);
  const pvx = toVX(p.x, p.y), pvy = toVY(p.x, p.y), pd = p.x + p.y;
  for (const it of list) {
    if (it.k === 0) {
      const P = PROPS[it.o.k]; if (!P) continue;
      const x = it.vx - P.ax, y = it.vy - P.ay;
      const occl = it.d > pd && pvx > x && pvx < x + P.img.width && pvy - 10 > y && pvy - 10 < y + P.img.height && it.d - pd < 3;
      if (occl) ctx.globalAlpha = 0.45;
      ctx.drawImage(P.img, x, y); ctx.globalAlpha = 1;
    } else if (it.k === 1) drawUnit(it.o);
    else if (it.k === 2) drawDrop(it.o);
    else if (it.k === 3) drawProj(it.o);
    else drawPortal(it.o);
  }
  for (const k in p.extras) if (EXTRAS[k].draw) EXTRAS[k].draw(p, p.extras[k], p.extraState[k]);
  drawFxTop();
  // vignette
  const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (p.hp < p.st.hp * 0.3 && p.alive) { ctx.fillStyle = `rgba(200,0,0,${0.12 + 0.08 * Math.sin(G.time * 6)})`; ctx.fillRect(0, 0, VW, VH); }
  G.cam.x -= sx; G.cam.y -= sy;
  // upscale + full-res overlays
  sctx.drawImage(view, 0, 0, VW * SCALE, VH * SCALE);
  for (const e of G.enemies) if (e.alive && e.spawnT <= 0 && !e.boss) drawHpBar(e, e.elite ? 22 : 14, e.elite ? '#ffb030' : '#e03030', e.spr.ay + 4);
  if (p.alive) drawHpBar(p, 22, '#40d050', p.spr.ay + 4);
  drawTexts();
}
