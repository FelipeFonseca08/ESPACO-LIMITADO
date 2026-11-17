import { useEffect, useMemo, useRef, useState } from "react";
import { SHIPS, SHIP_ORDER, TEAM_COLORS, TEAM_NAMES, type Mode, type ShipId } from "../config";
import { createEngine, type MatchResult, type Participant } from "../engine";
import { installKeyboard, playerUp } from "../input";
import { DEFAULT_SETTINGS, keyLabel, loadSettings, saveSettings, type DirKey, type Settings } from "../settings";
import { configureAudio, sfx } from "../audio";
import { loadSession, saveSession, type Session } from "../session";
import { ShipPreview, StatBar, useGamepadList, useMenuPad } from "./widgets";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Crosshair, Gamepad2, BarChart3, Trophy, Settings2, Zap, ChevronRight, Orbit, SlidersHorizontal } from "lucide-react";
import { SpaceBackdrop } from "./SpaceBackdrop";
import { BalanceScreen } from "./BalanceScreen";
import { loadBalance } from "../balance";

function ArenaButton(props: ButtonProps) {
  return <Button variant="arena" size="arena" {...props} />;
}

type Screen = "menu" | "setup" | "confirm" | "game" | "results" | "stats" | "ranking" | "settings" | "training" | "balance";
interface Comp { mode: Mode; target: number; parts: Participant[]; scores: Record<number, number>; dmg: Record<number, number>; kills: Record<number, number>; champion: number[] | null; last: MatchResult | null }

export function ArenaApp() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<Session>({ ships: {}, players: {}, competitions: [] });
  const [comp, setComp] = useState<Comp | null>(null);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => { loadBalance(); installKeyboard(); setSettings(loadSettings()); setSession(loadSession()); }, []);
  useEffect(() => { configureAudio(settings.sfx, settings.volume); }, [settings]);
  const updSettings = (s: Settings) => { setSettings(s); saveSettings(s); };
  const go = (s: Screen) => { sfx("ui"); setScreen(s); };

  const onEnd = (r: MatchResult) => {
    if (!comp) return;
    const c = { ...comp, scores: { ...comp.scores }, dmg: { ...comp.dmg }, kills: { ...comp.kills }, last: r };
    for (const p of r.players) { c.dmg[p.slot] = (c.dmg[p.slot] ?? 0) + p.damage; c.kills[p.slot] = (c.kills[p.slot] ?? 0) + p.kills; }
    if (!r.draw) for (const s of r.winners) c.scores[s] = (c.scores[s] ?? 0) + 1;
    const champs = c.parts.filter((p) => (c.scores[p.slot] ?? 0) >= c.target).map((p) => p.slot);
    if (champs.length) c.champion = champs;
    // sessão
    const ses: Session = structuredClone(session);
    for (const p of r.players) {
      const st = (ses.ships[p.ship] ??= { matches: 0, wins: 0, damage: 0, kills: 0 });
      st.matches++; st.damage += p.damage; st.kills += p.kills; if (r.winners.includes(p.slot)) st.wins++;
      const pl = (ses.players[p.slot] ??= { wins: 0, titles: 0, damage: 0, kills: 0 });
      pl.damage += p.damage; pl.kills += p.kills; if (r.winners.includes(p.slot)) pl.wins++;
    }
    if (champs.length) {
      for (const s of champs) ses.players[s]!.titles++;
      ses.competitions.unshift({ date: new Date().toLocaleTimeString("pt-BR"), mode: c.mode === "teams" ? "Equipes 2x2" : "Todos contra todos",
        champion: c.mode === "teams" ? `Equipe ${TEAM_NAMES[c.parts.find((p) => p.slot === champs[0])!.team]}` : `P${champs[0]! + 1}` });
    }
    setSession(ses); saveSession(ses); setComp(c); setScreen("results");
  };

  return (
    <main className="arena-root" style={{ fontSize: `${settings.uiScale}rem` }}>
      {screen !== "game" && <SpaceBackdrop />}
      {screen === "menu" && <MainMenu go={go} />}
      {screen === "setup" && <Setup onBack={() => go("menu")} onDone={(c) => { setComp(c); go("confirm"); }} />}
      {screen === "confirm" && comp && <Confirm comp={comp} settings={settings} onBack={() => go("setup")} onStart={() => { setGameKey((k) => k + 1); go("game"); }} />}
      {screen === "game" && comp && <GameView key={gameKey} mode={comp.mode} parts={comp.parts} settings={settings} onEnd={onEnd} onQuit={() => go("menu")} />}
      {screen === "results" && comp?.last && <Results comp={comp} settings={settings} onNext={() => { setComp({ ...comp, last: null }); setGameKey((k) => k + 1); setScreen("game"); }}
        onNewComp={() => { setComp({ ...comp, scores: {}, dmg: {}, kills: {}, champion: null, last: null }); setGameKey((k) => k + 1); setScreen("game"); }} onMenu={() => go("menu")} />}
      {screen === "training" && <Training settings={settings} onBack={() => go("menu")} />}
      {screen === "stats" && <Stats session={session} onBack={() => go("menu")} />}
      {screen === "ranking" && <Ranking session={session} onBack={() => go("menu")} />}
      {screen === "settings" && <SettingsScreen settings={settings} onChange={updSettings} onBack={() => go("menu")} />}
      {screen === "balance" && <BalanceScreen onBack={() => go("menu")} />}
    </main>
  );
}

