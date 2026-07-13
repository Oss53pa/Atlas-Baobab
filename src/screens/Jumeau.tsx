import { useMemo, useState } from 'react';
import { suggestChildTheme } from '@atlas-baobab/ui';
import {
  Eye, Ear, Hand, Candy, Flower2, Orbit, PersonStanding, HeartPulse,
  Sparkles, ChevronRight, Palette, RotateCcw,
} from 'lucide-react';
import { activeChild, actions, twinProfile, useAppState } from '../lib/store.js';
import { avatarDisplayName, avatarGlyph } from '../lib/avatars.js';
import { ACTIVITIES } from '../lib/activities.js';
import { childPaliers, PALIER_ORDER, PALIER_LABEL, PALIER_AGE_REF, DOMAIN_LABEL, type GameDomain, type Palier } from '../lib/paliers.js';
import { ageYears, relativeDay } from '../lib/format.js';
import type { SensoryChannelProfile, Trigger } from '@atlas-baobab/twin-engine';
import type { Observation, Incident } from '../lib/types.js';
import type { View } from '../App.js';

// Ordre + libellés « portrait » (plus doux que les termes cliniques).
const CHANNELS: { key: string; label: string; Icon: typeof Eye }[] = [
  { key: 'auditory', label: 'Sons', Icon: Ear },
  { key: 'visual', label: 'Lumières', Icon: Eye },
  { key: 'gustatory', label: 'Goûts', Icon: Candy },
  { key: 'tactile', label: 'Textures', Icon: Hand },
  { key: 'olfactory', label: 'Odeurs', Icon: Flower2 },
  { key: 'vestibular', label: 'Mouvement', Icon: Orbit },
  { key: 'proprioceptive', label: 'Toucher profond', Icon: PersonStanding },
  { key: 'interoceptive', label: 'Signaux du corps', Icon: HeartPulse },
];

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
function listFr(a: string[]): string {
  if (a.length <= 1) return a[0] ?? '';
  return `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`;
}

