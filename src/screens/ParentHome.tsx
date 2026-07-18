import { useMemo, useState, type CSSProperties } from 'react';
import {
  Compass, NotebookPen, Blocks,
  Star, Check, HelpCircle, ChevronRight, Sprout, HandHeart, Clock,
} from 'lucide-react';
import { suggestedFiches } from '../lib/togetherPlay.js';
import { activeChild, growthPoints, acquiredCompetences, childPauseCount7d, tensionToday, twinProfile, useAppState } from '../lib/store.js';
import { ageYears, relativeDay, formatTime, dayLabelFull } from '../lib/format.js';
import { KIND_GLYPH, KIND_TINT, WEATHER_GLYPH, WEATHER_TINT, GlyphNote, GlyphCloud } from '../components/glyphs.js';
import { WEATHER, kindLabel, caregiverTint } from '../components/journalKit.js';
import { avatarDisplayName, avatarGlyph, computeGrowthStage } from '../lib/avatars.js';
import { ACTIVITIES, acqLevel } from '../lib/activities.js';
import type { View } from '../App.js';
import type { Observation } from '../lib/types.js';

const BAND_COLOR: Record<string, string> = { green: 'var(--radar-green)', orange: 'var(--radar-orange)', red: 'var(--radar-red)' };

const BAND_PLAN: Record<string, { title: string; sub: (n: string) => string; steps: { do: string; why: string }[] }> = {
  green: {
    title: 'Belle journée',
    sub: (n) => `${n} est plutôt serein aujourd’hui. Un bon moment pour avancer, en douceur.`,
    steps: [
      { do: 'Proposez une activité nouvelle, courte', why: 'Les jours sereins sont les meilleurs pour apprendre sans pression.' },
      { do: 'Félicitez un geste réussi, à voix haute', why: 'Nommer une réussite l’ancre et donne envie de recommencer.' },
    ],
  },
  orange: {
    title: 'Journée à surveiller',
    sub: (n) => `${n} pourrait avoir besoin d’un peu plus d’attention. Voici le plan.`,
    steps: [
      { do: 'Anticipez les transitions avec ses images', why: 'Prévenir un changement réduit l’angoisse de l’imprévu.' },
      { do: 'Préparez le coin calme avant le soir', why: 'Un refuge prêt évite l’escalade quand la fatigue monte.' },
      { do: 'Allégez la charge sensorielle du soir', why: 'Moins de bruit et de lumière, moins de surcharge.' },
    ],
  },
  red: {
    title: 'Journée sensible',
    sub: (n) => `${n} aura besoin de plus de douceur aujourd’hui. Voici le plan.`,
    steps: [
      { do: 'Allégez le programme : gardez l’essentiel', why: 'Moins de sollicitations, moins de risque de débordement.' },
      { do: 'Préparez son coin calme avant la fin d’après-midi', why: 'Prêt à l’avance, il sert de refuge au premier signe.' },
      { do: 'Prévenez la sortie d’école avec ses 2 images', why: 'La transition école → maison est un moment à risque.' },
    ],
  },
};