function Panel({ title, onBack, children }: { title: string; onBack?: () => void; children: React.ReactNode }) {
  useMenuPad(onBack);
  return (
    <div className="arena-panel">
      <header className="panel-header">
        <div><div className="panel-brand"><Orbit size={16} /> ARENA SPACE</div><h2 className="arena-title text-3xl">{title}</h2></div>
        {onBack && <ArenaButton data-nav className="arena-btn ghost" onClick={onBack}><ArrowLeft /> Voltar</ArenaButton>}
      </header>
      {children}
    </div>
  );
}

function MainMenu({ go }: { go: (s: Screen) => void }) {
  useMenuPad();
  const items = [
    { label: "Treinamento", screen: "training" as const, icon: Crosshair },
    { label: "Estatísticas", screen: "stats" as const, icon: BarChart3 },
    { label: "Ranking", screen: "ranking" as const, icon: Trophy },
    { label: "Configurações", screen: "settings" as const, icon: Settings2 },
    { label: "Balanceamento", screen: "balance" as const, icon: SlidersHorizontal },
  ];
  return (
    <div className="arena-home">
      <header className="home-header"><span className="panel-brand"><Orbit size={19} /> ARENA SPACE</span><span className="local-status"><span /> MULTIPLAYER LOCAL</span></header>
      <section className="home-content">
        <div className="home-eyebrow"><Gamepad2 size={16} /> 2–4 JOGADORES · UMA ARENA</div>
        <h1 className="arena-logo">ARENA<span>SPACE</span></h1>
        <div className="home-fleet" aria-label="Frota de naves">
          {SHIP_ORDER.map((id, i) => <div key={id} className={`fleet-ship ship-${id}`}><span className="fleet-index">0{i + 1}</span><ShipPreview id={id} size={100} /><span className="fleet-name">{SHIPS[id].name}</span></div>)}
        </div>
        <nav className="home-nav" aria-label="Menu principal">
          <ArenaButton data-nav autoFocus className="play-button" onClick={() => go("setup")}><Zap /><span>Jogar</span><ArrowRight /></ArenaButton>
          <div className="secondary-nav">{items.map(({label, screen, icon: Icon}) => <ArenaButton key={screen} data-nav className="menu-action" onClick={() => go(screen)}><Icon /><span>{label}</span><ChevronRight /></ArenaButton>)}</div>
        </nav>
      </section>
      <footer className="home-footer"><span><Gamepad2 size={16} /> TECLADO & CONTROLES</span><span>5 NAVES <span className="footer-divider">/</span> 5 HABILIDADES</span></footer>
    </div>
  );
}

function ShipPicker({ value, taken, onPick }: { value: ShipId; taken: ShipId[]; onPick: (s: ShipId) => void }) {
  const s = SHIPS[value];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {SHIP_ORDER.map((id) => (
          <ArenaButton key={id} data-nav disabled={taken.includes(id) && id !== value} onClick={() => onPick(id)}
            aria-pressed={id === value} className={`ship-chip ship-${id} ${id === value ? "on" : ""}`}>{SHIPS[id].name}</ArenaButton>
        ))}
      </div>
      <div className="flex items-center gap-3"><ShipPreview id={value} size={80} />
        <div className="flex-1 space-y-1">
          <StatBar label={`Vida ${s.hp}`} value={s.hp} max={260} color={s.color} />
          <StatBar label={`Dano ${s.damage}`} value={s.damage} max={22} color={s.color} />
          <StatBar label={`Bala ${s.bullet}`} value={s.bullet} max={13} color={s.color} />
          <StatBar label={`Cad. ${s.rate}/s`} value={s.rate} max={1.5} color={s.color} />
          <StatBar label={`Tam. ${s.size}`} value={s.size} max={38} color={s.color} />
          <StatBar label={`Vel. ${Math.round(s.speed * 100)}%`} value={s.speed} max={1.25} color={s.color} />
        </div>
      </div>
      <p className="text-xs"><strong style={{ color: s.color }}>{s.abilityName}:</strong> <span className="text-muted-foreground">{s.abilityDesc}</span></p>
    </div>
  );
}

