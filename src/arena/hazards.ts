// Arena: SafeZone, EnvironmentalLasers, orbes de energia.
import { GAME } from "./config";
import { envLaserInterval, pickNextZone, randIn, zoneDamageAt } from "./rules";
import { damage, type Rect, type World } from "./world";
import { sfx } from "./audio";

const N = GAME.arena, Z = GAME.zone, L = GAME.envLaser;
export const fullRect = (): Rect => ({ x: 0, y: 0, w: N, h: N });
export const inRect = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function updateZone(w: World, dt: number) {
  const z = w.zone;
  // aviso: a próxima zona aparece piscando antes de começar a se mover
  if (!z.pending && z.k >= 1 && w.time >= z.next - Z.warn) {
    z.to = pickNextZone(z.cur, N);
    z.pending = true;
  }
  if (z.pending && w.time >= z.next) {
    z.pending = false;
    z.from = { ...z.cur }; z.k = 0;
    z.moveTime = randIn(Z.moveTime);
    z.next = w.time + z.moveTime + randIn(Z.interval);
  }
  if (z.k < 1 && !z.pending) {
    z.k = Math.min(1, z.k + dt / z.moveTime);
    const e = z.k * z.k * (3 - 2 * z.k), l = (a: number, b: number) => a + (b - a) * e;
    z.cur = { x: l(z.from.x, z.to.x), y: l(z.from.y, z.to.y), w: l(z.from.w, z.to.w), h: l(z.from.h, z.to.h) };
  }
  z.tick += dt;
  if (z.tick >= Z.tickInterval) {
    z.tick -= Z.tickInterval;
    let hit = false;
    for (const s of w.ships) if (s.alive && !inRect(z.cur, s.x, s.y)) { damage(w, s, zoneDamageAt(w.time), null); hit = true; }
    if (hit) sfx("zone");
  }
}

type Line = { x: number; y: number; angle: number };
/** Gera as linhas de um padrão de laser centrado em (x, y). */
export function laserPattern(kind: (typeof L.patterns)[number], x: number, y: number, angle: number): Line[] {
  const px = -Math.sin(angle) * L.parallelGap, py = Math.cos(angle) * L.parallelGap;
  switch (kind) {
    case "parallel": return [{ x: x + px / 2, y: y + py / 2, angle }, { x: x - px / 2, y: y - py / 2, angle }];
    case "cross": return [{ x, y, angle }, { x, y, angle: angle + Math.PI / 2 }];
    case "x": return [{ x, y, angle: angle + Math.PI / 4 }, { x, y, angle: angle - Math.PI / 4 }];
    case "fan": return [-1, 0, 1].map((k) => ({ x, y, angle: angle + k * L.fanSpread }));
    default: return [{ x, y, angle }];
  }
}

export function updateEnvLasers(w: World, dt: number) {
  w.envTimer -= dt;
  if (w.envTimer <= 0) {
    w.envTimer = envLaserInterval(w.time) * (1 - L.jitter + 2 * L.jitter * Math.random());
    const alive = w.ships.filter((s) => s.alive), t = alive[Math.floor(Math.random() * alive.length)];
    const z = w.zone.cur, onShip = t && Math.random() < 0.6;
    const x = onShip ? t.x + (Math.random() - 0.5) * 160 : z.x + Math.random() * z.w;
    const y = onShip ? t.y + (Math.random() - 0.5) * 160 : z.y + Math.random() * z.h;
    const kind = L.patterns[Math.floor(Math.random() * L.patterns.length)]!;
    for (const ln of laserPattern(kind, x, y, Math.random() * Math.PI)) w.env.push({ ...ln, t: 0, hit: new Set(), fired: false });
    sfx("warn");
  }
  for (let i = w.env.length - 1; i >= 0; i--) {
    const l = w.env[i]!; l.t += dt;
    if (l.t >= L.warn) {
      if (!l.fired) { l.fired = true; w.shake = Math.max(w.shake, 5); sfx("laser"); }
      const dx = Math.cos(l.angle), dy = Math.sin(l.angle);
      for (const s of w.ships) {
        if (!s.alive || l.hit.has(s.slot)) continue;
        if (Math.abs((s.x - l.x) * dy - (s.y - l.y) * dx) < L.width / 2 + s.stats.size / 2) { l.hit.add(s.slot); damage(w, s, L.damage, null); }
      }
    }
    if (l.t > L.warn + L.fire) w.env.splice(i, 1);
  }
}

export function spawnOrb(w: World) {
  const r = w.mode === "training" ? fullRect() : w.zone.to, m = 40;
  w.orbs.push({ x: r.x + m + Math.random() * Math.max(1, r.w - 2 * m), y: r.y + m + Math.random() * Math.max(1, r.h - 2 * m) });
}
export function updateOrbs(w: World) {
  for (let i = w.orbs.length - 1; i >= 0; i--) {
    const o = w.orbs[i]!;
    const s = w.ships.find((s) => s.alive && !s.energy && Math.hypot(s.x - o.x, s.y - o.y) < s.stats.size / 2 + GAME.energy.radius);
    if (s) { s.energy = true; s.prep = GAME.energy.prep; w.orbs.splice(i, 1); spawnOrb(w); sfx("pickup"); }
  }
}
