/**
 * Briques partagées du Journal & du Carnet : barème par type, rendu d'une entrée
 * et éditeur. Centralisées ici pour que le fil du jour et l'archive complète
 * parlent exactement le même langage (icônes maison, échelles nommées, édition).
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';
import { Check, X, Lock, PencilLine, Plus, MessageSquarePlus } from 'lucide-react';
import { actions, useStore } from '../lib/store.js';
import { momentType, type MomentType } from '../lib/moments.js';
import { formatTime, relativeDay } from '../lib/format.js';
import { KIND_GLYPH, WEATHER_GLYPH, KIND_TINT, WEATHER_TINT, GlyphNote, GlyphPartly } from './glyphs.js';
import type { ObservationKind } from '@atlas-baobab/twin-engine';
import type { Observation } from '../lib/types.js';

export const PLACES = ['maison', 'école', 'marché', 'taxi', 'dehors'];

/** Croisement des regards multi-aidants (CDC 6.2) : qui a observé ce moment. */
export const CAREGIVERS = ['Maman', 'Papa', 'Aidant·e', 'Enseignant·e'];
const CAREGIVER_TINT: Record<string, string> = {
  'Maman': '#c98a74', 'Papa': '#6e9fb3', 'Aidant·e': '#9b8fb0', 'Enseignant·e': '#7a9e7e',
};
export function caregiverTint(name?: string): string {
  return (name && CAREGIVER_TINT[name]) || '#8a8378';
}

/** Journal Météo (SFD-C1 E4) : la journée en 1 tap, 5 météos → intensity 1..5. */
export const WEATHER = [
  { wx: '☀️', label: 'Belle journée', intensity: 5 },
  { wx: '🌤️', label: 'Bonne journée', intensity: 4 },
  { wx: '⛅', label: 'Journée moyenne', intensity: 3 },
  { wx: '🌧️', label: 'Journée difficile', intensity: 2 },
  { wx: '⛈️', label: 'Très difficile', intensity: 1 },
];

/**
 * Barème d'intensité PAR TYPE : « 3/5 » ne veut rien dire dans l'absolu. Chaque
 * type a ses 5 crans nommés, expliqués au survol, pour que l'aidant classe juste
 * et que la donnée envoyée à CORTEX soit cohérente.
 */
export const SCALE: Record<string, { title: string; levels: [string, string, string, string, string] }> = {
  mood: { title: 'Son humeur', levels: ['Très dure', 'Difficile', 'Moyenne', 'Bonne', 'Rayonnante'] },
  success: { title: 'L’ampleur', levels: ['Petit pas', 'Jolie étape', 'Belle réussite', 'Grande fierté', 'Exploit'] },
  sleep: { title: 'La nuit', levels: ['Très agitée', 'Agitée', 'Moyenne', 'Bonne', 'Excellente'] },
  meal: { title: 'Le repas', levels: ['A refusé', 'A peu mangé', 'Correct', 'A bien mangé', 'Très bien mangé'] },
  event: { title: 'L’événement', levels: ['Anodin', 'Notable', 'Assez marquant', 'Marquant', 'Très marquant'] },
};
const GENERIC = { title: 'Intensité', levels: ['Très faible', 'Faible', 'Moyenne', 'Forte', 'Très forte'] as [string, string, string, string, string] };

export function scaleOf(kind: string) { return SCALE[kind] ?? GENERIC; }
export function levelLabel(kind: string, intensity?: number): string | null {
  const s = SCALE[kind];
  if (!s || !intensity) return null;
  return s.levels[Math.min(5, Math.max(1, intensity)) - 1];
}
export function kindLabel(k: string): string {
  return { mood: 'Humeur', success: 'Réussite', sleep: 'Sommeil', meal: 'Repas', event: 'Événement', incident: 'Crise', school: 'École', free_note: 'Note', weather: 'Météo' }[k] ?? k;
}

// ── Rendu d'une entrée ──────────────────────────────────────────────────────

