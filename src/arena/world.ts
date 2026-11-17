// Ship / Projectile / estado do mundo + sistema de dano (CollisionSystem helpers).
import { GAME, SHIPS, type Mode, type ShipId, type ShipStats } from "./config";
import { isEnemy, shieldedDamage } from "./rules";
import { sfx } from "./audio";

export type AbilityType = ShipId;
export interface Ship {
  slot: number; team: number; stats: ShipStats;
  x: number; y: number; angle: number; hp: number; alive: boolean;
  fireCd: number; energy: boolean; prep: number;
  ability: { type: AbilityType; left: number; dur: number } | null;
  slowT: number; push: { x: number; y: number };
  damageDealt: number; kills: number; deathT: number; flash: number;
  trail: { x: number; y: number }[];
}
export interface Projectile { owner: number; team: number; x: number; y: number; vx: number; vy: number; r: number; dmg: number; color: string }
export interface Beam { owner: number; team: number; x: number; y: number; angle: number; left: number; hits: Map<number, number> }
export interface Wave { owner: number; x: number; y: number; t: number; radius: number }
export interface Hole { owner: number; team: number; x: number; y: number; t: number; hit: Set<number> }
export interface EnvLaser { x: number; y: number; angle: number; t: number; hit: Set<number>; fired: boolean }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string }
export interface Rect { x: number; y: number; w: number; h: number }

export interface World {
  mode: Mode; teams: boolean; time: number; ships: Ship[];
  bullets: Projectile[]; beams: Beam[]; waves: Wave[]; holes: Hole[]; env: EnvLaser[]; orbs: { x: number; y: number }[];
  particles: Particle[]; maxParticles: number;
  zone: { cur: Rect; from: Rect; to: Rect; k: number; next: number; tick: number; pending: boolean; moveTime: number };
  envTimer: number; shake: number; ending: number; // >0 = partida encerrando
}

export function createShip(slot: number, shipId: ShipId, team: number, x: number, y: number): Ship {
  const stats = SHIPS[shipId];
  return { slot, team, stats, x, y, angle: y > GAME.arena / 2 ? 0 : Math.PI, hp: stats.hp, alive: true,
    fireCd: 0.6, energy: false, prep: 0, ability: null, slowT: 0, push: { x: 0, y: 0 }, damageDealt: 0, kills: 0, deathT: -1, flash: 0, trail: [] };
}

export const enemies = (w: World, a: { slot: number; team: number }) => w.ships.filter((s) => s.alive && isEnemy(a, s, w.teams));
export const shieldOn = (s: Ship) => s.ability?.type === "green";

export function burst(w: World, x: number, y: number, color: string, n: number, spd: number, size = 2.5) {
  for (let i = 0; i < n && w.particles.length < w.maxParticles; i++) {
    const a = Math.random() * 6.283, v = spd * (0.3 + Math.random()), max = 0.4 + Math.random() * 0.6;
    w.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, size: size * (0.5 + Math.random()), color });
  }
}

/** Aplica dano respeitando escudo; source = slot do atacante ou null (ambiente). */
export function damage(w: World, target: Ship, amount: number, source: number | null) {
  if (!target.alive || w.ending > 0 || w.mode === "training" && source === null) return;
  const dmg = shieldedDamage(amount, shieldOn(target));
  target.hp = Math.max(0, target.hp - dmg); target.flash = 0.15;
  const src = source != null ? w.ships.find((s) => s.slot === source) : undefined;
  if (src && src !== target) src.damageDealt += dmg;
  sfx("hit");
  if (target.hp <= 0) {
    target.alive = false; target.deathT = w.time; target.energy = false; target.ability = null;
    if (src && src !== target) src.kills++;
    burst(w, target.x, target.y, target.stats.color, 40, 220, 3);
    burst(w, target.x, target.y, "#fff3d6", 14, 110, 2);
    w.shake = Math.max(w.shake, 8); sfx("explode");
  }
}
