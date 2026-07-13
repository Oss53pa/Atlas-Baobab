import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Volume2, Clock, Check } from 'lucide-react';
import { actions } from '../lib/store.js';
import {
  MOMENT_TYPES, momentType, LIEUX, DECLENCHEURS_V1, MANIFESTATIONS_V1, AIDES_V1,
  DUREES_V1, DOMAINES_V1, type MomentType,
} from '../lib/moments.js';
import { CAREGIVERS } from './journalKit.js';

/**
 * Modal de saisie (JV-01 A2) : bottom-sheet, 3 volets progressifs. Saisie minimale
 * = type + intensité + lieu (~10 s) ; le reste est optionnel. Enregistrer est actif
 * dès le volet 1. Constat, jamais jugement.
 */
export function MomentModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<MomentType | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [place, setPlace] = useState<string>();
  const [when, setWhen] = useState(() => localIso());
  const [showWhen, setShowWhen] = useState(false);
  const [author, setAuthor] = useState(CAREGIVERS[0]);
  const [declencheurs, setDecl] = useState<string[]>([]);
  const [manifestations, setManif] = useState<string[]>([]);
  const [aides, setAides] = useState<string[]>([]);
  const [duree, setDuree] = useState<string>();
  const [domaines, setDom] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const def = type ? momentType(type) : null;
  const isIncident = type === 'crise' || type === 'difficile';
  const isPositive = type === 'reussite' || type === 'calme';

  function save() {
    if (!type) return;
    actions.logMoment({
      type, intensity, place, occurred_at: new Date(when).toISOString(), author,
      declencheurs, manifestations, aides, duree, domaines, note: note.trim() || undefined,
    });
    onClose();
  }

  return createPortal(
    <div className="sheet-scrim" onClick={onClose}>
      <div className="moment-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Noter un moment">
        <div className="sheet-grip" />
        <div className="moment-head">
          <b>Noter un moment</b>
          <button className="oje-m-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="moment-body">
          {/* Volet 1 · L'essentiel */}
          <section className="mv">
            <span className="mv-lab">1 · L’essentiel</span>
            <div className="mtype-grid">
              {MOMENT_TYPES.map((t) => (
                <button key={t.key} className={`mtype ${type === t.key ? 'on' : ''}`} style={{ '--c': t.tint } as React.CSSProperties}
                  onClick={() => { setType(t.key); setIntensity(3); }}>
                  <span className="mtype-e">{t.emoji}</span><span>{t.label}</span>
                </button>
              ))}
            </div>

            {def && (
              <div className="mfield">
                <span className="mfield-lab">L’ampleur : <b>{def.scale[intensity - 1]}</b></span>
                <div className="mscale">
                  {def.scale.map((_, i) => (
                    <button key={i} className={`mdot ${intensity >= i + 1 ? 'on' : ''}`} style={{ '--c': def.tint } as React.CSSProperties}
                      onClick={() => setIntensity(i + 1)} aria-label={def.scale[i]} />
                  ))}
                </div>
              </div>
            )}

            <div className="mfield">
              <span className="mfield-lab">Où&nbsp;?</span>
              <div className="mchips">
                {LIEUX.map((l) => <Chip key={l} on={place === l} onClick={() => setPlace(place === l ? undefined : l)}>{l}</Chip>)}
              </div>
            </div>

            <div className="mwhen">
              <button className="mwhen-btn" onClick={() => setShowWhen((s) => !s)}><Clock size={13} /> {showWhen ? 'Maintenant' : 'C’était plus tôt ?'}</button>
              {showWhen && <input type="datetime-local" className="field" value={when} max={localIso()} onChange={(e) => setWhen(e.target.value)} />}
            </div>
          </section>

          {/* Volet 2 · Le quoi (conditionnel) */}
          {def && (
            <section className="mv">
              <span className="mv-lab">2 · Le quoi <small>· si vous voulez</small></span>
              {isIncident && (
                <>
                  <ChipField label="Déclencheur, si connu" options={DECLENCHEURS_V1} sel={declencheurs} set={setDecl} />
                  <ChipField label="Ce qui s’est passé" options={MANIFESTATIONS_V1} sel={manifestations} set={setManif} />
                  <div className="mfield">
                    <span className="mfield-lab">Combien de temps&nbsp;?</span>
                    <div className="mchips">{DUREES_V1.map((d) => <Chip key={d} on={duree === d} onClick={() => setDuree(duree === d ? undefined : d)}>{d}</Chip>)}</div>
                  </div>
                  <ChipField label="Ce qui a aidé" options={AIDES_V1} sel={aides} set={setAides} strong />
                </>
              )}
              {isPositive && (
                <ChipField label="Dans quel domaine&nbsp;?" options={DOMAINES_V1} sel={domaines} set={setDom} />
              )}
            </section>
          )}

          {/* Volet 3 · En plus */}
          {def && (
            <section className="mv">
              <span className="mv-lab">3 · En plus <small>· optionnel</small></span>
              <div className="mfield">
                <div className="row between" style={{ alignItems: 'center' }}>
                  <span className="mfield-lab">Une note</span>
                  <button className="mwhen-btn" title="Dictée vocale — bientôt"><Volume2 size={13} /> Dicter <small style={{ opacity: .7 }}>(bientôt)</small></button>
                </div>
                <textarea className="field" rows={2} placeholder="Un mot de plus, si vous voulez…" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="mfield">
                <span className="mfield-lab">Qui raconte&nbsp;?</span>
                <div className="mchips">{CAREGIVERS.map((c) => <Chip key={c} on={author === c} onClick={() => setAuthor(c)}>{c}</Chip>)}</div>
              </div>
            </section>
          )}
        </div>

        <div className="moment-foot">
          <p className="mgov">Modifiable 24 h · un journal ne se supprime pas.</p>
          <button className="btn btn-accent btn-block btn-lg" disabled={!type} onClick={save}><Check size={17} /> Enregistrer</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className={`mchip ${on ? 'on' : ''}`} onClick={onClick}>{on && <Check size={12} />}{children}</button>;
}

function ChipField({ label, options, sel, set, strong }: { label: string; options: string[]; sel: string[]; set: (v: string[]) => void; strong?: boolean }) {
  const toggle = (o: string) => set(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
  return (
    <div className={`mfield ${strong ? 'strong' : ''}`}>
      <span className="mfield-lab">{label}</span>
      <div className="mchips">{options.map((o) => <Chip key={o} on={sel.includes(o)} onClick={() => toggle(o)}>{o}</Chip>)}</div>
    </div>
  );
}

/** ISO local (sans le décalage UTC) pour un input datetime-local. */
function localIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