export function ParentHome({ go }: { go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const tension = useMemo(() => (child ? tensionToday(child.id, state) : null), [child, state]);
  const profile = useMemo(() => (child ? twinProfile(child.id, state) : null), [child, state]);

  const obs = useMemo(() => (child ? state.observations.filter((o) => o.child_id === child.id) : []), [state.observations, child?.id]);
  const pauseCount = useMemo(() => (child ? childPauseCount7d(child.id, state) : 0), [child, state]);
  const playSuggestions = useMemo(() => (child ? suggestedFiches(child.id, state) : []), [child, state]);

  const week = useMemo(() => {
    if (!child) return null;
    const day = 86400000;
    const pad = (n: number) => String(n).padStart(2, '0');
    const lkey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
    const wxByDay = new Map<string, string>();
    for (const o of obs) if (o.kind === 'weather') wxByDay.set(lkey(new Date(o.occurred_at)), String(o.context?.wx ?? ''));
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart - i * day);
      days.push({ dow: i === 0 ? 'Auj.' : JOURS[d.getDay()], wx: wxByDay.get(lkey(d)) ?? null, today: i === 0 });
    }
    const since = (from: number) => obs.filter((o) => Date.parse(o.occurred_at) >= from);
    const wObs = since(todayStart - 6 * day);
    const wActs = state.activityLogs.filter((l) => l.child_id === child.id && Date.parse(l.occurred_at) >= todayStart - 6 * day);
    return {
      days,
      reussites: wObs.filter((o) => o.kind === 'success').length,
      activites: wActs.length,
      notes: wObs.length,
      aidants: new Set(wObs.map((o) => o.author).filter(Boolean)).size,
      feuilles: acquiredCompetences(child.id, state),
    };
  }, [child, obs, state]);

  const goodNews = useMemo(() => {
    if (!child) return null;
    const byAct = new Map<string, { at: string; level: number }[]>();
    for (const l of state.activityLogs) {
      if (l.child_id !== child.id) continue;
      const arr = byAct.get(l.activity_id) ?? [];
      arr.push({ at: l.occurred_at, level: l.level });
      byAct.set(l.activity_id, arr);
    }
    let best: { label: string; first: number; last: number; weeks: number; delta: number } | null = null;
    for (const [id, logs] of byAct) {
      if (logs.length < 2) continue;
      logs.sort((a, b) => a.at.localeCompare(b.at));
      const first = logs[0], last = logs[logs.length - 1];
      const delta = last.level - first.level;
      if (delta <= 0) continue;
      const weeks = Math.max(1, Math.round((Date.parse(last.at) - Date.parse(first.at)) / (7 * 86400000)));
      const label = ACTIVITIES.find((a) => a.id === id)?.label ?? 'Une compétence';
      if (!best || delta > best.delta) best = { label, first: first.level, last: last.level, weeks, delta };
    }
    if (best) {
      return `${best.label} : de « ${acqLevel(best.first).short} » à « ${acqLevel(best.last).short} » en ${best.weeks} semaine${best.weeks > 1 ? 's' : ''}. ${best.last >= 4 ? 'C’est acquis, tout seul !' : 'Presque acquis.'}`;
    }
    const succ = obs.filter((o) => o.kind === 'success').length;
    if (succ > 0) return `${child.first_name} a déjà ${succ} réussite${succ > 1 ? 's' : ''} enregistrée${succ > 1 ? 's' : ''}. Chaque petit pas compte, et vous les voyez.`;
    return `Continuez à noter : chaque moment aide ${child.first_name} à grandir, et fait pousser son baobab.`;
  }, [child, state.activityLogs, obs]);

  const feed = useMemo(
    () => obs.slice().sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 5),
    [obs],
  );

  const [checked, setChecked] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(planKey(child?.id)) || '[]'); } catch { return []; }
  });
  const [whyOpen, setWhyOpen] = useState<number | null>(null);
  const [howCalc, setHowCalc] = useState(false);
  const [fb, setFb] = useState<Record<number, string>>({});

  if (!child || !tension || !profile || !week) {
    return (
      <div className="card">
        <h3>Bienvenue</h3>
        <p className="muted" style={{ marginTop: 8 }}>Créez le profil de votre enfant pour commencer.</p>
        <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => go('reglages')}>Créer un profil</button>
      </div>
    );
  }

  const name = child.first_name;
  const bandColor = BAND_COLOR[tension.band];
  const plan = BAND_PLAN[tension.band];
  const factors = tension.factors.slice(0, 3).map((f) => f.label.split('(')[0].trim());
  const topTriggers = profile.triggers.filter((t) => t.confidence !== 'faible').slice(0, 2);
  const stage = computeGrowthStage(growthPoints(child.id, state));
  const avatarName = avatarDisplayName(child.avatar_key, child.avatar_custom_name);
  const avatarIcon = avatarGlyph(child.avatar_key, stage);

  function toggleStep(i: number) {
    setChecked((c) => {
      const n = c.includes(i) ? c.filter((x) => x !== i) : [...c, i];
      try { localStorage.setItem(planKey(child?.id), JSON.stringify(n)); } catch { /* quota */ }
      return n;
    });
  }

  function feedSentence(o: Observation): string {
    if (typeof o.context?.note === 'string' && o.context.note) return o.context.note;
    if (o.kind === 'weather') return String(o.context?.weather ?? 'Météo notée');
    const place = typeof o.context?.place === 'string' ? ` (${o.context.place})` : '';
    return kindLabel(o.kind) + place;
  }

  return (
    <div className="reveal home">
      {/* En-tête */}
      <div className="home-head">
        <div>
          <h2 style={{ fontSize: 25, letterSpacing: '-0.01em' }}>Bonjour</h2>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 1, textTransform: 'capitalize' }}>{dayLabelFull(new Date().toISOString())}</p>
        </div>
        <button className="home-kid" onClick={() => go('reglages')}>
          <span className="home-kid-av">{avatarIcon}</span>
          {name}, {ageYears(child.birth_date)} ans
        </button>
      </div>

      <div className="home-grid">
        {/* ── Colonne principale ────────────────────────────────── */}
        <div className="home-col">

          {/* HERO : le jour comme un plan, pas une alarme */}
          <div className="card home-hero" style={{ '--band': bandColor } as CSSProperties}>
            <div className="home-hero-top">
              <div className="home-gauge">
                <svg viewBox="0 0 100 56">
                  <path d="M6 50 A44 44 0 0 1 94 50" fill="none" stroke="var(--border)" strokeWidth="9" strokeLinecap="round" />
                  <path d="M6 50 A44 44 0 0 1 94 50" fill="none" stroke={bandColor} strokeWidth="9" strokeLinecap="round" pathLength={100} strokeDasharray={`${tension.score} 100`} />
                </svg>
                <span className="home-gauge-dot" style={{ background: bandColor }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: 20 }}>{plan.title}</h3>
                <p className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>{plan.sub(name)}</p>
                <div className="home-factors">
                  {factors.map((f) => <span className="home-factor" key={f}>{f}</span>)}
                  <button className="home-factor how" onClick={() => setHowCalc((v) => !v)}><HelpCircle size={12} /> Comment c’est calculé ?</button>
                </div>
                {howCalc && (
                  <p className="notice" style={{ marginTop: 8 }}>
                    Cet indice est calculé <b>sur votre téléphone</b>, par des règles fixes (sommeil, routine, déclencheurs récents), <b>jamais par une IA</b>. C’est un repère du jour, pas une certitude.
                  </p>
                )}
              </div>
            </div>

            <div className="home-plan">
              <div className="home-plan-t"><Sprout size={16} color="var(--radar-green)" /> Le plan du jour <span>· cochez au fil de la journée</span></div>
              {plan.steps.map((s, i) => (
                <div key={i}>
                  <div className={`home-step ${checked.includes(i) ? 'done' : ''}`} onClick={() => toggleStep(i)}>
                    <span className="home-step-cb">{checked.includes(i) && <Check size={13} />}</span>
                    <span className="grow">{s.do}</span>
                    <button className="home-why" onClick={(e) => { e.stopPropagation(); setWhyOpen(whyOpen === i ? null : i); }}>pourquoi ?</button>
                  </div>
                  {whyOpen === i && <p className="home-why-txt">{s.why}</p>}
                </div>
              ))}
            </div>

            <button className="btn btn-accent btn-block" style={{ marginTop: 12 }} onClick={() => go('reagir')}>
              <Compass size={16} /> Un comportement vous dépasse ? On vous guide
            </button>

            {/* Alerte douce, non alarmiste (CDC Kessy §6.7) : pauses détresse répétées cette semaine. */}
            {pauseCount >= 3 && (
              <div className="mini-card" style={{ marginTop: 10 }}>
                <span style={{ fontSize: 18 }}>🫧</span>
                <span>
                  {name} a utilisé la pause « une pause » {pauseCount} fois cette semaine.
                  Ce n’est pas un diagnostic — juste un repère. <button className="home-link" style={{ display: 'inline', padding: 0 }} onClick={() => go('coach')}>Voir le Coach du jour</button>
                </span>
              </div>
            )}
          </div>

          {/* SEMAINE = météo */}
          <div className="card">
            <div className="section-title" style={{ margin: '0 0 12px', display: 'flex' }}>La semaine de {name}
              <button className="home-link" onClick={() => go('carnet')}>voir le carnet <ChevronRight size={13} /></button>
            </div>
            <div className="home-week">
              {week.days.map((d, i) => {
                const G = d.wx ? (WEATHER_GLYPH[d.wx] ?? GlyphCloud) : GlyphCloud;
                const tint = d.wx ? (WEATHER_TINT[d.wx] ?? '#8a9bb0') : 'var(--text-muted)';
                return (
                  <div className={`home-day ${d.today ? 'today' : ''}`} key={i}>
                    <span className="home-day-ic" style={{ color: tint, opacity: d.wx ? 1 : 0.35 }}><G size={22} /></span>
                    <span className="home-day-d">{d.dow}</span>
                  </div>
                );
              })}
            </div>
            <div className="home-pills">
              <span className="home-pill"><Star size={13} color="#d99c3f" /> {week.reussites} réussite{week.reussites > 1 ? 's' : ''}</span>
              <span className="home-pill"><Blocks size={13} color="var(--radar-green)" /> {week.activites} activité{week.activites > 1 ? 's' : ''}</span>
              <span className="home-pill"><NotebookPen size={13} /> {week.notes} note{week.notes > 1 ? 's' : ''} · {week.aidants} aidant{week.aidants > 1 ? 's' : ''}</span>
              <span className="home-pill"><Sprout size={13} color="var(--radar-green)" /> {week.feuilles} feuille{week.feuilles > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* BONNE NOUVELLE */}
          <div className="card home-good">
            <div className="section-title" style={{ margin: '0 0 8px', color: '#4e7a50' }}>La bonne nouvelle</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.5 }}><Star size={16} color="#d99c3f" style={{ verticalAlign: -2 }} /> {goodNews}</p>
          </div>
        </div>

        {/* ── Colonne latérale ──────────────────────────────────── */}
        <div className="home-col">

          {/* Rituel du soir */}
          <div className="card home-rituel">
            <span className="home-rituel-tree">{avatarIcon}</span>
            <div className="grow" style={{ minWidth: 0 }}>
              <b style={{ fontSize: 14.5 }}>Votre rituel du soir est prêt</b>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>2 minutes · la météo du jour, le conseil du soir, votre réflexe</div>
            </div>
            <button className="btn btn-primary" style={{ flex: '0 0 auto' }} onClick={() => go('journal')}>Commencer</button>
          </div>

          {/* CORTEX observe : des contextes, jamais des personnes */}
          <div className="card">
            <div className="section-title" style={{ margin: '0 0 10px', display: 'flex' }}>Ce que {avatarName} remarque
              <button className="home-link" onClick={() => go('jumeau')}>tout voir <ChevronRight size={13} /></button>
            </div>
            {topTriggers.length ? topTriggers.map((t, i) => (
              <div className="home-obs" key={`${t.dimension}-${t.value}`} style={{ marginTop: i ? 8 : 0 }}>
                <p style={{ fontSize: 14, lineHeight: 1.5 }}>{cortexInsight(t.dimension, t.value)} <span className="home-conf">{confLabel(t.confidence)}</span></p>
                {i === 0 && (
                  <div className="home-fb">
                    {fb[i] ? <span className="muted" style={{ fontSize: 12.5 }}>Merci, c’est noté.</span> : (
                      <>
                        <button onClick={() => setFb((f) => ({ ...f, [i]: 'up' }))}>Utile</button>
                        <button onClick={() => setFb((f) => ({ ...f, [i]: 'down' }))}>Pas pour nous</button>
                        <button className="strong" onClick={() => go('reagir')}>Que faire ? <ChevronRight size={12} /></button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )) : (
              <div className="home-obs"><p className="muted" style={{ fontSize: 13.5 }}>Pas encore assez de données. Continuez à noter, {avatarName} apprendra les habitudes de {name}.</p></div>
            )}
            <p className="notice" style={{ marginTop: 10 }}>Tendances calculées sur votre téléphone, par des règles fixes, jamais par une IA. Ce sont des repères, pas des certitudes.</p>
          </div>

          {/* On joue ensemble (P01 §4.4) : suggestion douce, jamais impérative */}
          {playSuggestions.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ margin: '0 0 4px', display: 'flex' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><HandHeart size={15} color="var(--accent)" /> On joue ensemble</span>
                <button className="home-link" onClick={() => go('ensemble')}>tout voir <ChevronRight size={13} /></button>
              </div>
              <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 10px' }}>Cette semaine, si vous avez un moment — sans écran, avec ce que vous avez.</p>
              <div className="home-play">
                {playSuggestions.map((f) => (
                  <button key={f.id} className="home-play-c" onClick={() => go('ensemble')}>
                    <span className="home-play-p">{f.picto}</span>
                    <span className="home-play-t">{f.title}</span>
                    <span className="home-play-m"><Clock size={10} /> {f.duree} min</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activité récente : des phrases, par tous les aidants */}
          <div className="card">
            <div className="section-title" style={{ margin: '0 0 4px', display: 'flex' }}>Aujourd’hui, par tous les aidants
              <button className="home-link" onClick={() => go('journal')}>le journal <ChevronRight size={13} /></button>
            </div>
            {feed.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, padding: '8px 0' }}>Aucune note pour l’instant.</p>
            ) : feed.map((o) => {
              const isWx = o.kind === 'weather';
              const G = isWx ? (WEATHER_GLYPH[String(o.context?.wx ?? '')] ?? GlyphCloud) : (KIND_GLYPH[o.kind] ?? GlyphNote);
              const tint = isWx ? (WEATHER_TINT[String(o.context?.wx ?? '')] ?? '#6e9fb3') : (KIND_TINT[o.kind] ?? '#8a8378');
              return (
                <div className="home-item" key={o.id}>
                  <span className="home-item-ic" style={{ color: tint }}><G size={18} /></span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="home-item-tx">{feedSentence(o)}</div>
                    {o.author && <div className="home-item-by" style={{ '--who': caregiverTint(o.author) } as CSSProperties}>par {o.author}</div>}
                  </div>
                  <span className="home-item-when">{relativeDay(o.occurred_at) === 'Aujourd’hui' ? formatTime(o.occurred_at) : relativeDay(o.occurred_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

function planKey(childId?: string): string {
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `ab-plan-${childId ?? 'x'}-${day}`;
}

function confLabel(c: string): string {
  return { fort: 'tendance forte', moyen: 'tendance moyenne', faible: 'à confirmer', insufficient: 'à confirmer' }[c] ?? c;
}

function cortexInsight(dim: string, value: string): string {
  switch (dim) {
    case 'time': return `Les moments sensibles reviennent souvent ${timeFr(value)}.`;
    case 'place': return `Les tensions reviennent souvent au lieu « ${value} ».`;
    case 'people': return `Les tensions sont plus fréquentes en présence de « ${value} ».`;
    case 'noise': return 'Le bruit fort revient souvent avant les moments difficiles.';
    case 'suspected': return `« ${value} » revient souvent comme déclencheur.`;
    default: return `Un schéma se répète autour de « ${value} ».`;
  }
}
function timeFr(v: string): string {
  return { morning: 'le matin', afternoon: 'l’après-midi', evening: 'en fin de journée', night: 'la nuit' }[v] ?? v;
}
