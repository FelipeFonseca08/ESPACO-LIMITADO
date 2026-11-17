// ARENA SPACE — arquivo único de balanceamento e configuração.
export type ShipId = "blue" | "green" | "red" | "yellow" | "purple";
export type Mode = "ffa" | "teams" | "training";

export interface ShipStats {
  id: ShipId; name: string; color: string;
  hp: number; damage: number; bullet: number; rate: number; size: number; speed: number;
  abilityName: string; abilityDesc: string;
}

export const SHIPS: Record<ShipId, ShipStats> = {
  blue:   { id: "blue",   name: "Azul",     color: "#2583FF", hp: 200, damage: 15, bullet: 10, rate: 1,   size: 30, speed: 1.0,  abilityName: "Tiro Duplo",   abilityDesc: "5s: duas balas lado a lado a cada 0,5s (4 projéteis/s)." },
  green:  { id: "green",  name: "Verde",    color: "#35D46A", hp: 260, damage: 18, bullet: 13, rate: 0.8, size: 38, speed: 0.8,  abilityName: "Escudo",       abilityDesc: "Até 5s: -80% de dano. Ao encostar num adversário quebra e causa 30." },
  red:    { id: "red",    name: "Vermelha", color: "#FF4545", hp: 200, damage: 22, bullet: 10, rate: 0.7, size: 30, speed: 1.0,  abilityName: "Laser",        abilityDesc: "5s: feixe fixo que atravessa a arena. 20 de dano por contato." },
  yellow: { id: "yellow", name: "Amarela",  color: "#FFD43B", hp: 160, damage: 10, bullet: 7,  rate: 1.5, size: 23, speed: 1.25, abilityName: "PEM",          abilityDesc: "Onda de 40% da arena: 15 de dano e lentidão por 5s." },
  purple: { id: "purple", name: "Roxa",     color: "#A855F7", hp: 200, damage: 15, bullet: 10, rate: 1.3, size: 30, speed: 0.85, abilityName: "Buraco Negro", abilityDesc: "5s: atrai por 3s (15 de dano) e repele nos 2s finais." },
};
export const SHIP_ORDER: ShipId[] = ["blue", "green", "red", "yellow", "purple"];

export const GAME = {
  arena: 1000,            // unidades lógicas (arena quadrada)
  baseSpeed: 240,         // unidades/s com velocidade 100%
  bulletSpeed: 620,
  maxBullets: 300,
  energy: { prep: 2, orbs: 1, radius: 14 },
  ability: {
    blue:   { duration: 5, interval: 0.5, spacing: 9 },
    green:  { duration: 5, reduction: 0.8, contactDamage: 30 },
    red:    { duration: 5, damage: 20, hitInterval: 0.5, width: 16 },
    yellow: { radiusFrac: 0.4, damage: 15, slowDuration: 5, slowFactor: 0.5, waveTime: 0.7 },
    purple: { duration: 5, pullTime: 3, damage: 15, radius: 330, pull: 330, push: 520 },
  },
  // Zona: intervalos/tempos sorteados entre [mín, máx] a cada mudança.
  zone: { tickInterval: 1, baseDamage: 5, stepDamage: 5, stepSeconds: 10, firstShrinkAt: 3, warn: 1.5,
    interval: [4, 8] as [number, number], moveTime: [2, 3.5] as [number, number], shrinkFactor: [0.7, 0.88] as [number, number], minSize: 220 },
  // Lasers: intervalo base cai com o tempo; jitter = variação aleatória (±40%).
  envLaser: { damage: 30, warn: 1.2, fire: 0.5, width: 14, firstAt: 3, startInterval: 5, minInterval: 1.4, rampPerSecond: 0.1, jitter: 0.4,
    patterns: ["single", "single", "parallel", "cross", "fan", "x"] as const, parallelGap: 120, fanSpread: 0.45 },
  fx: { maxParticles: { low: 150, high: 600 } },
  endDelay: 1.6,
};

export const TEAM_NAMES = ["ALFA", "BETA"];
export const TEAM_COLORS = ["#E6F0FF", "#FF9F43"];
