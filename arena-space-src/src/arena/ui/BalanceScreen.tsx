import { useState } from "react";
import { ArrowLeft, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SHIPS, SHIP_ORDER, type ShipId } from "../config";
import { ABILITY_FIELDS, currentBalance, DEFAULT_BALANCE, saveBalance, SHIP_FIELDS, validateBalance, type Balance, type BalanceField } from "../balance";
import { ShipPreview, useMenuPad } from "./widgets";

function NumericField({ field, value, onChange }: { field: BalanceField; value: number; onChange: (v: number) => void }) {
  const scale = field.scale ?? 1;
  return <label className="balance-field">
    <span>{field.label}</span>
    <input data-nav className="opt" type="number" min={field.min} max={field.max} step={field.step}
      value={Number.isNaN(value) ? "" : Math.round(value * scale * 10000) / 10000}
      onChange={e => onChange(e.target.value === "" ? NaN : Number(e.target.value) / scale)} />
  </label>;
}

export function BalanceScreen({ onBack }: { onBack: () => void }) {
  const [draft, setDraft] = useState<Balance>(currentBalance);
  const [saved, setSaved] = useState<Balance>(currentBalance);
  const [id, setId] = useState<ShipId>("blue");
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const error = validateBalance(draft);
  const [leaving, setLeaving] = useState(false);
  const back = () => dirty ? setLeaving(true) : onBack();
  useMenuPad(back);
  const change = (next: Balance) => { setDraft(next); setMessage(""); };
  const save = () => {
    try { saveBalance(draft); setSaved(structuredClone(draft)); setMessage("Ajustes salvos neste navegador."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Não foi possível salvar os ajustes."); }
  };
  const restoreShip = () => change({ ...draft, ships: { ...draft.ships, [id]: structuredClone(DEFAULT_BALANCE.ships[id]) }, abilities: { ...draft.abilities, [id]: structuredClone(DEFAULT_BALANCE.abilities[id]) } });
  return <div className="arena-panel">
    <header className="panel-header">
      <div><div className="panel-brand"><SlidersHorizontal size={16} /> ARENA SPACE</div><h2 className="arena-title text-3xl">Balanceamento</h2></div>
      <Button variant="arena" size="arena" data-nav className="arena-btn ghost" onClick={back}><ArrowLeft /> Voltar</Button>
    </header>
    <div className="flex flex-wrap gap-2" aria-label="Nave para balancear">
      {SHIP_ORDER.map(ship => <Button key={ship} variant="arena" size="arena" data-nav aria-pressed={id === ship}
        className={`ship-chip ship-${ship} ${id === ship ? "on" : ""}`} onClick={() => setId(ship)}>{SHIPS[ship].name}</Button>)}
    </div>
    <div className={`balance-heading ship-${id}`}><ShipPreview id={id} size={84} /><div><h3 className="arena-title text-2xl">Nave {SHIPS[id].name}</h3><span className="text-sm text-muted-foreground">{SHIPS[id].abilityName}</span></div>
      <Button variant="arena" size="arena" data-nav className="arena-btn ghost" onClick={restoreShip}><RotateCcw /> Restaurar nave</Button>
    </div>
    <div className="balance-columns">
      <section><h3 className="section-label mb-4">Atributos da nave</h3><div className="balance-fields">
        {SHIP_FIELDS.map(field => <NumericField key={field.key} field={field} value={draft.ships[id][field.key]}
          onChange={v => change({ ...draft, ships: { ...draft.ships, [id]: { ...draft.ships[id], [field.key]: v } } })} />)}
      </div></section>
      <section><h3 className="section-label mb-4">Habilidade · {SHIPS[id].abilityName}</h3><div className="balance-fields">
        {ABILITY_FIELDS[id].map(field => <NumericField key={field.key} field={field} value={draft.abilities[id][field.key] ?? NaN}
          onChange={v => change({ ...draft, abilities: { ...draft.abilities, [id]: { ...draft.abilities[id], [field.key]: v } } })} />)}
      </div></section>
    </div>
    <section className="arena-field"><h3 className="section-label mb-4">Energia · todas as naves</h3>
      <div className="balance-fields"><NumericField field={{ key: "prep", label: "Preparação da habilidade (s)", min: 0, max: 30, step: 0.1 }} value={draft.prep} onChange={v => change({ ...draft, prep: v })} /></div>
    </section>
    <div className="balance-actions">
      <span role="status" className="text-sm text-muted-foreground">{error ?? (message || (dirty ? "Alterações não salvas" : "Valores atuais"))}</span>
      <div className="flex flex-wrap gap-2">
        <Button variant="arena" size="arena" data-nav className="arena-btn ghost" onClick={() => change(structuredClone(DEFAULT_BALANCE))}><RotateCcw /> Restaurar tudo</Button>
        <Button variant="arena" size="arena" data-nav className="arena-btn" disabled={!!error || !dirty} onClick={save}><Save /> Salvar ajustes</Button>
      </div>
    </div>
    {leaving && <div role="alertdialog" aria-modal="true" aria-labelledby="balance-leave-title" className="balance-dialog">
      <div className="arena-card"><h3 id="balance-leave-title" className="arena-title text-xl mb-5">Descartar alterações não salvas?</h3><div className="flex flex-wrap gap-2">
        <Button variant="arena" size="arena" data-nav autoFocus className="arena-btn" onClick={() => setLeaving(false)}>Continuar editando</Button>
        <Button variant="arena" size="arena" data-nav className="arena-btn ghost" onClick={onBack}>Descartar e voltar</Button>
      </div></div>
    </div>}
  </div>;
}