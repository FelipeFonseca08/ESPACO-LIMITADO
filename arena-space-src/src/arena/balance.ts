import { GAME, SHIPS, SHIP_ORDER, type ShipId } from "./config";

export const SHIP_FIELDS = [
  { key: "hp", label: "Vida", min: 1, max: 5000, step: 1 },
  { key: "damage", label: "Dano por projétil", min: 0, max: 500, step: 1 },
  { key: "bullet", label: "Diâmetro do projétil", min: 1, max: 60, step: 1 },
  { key: "rate", label: "Disparos por segundo", min: 0.1, max: 20, step: 0.1 },
  { key: "size", label: "Tamanho da nave", min: 10, max: 100, step: 1 },
  { key: "speed", label: "Velocidade (%)", min: 10, max: 300, step: 5, scale: 100 },
] as const;
export type ShipAttribute = (typeof SHIP_FIELDS)[number]["key"];
export interface BalanceField { key: string; label: string; min: number; max: number; step: number; scale?: number }
const duration: BalanceField = { key: "duration", label: "Duração (s)", min: 0.1, max: 60, step: 0.1 };
const damage: BalanceField = { key: "damage", label: "Dano", min: 0, max: 500, step: 1 };
export const ABILITY_FIELDS: Record<ShipId, BalanceField[]> = {
  blue: [duration, { key: "interval", label: "Intervalo entre tiros duplos (s)", min: 0.05, max: 10, step: 0.05 }, { key: "spacing", label: "Distância lateral dos projéteis", min: 1, max: 60, step: 1 }],
  green: [duration, { key: "reduction", label: "Redução de dano (%)", min: 0, max: 100, step: 1, scale: 100 }, { key: "contactDamage", label: "Dano ao encostar", min: 0, max: 500, step: 1 }],
  red: [duration, damage, { key: "hitInterval", label: "Intervalo entre danos (s)", min: 0.05, max: 10, step: 0.05 }, { key: "width", label: "Largura do laser", min: 1, max: 100, step: 1 }],
  yellow: [{ key: "radiusFrac", label: "Raio (% da arena)", min: 1, max: 100, step: 1, scale: 100 }, damage, { key: "slowDuration", label: "Duração da lentidão (s)", min: 0.1, max: 60, step: 0.1 }, { key: "slowFactor", label: "Velocidade restante (%)", min: 1, max: 100, step: 1, scale: 100 }, { key: "waveTime", label: "Duração da onda (s)", min: 0.1, max: 10, step: 0.1 }],
  purple: [duration, { key: "pullTime", label: "Tempo de atração (s)", min: 0.1, max: 60, step: 0.1 }, damage, { key: "radius", label: "Raio de alcance", min: 10, max: 1000, step: 10 }, { key: "pull", label: "Força de atração", min: 0, max: 2000, step: 10 }, { key: "push", label: "Força de repulsão", min: 0, max: 2000, step: 10 }],
};
export interface Balance {
  ships: Record<ShipId, Record<ShipAttribute, number>>;
  abilities: Record<ShipId, Record<string, number>>;
  prep: number;
}
export function currentBalance(): Balance {
  return {
    ships: Object.fromEntries(SHIP_ORDER.map(id => [id, Object.fromEntries(SHIP_FIELDS.map(f => [f.key, SHIPS[id][f.key]]))])) as Balance["ships"],
    abilities: structuredClone(GAME.ability), prep: GAME.energy.prep,
  };
}
export const DEFAULT_BALANCE = currentBalance();
export const BALANCE_KEY = "arena-space-balance-v1";
export function validateBalance(b: Balance): string | null {
  for (const id of SHIP_ORDER) {
    for (const [values, fields] of [[b.ships?.[id], SHIP_FIELDS], [b.abilities?.[id], ABILITY_FIELDS[id]]] as const) {
      for (const f of fields) {
        const v = values?.[f.key as keyof typeof values];
        const scale = "scale" in f ? f.scale ?? 1 : 1;
        if (typeof v !== "number" || !Number.isFinite(v) || v * scale < f.min - 1e-8 || v * scale > f.max + 1e-8) return `${SHIPS[id].name}: ${f.label} deve ficar entre ${f.min} e ${f.max}.`;
      }
    }
  }
  if (!Number.isFinite(b.prep) || b.prep < 0 || b.prep > 30) return "Preparação deve ficar entre 0 e 30 segundos.";
  if ((b.abilities.purple["pullTime"] ?? 0) > (b.abilities.purple["duration"] ?? 0)) return "Roxa: o tempo de atração não pode superar a duração do buraco negro.";
  return null;
}
export function applyBalance(b: Balance) {
  const error = validateBalance(b);
  if (error) throw new Error(error);
  for (const id of SHIP_ORDER) {
    for (const field of SHIP_FIELDS) SHIPS[id][field.key] = b.ships[id][field.key];
    // Keep object identities: simulation modules retain references to these values.
    for (const field of ABILITY_FIELDS[id]) Object.assign(GAME.ability[id], { [field.key]: b.abilities[id][field.key] });
  }
  GAME.energy.prep = b.prep;
  const a = GAME.ability;
  SHIPS.blue.abilityDesc = `${a.blue.duration}s: duas balas de ${SHIPS.blue.damage} de dano a cada ${a.blue.interval}s.`;
  SHIPS.green.abilityDesc = `Até ${a.green.duration}s: reduz ${Math.round(a.green.reduction * 100)}% do dano. Ao encostar quebra e causa ${a.green.contactDamage}.`;
  SHIPS.red.abilityDesc = `${a.red.duration}s: laser de ${a.red.damage} de dano a cada ${a.red.hitInterval}s por alvo.`;
  SHIPS.yellow.abilityDesc = `Raio de ${Math.round(a.yellow.radiusFrac * 100)}% da arena: ${a.yellow.damage} de dano, velocidade a ${Math.round(a.yellow.slowFactor * 100)}% por ${a.yellow.slowDuration}s.`;
  SHIPS.purple.abilityDesc = `${a.purple.duration}s: atrai por ${a.purple.pullTime}s (${a.purple.damage} de dano) e repele por ${Math.round((a.purple.duration - a.purple.pullTime) * 100) / 100}s.`;
}
export function loadBalance() {
  try {
    const raw = localStorage.getItem(BALANCE_KEY);
    if (raw) applyBalance(JSON.parse(raw));
  } catch { applyBalance(structuredClone(DEFAULT_BALANCE)); }
}
export function saveBalance(b: Balance) {
  const error = validateBalance(b);
  if (error) throw new Error(error);
  localStorage.setItem(BALANCE_KEY, JSON.stringify(b));
  applyBalance(b);
}