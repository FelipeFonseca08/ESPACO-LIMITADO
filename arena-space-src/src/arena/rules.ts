// Regras puras (testáveis) do ARENA SPACE.
import { GAME } from "./config";

export const zoneDamageAt = (t: number) =>
  GAME.zone.baseDamage + GAME.zone.stepDamage * Math.floor(Math.max(0, t) / GAME.zone.stepSeconds);

export const shieldedDamage = (amount: number, shield: boolean) =>
  shield ? amount * (1 - GAME.ability.green.reduction) : amount;

export const fireInterval = (rate: number, doubleShot: boolean) =>
  doubleShot ? GAME.ability.blue.interval : 1 / rate;

export const envLaserInterval = (t: number) =>
  Math.max(GAME.envLaser.minInterval, GAME.envLaser.startInterval - t * GAME.envLaser.rampPerSecond);

export type Rng = () => number;
export const randIn = ([a, b]: [number, number], rng: Rng = Math.random) => a + (b - a) * rng();

export interface ZoneRect { x: number; y: number; w: number; h: number }
/** Próxima zona: encolhe (até o mínimo) e vai para um ponto aleatório cujo centro fica dentro da zona atual. */
export function pickNextZone(cur: ZoneRect, arena: number, rng: Rng = Math.random): ZoneRect {
  const Z = GAME.zone;
  const size = cur.w <= Z.minSize ? Z.minSize : Math.max(Z.minSize, cur.w * randIn(Z.shrinkFactor, rng));
  const cx = cur.x + rng() * cur.w, cy = cur.y + rng() * cur.h;
  const clamp = (v: number) => Math.min(arena - size, Math.max(0, v));
  return { x: clamp(cx - size / 2), y: clamp(cy - size / 2), w: size, h: size };
}

export interface Side { slot: number; team: number }
export const isEnemy = (a: Side, b: Side, teams: boolean) => a.slot !== b.slot && (!teams || a.team !== b.team);

export type Outcome = { over: false } | { over: true; draw: boolean; winners: number[]; winnerTeam: number | null };
export function checkOutcome(players: { slot: number; team: number; alive: boolean }[], teams: boolean): Outcome {
  const alive = players.filter((p) => p.alive);
  if (teams) {
    const t = new Set(alive.map((p) => p.team));
    if (t.size > 1) return { over: false };
    if (t.size === 0) return { over: true, draw: true, winners: [], winnerTeam: null };
    const team = [...t][0]!;
    return { over: true, draw: false, winnerTeam: team, winners: players.filter((p) => p.team === team).map((p) => p.slot) };
  }
  if (alive.length > 1) return { over: false };
  if (alive.length === 0) return { over: true, draw: true, winners: [], winnerTeam: null };
  return { over: true, draw: false, winners: [alive[0]!.slot], winnerTeam: null };
}
