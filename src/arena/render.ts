// Renderização Canvas + HUD in-game.
import { GAME, TEAM_COLORS, TEAM_NAMES, type ShipId } from "./config";
import { zoneDamageAt } from "./rules";
import type { Ship, World } from "./world";

const N = GAME.arena;

export function drawShipShape(ctx: CanvasRenderingContext2D, id: ShipId, size: number, color: string, glow = true) {
  const s = size / 2;
  ctx.beginPath();
  switch (id) {
    case "blue": // dardo
      ctx.moveTo(0, -s * 1.25); ctx.lineTo(s * 0.9, s); ctx.lineTo(0, s * 0.45); ctx.lineTo(-s * 0.9, s); break;
    case "green": // hexágono pesado
      for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283 - Math.PI / 2; ctx.lineTo(Math.cos(a) * s * 1.05, Math.sin(a) * s * 1.05); } break;
    case "red": // garra bifurcada
      ctx.moveTo(-s * 0.35, -s * 1.2); ctx.lineTo(-s * 0.15, -s * 0.4); ctx.lineTo(s * 0.15, -s * 0.4); ctx.lineTo(s * 0.35, -s * 1.2);
      ctx.lineTo(s * 1.0, s * 0.3); ctx.lineTo(s * 0.4, s); ctx.lineTo(-s * 0.4, s); ctx.lineTo(-s * 1.0, s * 0.3); break;
    case "yellow": // triângulo ágil
      ctx.moveTo(0, -s * 1.3); ctx.lineTo(s * 0.85, s * 0.9); ctx.lineTo(-s * 0.85, s * 0.9); break;
    case "purple": // losango com asas
      ctx.moveTo(0, -s * 1.2); ctx.lineTo(s * 0.55, -s * 0.1); ctx.lineTo(s * 1.05, s * 0.7); ctx.lineTo(0, s * 0.4);
      ctx.lineTo(-s * 1.05, s * 0.7); ctx.lineTo(-s * 0.55, -s * 0.1); break;
  }
  ctx.closePath();
  // casco metálico: escuro nas bordas, cor da nave no centro, contorno claro
  const g = ctx.createLinearGradient(-s, 0, s, 0);
  g.addColorStop(0, "#1a1f2e"); g.addColorStop(0.5, color); g.addColorStop(1, "#1a1f2e");
  ctx.fillStyle = g;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.2; ctx.lineJoin = "round"; ctx.stroke();
  // cabine
  ctx.fillStyle = "rgba(220,245,255,0.95)";
  ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s * 0.2, s * 0.4, 0, 0, 6.283); ctx.fill();
}

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

let starLayer: HTMLCanvasElement | null = null;
function stars() {
  if (starLayer) return starLayer;
  const c = document.createElement("canvas"); c.width = c.height = N;
  const x = c.getContext("2d")!;
  for (let i = 0; i < 420; i++) { const z = Math.random() ** 2; x.fillStyle = `rgba(220,230,255,${0.2 + z * 0.7})`; x.fillRect(Math.random() * N, Math.random() * N, 0.6 + z * 1.6, 0.6 + z * 1.6); }
  for (const [cx, cy, c1] of [[200, 250, "rgba(37,131,255,0.07)"], [780, 720, "rgba(168,85,247,0.07)"], [700, 180, "rgba(53,212,106,0.04)"]] as const) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, 420); g.addColorStop(0, c1); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, N, N);
  }
  x.strokeStyle = "rgba(120,150,255,0.06)"; x.lineWidth = 1;
  for (let i = 0; i <= N; i += 50) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, N); x.moveTo(0, i); x.lineTo(N, i); x.stroke(); }
  return (starLayer = c);
}

