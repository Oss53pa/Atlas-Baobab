import { useMemo, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, FileText, Share2, Star, Shield, Sprout, Award, Check } from 'lucide-react';
import { activeChild, acquiredCompetences, useAppState } from '../lib/store.js';
import { monthKey, monthLabel, relativeDay, formatTime } from '../lib/format.js';
import { WEATHER_GLYPH, WEATHER_TINT, KIND_GLYPH, KIND_TINT, GlyphNote, GlyphPartly } from '../components/glyphs.js';
import { kindLabel, caregiverTint, EntryEditor } from '../components/journalKit.js';
import { DOMAINS } from '../lib/activities.js';
import type { Observation, Incident } from '../lib/types.js';
import type { View } from '../App.js';

type MFilter = 'all' | 'incident' | 'success' | 'follow';
const MFILTERS: { key: MFilter; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'incident', label: 'Sensibles' },
  { key: 'success', label: 'Réussites' },
  { key: 'follow', label: 'À suivre' },
];
const PLACE_PREP: Record<string, string> = { maison: 'à la maison', 'école': 'à l’école', marché: 'au marché', taxi: 'en taxi', transport: 'dans le transport', dehors: 'dehors' };
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const mKey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
const JOURS_H = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function Carnet({ go }: { go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const name = child?.first_name ?? 'l’enfant';
  const [editing, setEditing] = useState<Observation | null>(null);
  const [filter, setFilter] = useState<MFilter>('all');
  const [cursor, setCursor] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  const all = useMemo(
    () => state.observations.filter((o) => o.child_id === child?.id).slice().sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    [state.observations, child?.id],
  );
  const incidentByObs = useMemo(() => {
    const m = new Map<string, Incident>();
    for (const i of state.incidents) if (i.observation_id) m.set(i.observation_id, i);
    return m;
  }, [state.incidents]);

  const bounds = useMemo(() => {
    if (!all.length) { const t = new Date(); return { min: mKey(t.getFullYear(), t.getMonth() + 1), max: mKey(t.getFullYear(), t.getMonth() + 1) }; }
    return { min: monthKey(all[all.length - 1].occurred_at), max: monthKey(all[0].occurred_at) };
  }, [all]);

  const month = cursor ?? bounds.max;
  const [y, m] = month.split('-').map(Number);
  const shift = (delta: number) => {
    let nm = m + delta, ny = y;
    if (nm < 1) { nm = 12; ny -= 1; } else if (nm > 12) { nm = 1; ny += 1; }
    const k = mKey(ny, nm);
    if (k >= bounds.min && k <= bounds.max) setCursor(k);
  };

  const monthObs = useMemo(() => all.filter((o) => monthKey(o.occurred_at) === month), [all, month]);
  const monthInc = useMemo(() => state.incidents.filter((i) => i.child_id === child?.id && monthKey(i.started_at) === month), [state.incidents, child?.id, month]);
  const prevInc = useMemo(() => {
    let pm = m - 1, py = y; if (pm < 1) { pm = 12; py -= 1; }
    const pk = mKey(py, pm);
    return state.incidents.filter((i) => i.child_id === child?.id && monthKey(i.started_at) === pk);
  }, [state.incidents, child?.id, y, m]);

  const weatherByDay = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of monthObs) if (o.kind === 'weather') map.set(o.occurred_at.slice(8, 10), String(o.context?.wx ?? ''));
    return map;
  }, [monthObs]);

  const avgDur = (list: Incident[]) => {
    const durs = list.filter((i) => i.started_at && i.ended_at).map((i) => (Date.parse(i.ended_at!) - Date.parse(i.started_at)) / 60000);
    return durs.length ? Math.round(durs.reduce((s, d) => s + d, 0) / durs.length) : null;
  };

  const bilan = useMemo(() => {
    const success = monthObs.filter((o) => o.kind === 'success').length;
    const crises = monthObs.filter((o) => o.kind === 'incident').length;
    const dur = avgDur(monthInc), prevDur = avgDur(prevInc);
    const weekendCrises = monthInc.filter((i) => { const d = new Date(i.started_at).getDay(); return d === 0 || d === 6; }).length;
    // Ce qui a le plus aidé
    const helpFreq = new Map<string, number>();
    for (const i of monthInc) for (const h of i.what_helped ?? []) helpFreq.set(cap(h), (helpFreq.get(cap(h)) ?? 0) + 1);
    const helped = [...helpFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    // Programme
    const monthActs = state.activityLogs.filter((l) => l.child_id === child?.id && monthKey(l.occurred_at) === month);
    const domainsTouched = new Set(monthActs.map((l) => l.domain)).size;
    // Progrès
    const acquired = child ? acquiredCompetences(child.id, state) : 0;
    return { success, crises, dur, prevDur, weekendCrises, helped, activesDone: monthActs.length, domainsTouched, acquired, totalCrises: crises };
  }, [monthObs, monthInc, prevInc, state.activityLogs, child, month, state]);

  const story = useMemo(() => {
    const noted = new Set(monthObs.map((o) => o.occurred_at.slice(0, 10))).size;
    const wx = monthObs.filter((o) => o.kind === 'weather');
    const douces = wx.filter((o) => Number(o.intensity) >= 4).length;
    const aidants = new Set(monthObs.map((o) => o.author).filter(Boolean)).size;
    const parts: string[] = [];
    if (noted === 0) return `Aucune note pour ${monthLabel(month + '-01')} pour l’instant. Chaque note écrira l’histoire de ${name}.`;
    const tone = douces >= wx.length / 2 && wx.length ? 'plutôt serein' : 'plus sensible';
    parts.push(`Un mois <b>${tone}</b> : ${noted} jour${noted > 1 ? 's' : ''} noté${noted > 1 ? 's' : ''}${wx.length ? `, dont ${douces} en douceur` : ''}.`);
    if (bilan.success) parts.push(`${name} a gagné <b>${bilan.success} réussite${bilan.success > 1 ? 's' : ''}</b> et ${bilan.acquired} feuille${bilan.acquired > 1 ? 's' : ''} sur son arbre.`);
    if (bilan.crises) {
      let s = `Les moments sensibles (${bilan.crises}) restent <span class="warn">souvent en fin de journée</span>`;
      if (bilan.dur != null && bilan.prevDur != null) s += bilan.dur < bilan.prevDur ? `, mais <b>plus courts</b> que le mois dernier (${bilan.dur} min contre ${bilan.prevDur}).` : ` (${bilan.dur} min en moyenne).`;
      else if (bilan.dur != null) s += ` (${bilan.dur} min en moyenne).`;
      else s += '.';
      parts.push(s);
    }
    if (aidants > 1) parts.push(`${aidants} aidants ont contribué — le regard croisé aide CORTEX à mieux comprendre ${name}.`);
    return parts.join(' ');
  }, [monthObs, bilan, month, name]);

  // Calendrier
  const calendar = useMemo(() => {
    const first = new Date(y, m - 1, 1);
    const lead = (first.getDay() + 6) % 7; // lundi = 0
    const dim = new Date(y, m, 0).getDate();
    const cells: ({ day: number; wx: string | null; today: boolean } | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    const now = new Date();
    const isThisMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
    for (let d = 1; d <= dim; d++) cells.push({ day: d, wx: weatherByDay.get(String(d).padStart(2, '0')) ?? null, today: isThisMonth && now.getDate() === d });
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [y, m, weatherByDay]);

  // Moments filtrés → jours
  const filtered = useMemo(() => monthObs.filter((o) => {
    if (filter === 'incident') return o.kind === 'incident';
    if (filter === 'success') return o.kind === 'success';
    if (filter === 'follow') return !!o.context?.follow_up;
    return true;
  }), [monthObs, filter]);
  const days = useMemo(() => {
    const map = new Map<string, Observation[]>();
    for (const o of filtered) { const k = o.occurred_at.slice(0, 10); (map.get(k) ?? map.set(k, []).get(k)!).push(o); }
    return [...map.entries()];
  }, [filtered]);
  const [visibleDays, setVisibleDays] = useState(4);

  const counts = {
    all: monthObs.length,
    incident: monthObs.filter((o) => o.kind === 'incident').length,
    success: monthObs.filter((o) => o.kind === 'success').length,
    follow: monthObs.filter((o) => o.context?.follow_up).length,
  };

  function share() {
    const text = `Carnet de ${name} — ${cap(monthLabel(month + '-01'))}\n\n${story.replace(/<[^>]+>/g, '')}`;
    try { navigator.clipboard?.writeText(text); setShared(true); setTimeout(() => setShared(false), 2000); } catch { /* ignore */ }
  }

  return (
    <div className="reveal">
      <div className="row between" style={{ alignItems: 'center', gap: 12, margin: '2px 2px 16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 24 }}>Le carnet de {name}</h2>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>L’histoire de son mois, écrite par vos notes à tous.</p>
        </div>
        <div className="cn-month">
          <button onClick={() => shift(-1)} disabled={month <= bounds.min} aria-label="Mois précédent"><ChevronLeft size={18} /></button>
          <span style={{ textTransform: 'capitalize' }}>{monthLabel(month + '-01')}</span>
          <button onClick={() => shift(1)} disabled={month >= bounds.max} aria-label="Mois suivant"><ChevronRight size={18} /></button>
        </div>
        <div className="row" style={{ gap: 8, flex: '0 0 auto' }}>
          <button className="btn" onClick={() => window.print()}><FileText size={16} /> Rapport PDF</button>
          <button className="btn btn-accent" onClick={share}>{shared ? <><Check size={16} /> Copié</> : <><Share2 size={16} /> Partager au médecin</>}</button>
        </div>
      </div>

      <div className="cn-grid">
        {/* Colonne gauche */}
        <div className="home-col">
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>L’histoire du mois</div>
            <p className="cn-story" dangerouslySetInnerHTML={{ __html: story }} />
          </div>

          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Le climat des journées</div>
            <div className="cn-cal">
              {JOURS_H.map((h, i) => <span className="cn-cal-h" key={i}>{h}</span>)}
              {calendar.map((c, i) => {
                if (!c) return <span className="cn-cal-d empty" key={i} />;
                const G = c.wx ? (WEATHER_GLYPH[c.wx] ?? GlyphPartly) : null;
                return (
                  <span className={`cn-cal-d ${c.today ? 'today' : ''}`} key={i} style={{ color: c.wx ? (WEATHER_TINT[c.wx] ?? '#8a9bb0') : 'var(--text-muted)' }}>
                    {G ? <G size={16} /> : null}
                    <small>{c.day}</small>
                  </span>
                );
              })}
            </div>
            <div className="cn-legend">Belle · bonne · moyenne · difficile · très difficile — case vide : pas encore noté, et c’est bien aussi.</div>
          </div>

          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Le bilan en 4 regards</div>
            <div className="cn-regards">
              <div className="cn-mini">
                <div className="cn-mini-t"><Star size={15} color="#d99c3f" /> Ce qui progresse</div>
                <p>{bilan.acquired} compétence{bilan.acquired > 1 ? 's' : ''} acquise{bilan.acquired > 1 ? 's' : ''}{bilan.success ? ` · ${bilan.success} réussite${bilan.success > 1 ? 's' : ''} ce mois` : ''}. Chaque geste répété se consolide.</p>
              </div>
              <div className="cn-mini">
                <div className="cn-mini-t"><Shield size={15} color="var(--radar-red)" /> Moments sensibles {bilan.dur != null && bilan.prevDur != null && bilan.dur < bilan.prevDur && <span className="cn-trend">↓ plus courts</span>}</div>
                <p>{bilan.crises} épisode{bilan.crises > 1 ? 's' : ''}{bilan.dur != null ? `, ${bilan.dur} min en moyenne` : ''}{bilan.prevDur != null ? ` (mois dernier : ${bilan.prevDur})` : ''}. {bilan.weekendCrises === 0 ? 'Aucun le week-end.' : `${bilan.weekendCrises} le week-end.`}</p>
              </div>
              <div className="cn-mini">
                <div className="cn-mini-t"><Award size={15} color="#d99c3f" /> Ce qui a le plus aidé</div>
                {bilan.helped.length ? bilan.helped.map(([label, n], i) => (
                  <div className="cn-strat" key={label}><span className="cn-medal">{['🥇', '🥈', '🥉'][i]}</span> {label} <span className="cn-strat-n">{n} fois sur {bilan.totalCrises}</span></div>
                )) : <p className="muted">Pas encore de moment sensible ce mois.</p>}
              </div>
              <div className="cn-mini">
                <div className="cn-mini-t"><Sprout size={15} color="var(--radar-green)" /> Le programme</div>
                <p>{bilan.activesDone} activité{bilan.activesDone > 1 ? 's' : ''} faite{bilan.activesDone > 1 ? 's' : ''} · {bilan.domainsTouched} domaine{bilan.domainsTouched > 1 ? 's' : ''} travaillé{bilan.domainsTouched > 1 ? 's' : ''} sur {DOMAINS.length}.</p>
                <div className="cn-bar"><i style={{ width: `${(bilan.domainsTouched / DOMAINS.length) * 100}%` }} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : les moments du mois */}
        <div className="home-col">
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Les moments du mois</div>
            <div className="cn-chips">
              {MFILTERS.map((f) => (
                <button key={f.key} className={`jl2-f ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)}>{f.label} <small>{counts[f.key]}</small></button>
              ))}
            </div>
            {days.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, padding: '8px 0' }}>Aucun moment pour ce filtre.</p>
            ) : (
              <>
                {days.slice(0, visibleDays).map(([dayKey, items]) => {
                  const wx = weatherByDay.get(dayKey.slice(8, 10));
                  const G = wx ? (WEATHER_GLYPH[wx] ?? GlyphPartly) : null;
                  return (
                    <div key={dayKey}>
                      <div className="cn-dayhead">
                        {G ? <span style={{ color: WEATHER_TINT[wx!] ?? '#8a9bb0' }}><G size={16} /></span> : null}
                        {cap(relativeDay(items[0].occurred_at))} <span className="cn-dg">· {items.length} note{items.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="jl2-entries" style={{ boxShadow: 'none' }}>
                        {items.map((o) => <MomentEntry key={o.id} obs={o} inc={incidentByObs.get(o.id)} onOpen={() => setEditing(o)} />)}
                      </div>
                    </div>
                  );
                })}
                {days.length > visibleDays && <button className="jl2-more" onClick={() => setVisibleDays((v) => v + 6)}>Tout le mois</button>}
              </>
            )}
          </div>
        </div>
      </div>

      {editing && <EntryEditor obs={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function MomentEntry({ obs, inc, onOpen }: { obs: Observation; inc?: Incident; onOpen: () => void }) {
  const isCrisis = obs.kind === 'incident';
  const isStar = obs.kind === 'success';
  const isWx = obs.kind === 'weather';
  const tint = isCrisis ? 'var(--radar-red)' : isStar ? '#d99c3f' : isWx ? (WEATHER_TINT[String(obs.context?.wx ?? '')] ?? '#6e9fb3') : (KIND_TINT[obs.kind] ?? '#8a8378');
  const G = isWx ? (WEATHER_GLYPH[String(obs.context?.wx ?? '')] ?? GlyphPartly) : (KIND_GLYPH[obs.kind] ?? GlyphNote);
  const place = typeof obs.context?.place === 'string' ? obs.context.place : null;
  let sentence = typeof obs.context?.note === 'string' ? obs.context.note : null;
  if (isCrisis) {
    let s = `Crise${place ? ` ${PLACE_PREP[place] ?? place}` : ''}`;
    if (inc?.started_at && inc?.ended_at) s += `, ${Math.round((Date.parse(inc.ended_at) - Date.parse(inc.started_at)) / 60000)} min`;
    s += '.';
    if (inc?.suspected_trigger) s += ` Déclencheur : ${inc.suspected_trigger}.`;
    if (inc?.what_helped?.length) s += ` ${cap(inc.what_helped.join(', '))} a aidé.`;
    sentence = s;
  } else if (!sentence) sentence = isWx ? String(obs.context?.weather ?? 'Météo notée') : kindLabel(obs.kind);
  return (
    <div className={`jl2-entry ${isCrisis ? 'crisis' : ''} ${isStar ? 'star' : ''}`} role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }} style={{ padding: '12px 15px', fontSize: 13.5 }}>
      <span className="jl2-ic" style={{ color: tint, width: 34, height: 34 }}>{isCrisis ? <Shield size={17} /> : isStar ? <Star size={17} /> : <G size={17} />}</span>
      <div className="jl2-tx" style={{ fontSize: 13.5 }}>
        {sentence}
        <div className="jl2-meta">
          {obs.author && <span className="jl2-tag who" style={{ '--who': caregiverTint(obs.author) } as CSSProperties}>{obs.author}</span>}
          {obs.context?.follow_up ? <span className="jl2-tag follow">à suivre</span> : null}
        </div>
      </div>
      <span className="jl2-when">{formatTime(obs.occurred_at)}</span>
    </div>
  );
}