function Setup({ onBack, onDone }: { onBack: () => void; onDone: (c: Comp) => void }) {
  const [count, setCount] = useState(2);
  const [mode, setMode] = useState<Mode>("ffa");
  const [target, setTarget] = useState(3);
  const [ships, setShips] = useState<ShipId[]>(["blue", "green", "red", "yellow"]);
  const n = mode === "teams" ? 4 : count;
  const pick = (i: number, id: ShipId) => setShips((s) => s.map((x, j) => (j === i ? id : x)));
  const valid = new Set(ships.slice(0, n)).size === n;
  return (
    <Panel title="Configurar partida" onBack={onBack}>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Modo de jogo">{([["ffa", "Todos contra todos"], ["teams", "Equipes 2x2"]] as const).map(([m, l]) => <ArenaButton key={m} data-nav className={`opt ${mode === m ? "on" : ""}`} onClick={() => setMode(m)}>{l}</ArenaButton>)}</Field>
        <Field label="Participantes">{[2, 3, 4].map((c) => <ArenaButton key={c} data-nav disabled={mode === "teams" && c !== 4} className={`opt ${n === c ? "on" : ""}`} onClick={() => setCount(c)}>{c}</ArenaButton>)}</Field>
        <Field label="Pontos para vencer">{[1, 3, 5, 7, 10].map((t) => <ArenaButton key={t} data-nav className={`opt ${target === t ? "on" : ""}`} onClick={() => setTarget(t)}>{t}</ArenaButton>)}</Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className={`arena-card player-card ship-${ships[i]}`}>
            <div className="player-heading"><span className="player-number">P{i + 1}</span><span>JOGADOR {i + 1}</span>
              {mode === "teams" && <span style={{ color: TEAM_COLORS[i < 2 ? 0 : 1] }}>EQUIPE {TEAM_NAMES[i < 2 ? 0 : 1]}</span>}</div>
            <ShipPicker value={ships[i]!} taken={ships.slice(0, n)} onPick={(id) => pick(i, id)} />
          </div>
        ))}
      </div>
      <ArenaButton data-nav disabled={!valid} className="arena-btn self-end" onClick={() => onDone({ mode, target, scores: {}, dmg: {}, kills: {}, champion: null, last: null,
        parts: Array.from({ length: n }, (_, i) => ({ slot: i, ship: ships[i]!, team: mode === "teams" ? (i < 2 ? 0 : 1) : i })) })}>Continuar <ArrowRight /></ArenaButton>
    </Panel>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="arena-field"><div className="mb-2 text-xs tracking-widest text-muted-foreground">{label.toUpperCase()}</div><div className="flex flex-wrap gap-2">{children}</div></div>;
}

function ctrlText(slot: number, s: Settings) {
  const k = s.keys[slot]!; const pad = s.pads[slot];
  return `${keyLabel(k.up)} ${keyLabel(k.left)} ${keyLabel(k.down)} ${keyLabel(k.right)}${pad != null ? ` · Controle ${pad + 1}` : ""}`;
}

function Confirm({ comp, settings, onBack, onStart }: { comp: Comp; settings: Settings; onBack: () => void; onStart: () => void }) {
  return (
    <Panel title="Confirmar partida" onBack={onBack}>
      <div className="match-summary text-sm">Modo: <b>{comp.mode === "teams" ? "Equipes 2x2" : "Todos contra todos"}</b> · Pontos para vencer: <b>{comp.target}</b></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {comp.parts.map((p) => (
          <div key={p.slot} className="arena-card flex flex-col items-center gap-1 text-center" style={{ borderColor: SHIPS[p.ship].color }}>
            <b>P{p.slot + 1}</b><ShipPreview id={p.ship} size={70} />
            <span style={{ color: SHIPS[p.ship].color }}>{SHIPS[p.ship].name} · {SHIPS[p.ship].abilityName}</span>
            {comp.mode === "teams" && <span className="text-xs" style={{ color: TEAM_COLORS[p.team] }}>Equipe {TEAM_NAMES[p.team]}</span>}
            <span className="text-xs text-muted-foreground">{ctrlText(p.slot, settings)}</span>
          </div>
        ))}
      </div>
      
      <ArenaButton data-nav autoFocus className="arena-btn self-center px-16" onClick={onStart}>INICIAR</ArenaButton>
    </Panel>
  );
}