export function render(ctx: CanvasRenderingContext2D, w: World, W: number, H: number, hi: boolean, uiScale: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#03040a"; ctx.fillRect(0, 0, W, H);
  const sc = (Math.min(W, H) * 0.96) / N, ox = (W - N * sc) / 2, oy = (H - N * sc) / 2;
  const sh = w.shake > 0.3 && hi ? w.shake : 0;
  ctx.setTransform(sc, 0, 0, sc, ox + (Math.random() - 0.5) * sh, oy + (Math.random() - 0.5) * sh);
  ctx.fillStyle = "#070914"; ctx.fillRect(0, 0, N, N);
  ctx.drawImage(stars(), 0, 0);
  const t = w.time;

  // zona segura
  if (w.mode !== "training") {
    const z = w.zone.cur;
    ctx.fillStyle = `rgba(180,20,50,${0.22 + 0.06 * Math.sin(t * 4)})`;
    ctx.beginPath(); ctx.rect(0, 0, N, N); ctx.rect(z.x, z.y, z.w, z.h); ctx.fill("evenodd");
    if (w.zone.pending || w.zone.k < 1) {
      const n = w.zone.to, a = w.zone.pending ? (Math.sin(t * 18) > 0 ? 0.85 : 0.35) : 0.4;
      ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 40; ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = w.zone.pending ? 2.5 : 1.5;
      ctx.strokeRect(n.x, n.y, n.w, n.h); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
    if (hi) { ctx.shadowColor = "#7fd8ff"; ctx.shadowBlur = 12; }
    ctx.strokeStyle = "rgba(127,216,255,0.9)"; ctx.lineWidth = 2.5; ctx.strokeRect(z.x, z.y, z.w, z.h); ctx.shadowBlur = 0;
  }
  ctx.strokeStyle = "rgba(140,170,255,0.35)"; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, N - 3, N - 3);

  // orbes
  for (const o of w.orbs) {
    const r = GAME.energy.radius * (1 + 0.15 * Math.sin(t * 6));
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 2.4);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(140,255,240,0.9)"); g.addColorStop(1, "rgba(80,200,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, r * 2.4, 0, 6.283); ctx.fill();
    ctx.strokeStyle = "rgba(200,255,250,0.8)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(o.x, o.y, r * 1.5, t * 3, t * 3 + 4); ctx.stroke();
  }

  // buracos negros
  for (const h of w.holes) {
    const R = GAME.ability.purple.radius, pull = h.t < GAME.ability.purple.pullTime;
    const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, R);
    g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.12, "rgba(20,0,40,1)"); g.addColorStop(0.2, pull ? "rgba(168,85,247,0.5)" : "rgba(255,180,255,0.5)"); g.addColorStop(1, "rgba(168,85,247,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, R, 0, 6.283); ctx.fill();
    ctx.strokeStyle = "rgba(200,150,255,0.5)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const rr = ((t * (pull ? -60 : 90) + i * (R / 3)) % R + R) % R; ctx.beginPath(); ctx.arc(h.x, h.y, rr, 0, 6.283); ctx.stroke(); }
  }

  // lasers ambientais (ciano/branco, listrados)
  for (const l of w.env) {
    ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.angle);
    const L = GAME.envLaser, len = N * 1.5;
    if (l.t < L.warn) {
      const a = 0.25 + 0.35 * (Math.sin(l.t * 25) > 0 ? 1 : 0.3);
      ctx.strokeStyle = `rgba(120,240,255,${a})`; ctx.lineWidth = L.width; ctx.setLineDash([18, 14]);
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len, 0); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len, 0); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(160,250,255,${a + 0.3})`; ctx.font = "bold 22px 'Chakra Petch'"; ctx.textAlign = "center"; ctx.fillText("⚠", 0, -14);
    } else {
      const f = (l.t - L.warn) / L.fire, wd = L.width * (1 - f * 0.5);
      if (hi) { ctx.shadowColor = "#7ff3ff"; ctx.shadowBlur = 24; }
      ctx.fillStyle = "rgba(90,230,255,0.5)"; ctx.fillRect(-len, -wd / 2, len * 2, wd);
      ctx.fillStyle = "rgba(240,255,255,0.95)"; ctx.fillRect(-len, -wd / 6, len * 2, wd / 3); ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // laser vermelho (habilidade)
  for (const b of w.beams) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle);
    const wd = GAME.ability.red.width * (0.9 + 0.1 * Math.sin(t * 50));
    if (hi) { ctx.shadowColor = "#FF4545"; ctx.shadowBlur = 30; }
    ctx.fillStyle = "rgba(255,40,40,0.55)"; ctx.fillRect(-wd, -N * 1.5, wd * 2, N * 1.5);
    ctx.fillStyle = "rgba(255,120,110,0.9)"; ctx.fillRect(-wd / 2, -N * 1.5, wd, N * 1.5);
    ctx.fillStyle = "#fff"; ctx.fillRect(-wd / 6, -N * 1.5, wd / 3, N * 1.5); ctx.shadowBlur = 0;
    ctx.restore();
  }

  // projéteis
  for (const p of w.bullets) {
    if (hi) { ctx.shadowColor = p.color; ctx.shadowBlur = 10; }
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.45, 0, 6.283); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // ondas PEM
  for (const v of w.waves) {
    const k = v.t / GAME.ability.yellow.waveTime, r = v.radius * Math.min(1, k * 1.2);
    ctx.strokeStyle = `rgba(255,212,59,${1 - k})`; ctx.lineWidth = 8 * (1 - k) + 2;
    ctx.beginPath(); ctx.arc(v.x, v.y, r, 0, 6.283); ctx.stroke();
    ctx.fillStyle = `rgba(255,212,59,${0.12 * (1 - k)})`; ctx.fill();
  }

  for (const s of w.ships) if (s.alive) drawShip(ctx, w, s, hi);

  ctx.globalCompositeOperation = "lighter";
  for (const p of w.particles) { const a = p.life / p.max; ctx.globalAlpha = a; ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";

  for (const s of w.ships) if (s.alive) drawHud(ctx, w, s, uiScale);

  // info topo
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `600 ${14 * uiScale}px 'Chakra Petch'`; ctx.textAlign = "center"; ctx.fillStyle = "rgba(220,230,255,0.85)";
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60).toString().padStart(2, "0");
  ctx.fillText(w.mode === "training" ? `TREINAMENTO · ${mm}:${ss} · Esc para sair` : `${mm}:${ss} · DANO DA ZONA ${zoneDamageAt(t)}`, W / 2, oy + 4 + 14 * uiScale);
}

function drawShip(ctx: CanvasRenderingContext2D, w: World, s: Ship, hi: boolean) {
  const sz = s.stats.size, c = s.stats.color;
  // rastro de luz
  ctx.lineCap = "round";
  for (let i = 1; i < s.trail.length; i++) {
    const k = i / s.trail.length, a = s.trail[i - 1]!, b = s.trail[i]!;
    ctx.strokeStyle = rgba(c, k * 0.5); ctx.lineWidth = k * sz * 0.23;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.save(); ctx.translate(s.x, s.y);
  // halo de brilho
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, sz * 1.8);
  halo.addColorStop(0, rgba(c, 0.45)); halo.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, sz * 1.8, 0, 6.283); ctx.fill();
  if (w.teams) { ctx.strokeStyle = TEAM_COLORS[s.team]!; ctx.globalAlpha = 0.6; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(0, 0, sz * 0.95, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  if (s.ability?.type === "green") {
    const k = 0.75 + 0.25 * Math.sin(w.time * 10);
    const g = ctx.createRadialGradient(0, 0, sz * 0.5, 0, 0, sz * 1.15);
    g.addColorStop(0, "rgba(53,212,106,0)"); g.addColorStop(0.8, `rgba(53,212,106,${0.35 * k})`); g.addColorStop(1, `rgba(180,255,200,${0.8 * k})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, sz * 1.15, 0, 6.283); ctx.fill();
  }
  if (s.slowT > 0) { ctx.strokeStyle = "rgba(255,212,59,0.7)"; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const a = w.time * 6 + i * 2.1; ctx.beginPath(); ctx.arc(0, 0, sz * 0.8, a, a + 0.6); ctx.stroke(); } }
  ctx.rotate(s.angle);
  // chama do motor tremulando
  const base = sz * 0.35, fl = sz * (0.38 + 0.12 * Math.sin(w.time * 40));
  const fg = ctx.createLinearGradient(0, base, 0, base + fl);
  fg.addColorStop(0, "rgba(255,240,200,1)"); fg.addColorStop(0.4, rgba(c, 0.9)); fg.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-sz * 0.19, base); ctx.lineTo(0, base + fl); ctx.lineTo(sz * 0.19, base); ctx.fill();
  drawShipShape(ctx, s.stats.id, sz, s.flash > 0 ? "#ffffff" : c, hi);
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, w: World, s: Ship, u: number) {
  const sz = s.stats.size, bw = 46 * u, bh = 5 * u, x = s.x - bw / 2, y = s.y - sz * 0.8 - 14 * u;
  const r = s.hp / s.stats.hp;
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - 1, y - 1, bw + 2, bh + 2);
  ctx.fillStyle = r > 0.5 ? s.stats.color : r > 0.25 ? "#FFB020" : "#FF3B3B"; ctx.fillRect(x, y, bw * r, bh);
  ctx.font = `700 ${10 * u}px 'Chakra Petch'`; ctx.textAlign = "left"; ctx.fillStyle = s.stats.color;
  const tag = `P${s.slot + 1}${w.teams ? " " + TEAM_NAMES[s.team]![0] : ""}`;
  ctx.fillText(tag, x, y - 3 * u);
  ctx.textAlign = "right"; ctx.fillStyle = "#e8eeff"; ctx.fillText(String(Math.ceil(s.hp)), x + bw, y - 3 * u);
  // energia
  const ex = x + bw + 8 * u, ey = y + bh / 2, er = 4 * u;
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = "rgba(140,255,240,0.8)"; ctx.lineWidth = 1; ctx.strokeRect(-er, -er, er * 2, er * 2);
  if (s.energy) { ctx.fillStyle = "#8cfff0"; ctx.fillRect(-er, -er, er * 2, er * 2); }
  ctx.restore();
  if (s.energy) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, er * 2.2, -Math.PI / 2, -Math.PI / 2 + 6.283 * (1 - s.prep / GAME.energy.prep)); ctx.stroke(); }
  if (s.ability) {
    ctx.textAlign = "center"; ctx.font = `600 ${9 * u}px 'Chakra Petch'`; ctx.fillStyle = s.stats.color;
    ctx.fillText(`${s.stats.abilityName.toUpperCase()} ${s.ability.left.toFixed(1)}s`, s.x, s.y + sz * 0.9 + 12 * u);
  }
}
