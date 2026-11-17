import { useEffect, useRef } from "react";
import { SHIPS, type ShipId } from "../config";
import { drawShipShape } from "../render";
import { getPads, padDir } from "../input";
import { sfx } from "../audio";

export function ShipPreview({ id, size = 90 }: { id: ShipId; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    let raf = 0; const t0 = performance.now();
    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1; c.width = size * dpr; c.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, size / 2, size / 2); ctx.clearRect(-size, -size, size * 2, size * 2);
      ctx.rotate(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : Math.sin((now - t0) / 900) * 0.25);
      drawShipShape(ctx, id, size * 0.45 * (SHIPS[id].size / 30), SHIPS[id].color);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [id, size]);
  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size }} aria-label={`Nave ${SHIPS[id].name}`} role="img" />;
}

export function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-secondary"><div className="h-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} /></div>
    </div>
  );
}

/** MenuSystem: navegação por controle (direcional move foco, A confirma, B volta). */
export function useMenuPad(onBack?: () => void, active = true) {
  const back = useRef(onBack); back.current = onBack;
  useEffect(() => {
    if (!active) return;
    let raf = 0; const prev: Record<string, boolean> = {};
    const edge = (k: string, v: boolean) => { const r = v && !prev[k]; prev[k] = v; return r; };
    const loop = () => {
      getPads().forEach((p, i) => {
        if (!p) return;
        const d = padDir(p);
        const move = edge(`m${i}d`, d.y > 0 || d.x > 0) ? 1 : edge(`m${i}u`, d.y < 0 || d.x < 0) ? -1 : 0;
        if (move) {
          const els = Array.from(document.querySelectorAll<HTMLElement>("[data-nav]:not([disabled])"));
          if (els.length) { const idx = els.indexOf(document.activeElement as HTMLElement); els[(idx + move + els.length) % els.length]!.focus(); sfx("ui"); }
        }
        if (edge(`a${i}`, !!p.buttons[0]?.pressed)) { (document.activeElement as HTMLElement | null)?.click(); }
        if (edge(`b${i}`, !!p.buttons[1]?.pressed)) back.current?.();
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [active]);
}

export function useGamepadList() {
  const [, force] = useReducerTick();
  useEffect(() => {
    const f = () => force();
    window.addEventListener("gamepadconnected", f); window.addEventListener("gamepaddisconnected", f);
    const iv = window.setInterval(f, 1000);
    return () => { window.removeEventListener("gamepadconnected", f); window.removeEventListener("gamepaddisconnected", f); clearInterval(iv); };
  }, [force]);
  return getPads().filter((p): p is Gamepad => !!p);
}
import { useReducer } from "react";
function useReducerTick() { return useReducer((x: number) => x + 1, 0); }