export function Jumeau({ go }: { go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const profile = useMemo(() => (child ? twinProfile(child.id, state) : null), [child, state]);
  const [tab, setTab] = useState<'portrait' | 'evolution'>('portrait');
  const [muted, setMuted] = useState<string[]>([]);

  const paliers = useMemo(() => (child ? childPaliers(child.id, state) : null), [child, state]);
  const obs = useMemo(() => (child ? state.observations.filter((o) => o.child_id === child.id) : []), [state.observations, child?.id]);
  const incidentByObs = useMemo(() => {
    const m = new Map<string, Incident>();
    for (const i of state.incidents) if (i.observation_id) m.set(i.observation_id, i);
    return m;
  }, [state.incidents]);

  const calms = useMemo(() => {
    const freq = new Map<string, number>();
    for (const i of state.incidents) { if (i.child_id !== child?.id) continue; for (const h of i.what_helped ?? []) freq.set(cap(h), (freq.get(cap(h)) ?? 0) + 1); }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]);
  }, [state.incidents, child?.id]);

  const forces = useMemo(() => {
    const byAct = new Map<string, { first: number; last: number; at: string }>();
    for (const l of state.activityLogs) {
      if (l.child_id !== child?.id) continue;
      const cur = byAct.get(l.activity_id);
      if (!cur) byAct.set(l.activity_id, { first: l.level, last: l.level, at: l.occurred_at });
      else byAct.set(l.activity_id, { first: Math.min(cur.first, l.level), last: l.occurred_at > cur.at ? l.level : cur.last, at: l.occurred_at > cur.at ? l.occurred_at : cur.at });
    }
    const acquired: string[] = [], emerging: string[] = [];
    for (const [id, v] of byAct) {
      const label = ACTIVITIES.find((a) => a.id === id)?.label; if (!label) continue;
      if (v.last >= 4) acquired.push(label); else if (v.last > v.first) emerging.push(label);
    }
    return { acquired, emerging };
  }, [state.activityLogs, child?.id]);

  const caa = useMemo(() => {
    const board = child ? state.aacBoards[child.id] : null;
    const words = board?.cards.length ?? 0;
    const freq = new Map<string, number>();
    for (const u of state.aacUsage) freq.set(u.label, (freq.get(u.label) ?? 0) + 1);
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([l]) => l);
    return { words, top };
  }, [child, state.aacBoards, state.aacUsage]);

  const stats = useMemo(() => ({ obs: obs.length, aidants: new Set(obs.map((o) => o.author).filter(Boolean)).size, days: new Set(obs.map((o) => o.occurred_at.slice(0, 10))).size }), [obs]);

  if (!child || !profile) return <div className="card">Aucun enfant sélectionné.</div>;

  const active = profile.sensory.channels;
  const byKey = new Map(active.map((c) => [c.channel, c]));
  const hyperLabels = CHANNELS.filter((c) => byKey.get(c.key)?.classification === 'hyper').map((c) => `aux ${c.label.toLowerCase()}`);
  const shownTriggers = profile.triggers.filter((t) => !muted.includes(`${t.dimension}-${t.value}`)).slice(0, 5);
  const suggestion = suggestChildTheme(active.map((c) => ({ channel: c.channel, classification: c.classification, confidence: c.confidence })));
  const avatarName = avatarDisplayName(child.avatar_key, child.avatar_custom_name);
  const evolution = buildEvolution(state, child.id, calms, forces, profile.version);

  // Phrase portrait
  const portraitBits: string[] = [`<b>${child.first_name}, ${ageYears(child.birth_date)} ans.</b>`];
  if (caa.words) portraitBits.push(`Il communique par pictos et mots isolés — <b>${caa.words} mots actifs</b>${caa.top.length ? ` (${caa.top.join(', ')})` : ''}.`);
  if (hyperLabels.length) portraitBits.push(`Il est <span class="cx-s">sensible ${listFr(hyperLabels.length > 2 ? [...hyperLabels.slice(0, 2), 'aux transitions'] : hyperLabels)}</span>${profile.triggers.some((t) => t.dimension === 'time') ? ', surtout en fin de journée' : ''}.`);
  if (calms.length) portraitBits.push(`Ce qui l’apaise : <b>${calms.slice(0, 3).map(([l]) => l.toLowerCase()).join(', ')}</b>. Ses routines sont son ancre.`);
  if (portraitBits.length === 1) portraitBits.push('Son portrait se dessine à chaque note. Continuez à raconter ses journées.');

  return (
    <div className="reveal">
      {/* Hero portrait */}
      <div className="card cx-hero">
        <span className="cx-hero-tree">{avatarGlyph(child.avatar_key, 4)}</span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="cx-hero-brand">CORTEX</div>
          <h2 style={{ fontSize: 22 }}>Le portrait de {child.first_name}</h2>
          <p className="cx-portrait" dangerouslySetInnerHTML={{ __html: portraitBits.join(' ') }} />
          <div className="cx-hero-meta">
            <span>Écrit à partir de <b>&nbsp;{stats.obs} observations</b>, {stats.aidants} aidant{stats.aidants > 1 ? 's' : ''}</span>
            <span>· {stats.days} jours suivis</span>
          </div>
        </div>
        <span className="cx-ver"><RotateCcw size={13} /> Profil v{profile.version}</span>
      </div>

      {/* Onglets */}
      <div className="cx-tabs">
        <button className={`cx-tab ${tab === 'portrait' ? 'on' : ''}`} onClick={() => setTab('portrait')}>Portrait</button>
        <button className={`cx-tab ${tab === 'evolution' ? 'on' : ''}`} onClick={() => setTab('evolution')}>Son évolution</button>
      </div>

      {tab === 'portrait' ? (
        <div className="cx-grid">
          <div className="home-col">
            {/* Profil sensoriel bipolaire */}
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Son profil sensoriel</div>
              {CHANNELS.map((ch) => <SenseRow key={ch.key} ch={ch} c={byKey.get(ch.key)} />)}
              <div className="cx-axis"><span>◂ en recherche</span><span>à l’aise</span><span>très sensible ▸</span></div>
            </div>

            {/* Moments sensibles */}
            <div className="card">
              <div className="section-title" style={{ marginTop: 0, display: 'flex' }}>Ses moments sensibles
                <span style={{ marginLeft: 'auto', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>30 derniers jours</span>
              </div>
              {shownTriggers.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>Aucun schéma net pour l’instant. Continuez à noter le contexte des moments difficiles.</p>
              ) : shownTriggers.map((t) => (
                <TriggerRow key={`${t.dimension}-${t.value}`} t={t} series={triggerSeries(t, obs, incidentByObs)} onGuide={() => go('reagir')} onMute={() => setMuted((m) => [...m, `${t.dimension}-${t.value}`])} />
              ))}
              <p className="cx-correct">Une tendance vous semble fausse ? <button className="cx-link" onClick={() => shownTriggers[0] && setMuted((m) => [...m, `${shownTriggers[0].dimension}-${shownTriggers[0].value}`])}>Dites-le à CORTEX</button> — votre connaissance de {child.first_name} passe avant les statistiques.</p>
            </div>
          </div>

          <div className="home-col">
            {/* Ce qui l'apaise */}
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Ce qui l’apaise, dans l’ordre</div>
              {calms.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>À découvrir au fil des moments notés.</p> : calms.slice(0, 4).map(([label, n], i) => (
                <div className="cx-strat" key={label}>
                  <span className="cx-medal">{['🥇', '🥈', '🥉', '·'][i]}</span> {label}
                  <span className="cx-meter"><i style={{ width: `${(n / calms[0][1]) * 100}%` }} /></span>
                </div>
              ))}
            </div>

            {/* Forces */}
            {(forces.acquired.length > 0 || forces.emerging.length > 0) && (
              <div className="card">
                <div className="section-title" style={{ marginTop: 0 }}>Ses forces · îlots de compétence</div>
                <div className="cx-chips">
                  {forces.acquired.map((f) => <span className="cx-chip love" key={f}><Sparkles size={13} /> {f} <small>· confirmée</small></span>)}
                  {forces.emerging.map((f) => <span className="cx-chip" key={f}>{f} <small>· émergente</small></span>)}
                </div>
              </div>
            )}

            {/* Atlas des forces : positionnement par domaine (CDC Jeux §0.1) */}
            {paliers && (
              <div className="card">
                <div className="section-title" style={{ marginTop: 0 }}>L’Atlas des forces · où en est {child.first_name}</div>
                <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, margin: '2px 0 12px' }}>
                  Chaque domaine avance à son propre rythme. {child.first_name} n’est comparé qu’à lui-même — jamais à d’autres enfants.
                </p>
                {(Object.keys(DOMAIN_LABEL) as GameDomain[]).map((d) => (
                  <PalierRow key={d} domain={d} palier={paliers[d]} />
                ))}
                <p className="notice" style={{ marginTop: 10 }}>Un repère de développement, calculé sur son jeu. Ce n’est ni un niveau scolaire, ni un retard.</p>
              </div>
            )}

            {/* Communication */}
            {caa.words > 0 && (
              <div className="card">
                <div className="section-title" style={{ marginTop: 0 }}>Comment il communique</div>
                <div className="cx-chips">
                  <span className="cx-chip">{caa.words} mots CAA</span>
                  {caa.top.length > 0 && <span className="cx-chip">Top : {caa.top.join(' · ')}</span>}
                </div>
              </div>
            )}

            {/* Thème */}
            <div className="card cx-theme">
              <span className="cx-swatch" data-theme={suggestion.theme} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 7, alignItems: 'center' }}><Palette size={14} color="var(--primary)" /><b style={{ fontSize: 14, textTransform: 'capitalize' }}>{suggestion.theme}</b></div>
                <p className="muted" style={{ fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>{suggestion.reason} CORTEX suggère, vous décidez.</p>
              </div>
              {child.active_theme === suggestion.theme
                ? <span className="chip" style={{ flex: '0 0 auto' }}>Actuel</span>
                : <button className="btn btn-primary" style={{ flex: '0 0 auto' }} onClick={() => actions.updateChild(child.id, { active_theme: suggestion.theme })}>Essayer</button>}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 720 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Ce que CORTEX a appris, au fil du temps</div>
          {evolution.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>L’histoire de {child.first_name} commence. Chaque note l’écrit un peu plus.</p>
          ) : (
            <div className="cx-timeline">
              {evolution.map((e, i) => (
                <div className={`cx-vitem ${e.warn ? 'warn' : ''}`} key={i}>
                  <div className="cx-vd">{e.date} · v{e.version}</div>
                  <div className="cx-vt" dangerouslySetInnerHTML={{ __html: e.text }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="muted mono" style={{ fontSize: 10.5, textAlign: 'center', margin: '18px 0 0', lineHeight: 1.5 }}>
        {profile.algorithm_version} · profil v{profile.version} · recalculé sur ce téléphone · règles fixes, aucune IA · chaque élément est traçable jusqu’à vos notes
      </p>
    </div>
  );
}

function SenseRow({ ch, c }: { ch: { label: string; Icon: typeof Eye }; c?: SensoryChannelProfile }) {
  const insuff = !c || c.classification === 'insufficient_data';
  const pos = insuff ? 0.5 : Math.min(1, Math.max(0, 0.5 + (c!.hyper_score - c!.hypo_score) / 2));
  const kind = insuff ? 'unk' : c!.classification === 'hyper' ? 'hyper' : c!.classification === 'hypo' ? 'hypo' : 'ok';
  const label = insuff ? 'à observer'
    : c!.classification === 'hyper' ? (c!.hyper_score > 0.66 ? 'très sensible' : 'sensible')
    : c!.classification === 'hypo' ? 'en recherche'
    : c!.classification === 'mixed' ? 'variable' : 'à l’aise';
  return (
    <div className="cx-sense">
      <span className="cx-sense-ic"><ch.Icon size={17} /></span>
      <span className="cx-sense-n">{ch.label}</span>
      <span className="cx-scale"><span className={`cx-dot ${kind}`} style={{ left: `${pos * 100}%` }} /></span>
      <span className="cx-sense-lv">{label}</span>
    </div>
  );
}

function PalierRow({ domain, palier }: { domain: GameDomain; palier: Palier }) {
  const idx = PALIER_ORDER.indexOf(palier);
  return (
    <div className="cx-palier">
      <span className="cx-palier-n">{DOMAIN_LABEL[domain]}</span>
      <span className="cx-palier-track">
        {PALIER_ORDER.map((p, i) => <i key={p} className={i <= idx ? 'on' : ''} data-cur={i === idx || undefined} />)}
      </span>
      <span className="cx-palier-lv">{PALIER_LABEL[palier]}<small>{PALIER_AGE_REF[palier]}</small></span>
    </div>
  );
}

function TriggerRow({ t, series, onGuide, onMute }: { t: Trigger; series: number[]; onGuide: () => void; onMute: () => void }) {
  const trend = series.length >= 2 ? series[series.length - 1] - series[0] : 0;
  const trendTxt = trend < 0 ? 'en baisse' : trend > 0 ? 'en hausse' : 'stable';
  const stroke = t.confidence === 'fort' ? 'var(--radar-red)' : 'var(--radar-orange)';
  const max = Math.max(1, ...series);
  const pts = series.map((v, i) => `${2 + (i * 52) / Math.max(1, series.length - 1)},${22 - (v / max) * 16}`).join(' ');
  return (
    <div className="cx-trig">
      <svg className="cx-spark" width="56" height="26"><polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className="cx-trig-tx"><b>{triggerSentence(t)}</b><br /><small>{t.support} épisode{t.support > 1 ? 's' : ''} · tendance {trendTxt}</small></span>
      <div className="cx-trig-actions">
        <span className={`cx-badge ${t.confidence === 'fort' ? 'fort' : 'conf'}`}>{t.confidence === 'fort' ? 'forte' : 'à confirmer'}</span>
        <div className="row" style={{ gap: 6 }}>
          <button className="cx-act" onClick={onGuide}>Que faire <ChevronRight size={12} /></button>
          <button className="cx-mute" onClick={onMute} title="Masquer cette tendance">✕</button>
        </div>
      </div>
    </div>
  );
}

function triggerSentence(t: Trigger): string {
  switch (t.dimension) {
    case 'place': return `Les moments difficiles reviennent au lieu « ${t.value} »`;
    case 'people': return 'Les fins de journée d’école, surtout';
    case 'noise': return 'Le bruit fort et soudain';
    case 'time': return `Les moments sensibles ${timeFr(t.value)}`;
    case 'suspected': return `« ${cap(t.value)} »`;
    default: return `Autour de « ${t.value} »`;
  }
}
function timeFr(v: string): string {
  return { morning: 'le matin', afternoon: 'l’après-midi', evening: 'en fin de journée', night: 'la nuit' }[v] ?? v;
}

/** Série hebdomadaire (5 semaines) des incidents correspondant au déclencheur. */
function triggerSeries(t: Trigger, obs: Observation[], incByObs: Map<string, Incident>): number[] {
  const now = Date.now(), week = 7 * 86400000;
  const buckets = [0, 0, 0, 0, 0];
  for (const o of obs) {
    if (o.kind !== 'incident') continue;
    const inc = incByObs.get(o.id);
    let match = false;
    switch (t.dimension) {
      case 'place': match = o.context?.place === t.value; break;
      case 'noise': match = Number(o.context?.noise_level ?? 0) >= 4; break;
      case 'people': match = (o.context?.people ?? []).includes(t.value); break;
      case 'suspected': match = inc?.suspected_trigger === t.value; break;
      case 'time': match = true; break;
      default: match = true;
    }
    if (!match) continue;
    const wk = Math.floor((now - Date.parse(o.occurred_at)) / week);
    if (wk >= 0 && wk < 5) buckets[4 - wk] += 1;
  }
  return buckets;
}

type Evo = { date: string; version: number; text: string; warn?: boolean };
function buildEvolution(state: ReturnType<typeof useAppState>, childId: string, calms: [string, number][], forces: { acquired: string[]; emerging: string[] }, version: number): Evo[] {
  const items: { at: string; text: string; warn?: boolean }[] = [];
  // Acquis récents
  const latest = new Map<string, { at: string; level: number }>();
  for (const l of state.activityLogs) {
    if (l.child_id !== childId) continue;
    const cur = latest.get(l.activity_id);
    if (!cur || l.occurred_at > cur.at) latest.set(l.activity_id, { at: l.occurred_at, level: l.level });
  }
  for (const [id, v] of latest) {
    const label = ACTIVITIES.find((a) => a.id === id)?.label;
    if (label && v.level >= 4) items.push({ at: v.at, text: `Force confirmée : <b>${label.toLowerCase()}</b>. Le geste tient tout seul, on l’ancre.` });
  }
  // Tendance des crises (durées)
  const inc = state.incidents.filter((i) => i.child_id === childId && i.started_at && i.ended_at).sort((a, b) => a.started_at.localeCompare(b.started_at));
  if (inc.length >= 4) {
    const half = Math.floor(inc.length / 2);
    const dur = (arr: typeof inc) => Math.round(arr.reduce((s, i) => s + (Date.parse(i.ended_at!) - Date.parse(i.started_at)) / 60000, 0) / arr.length);
    const older = dur(inc.slice(0, half)), recent = dur(inc.slice(half));
    if (recent < older) items.push({ at: inc[inc.length - 1].started_at, text: `Les moments sensibles deviennent <b>plus courts</b> (${recent} min en moyenne, contre ${older} avant). ${calms[0] ? `${calms[0][0]} confirmé comme meilleure aide.` : ''}` });
  }
  // Progrès émergents
  for (const f of forces.emerging.slice(0, 1)) items.push({ at: new Date(Date.now() - 10 * 86400000).toISOString(), text: `<b>${f}</b> progresse. Le parcours de consolidation est lancé.`, warn: false });
  items.sort((a, b) => b.at.localeCompare(a.at));
  return items.slice(0, 5).map((it, i) => ({ date: cap(relativeDay(it.at)), version: version - i, text: it.text, warn: it.warn }));
}
