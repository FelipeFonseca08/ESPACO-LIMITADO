// Abilities + EnergySystem + Projectile firing.
import { GAME } from "./config";
import { fireInterval } from "./rules";
import { burst, damage, enemies, shieldOn, type Ship, type World } from "./world";
import { sfx } from "./audio";

const A = GAME.ability;
const fwd = (a: number) => ({ x: Math.sin(a), y: -Math.cos(a) });

export function activate(w: World, s: Ship) {
  sfx("ability");
  const id = s.stats.id;
  switch (id) {
    case "blue": s.ability = { type: id, left: A.blue.duration, dur: A.blue.duration }; s.fireCd = 0; break;
    case "green": s.ability = { type: id, left: A.green.duration, dur: A.green.duration }; break;
    case "red":
      s.ability = { type: id, left: A.red.duration, dur: A.red.duration };
      w.beams.push({ owner: s.slot, team: s.team, x: s.x, y: s.y, angle: s.angle, left: A.red.duration, hits: new Map() }); break;
    case "yellow": {
      const r = GAME.arena * A.yellow.radiusFrac;
      s.ability = { type: id, left: A.yellow.waveTime, dur: A.yellow.waveTime };
      w.waves.push({ owner: s.slot, x: s.x, y: s.y, t: 0, radius: r });
      for (const e of enemies(w, s)) if (Math.hypot(e.x - s.x, e.y - s.y) <= r) { damage(w, e, A.yellow.damage, s.slot); e.slowT = A.yellow.slowDuration; }
      break;
    }
    case "purple":
      s.ability = { type: id, left: A.purple.duration, dur: A.purple.duration };
      w.holes.push({ owner: s.slot, team: s.team, x: s.x, y: s.y, t: 0, hit: new Set() }); break;
  }
}

/** Energia: preparação de 2s; espera habilidade ativa terminar. */
export function updateEnergy(w: World, s: Ship, dt: number) {
  if (!s.alive) return;
  if (s.ability) { s.ability.left -= dt; if (s.ability.left <= 0) s.ability = null; }
  if (!s.energy) return;
  if (s.ability) { s.prep = GAME.energy.prep; return; }
  s.prep -= dt;
  if (s.prep <= 0) { s.energy = false; s.prep = 0; activate(w, s); }
}

export function fire(w: World, s: Ship, dt: number) {
  s.fireCd -= dt;
  if (s.fireCd > 0) return;
  const dbl = s.ability?.type === "blue";
  s.fireCd += fireInterval(s.stats.rate, dbl);
  if (s.fireCd < 0) s.fireCd = 0;
  const f = fwd(s.angle), px = -f.y, py = f.x, nose = s.stats.size * 0.6;
  const offs = dbl ? [-A.blue.spacing, A.blue.spacing] : [0];
  for (const o of offs) {
    if (w.bullets.length >= GAME.maxBullets) w.bullets.shift();
    w.bullets.push({ owner: s.slot, team: s.team, x: s.x + f.x * nose + px * o, y: s.y + f.y * nose + py * o,
      vx: f.x * GAME.bulletSpeed, vy: f.y * GAME.bulletSpeed, r: s.stats.bullet / 2, dmg: s.stats.damage, color: s.stats.color });
  }
  sfx("shoot");
}

export function updateAbilityEntities(w: World, dt: number) {
  // Laser vermelho
  for (let i = w.beams.length - 1; i >= 0; i--) {
    const b = w.beams[i]!; b.left -= dt;
    const owner = w.ships.find((s) => s.slot === b.owner)!;
    if (b.left <= 0 || !owner.alive) { w.beams.splice(i, 1); continue; }
    const f = fwd(b.angle);
    for (const e of enemies(w, { slot: b.owner, team: b.team })) {
      const dx = e.x - b.x, dy = e.y - b.y, proj = dx * f.x + dy * f.y;
      const dist = Math.abs(dx * f.y - dy * f.x);
      if (proj > 0 && dist < A.red.width / 2 + e.stats.size / 2) {
        const cd = b.hits.get(e.slot) ?? 0;
        if (w.time >= cd) { damage(w, e, A.red.damage, b.owner); b.hits.set(e.slot, w.time + A.red.hitInterval); }
      }
    }
  }
  for (let i = w.waves.length - 1; i >= 0; i--) { const v = w.waves[i]!; v.t += dt; if (v.t > A.yellow.waveTime) w.waves.splice(i, 1); }
  // Buraco negro
  for (let i = w.holes.length - 1; i >= 0; i--) {
    const h = w.holes[i]!; h.t += dt;
    if (h.t >= A.purple.duration) { w.holes.splice(i, 1); continue; }
    const pulling = h.t < A.purple.pullTime;
    for (const e of enemies(w, { slot: h.owner, team: h.team })) {
      const dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy);
      if (d > A.purple.radius || d < 1) continue;
      if (!h.hit.has(e.slot)) { h.hit.add(e.slot); damage(w, e, A.purple.damage, h.owner); }
      const k = (1 - d / A.purple.radius) * 0.7 + 0.3;
      const force = (pulling ? A.purple.pull : -A.purple.push) * k * dt;
      if (pulling && d < 18) continue;
      e.x += (dx / d) * force; e.y += (dy / d) * force;
    }
    if (w.particles.length < w.maxParticles && Math.random() < 0.8) {
      const a = Math.random() * 6.283, r = A.purple.radius * (0.4 + Math.random() * 0.6), sp = pulling ? -160 : 200;
      w.particles.push({ x: h.x + Math.cos(a) * r * (pulling ? 1 : 0.15), y: h.y + Math.sin(a) * r * (pulling ? 1 : 0.15), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.9, max: 0.9, size: 2, color: "#c79bff" });
    }
  }
  // Escudo verde: colisão com adversários
  for (const s of w.ships) {
    if (!s.alive || !shieldOn(s)) continue;
    for (const e of enemies(w, s)) {
      if (Math.hypot(e.x - s.x, e.y - s.y) < (e.stats.size + s.stats.size) / 2 + 6) {
        damage(w, e, A.green.contactDamage, s.slot); s.ability = null;
        burst(w, s.x, s.y, "#35D46A", 30, 260, 2.5); w.shake = Math.max(w.shake, 6); break;
      }
    }
  }
}