function GameView({ mode, parts, settings, onEnd, onQuit }: { mode: Mode; parts: Participant[]; settings: Settings; onEnd: (r: MatchResult) => void; onQuit: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const end = useRef(onEnd); end.current = onEnd;
  useEffect(() => {
    const eng = createEngine(ref.current!, mode, parts, settings, (r) => end.current(r));
    const k = (e: KeyboardEvent) => { if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault(); if (e.code === "Escape") onQuit(); };
    window.addEventListener("keydown", k);
    return () => { eng.destroy(); window.removeEventListener("keydown", k); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <canvas ref={ref} className="fixed inset-0 h-screen w-screen" />;
}

function Training({ settings, onBack }: { settings: Settings; onBack: () => void }) {
  const [ship, setShip] = useState<ShipId | null>(null);
  if (ship) return <GameView mode="training" parts={[{ slot: 0, ship, team: 0 }]} settings={settings} onEnd={() => {}} onQuit={() => setShip(null)} />;
  return (
    <Panel title="Treinamento" onBack={onBack}>
      <div className="section-label"><Crosshair size={18} /> Escolha sua nave</div>
      <div className="training-grid">
        {SHIP_ORDER.map((id) => <ArenaButton key={id} data-nav className={`arena-card training-ship ship-${id} flex flex-col items-center gap-2`} onClick={() => setShip(id)}><ShipPreview id={id} size={70} /><b style={{ color: SHIPS[id].color }}>{SHIPS[id].name}</b><span className="text-xs text-muted-foreground">{SHIPS[id].abilityName}</span></ArenaButton>)}
      </div>
    </Panel>
  );
}

function Results({ comp, settings, onNext, onNewComp, onMenu }: { comp: Comp; settings: Settings; onNext: () => void; onNewComp: () => void; onMenu: () => void }) {
  const r = comp.last!;
  const [ok, setOk] = useState<number[]>([]);
  const order = useMemo(() => [...r.players].sort((a, b) => Number(r.winners.includes(b.slot)) - Number(r.winners.includes(a.slot)) || (b.deathT < 0 ? 1e9 : b.deathT) - (a.deathT < 0 ? 1e9 : a.deathT) || b.damage - a.damage), [r]);
  useMenuPad(undefined, !!comp.champion);
  useEffect(() => {
    if (comp.champion) return;
    let raf = 0; const prev: Record<number, boolean> = {}; const t0 = performance.now(); const done = new Set<number>();
    const loop = () => {
      for (const p of comp.parts) {
        const up = playerUp(p.slot, settings);
        if (performance.now() - t0 > 700 && up && prev[p.slot] === false && !done.has(p.slot)) { done.add(p.slot); sfx("ui"); setOk([...done]); }
        prev[p.slot] = up;
      }
      if (done.size === comp.parts.length) { onNext(); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const headline = r.draw ? "EMPATE — ninguém pontua" : comp.mode === "teams" ? `EQUIPE ${TEAM_NAMES[r.winnerTeam!]} VENCEU` : `P${r.winners[0]! + 1} VENCEU A PARTIDA`;
  const wColor = r.draw ? "#cbd5ff" : comp.mode === "teams" ? TEAM_COLORS[r.winnerTeam!] : SHIPS[r.players.find((p) => p.slot === r.winners[0])!.ship].color;
  return (
    <div className="arena-panel">
      {comp.champion && <div className="arena-card champion text-center"><div className="text-xs tracking-[0.4em]">CAMPEÃO DA COMPETIÇÃO</div>
        <div className="arena-title text-4xl">{comp.mode === "teams" ? `EQUIPE ${TEAM_NAMES[comp.parts.find((p) => p.slot === comp.champion![0])!.team]}` : `P${comp.champion[0]! + 1}`}</div></div>}
      <h2 className="arena-title text-center text-4xl" style={{ color: wColor, textShadow: `0 0 24px ${wColor}` }}>{headline}</h2>
      {comp.mode === "teams" && <div className="grid grid-cols-2 gap-3">{[0, 1].map((t) => {
        const ps = r.players.filter((p) => p.team === t);
        return <div key={t} className="arena-card text-center" style={{ borderColor: TEAM_COLORS[t] }}><b style={{ color: TEAM_COLORS[t] }}>EQUIPE {TEAM_NAMES[t]}</b>
          <div className="text-sm">Dano {ps.reduce((a, p) => a + p.damage, 0)} · Eliminações {ps.reduce((a, p) => a + p.kills, 0)} · Pontos {comp.scores[ps[0]!.slot] ?? 0}/{comp.target} · {r.winnerTeam === t ? "VENCEU" : r.draw ? "EMPATE" : "DERROTA"}</div></div>;
      })}</div>}
      <div className="table-scroll"><table className="arena-table">
        <thead><tr><th>#</th><th>Jogador</th><th>Dano causado</th><th>Eliminações</th><th>Dano total</th><th>Pontos</th><th>Próxima</th></tr></thead>
        <tbody>{order.map((p, i) => (
          <tr key={p.slot} className={r.winners.includes(p.slot) ? "win" : ""}>
            <td>{i + 1}º</td><td style={{ color: SHIPS[p.ship].color }}><b>P{p.slot + 1}</b> {SHIPS[p.ship].name}{comp.mode === "teams" ? ` · ${TEAM_NAMES[p.team]}` : ""}</td>
            <td>{p.damage}</td><td>{p.kills}</td><td>{comp.dmg[p.slot] ?? 0}</td><td><b>{comp.scores[p.slot] ?? 0}</b>/{comp.target}</td>
            <td>{comp.champion ? "—" : ok.includes(p.slot) ? "✔ pronto" : `↑ ${keyLabel(settings.keys[p.slot]!.up)}`}</td>
          </tr>))}</tbody>
      </table></div>
      {comp.champion ? (
        <div className="flex justify-center gap-3"><ArenaButton data-nav autoFocus className="arena-btn" onClick={onNewComp}>Nova competição</ArenaButton><ArenaButton data-nav className="arena-btn ghost" onClick={onMenu}>Menu principal</ArenaButton></div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Cada jogador confirma pressionando <b>para cima</b> no próprio teclado ou controle. A próxima partida começa quando todos confirmarem ({ok.length}/{comp.parts.length}).
          <ArenaButton className="ml-3 underline" onClick={onMenu}>Sair para o menu</ArenaButton></p>
      )}
    </div>
  );
}

function Stats({ session, onBack }: { session: Session; onBack: () => void }) {
  return (
    <Panel title="Estatísticas da sessão" onBack={onBack}>
      <div className="table-scroll"><table className="arena-table">
        <thead><tr><th>Nave</th><th>Partidas</th><th>Vitórias</th><th>Dano total</th><th>Eliminações</th></tr></thead>
        <tbody>{SHIP_ORDER.map((id) => { const s = session.ships[id]; return (
          <tr key={id}><td style={{ color: SHIPS[id].color }}><b>{SHIPS[id].name}</b></td><td>{s?.matches ?? 0}</td><td>{s?.wins ?? 0}</td><td>{s?.damage ?? 0}</td><td>{s?.kills ?? 0}</td></tr>); })}</tbody>
      </table></div>
    </Panel>
  );
}

function Ranking({ session, onBack }: { session: Session; onBack: () => void }) {
  const rows = Object.entries(session.players).sort((a, b) => b[1].titles - a[1].titles || b[1].wins - a[1].wins || b[1].damage - a[1].damage);
  return (
    <Panel title="Ranking da sessão" onBack={onBack}>
      {rows.length === 0 ? <p className="text-muted-foreground">Nenhum resultado nesta sessão.</p> : (
        <div className="table-scroll"><table className="arena-table"><thead><tr><th>#</th><th>Jogador</th><th>Títulos</th><th>Vitórias</th><th>Dano</th><th>Eliminações</th></tr></thead>
          <tbody>{rows.map(([slot, p], i) => <tr key={slot}><td>{i + 1}º</td><td><b>P{Number(slot) + 1}</b></td><td>{p.titles}</td><td>{p.wins}</td><td>{p.damage}</td><td>{p.kills}</td></tr>)}</tbody></table></div>)}
      {session.competitions.length > 0 && <div className="arena-card text-sm"><b>Competições</b>{session.competitions.map((c, i) => <div key={i} className="text-muted-foreground">{c.date} · {c.mode} · Campeão: {c.champion}</div>)}</div>}
    </Panel>
  );
}

function SettingsScreen({ settings, onChange, onBack }: { settings: Settings; onChange: (s: Settings) => void; onBack: () => void }) {
  const [bind, setBind] = useState<[number, DirKey] | null>(null);
  const pads = useGamepadList();
  useEffect(() => {
    if (!bind) return;
    const h = (e: KeyboardEvent) => { e.preventDefault(); if (e.code !== "Escape") { const keys = settings.keys.map((k) => ({ ...k })); keys[bind[0]]![bind[1]] = e.code; onChange({ ...settings, keys }); } setBind(null); };
    window.addEventListener("keydown", h, { once: true }); return () => window.removeEventListener("keydown", h);
  }, [bind, settings, onChange]);
  const dirs: [DirKey, string][] = [["up", "Cima"], ["left", "Esquerda"], ["down", "Baixo"], ["right", "Direita"]];
  return (
    <Panel title="Configurações" onBack={onBack}>
      <div className="arena-card">
        <div className="mb-3 text-xs tracking-widest text-muted-foreground">CONTROLES (clique e pressione uma tecla · Esc cancela)</div>
        <div className="table-scroll"><table className="arena-table"><thead><tr><th>Jogador</th>{dirs.map(([, l]) => <th key={l}>{l}</th>)}<th>Controle físico</th></tr></thead>
          <tbody>{[0, 1, 2, 3].map((p) => (
            <tr key={p}><td><b>P{p + 1}</b></td>
              {dirs.map(([d]) => <td key={d}><ArenaButton data-nav className="opt" onClick={() => setBind([p, d])}>{bind?.[0] === p && bind[1] === d ? "..." : keyLabel(settings.keys[p]![d])}</ArenaButton></td>)}
              <td><select data-nav className="opt" value={settings.pads[p] ?? ""} onChange={(e) => { const pads2 = [...settings.pads]; pads2[p] = e.target.value === "" ? null : Number(e.target.value); onChange({ ...settings, pads: pads2 }); }}>
                <option value="">Nenhum</option>{[0, 1, 2, 3].map((i) => <option key={i} value={i}>Controle {i + 1}{pads.some((g) => g.index === i) ? " (conectado)" : ""}</option>)}</select></td></tr>))}</tbody></table></div>
        <div className="mt-3 text-xs text-muted-foreground">Controles conectados: {pads.length ? pads.map((g) => `${g.index + 1}: ${g.id.slice(0, 30)}`).join(" · ") : "nenhum (pressione um botão no controle para detectar)"}</div>
        <ArenaButton data-nav className="opt mt-3" onClick={() => onChange({ ...settings, keys: DEFAULT_SETTINGS.keys, pads: DEFAULT_SETTINGS.pads })}>Restaurar controles padrão</ArenaButton>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Efeitos sonoros"><ArenaButton data-nav className={`opt ${settings.sfx ? "on" : ""}`} onClick={() => onChange({ ...settings, sfx: !settings.sfx })}>{settings.sfx ? "Ativados" : "Desativados"}</ArenaButton>
          <input data-nav type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => onChange({ ...settings, volume: Number(e.target.value) })} className="flex-1" />
          <span className="text-sm">{Math.round(settings.volume * 100)}%</span><ArenaButton data-nav className="opt" onClick={() => { configureAudio(settings.sfx, settings.volume); sfx("pickup"); }}>Testar</ArenaButton></Field>
        <Field label="Qualidade visual">{(["low", "high"] as const).map((q) => <ArenaButton key={q} data-nav className={`opt ${settings.quality === q ? "on" : ""}`} onClick={() => onChange({ ...settings, quality: q })}>{q === "low" ? "Desempenho" : "Alta"}</ArenaButton>)}</Field>
        <Field label="Escala da interface">{[0.85, 1, 1.15, 1.3].map((u) => <ArenaButton key={u} data-nav className={`opt ${settings.uiScale === u ? "on" : ""}`} onClick={() => onChange({ ...settings, uiScale: u })}>{Math.round(u * 100)}%</ArenaButton>)}</Field>
      </div>
    </Panel>
  );
}
