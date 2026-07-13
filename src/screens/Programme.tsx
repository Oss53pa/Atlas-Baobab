import { useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Volume2, ChevronRight, Handshake } from 'lucide-react';
import { activeChild, actions, acquiredCompetences, growthPoints, useAppState } from '../lib/store.js';
import { avatarGlyph, computeGrowthStage } from '../lib/avatars.js';
import { DOMAINS, ACTIVITIES, ACQ_LEVELS, acqLevel, domainOf, activitiesOf, type Activity } from '../lib/activities.js';
import { relativeDay } from '../lib/format.js';
import { Tabs } from '../components/Tabs.js';
import type { View } from '../App.js';

const SCORE_EMOJI = ['🌱', '🤝', '💪', '⭐'];
const ROLE_LABEL: Record<string, string> = { soutien: 'Soutien', force: 'Force ✨', révision: 'Révision' };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function Programme({ go }: { go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const [rating, setRating] = useState<{ a: Activity; role: string } | null>(null);
  const [tab, setTab] = useState<'prog' | 'sens'>('prog');

  const logs = useMemo(() => state.activityLogs.filter((l) => l.child_id === child?.id), [state.activityLogs, child?.id]);
  const latest = useMemo(() => {
    const m = new Map<string, { level: number; at: string }>();
    for (const l of logs) { const c = m.get(l.activity_id); if (!c || l.occurred_at > c.at) m.set(l.activity_id, { level: l.level, at: l.occurred_at }); }
    return m;
  }, [logs]);
  const levelOf = (id: string) => latest.get(id)?.level ?? 0;

  const forceDomain = useMemo(() => {
    let best = 'communication', bestAvg = -1;
    for (const d of DOMAINS) {
      const tried = activitiesOf(d.key).filter((a) => latest.has(a.id));
      if (!tried.length) continue;
      const avg = tried.reduce((s, a) => s + levelOf(a.id), 0) / tried.length;
      if (avg > bestAvg) { bestAvg = avg; best = d.key; }
    }
    return best;
  }, [latest]);

  const sessions = useMemo(() => {
    const now = new Date();
    const di = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const doneToday = new Set(logs.filter((l) => l.occurred_at.slice(0, 10) === ymd(now)).map((l) => l.activity_id));
    const pick = (arr: Activity[], off: number) => (arr.length ? arr[(di + off) % arr.length] : null);
    const comm = activitiesOf('communication').filter((a) => levelOf(a.id) < 4);
    const force = activitiesOf(forceDomain);
    const acq = ACTIVITIES.filter((a) => levelOf(a.id) >= 4);
    const raw = [
      { a: pick(comm, 0), role: 'soutien' },
      { a: pick(force, 1), role: 'force' },
      { a: pick(acq, 2), role: 'révision' },
    ].filter((s): s is { a: Activity; role: string } => !!s.a);
    const seen = new Set<string>();
    return raw.filter((s) => (seen.has(s.a.id) ? false : (seen.add(s.a.id), true))).slice(0, 3)
      .map((s) => ({ ...s, done: doneToday.has(s.a.id), level: levelOf(s.a.id) }));
  }, [logs, latest, forceDomain]);

  const week = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monday = new Date(todayStart); monday.setDate(monday.getDate() - ((now.getDay() + 6) % 7));
    const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const days = [];
    let doneTotal = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(d.getDate() + i);
      const n = logs.filter((l) => l.occurred_at.slice(0, 10) === ymd(d)).length;
      doneTotal += n;
      days.push({ dow: DOW[i], n, today: ymd(d) === ymd(now), future: d > todayStart });
    }
    return { days, doneTotal };
  }, [logs]);

  if (!child) return <div className="card">Aucun enfant sélectionné.</div>;

  const acquired = acquiredCompetences(child.id, state);
  const stage = computeGrowthStage(growthPoints(child.id, state));
  const tree = avatarGlyph(child.avatar_key, stage);
  const palier = stage + 1;
  const palierPct = Math.min(100, Math.round((acquired / 8) * 100));
  const weekN = Math.min(12, Math.max(1, Math.floor((Date.now() - Date.parse(child.created_at)) / (7 * 86400000)) + 1));

  return (
    <div className="reveal">
      <h2 style={{ fontSize: 24 }}>Notre programme</h2>
      <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px 0' }}>Ce que {child.first_name} fait cette semaine, et ce qu’il gagne en le faisant. Peu, mais tous les jours.</p>

      {/* Bandeau saison */}
      <div className="pg-season">
        <span className="pg-season-tree">{tree}</span>
        <div style={{ minWidth: 0 }}>
          <b style={{ fontSize: 15 }}>Saison 1 · Semaine {weekN} sur 12</b>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Arbre : stade {stage} sur 4 · {acquired} feuille{acquired > 1 ? 's' : ''} · Semaine Palier dans {Math.max(1, 12 - weekN)} semaines</div>
        </div>
        <div className="pg-sbar">
          <div className="pg-track"><i style={{ width: `${palierPct}%` }} /></div>
          <div className="pg-cap"><span>vers le Palier {palier}</span><span>{palierPct}%</span></div>
        </div>
      </div>

      <Tabs tabs={[{ key: 'prog', label: 'Le programme' }, { key: 'sens', label: 'L’arbre & le pourquoi' }]} active={tab} onChange={setTab} />

      {tab === 'prog' && (
      <div className="home-col">
          {/* Aujourd'hui */}
          <div className="card">
            <div className="section-title" style={{ marginTop: 0, display: 'flex' }}>Aujourd’hui · {sessions.length} session{sessions.length > 1 ? 's' : ''}
              <button className="home-link" onClick={() => go('activites')}>le catalogue <ChevronRight size={13} /></button>
            </div>
            {sessions.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Notez une première activité pour lancer le programme.</p>
            ) : sessions.map((s) => {
              const G = domainOf(s.a.domain);
              return (
                <button key={s.a.id} className={`pg-session ${s.done ? 'done' : ''}`} onClick={() => setRating({ a: s.a, role: s.role })}>
                  <span className="pg-session-ic" style={{ color: G.tint }}>{roleEmoji(s.role)}</span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="pg-session-t">{s.a.label}</span>
                    <span className="pg-session-d">{G.label} · {s.done ? <b>fait aujourd’hui · {acqLevel(s.level).short}</b> : `${ROLE_LABEL[s.role]} · touchez pour commencer`}</span>
                    <span className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                      <span className="pg-pill dom">{ROLE_LABEL[s.role]}</span>
                      {s.role === 'force' && <span className="pg-pill papa"><Handshake size={11} /> Proposer à Papa ?</span>}
                    </span>
                  </span>
                  <span className={`pg-go ${s.done ? 'done' : ''}`}>{s.done ? <><Check size={14} /> Fait</> : <>On commence ›</>}</span>
                </button>
              );
            })}
            <div className="pg-softnote">Un jour difficile ? CORTEX allège tout seul — mieux vaut une petite session réussie que trois de trop. C’est très bien comme ça.</div>
          </div>

          {/* La semaine */}
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>La semaine · {week.doneTotal} session{week.doneTotal > 1 ? 's' : ''} faite{week.doneTotal > 1 ? 's' : ''}</div>
            <div className="pg-wk">
              {week.days.map((d, i) => (
                <div className={`pg-wd ${d.today ? 'today' : ''}`} key={i}>
                  <span className="pg-wd-s">{d.future ? '··' : d.n >= 2 ? '✓✓' : d.n === 1 ? '✓·' : '··'}</span>{d.dow}
                </div>
              ))}
            </div>
          </div>

          {/* Vers le palier */}
          <div className="card">
            <div className="section-title" style={{ marginTop: 0, display: 'flex' }}>Vers le Palier {palier}
              <button className="home-link" onClick={() => go('activites')}>grille complète <ChevronRight size={13} /></button>
            </div>
            {DOMAINS.map((d) => {
              const tried = activitiesOf(d.key).filter((a) => latest.has(a.id));
              if (!tried.length) return null;
              const acq = tried.filter((a) => levelOf(a.id) >= 4).length;
              return (
                <div className="pg-dom" key={d.key}>
                  <div className="pg-dh"><span style={{ color: d.tint }}>●</span> {d.label} {d.key === 'communication' && <span className="pg-prior">priorité du bilan</span>}<span className="pg-dh-tag">{acq} sur {tried.length} acquise{tried.length > 1 ? 's' : ''}</span></div>
                  {tried.map((a) => {
                    const lvl = levelOf(a.id); const meta = acqLevel(lvl); const logsN = logs.filter((l) => l.activity_id === a.id).length;
                    return (
                      <div className="pg-skill" key={a.id}>
                        <span className="pg-skill-n">{a.label}<br /><small>{logsN} séance{logsN > 1 ? 's' : ''} · dernière {relativeDay(latest.get(a.id)!.at)}</small></span>
                        <span className="pg-lvl">
                          {[1, 2, 3].map((n) => <span key={n} className={n <= Math.ceil(lvl * 3 / 4) ? `f${Math.min(3, lvl - 1)}` : ''} style={n <= Math.ceil(lvl * 3 / 4) ? { background: meta.tint } : undefined} />)}
                          <span className="pg-lvl-cap" style={{ color: meta.tint }}>{meta.short}{lvl >= 4 ? ' ⭐' : ''}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'sens' && (
      <div className="home-col">
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="section-title" style={{ marginTop: 0, justifyContent: 'center' }}>L’arbre de {child.first_name}</div>
            <div style={{ fontSize: 60, lineHeight: 1 }}>{tree}</div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>{acquired} feuille{acquired > 1 ? 's' : ''} · il pousse sur ses <b style={{ color: '#4e7a50' }}>vrais progrès</b>, jamais sur le temps d’écran. Il ne perd jamais rien.</p>
          </div>
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Pourquoi ces activités ?</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>Le bilan dit : <b style={{ color: 'var(--amberd, #b07c2a)' }}>communication à soutenir</b>, {domainOf(forceDomain).label.toLowerCase()} en force ✨. CORTEX dose donc : <b>60 %</b> soutien, <b>25 %</b> sa force (le plaisir d’abord), <b>15 %</b> révision des acquis pour ne rien perdre.</p>
          </div>
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Semaine Palier · dans {Math.max(1, 12 - weekN)} semaines</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>Une semaine normale pour {child.first_name} — les mêmes jeux, la même ambiance. C’est votre grille qui change, pas la sienne. À la fin : son <b>diplôme de saison</b> à imprimer 🎓.</p>
          </div>
      </div>
      )}

      {rating && <ActivityDoModal activity={rating.a} role={rating.role} prev={levelOf(rating.a.id)} onClose={() => setRating(null)} />}
    </div>
  );
}

function roleEmoji(role: string): string {
  return { soutien: '💬', force: '🥁', révision: '🔁' }[role] ?? '🧺';
}

function ActivityDoModal({ activity, role, prev, onClose }: { activity: Activity; role: string; prev: number; onClose: () => void }) {
  const [level, setLevel] = useState(prev || 3);
  const [like, setLike] = useState(1);
  const d = domainOf(activity.domain);
  const steps = [
    'Installez-vous au calme, face à face, sans autre sollicitation.',
    'Montrez une fois, puis laissez-le essayer. Attendez sans presser.',
    'Dès qu’il s’approche du but : encouragez avec joie, et recommencez.',
  ];
  function save() {
    actions.logActivity({ activity_id: activity.id, domain: activity.domain, level, note: like === 0 ? 'A adoré' : like === 2 ? 'A moins accroché' : undefined });
    onClose();
  }
  return createPortal(
    <div className="modal-scrim" onClick={onClose}>
      <div className="rg-guide" onClick={(e) => e.stopPropagation()}>
        <div className="rg-ghead"><span style={{ fontSize: 20 }}>{roleEmoji(role)}</span><span className="rg-ghead-t">{activity.label}</span><button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div>
        <div className="rg-gbody">
          <div className="pg-meta"><span className="pg-pill dom" style={{ color: d.tint }}>{d.label}{role === 'force' ? ' · sa force ✨' : ''}</span></div>
          <div className="pg-obj">🎯 <b>Objectif observable :</b> {activity.example}</div>
          {steps.map((s, i) => <div className="pg-st" key={i}><span className="pg-st-n">{i + 1}</span><span style={{ flex: 1 }}>{s}</span><Volume2 size={15} color="var(--text-muted)" /></div>)}
          <div className="pg-st"><span className="pg-st-n">💡</span><span style={{ flex: 1 }}>S’il se lasse, passez par ce qu’il aime — c’est le plaisir qui apprend, pas l’exercice.</span></div>

          <div className="section-title">Et alors, comment ça s’est passé ?</div>
          <div className="pg-sgrid">
            {ACQ_LEVELS.map((l, i) => (
              <button key={l.level} className={`pg-sopt ${level === l.level ? 'on' : ''}`} onClick={() => setLevel(l.level)}>
                <span className="pg-sopt-e">{SCORE_EMOJI[i]}</span><span className="pg-sopt-t">{l.short}</span>
              </button>
            ))}
          </div>
          <div className="pg-like">
            {['😊', '😐', '☹️'].map((e, i) => <button key={e} className={like === i ? 'on' : ''} onClick={() => setLike(i)}>{e}</button>)}
          </div>
        </div>
        <div className="rg-gfoot"><button className="btn btn-primary btn-block btn-lg" onClick={save}><Check size={18} /> Enregistrer · +1 vers sa feuille 🌿</button></div>
      </div>
    </div>,
    document.body,
  );
}
