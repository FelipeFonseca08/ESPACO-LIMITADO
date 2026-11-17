import { describe, expect, it } from "vitest";
import { GAME } from "@/arena/config";
import { envLaserInterval, pickNextZone } from "@/arena/rules";

const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]!; };
const N = GAME.arena;

describe("mapa aleatório", () => {
  it("a próxima zona fica dentro da arena e encosta na zona atual", () => {
    const cur = { x: 300, y: 300, w: 400, h: 400 };
    for (let k = 0; k < 200; k++) {
      const n = pickNextZone(cur, N);
      expect(n.x).toBeGreaterThanOrEqual(0); expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.x + n.w).toBeLessThanOrEqual(N); expect(n.y + n.h).toBeLessThanOrEqual(N);
      expect(n.x < cur.x + cur.w && n.x + n.w > cur.x).toBe(true);
      expect(n.y < cur.y + cur.h && n.y + n.h > cur.y).toBe(true);
    }
  });

  it("a zona encolhe até o tamanho mínimo e depois continua mudando de lugar", () => {
    expect(pickNextZone({ x: 0, y: 0, w: N, h: N }, N, seq([0.5])).w).toBeLessThan(N);
    const a = pickNextZone({ x: 400, y: 400, w: 220, h: 220 }, N, seq([0, 0, 0]));
    const b = pickNextZone({ x: 400, y: 400, w: 220, h: 220 }, N, seq([1, 1, 1]));
    expect(a.w).toBe(220); expect(b.w).toBe(220);
    expect(a.x).not.toBe(b.x);
  });

  it("lasers começam a cada 5s e aceleram até 1,4s", () => {
    expect(envLaserInterval(0)).toBe(5);
    expect(envLaserInterval(20)).toBeCloseTo(3);
    expect(envLaserInterval(500)).toBe(1.4);
  });
});
