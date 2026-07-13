import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ChevronRight, X, Heart, MessageSquare, Plus, Wind } from 'lucide-react';
import { activeChild, actions, useAppState } from '../lib/store.js';
import {
  domainTrends, acquiredList, emergingList, acquisitionFiche, caaTrajectory,
  learningProfile, AXIS_BADGE_LABEL, calmTrajectory, plateaus,
  lifeEventsFor, lifeEventType, LIFE_EVENT_TYPES,
  STATE_LABEL, STATE_TINT, type CompStatus,
} from '../lib/trajectoires.js';
import { formatDate, relativeDay } from '../lib/format.js';
import { Tabs } from '../components/Tabs.js';
import type { View } from '../App.js';

export function Trajectoires({ go }: { go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const [tab, setTab] = useState<'ap' | 'voix' | 'profil'>('ap');
  const [open, setOpen] = useState<CompStatus | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);

  const trends = useMemo(() => (child ? domainTrends(child.id, state) : []), [child, state]);
  const acquired = useMemo(() => (child ? acquiredList(child.id, state) : []), [child, state]);
  const emerging = useMemo(() => (child ? emergingList(child.id, state) : []), [child, state]);
  const caa = useMemo(() => (child ? caaTrajectory(child.id, state) : null), [child, state]);
  const axes = useMemo(() => (child ? learningProfile(child.id, state) : []), [child, state]);
  const events = useMemo(() => (child ? lifeEventsFor(child.id, state) : []), [child, state]);
  const calm = useMemo(() => (child ? calmTrajectory(child.id, state) : null), [child, state]);
  const stuck = useMemo(() => (child ? plateaus(child.id, state) : []), [child, state]);

  if (!child) return null;

  return (
    <div className="reveal tr-wrap">
      <div className="co-head">
        <p className="muted" style={{ fontSize: 14 }}>Ce que {child.first_name} a appris, et <b style={{ color: 'var(--text)' }}>comment</b> il l’a appris. Sa seule référence, c’est lui-même hier.</p>
        <span className="pill-soft">{acquired.length} acquis</span>
      </div>

      <Tabs tabs={[{ key: 'ap', label: 'Avant / Après' }, { key: 'voix', label: 'Voix & calme' }, { key: 'profil', label: 'Comment il apprend' }]} active={tab} onChange={setTab} />

      {tab === 'ap' && <>
        {/* Panorama par domaine */}
        <div className="card">
          <h3 style={{ fontSize: 17 }}>Où il en est, domaine par domaine</h3>
          <div className="bl-legend"><span><i className="prev" /> Au départ</span><span><i className="now" /> Aujourd’hui</span></div>
          {trends.filter((t) => t.apres !== null).map((t) => (
            <div className="bl-domrow" key={t.domain}>
              <b>{t.label}</b>
              <span className="bl-dbar">
                {t.avant !== null && <i className="prev" style={{ width: `${t.avant * 100}%` }} />}
                {t.apres !== null && <i className="now" style={{ width: `${t.apres * 100}%` }} />}
              </span>
              <span className="bl-trend">{t.acquired}/{t.total} acquis</span>
            </div>
          ))}
          <p className="notice" style={{ marginTop: 10 }}>Un repère de progression sur ses propres activités. Ni test, ni diagnostic, ni comparaison.</p>
        </div>

        {/* Ses acquis */}
        <div className="card">
          <h3 style={{ fontSize: 17 }}>{acquired.length > 0 ? `${child.first_name} a acquis ${acquired.length} chose${acquired.length > 1 ? 's' : ''}` : 'Ses premiers acquis arrivent'}</h3>
          <p className="muted" style={{ fontSize: 13 }}>Touchez une carte pour voir <b>comment</b> il l’a acquise.</p>
          {acquired.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, marginTop: 10 }}>Continuez à noter ses activités — chaque petit pas se verra ici.</p>
          ) : (
            <div className="tr-list">
              {acquired.map((s) => (
                <button className="tr-acq" key={s.activity.id} onClick={() => setOpen(s)}>
                  <span className="tr-acq-ic"><Sparkles size={16} /></span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="tr-acq-t">{s.activity.label}</span>
                    <span className="tr-acq-m">{s.acquiredAt ? relativeDay(s.acquiredAt) : ''} · {s.logs.length} séances</span>
                  </span>
                  <span className="tr-badge" style={{ '--c': STATE_TINT[s.state] } as React.CSSProperties}>{STATE_LABEL[s.state]}</span>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)', flex: '0 0 auto' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* En train de venir */}
        {emerging.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: 17 }}>{emerging.length} chose{emerging.length > 1 ? 's' : ''} en train de venir</h3>
            <div className="tr-chips">
              {emerging.map((s) => (
                <span className="tr-chip" key={s.activity.id} style={{ '--c': STATE_TINT[s.state] } as React.CSSProperties}>{s.activity.label} <small>{STATE_LABEL[s.state].toLowerCase()}</small></span>
              ))}
            </div>
          </div>
        )}

        {/* Ce qui plafonne · pivots (§7.4) */}
        {stuck.length > 0 && (
          <div className="card tr-stuck">
            <h3 style={{ fontSize: 17 }}>Ce qui semble marquer une pause</h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>Une compétence qui n’avance plus depuis quelques séances, ce n’est pas un échec — souvent, ça vient d’abord en vrai. CORTEX change de chemin en douceur, sans que {child.first_name} le voie.</p>
            {stuck.map((p) => (
              <div className="tr-stuck-row" key={p.status.activity.id}>
                <div style={{ minWidth: 0 }}>
                  <b>{p.status.activity.label}</b>
                  <div className="muted" style={{ fontSize: 12.5 }}>{p.sessions} séances sans nouveau progrès à l’écran</div>
                </div>
                {p.mirror && (
                  <button className="btn" onClick={() => go('ensemble')}>Le tenter en vrai : « {p.mirror} »</button>
                )}
              </div>
            ))}
            <p className="notice" style={{ marginTop: 8 }}>« À l’écran, ça ne passe pas encore. Parfois ça vient d’abord en vrai. » — une piste, jamais un reproche.</p>
          </div>
        )}

        {/* Chronologie de vie */}
        <div className="card">
          <div className="row between" style={{ alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 17 }}>La chronologie de vie</h3>
            <button className="btn" onClick={() => setAddingEvent((v) => !v)}><Plus size={15} /> Noter un événement</button>
          </div>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>Le contexte compte : une régression pendant un déménagement n’est pas un échec. Ces repères aident à lire les courbes avec justesse.</p>
          {addingEvent && (
            <div className="tr-evpick">
              {LIFE_EVENT_TYPES.map((t) => (
                <button key={t.key} className="tr-evbtn" onClick={() => { actions.addLifeEvent(t.key); setAddingEvent(false); }}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          )}
          {events.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>Rien de noté — et c’est très bien. Vous ajouterez un repère si un jour ça aide.</p>
          ) : (
            <div className="tr-timeline">
              {events.map((e) => {
                const t = lifeEventType(e.kind);
                return (
                  <div className={`tr-ev ${t.major ? 'major' : ''}`} key={e.id}>
                    <span className="tr-ev-e">{t.emoji}</span>
                    <span className="grow"><b>{e.label ? `${t.label} · ${e.label}` : t.label}</b><span className="muted"> · {relativeDay(e.at)}</span></span>
                    {t.major && <span className="tr-ev-tag">14 j pondérés</span>}
                    <button className="tr-ev-x" onClick={() => actions.deleteLifeEvent(e.id)} aria-label="Retirer"><X size={13} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>}

      {tab === 'voix' && caa && (<>
        <div className="card tr-voix">
          <span className="pill-soft"><MessageSquare size={13} /> Sa voix · CAA</span>
          <h3 style={{ fontSize: 18, marginTop: 10 }}>Son vocabulaire grandit</h3>
          <div className="tr-vocab">
            <div><span className="tr-vocab-n">{caa.vocabBefore}</span><span>il y a 2 semaines</span></div>
            <ChevronRight size={22} style={{ color: 'var(--text-muted)' }} />
            <div><span className="tr-vocab-n big">{caa.vocabNow}</span><span>aujourd’hui</span></div>
            <div className="grow" style={{ textAlign: 'right' }}><span className="muted" style={{ fontSize: 12.5 }}>{caa.totalPresses} fois qu’il a pris la parole</span></div>
          </div>

          {caa.vocabNow === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, marginTop: 12 }}>Sa trajectoire de voix s’écrira dès qu’il utilisera sa CAA.</p>
          ) : (
            <>
              <div className="section-title" style={{ marginTop: 4 }}>Les univers qu’il ouvre</div>
              <div className="tr-cats">
                {caa.categories.map((c) => (
                  <span className="tr-cat" key={c.key}>{c.label} <b>{c.count}</b></span>
                ))}
              </div>

              <div className="section-title">Ses premières, gardées à vie</div>
              <div className="tr-premieres">
                {caa.premieres.map((p) => (
                  <div className="tr-prem" key={p.at}>
                    <span className="tr-prem-p">{p.picto}</span>
                    <span className="grow"><b>« {p.label} »</b><span className="muted"> · première fois {relativeDay(p.at)}</span></span>
                  </div>
                ))}
              </div>
              <p className="notice" style={{ marginTop: 10 }}>La CAA reste sa voix : jamais un objectif chiffré, jamais une comparaison. On célèbre, on ne mesure pas.</p>
            </>
          )}
        </div>

        {calm && (
          <div className="card">
            <span className="pill-soft"><Wind size={13} /> Son calme · régulation</span>
            <h3 style={{ fontSize: 17, marginTop: 10 }}>Comment il revient au calme</h3>
            {calm.trend === null ? (
              <p className="muted" style={{ fontSize: 13.5, marginTop: 8 }}>Peu de moments difficiles notés récemment — tant mieux.</p>
            ) : (
              <p style={{ fontSize: 14.5, lineHeight: 1.55, marginTop: 8 }}>
                {calm.trend === 'mieux'
                  ? `Ces deux dernières semaines, les moments difficiles ont eu moins souvent besoin du mode apaisement (${calm.hardNow} contre ${calm.hardBefore} auparavant).`
                  : calm.trend === 'plus'
                    ? `Cette période a demandé plus de douceur (${calm.hardNow} moments difficiles contre ${calm.hardBefore}) — souvent, le contexte l’explique. Regardez la chronologie de vie.`
                    : `La fréquence des moments difficiles est restée stable (${calm.hardNow}).`}
              </p>
            )}
            {calm.calms.length > 0 && (
              <>
                <div className="section-title">Ce qui l’apaise le plus</div>
                <div className="co-helps">
                  {calm.calms.map((h) => <span className="co-help" key={h.label}>{h.label}</span>)}
                </div>
              </>
            )}
            <p className="notice" style={{ marginTop: 10 }}>Jamais « ses crises diminuent » — on dit « les moments difficiles ont eu moins besoin d’aide ». La nuance protège.</p>
          </div>
        )}
      </>)}

      {tab === 'profil' && (
        <div className="card">
          <h3 style={{ fontSize: 17 }}>Comment {child.first_name} apprend</h3>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>Des tendances, jamais des règles. « Les réussites sont plus fréquentes quand… », jamais « il faut… ». Un axe sans assez de données reste honnêtement vide.</p>
          <div className="tr-axes">
            {axes.map((ax) => (
              <div className={`tr-axis ${ax.finding ? '' : 'empty'}`} key={ax.key}>
                <div className="tr-axis-head">
                  <b>{ax.label}</b>
                  <span className={`tr-axbadge ${ax.badge}`}>{AXIS_BADGE_LABEL[ax.badge]}</span>
                </div>
                <p>{ax.finding ?? 'Pas encore assez de moments notés pour le dire — et un vide est une réponse honnête.'}</p>
              </div>
            ))}
          </div>
          <p className="notice" style={{ marginTop: 12 }}>Ces repères affinent en silence ce que CORTEX propose (les jeux de la natte, les fiches) — jamais rien ne change pour {child.first_name} de son côté.</p>
        </div>
      )}

      {open && <AcqFicheModal status={open} childId={child.id} childName={child.first_name} onClose={() => setOpen(null)} go={go} />}
    </div>
  );
}

function AcqFicheModal({ status, childId, childName, onClose, go }: { status: CompStatus; childId: string; childName: string; onClose: () => void; go: (v: View) => void }) {
  const state = useAppState();
  const f = acquisitionFiche(status, childId, state, childName);
  const maxLvl = 4;
  return createPortal(
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-card tr-fiche" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <span className="tr-badge" style={{ '--c': STATE_TINT[status.state] } as React.CSSProperties}>{STATE_LABEL[status.state]}</span>
          <button className="oje-m-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <h3 style={{ fontSize: 19, lineHeight: 1.25 }}>{status.activity.label}</h3>
        <p className="tr-resume">{f.resume}</p>
        {f.contextEvent && (
          <p className="tr-context">📌 Cette période a croisé « {f.contextEvent.toLowerCase()} » — et le progrès a tenu bon malgré le changement.</p>
        )}

        {/* La courbe */}
        <div className="tr-curve-lab">Sa progression, séance après séance</div>
        <div className="tr-curve">
          {f.curve.map((lvl, i) => (
            <span className="tr-cbar" key={i}>
              <i style={{ height: `${(lvl / maxLvl) * 100}%`, background: STATE_TINT[lvl >= 4 ? 'acquise' : lvl >= 2 ? 'en_acquisition' : 'emergente'] }} />
            </span>
          ))}
          {status.acquiredAt && <span className="tr-curve-flag">✓ {formatDate(status.acquiredAt)}</span>}
        </div>

        {/* Ce qui l'a aidé */}
        <div className="section-title">Ce qui l’a aidé <Heart size={13} style={{ color: 'var(--radar-green, #7a9e7e)', verticalAlign: -2 }} /></div>
        <ul className="tr-helped">{f.helped.map((h, i) => <li key={i}>{h}</li>)}</ul>

        {/* Et maintenant */}
        <div className="tr-next">
          <b>Et maintenant</b>
          {f.next && <p>La prochaine marche : <b>{f.next}</b>.</p>}
          {f.mirror && <p className="muted" style={{ fontSize: 13 }}>Pour l’ancrer en vrai : la fiche « {f.mirror} ».</p>}
          <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => go('ensemble')}>Voir « On joue ensemble » <ChevronRight size={14} /></button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
