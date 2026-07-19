import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import {
  ArrowLeft, Check, X, Plus,
  MessagesSquare, PersonStanding, Utensils, Users, Puzzle, Hand,
} from 'lucide-react';
import { activeChild, actions, acquiredCompetences, allGameProgress, growthPoints, useAppState } from '../lib/store.js';
import { gameByCode } from '../lib/games.js';
import { relativeDay, formatDate } from '../lib/format.js';
import { avatarDisplayName, avatarGlyph, computeGrowthStage } from '../lib/avatars.js';
import {
  DOMAINS, ACQ_LEVELS, acqLevel, domainOf, activitiesOf,
  type Activity,
} from '../lib/activities.js';
import type { ActivityLog } from '../lib/types.js';
import type { View } from '../App.js';

const DOMAIN_ICON: Record<string, (p: { size?: number }) => JSX.Element> = {
  MessagesSquare, PersonStanding, Utensils, Users, Puzzle, Hand,
};
function DomainIcon({ name, size = 20 }: { name: string; size?: number }) {
  const I = DOMAIN_ICON[name] ?? Puzzle;
  return <I size={size} />;
}

/** Module Activités : noter les séances et suivre les acquis, compétence par
 * compétence, sur une échelle d'acquisition à 4 crans (déterministe, aucune IA). */
