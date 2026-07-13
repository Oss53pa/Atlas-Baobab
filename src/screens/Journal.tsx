import { useMemo, useState, type CSSProperties } from 'react';
import { BookOpen, MessageSquarePlus, Search, Mic, Shield, Star, Check } from 'lucide-react';
import { activeChild, actions, useAppState } from '../lib/store.js';
import { relativeDay, formatTime } from '../lib/format.js';
import { KIND_GLYPH, WEATHER_GLYPH, KIND_TINT, WEATHER_TINT, GlyphNote, GlyphPartly, GlyphCloud } from '../components/glyphs.js';
import { WEATHER, caregiverTint, kindLabel, EntryEditor, QuickNoteModal } from '../components/journalKit.js';
import { MomentModal } from '../components/MomentModal.js';
import { EventCapture } from './EventCapture.js';
import type { ObservationKind } from '@atlas-baobab/twin-engine';
import type { Observation, Incident } from '../lib/types.js';
import type { View } from '../App.js';

const TILES: { kind: ObservationKind; label: string }[] = [
  { kind: 'mood', label: 'Humeur' },
  { kind: 'success', label: 'Réussite' },
  { kind: 'event', label: 'Événement' },
  { kind: 'meal', label: 'Repas' },
  { kind: 'sleep', label: 'Sommeil' },
  { kind: 'school', label: 'École' },
];

type Filter = 'all' | 'incident' | 'success' | 'school' | 'sleep' | 'follow';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'incident', label: 'Crises' },
  { key: 'success', label: 'Réussites' },
  { key: 'school', label: 'École' },
  { key: 'sleep', label: 'Sommeil' },
  { key: 'follow', label: 'À suivre' },
];

const PLACE_PREP: Record<string, string> = { maison: 'à la maison', 'école': 'à l’école', marché: 'au marché', taxi: 'en taxi', transport: 'dans le transport', dehors: 'dehors' };

