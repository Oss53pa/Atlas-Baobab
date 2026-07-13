import { useState } from 'react';
import { Check, Pause, Play, ChevronRight, Sparkles, Plus, Flag, RefreshCw, Hand } from 'lucide-react';
import { activeChild, actions, useAppState } from '../lib/store.js';
import {
  CAP_TEMPLATES, MAX_ACTIVE_CAPS, capProgress, capStatusLabel, activeCaps, pausedCaps,
} from '../lib/gps.js';
import { isHardTime } from '../lib/coach.js';
import { speak } from '../lib/tts.js';
import { Tabs } from '../components/Tabs.js';
import type { Cap } from '../lib/types.js';
import type { View } from '../App.js';

export function Gps({ go }: { go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const [adding, setAdding] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [tab, setTab] = useState<'caps' | 'revue'>('caps');

  if (!child) return null;
  const hard = isHardTime(child.id, state);
  const actives = activeCaps(child.id, state);
  const paused = pausedCaps(child.id, state);
  const usedTitles = new Set(state.caps.filter((c) => c.child_id === child.id).map((c) => c.title));
  const templates = CAP_TEMPLATES.filter((t) => !usedTitles.has(t.title));
  const canAdd = actives.length < MAX_ACTIVE_CAPS;

  function franchir(cap: Cap) {
    actions.gpsAdvance(cap.id);
    speak('Une marche franchie. Un fruit de plus sur son arbre.');
  }

  return (
    <div className="reveal gps-wrap">
      <div className="co-head">
        <p className="muted" style={{ fontSize: 14 }}>Un GPS ne juge jamais un détour — il recalcule.</p>
        <span className="pill-soft">{actives.length} cap{actives.length > 1 ? 's' : ''} actif{actives.length > 1 ? 's' : ''} · {MAX_ACTIVE_CAPS} max</span>
      </div>

      {hard && (
        <div className="co-hard">
          <Hand size={18} />
          <span><b>GPS en silence :</b> aucun rappel, aucune revue proposée. On fait une pause sur le chemin — c’est le chemin aussi. Les caps ne bougent pas.</span>
        </div>
      )}

      <Tabs tabs={[{ key: 'caps', label: 'Mes caps' }, { key: 'revue', label: 'La revue de saison' }]} active={tab} onChange={setTab} />

      {tab === 'caps' && <>
      {actives.map((cap) => {
        const { done, total } = capProgress(cap);
        return (
          <div className="card gps-cap" key={cap.id}>
            <div className="gps-cap-head">
              <div>
                <span className="co-tag">Cap · {cap.domain}</span>
                <h3 className="gps-cap-title">« {cap.title} »</h3>
              </div>
              <div className="gps-cap-actions">
                <span className="pill-soft">{capStatusLabel(cap)}</span>
                <button className="gps-icon" title="Mettre ce cap en pause" onClick={() => actions.gpsPause(cap.id)}><Pause size={15} /></button>
              </div>
            </div>

            <div className="gps-sentier" style={{ ['--n' as string]: cap.milestones.length }}>
              {cap.milestones.map((m) => (
                <div className={`gps-marche ${m.status}`} key={m.id}>
                  <span className="gps-pt">{m.status === 'done' ? <Sparkles size={16} /> : m.status === 'now' ? '•' : ''}</span>
                  <b>{m.label}</b>
                  <span className="gps-when">{m.status === 'done' ? 'franchie' : m.status === 'now' ? 'on y est' : 'plus loin'}</span>
                </div>
              ))}
            </div>

            {cap.recalc && (
              <div className="gps-recalc"><RefreshCw size={15} /> <span><b>Itinéraire recalculé :</b> {cap.recalc}</span></div>
            )}

            <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              {done < total ? (
                <button className="btn btn-primary" onClick={() => franchir(cap)}><Check size={16} /> Marche franchie</button>
              ) : (
                <span className="co-tried" style={{ margin: 0 }}><Sparkles size={15} /> Cap atteint — de beaux fruits sur son arbre.</span>
              )}
              <button className="btn" onClick={() => go('ensemble')}>Fiche à faire en vrai</button>
              <button className="btn" onClick={() => go('coach')}>Leçon liée</button>
            </div>
            <p className="notice" style={{ marginTop: 12 }}>Chaque marche franchie devient un fruit d’or sur le baobab de {child.first_name} — il le voit, à sa façon.</p>
          </div>
        );
      })}

      {/* Ajouter un cap */}
      {canAdd && (
        adding ? (
          <div className="card">
            <div className="row between" style={{ alignItems: 'center' }}>
              <h3 style={{ fontSize: 16 }}>Un nouveau cap</h3>
              <button className="gps-icon" onClick={() => setAdding(false)}>✕</button>
            </div>
            <p className="muted" style={{ fontSize: 13, margin: '4px 0 12px' }}>Choisissez un objectif — vous pourrez ajuster le sentier ensuite.</p>
            <div className="gps-templates">
              {templates.map((t) => (
                <button key={t.title} className="gps-tpl" onClick={() => { actions.gpsAddCap(t.domain, t.title, t.milestones); setAdding(false); }}>
                  <span className="gps-tpl-d">{t.domain}</span>
                  <b>{t.title}</b>
                  <span className="gps-tpl-m">{t.milestones.length} marches</span>
                </button>
              ))}
              {templates.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Tous les caps modèles sont déjà en route.</p>}
            </div>
          </div>
        ) : (
          <button className="gps-add" onClick={() => setAdding(true)}><Plus size={18} /> Se donner un nouveau cap</button>
        )
      )}
      {!canAdd && <p className="notice">3 caps en même temps, c’est déjà beaucoup. Terminez-en un, ou mettez-en un en pause, avant d’en ajouter.</p>}

      {/* Caps en pause */}
      {paused.map((cap) => (
        <div className="card gps-paused" key={cap.id}>
          <span className="pill-soft" style={{ background: 'var(--tile)', color: 'var(--text-muted)' }}>CAP EN PAUSE</span>
          <div className="gps-cap-title" style={{ fontSize: 17, marginTop: 8 }}>« {cap.title} »</div>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>En pause — c’est un choix respectable, et le chemin vous attend. Aucun rappel ne sera envoyé.</p>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => actions.gpsResume(cap.id)}><Play size={15} /> Reprendre quand vous voulez</button>
        </div>
      ))}
      </>}

      {tab === 'revue' && (
      /* Revue de saison */
      <div className="card gps-revue">
        <h3 style={{ fontSize: 17 }}>La revue de saison</h3>
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>Un temps guidé, fractionnable : ce qui est franchi, ce qui est en chemin. Puis vous décidez, cap par cap : poursuivre, mettre en pause, ou célébrer et clore.</p>
        {reviewing ? (
          <div className="gps-review">
            {actives.map((cap) => {
              const { done, total } = capProgress(cap);
              return (
                <div className="gps-rev-row" key={cap.id}>
                  <div><b>{cap.title}</b><span className="muted" style={{ fontSize: 12.5 }}> · {done}/{total} marches</span></div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn" onClick={() => actions.gpsPause(cap.id)}>Pause</button>
                    <button className="btn btn-primary" onClick={() => actions.gpsAdvance(cap.id)}>Franchir</button>
                  </div>
                </div>
              );
            })}
            <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => setReviewing(false)}>Terminer la revue</button>
          </div>
        ) : (
          <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn btn-accent" onClick={() => setReviewing(true)} disabled={hard}><Flag size={15} /> Commencer la revue</button>
            <button className="btn" onClick={() => go('bilan')}>Partager « Notre trimestre » <ChevronRight size={14} /></button>
          </div>
        )}
        {hard && <p className="notice" style={{ marginTop: 10 }}>La revue attend la fin de la période difficile — rien ne presse.</p>}
      </div>
      )}
    </div>
  );
}
