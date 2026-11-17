// AudioManager: efeitos sonoros sintetizados (sem música).
type Sfx = "shoot" | "hit" | "explode" | "pickup" | "ability" | "warn" | "laser" | "zone" | "ui";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true, volume = 0.6;
const last: Partial<Record<Sfx, number>> = {};

export function configureAudio(on: boolean, vol: number) {
  enabled = on; volume = vol; if (master) master.gain.value = vol;
}
function ac() {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C(); master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
function tone(type: OscillatorType, f0: number, f1: number, dur: number, g: number) {
  const c = ac(), o = c.createOscillator(), gn = c.createGain(), t = c.currentTime;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(master!); o.start(t); o.stop(t + dur);
}
function noise(dur: number, g: number, freq: number) {
  const c = ac(), len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
  s.buffer = buf; f.type = "lowpass"; f.frequency.value = freq; gn.gain.value = g;
  s.connect(f); f.connect(gn); gn.connect(master!); s.start();
}
export function sfx(name: Sfx) {
  if (!enabled || typeof window === "undefined") return;
  const now = performance.now();
  const gap = name === "shoot" ? 40 : name === "hit" ? 50 : 20;
  if (now - (last[name] ?? 0) < gap) return; last[name] = now;
  try {
    switch (name) {
      case "shoot": tone("square", 880, 440, 0.07, 0.04); break;
      case "hit": tone("triangle", 300, 120, 0.1, 0.12); break;
      case "explode": noise(0.6, 0.5, 900); tone("sawtooth", 160, 40, 0.5, 0.15); break;
      case "pickup": tone("sine", 600, 1400, 0.18, 0.15); break;
      case "ability": tone("sawtooth", 200, 900, 0.35, 0.12); break;
      case "warn": tone("square", 1200, 1200, 0.08, 0.05); break;
      case "laser": noise(0.4, 0.25, 3000); tone("sawtooth", 90, 60, 0.4, 0.1); break;
      case "zone": tone("sine", 140, 100, 0.12, 0.08); break;
      case "ui": tone("sine", 700, 900, 0.06, 0.06); break;
    }
  } catch { /* audio indisponível */ }
}