export function Activites({ go }: { go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const [tab, setTab] = useState<'acquis' | 'catalogue' | 'jeux'>('acquis');
  const [rating, setRating] = useState<Activity | null>(null);

  const byActivity = useMemo(() => {
    const m = new Map<string, ActivityLog[]>();
    for (const l of state.activityLogs) {
      if (l.child_id !== child?.id) continue;
      const a = m.get(l.activity_id) ?? [];
      a.push(l);
      m.set(l.activity_id, a);
    }
    for (const arr of m.values()) arr.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
    return m;
  }, [state.activityLogs, child?.id]);

  const currentLevel = (id: string) => byActivity.get(id)?.[0]?.level ?? 0;
  const totalSessions = useMemo(() => state.activityLogs.filter((l) => l.child_id === child?.id).length, [state.activityLogs, child?.id]);

  const acquiredN = child ? acquiredCompetences(child.id, state) : 0;
  const stage = child ? computeGrowthStage(growthPoints(child.id, state)) : 1;
  const avatarName = child ? avatarDisplayName(child.avatar_key, child.avatar_custom_name) : '';
  const avatarIcon = child ? avatarGlyph(child.avatar_key, stage) : '';

  return (
    <div className="reveal">
      <div className="row" style={{ gap: 10, margin: '2px 2px 14px', alignItems: 'center' }}>
        <button className="icon-btn" onClick={() => go('accueil')} aria-label="Retour"><ArrowLeft size={18} /></button>
        <div>
          <h2 style={{ fontSize: 24 }}>Activités</h2>
          <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>Ce que {child?.first_name ?? 'l’enfant'} fait, et ce qu’il acquiert au fil des séances.</p>
        </div>
      </div>

      <div className="acq-tabs">
        <button className={`acq-tab ${tab === 'acquis' ? 'on' : ''}`} onClick={() => setTab('acquis')}>Les acquis</button>
        <button className={`acq-tab ${tab === 'catalogue' ? 'on' : ''}`} onClick={() => setTab('catalogue')}>Noter une activité</button>
        <button className={`acq-tab ${tab === 'jeux' ? 'on' : ''}`} onClick={() => setTab('jeux')}>Progression des jeux</button>
      </div>

      {tab !== 'jeux' && (tab === 'acquis' ? (
        totalSessions === 0 ? (
          <div className="card jl-empty">
            <div className="big">🌱</div>
            <p style={{ marginTop: 10 }}>Aucune activité notée pour l’instant.<br />Choisissez une activité à faire ensemble.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setTab('catalogue')}>Voir le catalogue</button>
          </div>
        ) : (
          <>
          <div className="card acq-avatar">
            <span className="acq-avatar-ico">{avatarIcon}</span>
            <div className="grow" style={{ minWidth: 0 }}>
              <b style={{ fontSize: 15.5 }}>{avatarName} grandit avec {child?.first_name ?? 'l’enfant'}</b>
              <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>{acquiredN} compétence{acquiredN > 1 ? 's' : ''} acquise{acquiredN > 1 ? 's' : ''} · stade {stage}/4 du Baobab</p>
              <div className="acq-avatar-bar"><i style={{ width: `${(stage / 4) * 100}%` }} /></div>
            </div>
          </div>
          {DOMAINS.map((d) => {
            const acts = activitiesOf(d.key);
            const tried = acts.filter((a) => byActivity.has(a.id));
            const levels = tried.map((a) => currentLevel(a.id));
            const acquired = levels.filter((l) => l === 4).length;
            const avg = levels.length ? levels.reduce((s, l) => s + l, 0) / levels.length : 0;
            return (
              <div className="card" key={d.key} style={{ marginBottom: 14 }}>
                <div className="acq-domain-head">
                  <span className="acq-domain-ico" style={{ color: d.tint, background: `color-mix(in srgb, ${d.tint} 14%, var(--surface))` }}><DomainIcon name={d.icon} size={20} /></span>
                  <div className="grow">
                    <b style={{ fontSize: 15.5 }}>{d.label}</b>
                    <div className="acq-progress"><i style={{ width: `${(avg / 4) * 100}%`, background: d.tint }} /></div>
                  </div>
                  <span className="acq-domain-n">{tried.length ? `${acquired}/${tried.length} acquis` : '—'}</span>
                </div>

                {tried.length === 0 ? (
                  <button className="acq-start" onClick={() => setTab('catalogue')}><Plus size={15} /> Commencer une activité de ce domaine</button>
                ) : (
                  tried.map((a) => {
                    const lvl = currentLevel(a.id);
                    const meta = acqLevel(lvl);
                    const logs = byActivity.get(a.id)!;
                    return (
                      <div className="acq-row" key={a.id} role="button" tabIndex={0} onClick={() => setRating(a)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setRating(a); }}>
                        <div className="grow">
                          <div className="acq-row-title">{a.label}</div>
                          <div className="acq-dots">
                            {[1, 2, 3, 4].map((n) => <i key={n} className={n <= lvl ? 'on' : ''} style={n <= lvl ? { background: meta.tint } : undefined} />)}
                          </div>
                          <div className="acq-row-meta">{logs.length} séance{logs.length > 1 ? 's' : ''} · dernière {relativeDay(logs[0].occurred_at)}</div>
                        </div>
                        <span className="acq-badge" style={{ color: meta.tint, background: `color-mix(in srgb, ${meta.tint} 15%, var(--surface))` }}>{meta.short}</span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
          </>
        )
      ) : (
        DOMAINS.map((d) => (
          <div key={d.key} style={{ marginBottom: 8 }}>
            <div className="acq-cat-head">
              <span className="acq-domain-ico sm" style={{ color: d.tint, background: `color-mix(in srgb, ${d.tint} 14%, var(--surface))` }}><DomainIcon name={d.icon} size={16} /></span>
              {d.label}
            </div>
            <div className="card jl-card">
              {activitiesOf(d.key).map((a) => {
                const lvl = currentLevel(a.id);
                const meta = lvl ? acqLevel(lvl) : null;
                return (
                  <div className="acq-cat-row" key={a.id}>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="acq-row-title">{a.label}</div>
                      <div className="acq-row-meta">{a.example}</div>
                    </div>
                    {meta && <span className="acq-badge sm" style={{ color: meta.tint, background: `color-mix(in srgb, ${meta.tint} 15%, var(--surface))` }}>{meta.short}</span>}
                    <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => setRating(a)}><Plus size={15} /> Noter</button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ))}

      {tab === 'jeux' && child && <GameProgressSection childId={child.id} />}

      {rating && <RateModal activity={rating} prev={currentLevel(rating.id)} logs={byActivity.get(rating.id) ?? []} onClose={() => setRating(null)} />}
    </div>
  );
}

/** Tableau de progression des jeux (CDC Mode Enfant v1.1 §6.1) : niveau N1/N2/N3,
 * fruits gagnés et parties jouées par activité. Piloté par la couche gameProgress. */
function GameProgressSection({ childId }: { childId: string }) {
  const state = useAppState();
  const rows = allGameProgress(childId, state);
  if (rows.length === 0) {
    return (
      <div className="card jl-empty">
        <div className="big">🎮</div>
        <p style={{ marginTop: 10 }}>Aucun jeu joué pour l’instant.<br />La progression apparaîtra ici, activité par activité.</p>
      </div>
    );
  }
  return (
    <div className="card jl-card">
      {rows.map(({ code, p }) => {
        const title = gameByCode(code)?.title ?? code;
        return (
          <div className="acq-cat-row" key={code}>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="acq-row-title">{title}</div>
              <div className="acq-row-meta">🍎 {p.fruits} fruit{p.fruits > 1 ? 's' : ''} · {p.attempts} partie{p.attempts > 1 ? 's' : ''}{p.wins ? ` · ${p.wins} réussie${p.wins > 1 ? 's' : ''}` : ''}</div>
            </div>
            <div className="gp-level" title={`Niveau ${p.level} sur 3`}>
              {[1, 2, 3].map((n) => <i key={n} className={n <= p.level ? 'on' : ''} />)}
              <span className="gp-level-n">N{p.level}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RateModal({ activity, prev, logs, onClose }: { activity: Activity; prev: number; logs: ActivityLog[]; onClose: () => void }) {
  const [level, setLevel] = useState(prev || 3);
  const [note, setNote] = useState('');
  const d = domainOf(activity.domain);

  function save() {
    actions.logActivity({ activity_id: activity.id, domain: activity.domain, level, note: note.trim() || undefined });
    onClose();
  }

  return createPortal(
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 2 }}>
          <span className="chip" style={{ color: d.tint }}><DomainIcon name={d.icon} size={13} /> {d.label}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <h3 style={{ fontSize: 18, marginTop: 8 }}>{activity.label}</h3>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{activity.example}</p>

        <div className="section-title">Comment ça s’est passé ?</div>
        <div className="acq-scale">
          {ACQ_LEVELS.map((l) => (
            <button key={l.level} className={`acq-scale-btn ${level === l.level ? 'on' : ''}`} onClick={() => setLevel(l.level)}
              style={{ '--tint': l.tint } as CSSProperties}>
              <span className="acq-scale-dot" />
              {l.label}
            </button>
          ))}
        </div>

        <div className="section-title">Un mot (optionnel)</div>
        <textarea className="jl-note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Comment il a fait, ce qui a aidé…" />

        {logs.length > 0 && (
          <div className="acq-history">
            <div className="acq-history-lbl">Progression · {logs.length} séance{logs.length > 1 ? 's' : ''}</div>
            <div className="acq-curve">
              {[...logs].reverse().map((l) => {
                const m = acqLevel(l.level);
                return (
                  <div className="acq-curve-col" key={l.id} title={`${m.label} · ${formatDate(l.occurred_at)}`}>
                    <div className="acq-curve-bar-wrap"><span className="acq-curve-bar" style={{ height: `${(l.level / 4) * 100}%`, background: m.tint }} /></div>
                    <div className="acq-curve-x">{formatDate(l.occurred_at)}</div>
                  </div>
                );
              })}
            </div>
            <div className="acq-curve-cap">De « Pas encore » vers « Acquis » — barre plus haute, plus autonome.</div>
          </div>
        )}

        <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }} onClick={save}>
          <Check size={18} /> Enregistrer la séance
        </button>
      </div>
    </div>,
    document.body,
  );
}
