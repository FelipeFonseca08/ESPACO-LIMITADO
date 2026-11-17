// ScoreManager de sessão: ranking e estatísticas salvos em sessionStorage.
import type { ShipId } from "./config";
export interface ShipStat { matches: number; wins: number; damage: number; kills: number }
export interface Session { ships: Partial<Record<ShipId, ShipStat>>; players: Record<number, { wins: number; titles: number; damage: number; kills: number }>; competitions: { date: string; champion: string; mode: string }[] }
const KEY = "arena-space-session";
export function loadSession(): Session {
  try { const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); if (s) return s; } catch { /* */ }
  return { ships: {}, players: {}, competitions: [] };
}
export function saveSession(s: Session) { sessionStorage.setItem(KEY, JSON.stringify(s)); }
