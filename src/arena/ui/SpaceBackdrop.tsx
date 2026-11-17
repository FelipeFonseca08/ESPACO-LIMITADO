import { useEffect, useRef } from "react";

/** Quiet starfield behind menus; gameplay keeps its own renderer. */
export function SpaceBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const paint = () => {
      const width = window.innerWidth, height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const color = getComputedStyle(canvas).getPropertyValue("--star-color").trim();
      ctx.fillStyle = color;
      for (let i = 0; i < 160; i++) {
        const x = ((i * 7919 + 37) % 10007) / 10007 * width;
        const y = ((i * 3571 + 71) % 10009) / 10009 * height;
        ctx.globalAlpha = 0.12 + (i % 5) * 0.1;
        const size = i % 9 === 0 ? 2 : 1;
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalAlpha = 1;
    };
    paint(); window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, []);
  return <canvas ref={ref} className="space-backdrop" aria-hidden="true" />;
}