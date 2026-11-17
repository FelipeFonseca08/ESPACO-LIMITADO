// Configurações persistidas em localStorage.
export type DirKey = "up" | "down" | "left" | "right";
export type KeyMap = Record<DirKey, string>;
export interface Settings {
  keys: KeyMap[]; pads: (number | null)[];
  sfx: boolean; volume: number; quality: "low" | "high"; uiScale: number;
}
export const DEFAULT_KEYS: KeyMap[] = [
  { up: "KeyW", left: "KeyA", down: "KeyS", right: "KeyD" },
  { up: "KeyY", left: "KeyG", down: "KeyH", right: "KeyJ" },
  { up: "ArrowUp", left: "ArrowLeft", down: "ArrowDown", right: "ArrowRight" },
  { up: "Numpad5", left: "Numpad1", down: "Numpad2", right: "Numpad3" },
];
export const DEFAULT_SETTINGS: Settings = {
  keys: DEFAULT_KEYS, pads: [0, 1, 2, 3], sfx: true, volume: 0.6, quality: "high", uiScale: 1,
};
const KEY = "arena-space-settings";
export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (s) return { ...DEFAULT_SETTINGS, ...s };
  } catch { /* ignore */ }
  return structuredClone(DEFAULT_SETTINGS);
}
export function saveSettings(s: Settings) { localStorage.setItem(KEY, JSON.stringify(s)); }
export const keyLabel = (code: string) =>
  code.replace(/^Key/, "").replace(/^Digit/, "").replace(/^Numpad/, "Num ").replace("ArrowUp", "↑").replace("ArrowDown", "↓").replace("ArrowLeft", "←").replace("ArrowRight", "→");
