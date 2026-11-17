// GameEngine: loop com delta time, MatchManager e orquestração dos módulos.
import { GAME, type Mode, type ShipId } from "./config";
import { checkOutcome } from "./rules";
import { activate, fire, updateAbilityEntities, updateEnergy } from "./abilities";
import { fullRect, spawnOrb, updateEnvLasers, updateOrbs, updateZone } from "./hazards";
import { createShip, damage, enemies, type World } from "./world";
import { render } from "./render";
import { playerDir } from "./input";
import type { Settings } from "./settings";

export interface Participant { slot: number; ship: ShipId; team: number }
export interface MatchResult {
  draw: boolean; winners: number[]; winnerTeam: number | null;
  players: { slot: number; ship: ShipId; team: number; damage: number; kills: number; alive: boolean; deathT: number }[];
  duration: number;
}

const SPAWNS = [[0.2, 0.2], [0.8, 0.8], [0.8, 0.2], [0.2, 0.8]] as const;
function shuffle<T>(a: T[]) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a; }

export function createWorld(mode: Mode, parts: Participant[], hi: boolean): World {
  const N = GAME.arena;
  // cantos sorteados a cada partida
  const order = shuffle([0, 1, 2, 3]);
  const ships = parts.map((p, i) => {
    const sp = mode === "training" ? [0.5, 0.6] : SPAWNS[order[i]!]!;
    return createShip(p.slot, p.ship, p.team, sp[0] * N, sp[1] * N);
  });
  const w: World = {
    mode, teams: mode === "teams", time: 0, ships, bullets: [], beams: [], waves: [], holes: [], env: [], orbs: [], particles: [],
    maxParticles: hi ? GAME.fx.maxParticles.high : GAME.fx.maxParticles.low,
    zone: { cur: fullRect(), from: fullRect(), to: fullRect(), k: 1, next: GAME.zone.firstShrinkAt, tick: 0, pending: false, moveTime: 1 },
    envTimer: GAME.envLaser.firstAt, shake: 0, ending: 0,
  };
  for (let i = 0; i < GAME.energy.orbs; i++) spawnOrb(w);
  return w;
}

/** Um passo de simulação (sem render); input = direções por slot. */
export function step(w: World, dt: number, input: (slot: number) => { x: number; y: number }) {
  const N = GAME.arena;
  w.time += dt;
  for (const s of w.ships) {
    if (!s.alive) continue;
    s.flash = Math.max(0, s.flash - dt); s.slowT = Math.max(0, s.slowT - dt);
    const d = input(s.slot);
    if (d.x || d.y) {
      const len = Math.hypot(d.x, d.y), spd = GAME.baseSpeed * s.stats.speed * (s.slowT > 0 ? GAME.ability.yellow.slowFactor : 1);
      s.x += (d.x / len) * spd * dt; s.y += (d.y / len) * spd * dt;
      s.angle = Math.atan2(d.x, -d.y);
      // fagulhas do motor
      const bx = s.x - Math.sin(s.angle) * s.stats.size * 0.5, by = s.y + Math.cos(s.angle) * s.stats.size * 0.5;
      for (let k = 0; k < 2 && w.particles.length < w.maxParticles; k++)
        w.particles.push({ x: bx, y: by, vx: -Math.sin(s.angle) * 80 + (Math.random() - 0.5) * 60, vy: Math.cos(s.angle) * 80 + (Math.random() - 0.5) * 60, life: 0.35, max: 0.35, size: 2 + Math.random() * 2, color: s.stats.color });
    }
    // rastro de luz: cresce em movimento, some aos poucos parado
    if (d.x || d.y) { s.trail.push({ x: s.x, y: s.y }); if (s.trail.length > 28) s.trail.shift(); } else if (s.trail.length) s.trail.shift();
    const r = s.stats.size / 2;
    s.x = Math.min(N - r, Math.max(r, s.x)); s.y = Math.min(N - r, Math.max(r, s.y));
    updateEnergy(w, s, dt);
    fire(w, s, dt);
  }
  // projéteis x naves
  for (let i = w.bullets.length - 1; i >= 0; i--) {
    const b = w.bullets[i]!; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < -20 || b.y < -20 || b.x > N + 20 || b.y > N + 20) { w.bullets.splice(i, 1); continue; }
    const t = enemies(w, { slot: b.owner, team: b.team }).find((s) => Math.hypot(s.x - b.x, s.y - b.y) < s.stats.size / 2 + b.r);
    if (t) {
      damage(w, t, b.dmg, b.owner); w.bullets.splice(i, 1);
      for (let k = 0; k < 5 && w.particles.length < w.maxParticles; k++) w.particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, life: 0.25, max: 0.25, size: 2, color: b.color });
    }
  }
  updateAbilityEntities(w, dt);
  updateOrbs(w);
  if (w.mode !== "training") { updateZone(w, dt); updateEnvLasers(w, dt); }
  for (let i = w.particles.length - 1; i >= 0; i--) {
    const p = w.particles[i]!; p.life -= dt;
    if (p.life <= 0) { w.particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96;
  }
  w.shake *= Math.exp(-7 * dt);
}

export function buildResult(w: World): MatchResult {
  const o = checkOutcome(w.ships, w.teams);
  const res = o.over ? o : { draw: true, winners: [], winnerTeam: null };
  return { draw: res.draw, winners: res.winners, winnerTeam: res.winnerTeam, duration: w.time,
    players: w.ships.map((s) => ({ slot: s.slot, ship: s.stats.id, team: s.team, damage: Math.round(s.damageDealt), kills: s.kills, alive: s.alive, deathT: s.deathT })) };
}

export function createEngine(canvas: HTMLCanvasElement, mode: Mode, parts: Participant[], settings: Settings, onEnd: (r: MatchResult) => void) {
  const ctx = canvas.getContext("2d")!;
  const hi = settings.quality === "high";
  const w = createWorld(mode, parts, hi);
  let W = 0, H = 0, raf = 0, last = performance.now(), done = false, result: MatchResult | null = null;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, hi ? 2 : 1);
    W = canvas.clientWidth * dpr; H = canvas.clientHeight * dpr; canvas.width = W; canvas.height = H;
  };
  const loop = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    step(w, dt, (slot) => playerDir(slot, settings));
    if (mode !== "training") {
      if (w.ending === 0 && checkOutcome(w.ships, w.teams).over) { w.ending = 0.0001; result = buildResult(w); }
      if (w.ending > 0) { w.ending += dt; if (w.ending >= GAME.endDelay && !done) { done = true; onEnd(result!); } }
    }
    render(ctx, w, W, H, hi, settings.uiScale * (W / canvas.clientWidth || 1));
    raf = requestAnimationFrame(loop);
  };
  resize(); window.addEventListener("resize", resize);
  raf = requestAnimationFrame(loop);
  return { world: w, testAbility: (slot: number) => { const s = w.ships.find((x) => x.slot === slot); if (s && !s.ability) activate(w, s); },
    destroy() { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); } };
}