export function Journal({ go }: { go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const name = child?.first_name ?? 'l’enfant';

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [editing, setEditing] = useState<Observation | null>(null);
  const [showEvent, setShowEvent] = useState(false);
  const [showMoment, setShowMoment] = useState(false);
  const [quickKind, setQuickKind] = useState<ObservationKind | null>(null);
  const [wxSaved, setWxSaved] = useState(false);
  const [visibleDays, setVisibleDays] = useState(5);

  const incidentByObs = useMemo(() => {
    const m = new Map<string, Incident>();
    for (const i of state.incidents) if (i.observation_id) m.set(i.observation_id, i);
    return m;
  }, [state.incidents]);

  const all = useMemo(
    () => state.observations.filter((o) => o.child_id === child?.id).slice().sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    [state.observations, child?.id],
  );

  const weatherByDay = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of all) if (o.kind === 'weather') m.set(o.occurred_at.slice(0, 10), String(o.context?.wx ?? ''));
    return m;
  }, [all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((o) => {
      if (filter === 'incident' && o.kind !== 'incident') return false;
      if (filter === 'success' && o.kind !== 'success') return false;
      if (filter === 'sleep' && o.kind !== 'sleep') return false;
      if (filter === 'school' && o.context?.place !== 'école' && o.kind !== 'school') return false;
      if (filter === 'follow' && !o.context?.follow_up) return false;
      if (q) {
        const hay = `${kindLabel(o.kind)} ${o.context?.note ?? ''} ${o.context?.place ?? ''} ${o.author ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, filter, search]);

  const days = useMemo(() => {
    const m = new Map<string, Observation[]>();
    for (const o of filtered) {
      const k = o.occurred_at.slice(0, 10);
      const arr = m.get(k) ?? [];
      arr.push(o);
      m.set(k, arr);
    }
    return [...m.entries()];
  }, [filtered]);

  function saveWeather(w: (typeof WEATHER)[number]) {
    actions.addObservation({ kind: 'weather', intensity: w.intensity, occurred_at: new Date().toISOString(), author: 'Maman', context: { weather: w.label, wx: w.wx } });
    setWxSaved(true);
    setTimeout(() => setWxSaved(false), 1800);
  }
  function openTile(kind: ObservationKind) {
    if (kind === 'event') setShowEvent(true);
    else setQuickKind(kind);
  }

  return (
    <div className="reveal">
      {/* En-tête */}
      <div className="row between" style={{ alignItems: 'flex-start', gap: 12, margin: '2px 2px 12px' }}>
        <div>
          <h2 style={{ fontSize: 24 }}>Le journal de {name}</h2>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Chaque note, de chaque aidant, raconte son histoire et nourrit CORTEX.</p>
        </div>
        <div className="row" style={{ gap: 8, flex: '0 0 auto' }}>
          <button className="btn" onClick={() => go('carnet')}><BookOpen size={16} /> Le carnet</button>
          <button className="btn btn-accent" onClick={() => setShowMoment(true)}><MessageSquarePlus size={16} /> Noter un moment</button>
        </div>
      </div>

      {/* Filtres */}
      <div className="jl2-filters">
        {FILTERS.map((f) => (
          <button key={f.key} className={`jl2-f ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
        <button className={`jl2-f ${showSearch ? 'on' : ''}`} onClick={() => setShowSearch((s) => !s)}><Search size={13} /> Rechercher</button>
        {showSearch && (
          <input className="jl2-search" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="dentiste, cantine, bruit…" />
        )}
      </div>

      <div className="jl2-grid">
        {/* Rail : capture éclair */}
        <div className="jl2-rail">
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>{name} aujourd’hui ? · 1 tap</div>
            <div className="weather-row">
              {WEATHER.map((w) => {
                const G = WEATHER_GLYPH[w.wx] ?? GlyphPartly;
                return (
                  <button key={w.label} className="weather-btn" onClick={() => saveWeather(w)} style={{ '--tint': WEATHER_TINT[w.wx] } as CSSProperties}>
                    <span className="wx"><G size={26} /></span>{w.label}
                  </button>
                );
              })}
            </div>
            {wxSaved && <div style={{ fontSize: 12, color: 'var(--radar-green)', marginTop: 8, fontWeight: 600 }}><Check size={12} /> Enregistré, merci</div>}
          </div>

          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Ajouter en 30 secondes</div>
            <div className="jl2-tiles">
              {TILES.map((t) => {
                const G = KIND_GLYPH[t.kind] ?? GlyphNote;
                return (
                  <button key={t.kind} className="jl2-tile" onClick={() => openTile(t.kind)} style={{ '--tint': KIND_TINT[t.kind] } as CSSProperties}>
                    <span className="jl2-tile-ic"><G size={20} /></span>{t.label}
                  </button>
                );
              })}
            </div>
            <button className="jl2-dictee" onClick={() => setShowEvent(true)}>
              <Mic size={16} /> <span><b>Pressé·e ? Racontez.</b> La note s’écrit toute seule, vous validez.</span>
            </button>
          </div>

          <div className="card jl2-sign">Vos notes sont signées automatiquement et <b>modifiables 24 h</b> par leur auteur. Un journal ne se supprime pas.</div>
        </div>

        {/* Timeline : un récit */}
        <div className="jl2-timeline">
          {days.length === 0 ? (
            <div className="card jl-empty"><div className="big">📖</div><p style={{ marginTop: 10 }}>Aucune note pour ce filtre.</p></div>
          ) : (
            <>
              {days.slice(0, visibleDays).map(([dayKey, items]) => {
                const wx = weatherByDay.get(dayKey);
                const WG = wx ? (WEATHER_GLYPH[wx] ?? GlyphCloud) : GlyphCloud;
                const authors = new Set(items.map((o) => o.author).filter(Boolean)).size;
                const succ = items.filter((o) => o.kind === 'success').length;
                const cris = items.filter((o) => o.kind === 'incident').length;
                const stats = [`${items.length} note${items.length > 1 ? 's' : ''}`, authors > 1 ? `${authors} aidants` : null, succ ? `${succ} réussite${succ > 1 ? 's' : ''}` : null, cris ? `${cris} crise${cris > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ');
                return (
                  <div className="jl2-day" key={dayKey}>
                    <div className="jl2-dayhead">
                      <span className="jl2-dayhead-ic" style={{ color: wx ? (WEATHER_TINT[wx] ?? '#8a9bb0') : 'var(--text-muted)', opacity: wx ? 1 : 0.4 }}><WG size={20} /></span>
                      <span className="jl2-dayhead-t">{cap(relativeDay(items[0].occurred_at))}</span>
                      <span className="jl2-dayhead-g">{stats}</span>
                    </div>
                    <div className="jl2-entries">
                      {items.map((o) => <JournalEntry key={o.id} obs={o} inc={incidentByObs.get(o.id)} onOpen={() => setEditing(o)} />)}
                    </div>
                  </div>
                );
              })}
              {days.length > visibleDays && (
                <button className="jl2-more" onClick={() => setVisibleDays((v) => v + 7)}>Afficher les jours précédents</button>
              )}
            </>
          )}
        </div>
      </div>

      {editing && <EntryEditor obs={editing} onClose={() => setEditing(null)} />}
      {showEvent && <EventCapture onClose={() => setShowEvent(false)} go={go} />}
      {showMoment && <MomentModal onClose={() => setShowMoment(false)} />}
      {quickKind && <QuickNoteModal kind={quickKind} onClose={() => setQuickKind(null)} />}
    </div>
  );
}

function JournalEntry({ obs, inc, onOpen }: { obs: Observation; inc?: Incident; onOpen: () => void }) {
  const isWx = obs.kind === 'weather';
  const isCrisis = obs.kind === 'incident';
  const isStar = obs.kind === 'success';
  const tint = isCrisis ? 'var(--radar-red)' : isStar ? '#d99c3f' : isWx ? (WEATHER_TINT[String(obs.context?.wx ?? '')] ?? '#6e9fb3') : (KIND_TINT[obs.kind] ?? '#8a8378');
  const G = isWx ? (WEATHER_GLYPH[String(obs.context?.wx ?? '')] ?? GlyphPartly) : (KIND_GLYPH[obs.kind] ?? GlyphNote);

  const noteText = typeof obs.context?.note === 'string' ? obs.context.note : null;
  const place = typeof obs.context?.place === 'string' ? obs.context.place : null;
  let sentence = noteText;
  if (isCrisis) {
    let s = `Crise${place ? ` ${PLACE_PREP[place] ?? place}` : ''}`;
    if (inc?.started_at && inc?.ended_at) s += `, ${Math.round((Date.parse(inc.ended_at) - Date.parse(inc.started_at)) / 60000)} min`;
    s += '.';
    if (inc?.suspected_trigger) s += ` Déclencheur supposé : ${inc.suspected_trigger}.`;
    if (inc?.what_helped?.length) s += ` ${cap(inc.what_helped.join(', '))} a aidé.`;
    sentence = s;
  } else if (!sentence) {
    sentence = isWx ? String(obs.context?.weather ?? 'Météo notée') : kindLabel(obs.kind);
  }

  return (
    <div className={`jl2-entry ${isCrisis ? 'crisis' : ''} ${isStar ? 'star' : ''}`} role="button" tabIndex={0}
      onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}>
      <span className="jl2-ic" style={{ color: tint }}>{isCrisis ? <Shield size={18} /> : isStar ? <Star size={18} /> : <G size={18} />}</span>
      <div className="jl2-tx">
        {sentence}
        <div className="jl2-meta">
          {obs.author && <span className="jl2-tag who" style={{ '--who': caregiverTint(obs.author) } as CSSProperties}>{obs.author}</span>}
          {place && <span className="jl2-tag">{place}</span>}
          {obs.context?.follow_up ? <span className="jl2-tag follow">à suivre</span> : null}
          {isStar && <span className="jl2-tag leaf">+1 feuille</span>}
        </div>
      </div>
      <span className="jl2-when">{formatTime(obs.occurred_at)}</span>
    </div>
  );
}

function cap(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