export function EntryRow({ obs, onEdit, extra }: { obs: Observation; onEdit: (o: Observation) => void; extra?: ReactNode }) {
  const isWx = obs.kind === 'weather';
  const G = isWx ? (WEATHER_GLYPH[String(obs.context?.wx ?? '🌤️')] ?? GlyphPartly) : (KIND_GLYPH[obs.kind] ?? GlyphNote);
  const title = isWx ? String(obs.context?.weather ?? 'Météo') : kindLabel(obs.kind);
  const tint = isWx ? (WEATHER_TINT[String(obs.context?.wx ?? '')] ?? '#6e9fb3') : (KIND_TINT[obs.kind] ?? '#8a8378');
  const noteText = typeof obs.context?.note === 'string' ? obs.context.note : null;
  const metaText = [levelLabel(obs.kind, obs.intensity), obs.context?.place].filter(Boolean).join(' · ');
  return (
    <div
      className="jl-entry" role="button" tabIndex={0}
      style={{ '--tint': tint } as CSSProperties}
      onClick={() => onEdit(obs)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(obs); } }}
    >
      <div className="jl-ico"><G size={24} /></div>
      <div className="jl-body">
        <div className="jl-line">
          <span className="jl-title">{title}</span>
          {!isWx && obs.intensity ? (
            <span className="jl-gauge" aria-label={`Intensité ${obs.intensity} sur 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} className={n <= (obs.intensity ?? 0) ? 'on' : ''} />
              ))}
            </span>
          ) : null}
        </div>
        {noteText && <p className="jl-note">{noteText}</p>}
        {(metaText || obs.author) && (
          <div className="jl-meta">
            {metaText && <span>{metaText}</span>}
            {obs.author && (
              <span className="jl-author" style={{ '--who': caregiverTint(obs.author) } as CSSProperties}>{obs.author}</span>
            )}
          </div>
        )}
        {extra}
      </div>
      <div className="jl-time">{formatTime(obs.occurred_at)}</div>
    </div>
  );
}

// ── Éditeur d'une entrée ────────────────────────────────────────────────────

const EDIT_WINDOW_MS = 24 * 3600 * 1000;

/** Détail d'un moment. Un journal ne se supprime jamais (fiabilité du suivi) et
 * ne se corrige que pendant 24 h ; passé ce délai, il se fige en lecture seule. */
export function EntryEditor({ obs, onClose }: { obs: Observation; onClose: () => void }) {
  const isWx = obs.kind === 'weather';
  const age = Date.now() - Date.parse(obs.occurred_at);
  const editable = age >= 0 && age < EDIT_WINDOW_MS;
  const hoursLeft = Math.max(1, Math.ceil((EDIT_WINDOW_MS - age) / 3600000));

  // Observation vivante (le complément horodaté doit s'afficher immédiatement).
  const live = useStore((s) => s.observations.find((o) => o.id === obs.id)) ?? obs;

  const [intensity, setIntensity] = useState(obs.intensity ?? 3);
  const [place, setPlace] = useState<string | null>(typeof obs.context?.place === 'string' ? obs.context.place : null);
  const [note, setNote] = useState(typeof obs.context?.note === 'string' ? obs.context.note : '');
  const [wx, setWx] = useState(isWx ? String(obs.context?.wx ?? '🌤️') : '');
  const [author, setAuthor] = useState(obs.author ?? 'Maman');
  const [adding, setAdding] = useState(false);
  const [cText, setCText] = useState('');
  const [cWho, setCWho] = useState(obs.author ?? 'Maman');
  const sc = scaleOf(obs.kind);

  const momentExtras = <MomentExtras
    obs={live}
    adding={adding} setAdding={setAdding} cText={cText} setCText={setCText} cWho={cWho} setCWho={setCWho}
    onAdd={() => { actions.addMomentAddendum(obs.id, cText, cWho); setCText(''); setAdding(false); }}
  />;

  const G = isWx ? (WEATHER_GLYPH[String(obs.context?.wx ?? '🌤️')] ?? GlyphPartly) : (KIND_GLYPH[obs.kind] ?? GlyphNote);
  const tint = isWx ? (WEATHER_TINT[String(obs.context?.wx ?? '')] ?? '#6e9fb3') : (KIND_TINT[obs.kind] ?? '#8a8378');
  const title = isWx ? String(obs.context?.weather ?? 'Météo') : kindLabel(obs.kind);
  const noteText = typeof obs.context?.note === 'string' ? obs.context.note : null;
  const placeText = typeof obs.context?.place === 'string' ? obs.context.place : null;

  function save() {
    const trimmed = note.trim();
    if (isWx) {
      const w = WEATHER.find((x) => x.wx === wx) ?? WEATHER[1];
      const ctx: Record<string, unknown> = { ...obs.context, weather: w.label, wx: w.wx };
      if (trimmed) ctx.note = trimmed; else delete ctx.note;
      actions.updateObservation(obs.id, { intensity: w.intensity, context: ctx, author });
    } else {
      const ctx: Record<string, unknown> = { ...obs.context };
      if (place) ctx.place = place; else delete ctx.place;
      if (trimmed) ctx.note = trimmed; else delete ctx.note;
      actions.updateObservation(obs.id, { intensity, context: ctx, author });
    }
    onClose();
  }

  return createPortal(
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 12, alignItems: 'center', minWidth: 0 }}>
            <span className="jl-ico" style={{ '--tint': tint } as CSSProperties}><G size={24} /></span>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: 18, lineHeight: 1.2 }}>{title}</h3>
              <div className="row" style={{ gap: 8, marginTop: 3, alignItems: 'center' }}>
                <span className="muted" style={{ fontSize: 12.5 }}>{relativeDay(obs.occurred_at)} · {formatTime(obs.occurred_at)}</span>
                {obs.author && <span className="jl-author" style={{ '--who': caregiverTint(obs.author), fontSize: 12 } as CSSProperties}>{obs.author}</span>}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        {editable ? (
          <>
            {isWx ? (
              <div className="weather-row">
                {WEATHER.map((w) => {
                  const WG = WEATHER_GLYPH[w.wx] ?? GlyphPartly;
                  return (
                    <button key={w.label} className={`weather-btn ${wx === w.wx ? 'on' : ''}`} onClick={() => setWx(w.wx)} style={{ '--tint': WEATHER_TINT[w.wx] } as CSSProperties}>
                      <span className="wx"><WG size={28} /></span>
                      {w.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="section-title" style={{ marginTop: 0 }}>{sc.title}</div>
                <div className="scale scale-tip">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} className={intensity === n ? 'on' : ''} data-tip={sc.levels[n - 1]} onClick={() => setIntensity(n)}>{n}</button>
                  ))}
                </div>
                <div className="jl-scale-cap"><b>{intensity}</b> · {sc.levels[intensity - 1]}</div>

                <div className="section-title">Lieu</div>
                <div className="row wrap" style={{ gap: 8 }}>
                  {PLACES.map((p) => (
                    <button key={p} className="chip" onClick={() => setPlace(place === p ? null : p)}
                      style={place === p ? { background: 'var(--primary)', color: 'var(--primary-ink)', borderColor: 'transparent' } : undefined}>
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="section-title">Qui a observé ?</div>
            <div className="row wrap" style={{ gap: 8 }}>
              {CAREGIVERS.map((c) => (
                <button key={c} className={`who-chip ${author === c ? 'on' : ''}`} onClick={() => setAuthor(c)} style={{ '--who': caregiverTint(c) } as CSSProperties}>
                  {c}
                </button>
              ))}
            </div>

            <div className="section-title">Un mot</div>
            <textarea className="jl-note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Complétez ce moment…" />

            {momentExtras}

            <p className="notice" style={{ marginTop: 14, display: 'flex', gap: 7, alignItems: 'center' }}>
              <PencilLine size={13} /> Modifiable encore ~{hoursLeft} h. Un moment enregistré ne se supprime pas et se fige après 24 h.
            </p>
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 12 }} onClick={save}><Check size={18} /> Enregistrer</button>
          </>
        ) : (
          <>
            {/* Lecture seule (archivé) */}
            <div className="jl-detail">
              {!isWx && obs.intensity ? (
                <div className="jl-detail-row">
                  <span className="jl-detail-k">{sc.title}</span>
                  <span className="jl-detail-v">{obs.intensity} · {sc.levels[obs.intensity - 1]}</span>
                </div>
              ) : null}
              {isWx && (
                <div className="jl-detail-row"><span className="jl-detail-k">Météo</span><span className="jl-detail-v">{title}</span></div>
              )}
              {placeText && <div className="jl-detail-row"><span className="jl-detail-k">Lieu</span><span className="jl-detail-v">{placeText}</span></div>}
              {obs.author && (
                <div className="jl-detail-row">
                  <span className="jl-detail-k">Observé par</span>
                  <span className="jl-author" style={{ '--who': caregiverTint(obs.author) } as CSSProperties}>{obs.author}</span>
                </div>
              )}
            </div>
            {noteText && <div className="jl-detail-note">« {noteText} »</div>}

            {momentExtras}

            <p className="notice" style={{ marginTop: 14, display: 'flex', gap: 7, alignItems: 'center' }}>
              <Lock size={13} /> Ce moment est archivé et figé. Vous ne pouvez plus le modifier — mais vous pouvez toujours <b style={{ fontWeight: 700 }}>ajouter un complément</b> daté.
            </p>
            <button className="btn btn-block btn-lg" style={{ marginTop: 12 }} onClick={onClose}>Fermer</button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Détail v2 (JV-01 A3) : les chips capturés (déclencheur, ce qui s'est passé, ce
 * qui a aidé, domaine, durée) + les compléments horodatés, append-only. */
function MomentExtras({ obs, adding, setAdding, cText, setCText, cWho, setCWho, onAdd }: {
  obs: Observation;
  adding: boolean; setAdding: (v: boolean) => void;
  cText: string; setCText: (v: string) => void;
  cWho: string; setCWho: (v: string) => void;
  onAdd: () => void;
}) {
  const ctx = obs.context ?? {};
  const mtKey = typeof ctx.moment_type === 'string' ? (ctx.moment_type as MomentType) : null;
  const mt = mtKey ? momentType(mtKey) : null;
  const groups = ([
    ['declencheurs', 'Déclencheur'],
    ['manifestations', 'Ce qui s’est passé'],
    ['aides', 'Ce qui a aidé'],
    ['domaines', 'Domaine'],
  ] as const)
    .map(([k, label]) => ({ key: k, label, values: Array.isArray(ctx[k]) ? (ctx[k] as string[]) : [], strong: k === 'aides' }))
    .filter((g) => g.values.length);
  const duree = typeof ctx.duree === 'string' ? ctx.duree : null;
  const addenda = (Array.isArray(ctx.addenda) ? ctx.addenda : []) as { text: string; at: string; author?: string }[];
  const hasStructured = Boolean(mt || groups.length || duree);

  if (!hasStructured && addenda.length === 0 && !adding) {
    return <button className="jl-add-btn" onClick={() => setAdding(true)}><MessageSquarePlus size={14} /> Ajouter un complément</button>;
  }

  return (
    <div className="jl-moment">
      {mt && <span className="jl-mtype" style={{ '--c': mt.tint } as CSSProperties}>{mt.emoji} {mt.label}</span>}
      {groups.map((g) => (
        <div className={`jl-mgroup ${g.strong ? 'strong' : ''}`} key={g.key}>
          <span className="jl-mgroup-k">{g.label}</span>
          <div className="jl-mchips">{g.values.map((v) => <span className="jl-mchip" key={v}>{v}</span>)}</div>
        </div>
      ))}
      {duree && (
        <div className="jl-mgroup"><span className="jl-mgroup-k">Durée</span><div className="jl-mchips"><span className="jl-mchip">{duree}</span></div></div>
      )}

      {addenda.length > 0 && (
        <div className="jl-addenda">
          {addenda.map((a, i) => (
            <div className="jl-add-item" key={i}>
              <b>Complément · {relativeDay(a.at)} · {formatTime(a.at)}{a.author ? ` · ${a.author}` : ''}</b>
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="jl-add-form">
          <textarea className="jl-note-input" value={cText} onChange={(e) => setCText(e.target.value)} placeholder="Ce que vous voulez ajouter, daté d’aujourd’hui…" />
          <div className="row wrap" style={{ gap: 6, margin: '8px 0' }}>
            {CAREGIVERS.map((c) => (
              <button key={c} className={`who-chip ${cWho === c ? 'on' : ''}`} onClick={() => setCWho(c)} style={{ '--who': caregiverTint(c) } as CSSProperties}>{c}</button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary grow" onClick={onAdd} disabled={!cText.trim()}><Plus size={16} /> Ajouter</button>
            <button className="btn" onClick={() => setAdding(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <button className="jl-add-btn" onClick={() => setAdding(true)}><MessageSquarePlus size={14} /> Ajouter un complément</button>
      )}
    </div>
  );
}

// ── Saisie rapide (tuiles du Journal) ───────────────────────────────────────

/** Modale légère de saisie d'une note d'un type donné (Humeur, Repas, Sommeil…). */
export function QuickNoteModal({ kind, onClose }: { kind: ObservationKind; onClose: () => void }) {
  const [intensity, setIntensity] = useState(3);
  const [place, setPlace] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('Maman');
  const sc = scaleOf(kind);
  const G = KIND_GLYPH[kind] ?? GlyphNote;
  const tint = KIND_TINT[kind] ?? '#8a8378';

  function save() {
    const ctx: Record<string, unknown> = {};
    if (place) ctx.place = place;
    if (note.trim()) ctx.note = note.trim();
    actions.addObservation({ kind, intensity, occurred_at: new Date().toISOString(), author, context: ctx });
    onClose();
  }

  return createPortal(
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 12, alignItems: 'center' }}>
            <span className="jl-ico" style={{ '--tint': tint } as CSSProperties}><G size={24} /></span>
            <h3 style={{ fontSize: 18 }}>{kindLabel(kind)}</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="section-title" style={{ marginTop: 0 }}>{sc.title}</div>
        <div className="scale scale-tip">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={intensity === n ? 'on' : ''} data-tip={sc.levels[n - 1]} onClick={() => setIntensity(n)}>{n}</button>
          ))}
        </div>
        <div className="jl-scale-cap"><b>{intensity}</b> · {sc.levels[intensity - 1]}</div>

        <div className="section-title">Lieu (optionnel)</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {PLACES.map((p) => (
            <button key={p} className="chip" onClick={() => setPlace(place === p ? null : p)}
              style={place === p ? { background: 'var(--primary)', color: 'var(--primary-ink)', borderColor: 'transparent' } : undefined}>{p}</button>
          ))}
        </div>

        <div className="section-title">Qui a observé ?</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {CAREGIVERS.map((c) => (
            <button key={c} className={`who-chip ${author === c ? 'on' : ''}`} onClick={() => setAuthor(c)} style={{ '--who': caregiverTint(c) } as CSSProperties}>{c}</button>
          ))}
        </div>

        <div className="section-title">Un mot (optionnel)</div>
        <textarea className="jl-note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce que vous voulez retenir…" />

        <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }} onClick={save}><Check size={18} /> Enregistrer</button>
      </div>
    </div>,
    document.body,
  );
}

// ── Regroupements ───────────────────────────────────────────────────────────

export function groupByDay(entries: Observation[]): [string, Observation[]][] {
  const map = new Map<string, Observation[]>();
  for (const e of entries) {
    const day = relativeDay(e.occurred_at);
    const arr = map.get(day) ?? [];
    arr.push(e);
    map.set(day, arr);
  }
  return [...map.entries()];
}
