import { afterEach, describe, expect, it } from "vitest";
import { applyBalance, BALANCE_KEY, DEFAULT_BALANCE, loadBalance, saveBalance, validateBalance } from "@/arena/balance";
import { GAME, SHIPS, SHIP_ORDER } from "@/arena/config";
import { createWorld } from "@/arena/engine";
import { activate, fire, updateEnergy } from "@/arena/abilities";
import { configureAudio } from "@/arena/audio";
import { shieldedDamage } from "@/arena/rules";

configureAudio(false, 0);
afterEach(() => { applyBalance(structuredClone(DEFAULT_BALANCE)); localStorage.removeItem(BALANCE_KEY); });
describe("balanceamento editável", () => {
  it("aplica vida, dano, projétil, cadência, tamanho e velocidade de todas as naves", () => {
    const b = structuredClone(DEFAULT_BALANCE);
    for (const id of SHIP_ORDER) b.ships[id] = { hp: 350, damage: 33, bullet: 18, rate: 2, size: 40, speed: 1.5 };
    applyBalance(b);
    for (const id of SHIP_ORDER) {
      const w = createWorld("training", [{ slot: 0, team: 0, ship: id }], false);
      const s = w.ships[0];
      if (!s) throw new Error("Nave ausente");
      expect(s.hp).toBe(350); expect(s.stats.speed).toBe(1.5); expect(s.stats.size).toBe(40);
      s.fireCd = 0; fire(w, s, 0);
      expect(w.bullets[0]?.dmg).toBe(33); expect(w.bullets[0]?.r).toBe(9); expect(s.fireCd).toBe(0.5);
    }
  });
  it("aplica duração, cadência especial e preparação ao tiro duplo", () => {
    const b = structuredClone(DEFAULT_BALANCE);
    b.prep = 1; b.abilities.blue["duration"] = 8; b.abilities.blue["interval"] = 0.25;
    applyBalance(b);
    const w = createWorld("training", [{ slot: 0, team: 0, ship: "blue" }], false);
    const s = w.ships[0]; if (!s) throw new Error("Nave ausente");
    s.energy = true; s.prep = GAME.energy.prep;
    updateEnergy(w, s, 0.5); expect(s.ability).toBeNull();
    updateEnergy(w, s, 0.5); expect(s.ability?.left).toBe(8);
    fire(w, s, 0); expect(w.bullets.length).toBe(2); expect(s.fireCd).toBe(0.25);
  });
  it("aplica a redução de dano ajustada do escudo", () => {
    const b = structuredClone(DEFAULT_BALANCE); b.abilities.green["reduction"] = 0.5;
    applyBalance(b); expect(shieldedDamage(40, true)).toBe(20);
  });
  it("usa os ajustes do laser, PEM e buraco negro na ativação", () => {
    const b = structuredClone(DEFAULT_BALANCE);
    b.abilities.red["duration"] = 9; b.abilities.yellow["radiusFrac"] = 0.2;
    b.abilities.yellow["damage"] = 45; b.abilities.purple["duration"] = 7;
    applyBalance(b);
    const w = createWorld("ffa", [{ slot: 0, team: 0, ship: "yellow" }, { slot: 1, team: 1, ship: "red" }, { slot: 2, team: 2, ship: "purple" }], false);
    const [yellow, red, purple] = w.ships; if (!yellow || !red || !purple) throw new Error("Naves ausentes");
    yellow.x = 500; yellow.y = 500; red.x = 550; red.y = 500;
    activate(w, yellow); expect(w.waves[0]?.radius).toBe(200); expect(red.hp).toBe(155);
    activate(w, red); expect(w.beams[0]?.left).toBe(9);
    activate(w, purple); expect(purple.ability?.dur).toBe(7);
  });
  it("salva no navegador, carrega novamente e restaura o padrão", () => {
    const b = structuredClone(DEFAULT_BALANCE); b.ships.blue.hp = 321;
    saveBalance(b); applyBalance(structuredClone(DEFAULT_BALANCE)); loadBalance();
    expect(SHIPS.blue.hp).toBe(321);
    saveBalance(structuredClone(DEFAULT_BALANCE)); expect(SHIPS.blue.hp).toBe(200);
  });
  it("rejeita valores inválidos e atração maior que a duração", () => {
    const b = structuredClone(DEFAULT_BALANCE); b.ships.blue.rate = 0;
    expect(validateBalance(b)).not.toBeNull(); expect(() => applyBalance(b)).toThrow();
    b.ships.blue.rate = 1; b.abilities.purple["pullTime"] = 6;
    expect(validateBalance(b)).not.toBeNull();
  });
});