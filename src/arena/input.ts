// PlayerController + GamepadManager: teclado e controles combinados.
import type { Settings } from "./settings";

const down = new Set<string>();
let installed = false;
export function installKeyboard() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("keydown", (e) => { down.add(e.code); });
  window.addEventListener("keyup", (e) => { down.delete(e.code); });
  window.addEventListener("blur", () => down.clear());
}
export const isKey = (code: string) => down.has(code);

export function getPads(): (Gamepad | null)[] {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return [];
  return Array.from(navigator.getGamepads());
}
const DZ = 0.35;
export function padDir(p: Gamepad | null | undefined) {
  if (!p) return { x: 0, y: 0 };
  let x = p.axes[0] ?? 0, y = p.axes[1] ?? 0;
  if (Math.abs(x) < DZ) x = 0; if (Math.abs(y) < DZ) y = 0;
  const b = (i: number) => !!p.buttons[i]?.pressed;
  if (b(12)) y = -1; if (b(13)) y = 1; if (b(14)) x = -1; if (b(15)) x = 1;
  return { x: Math.sign(x), y: Math.sign(y) };
}

/** Direção do jogador (0..3) combinando teclado e o controle atribuído. */
export function playerDir(slot: number, s: Settings) {
  const k = s.keys[slot]!;
  let x = (isKey(k.right) ? 1 : 0) - (isKey(k.left) ? 1 : 0);
  let y = (isKey(k.down) ? 1 : 0) - (isKey(k.up) ? 1 : 0);
  const pi = s.pads[slot];
  if (pi != null) { const d = padDir(getPads()[pi]); if (d.x) x = d.x; if (d.y) y = d.y; }
  return { x, y };
}
export const playerUp = (slot: number, s: Settings) => playerDir(slot, s).y < 0;
