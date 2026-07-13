import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, Clock, Sparkles, Check, X, Meh, Smile, HandHeart, ShieldQuestion, Gamepad2 } from 'lucide-react';
import { actions, activeChild, useAppState } from '../lib/store.js';
import {
  FICHES, suggestedFiches, ageRef,
  DISCLAIMER, SIGNAUX_STOP, ENCART_REFUS,
  type Fiche,
} from '../lib/togetherPlay.js';
import { DOMAINS, domainOf, type ActivityDomainKey } from '../lib/activities.js';
import { speak } from '../lib/tts.js';
import { Tabs } from '../components/Tabs.js';

type DureeFilter = 'all' | 5 | 10 | 15;
const REACTIONS: { key: 'love' | 'meh' | 'not'; label: string; Icon: typeof Smile }[] = [
  { key: 'love', label: 'Il a aimé', Icon: Smile },
  { key: 'meh', label: 'Mitigé', Icon: Meh },
  { key: 'not', label: 'Pas cette fois', Icon: X },
];

export function OnJoueEnsemble() {
  const state = useAppState();
  const child = activeChild(state);
  const [open, setOpen] = useState<Fiche | null>(null);
  const [domFilter, setDomFilter] = useState<ActivityDomainKey | 'all'>('all');
  const [dureeFilter, setDureeFilter] = useState<DureeFilter>('all');
  const [tab, setTab] = useState<'semaine' | 'catalogue'>('semaine');

  const suggestions = useMemo(
    () => (child ? suggestedFiches(child.id, state) : []),
    [child, state],
  );

  const doneMap = useMemo(() => {
    const m = new Map<string, { count: number; last: string }>();
    for (const l of state.togetherLogs) {
      if (l.child_id !== child?.id) continue;
      const cur = m.get(l.fiche_id);
      m.set(l.fiche_id, { count: (cur?.count ?? 0) + 1, last: cur?.last ?? l.done_at });
    }
    return m;
  }, [state.togetherLogs, child?.id]);

  const filtered = useMemo(() => FICHES.filter((f) =>
    (domFilter === 'all' || f.domains.includes(domFilter)) &&
    (dureeFilter === 'all' || f.duree === dureeFilter),
  ), [domFilter, dureeFilter]);

  if (!child) return null;

  return (
    <div className="reveal oje-wrap">
      {/* Hero */}
      <div className="oje-hero">
        <div className="oje-hero-ic"><HandHeart size={26} /></div>
        <div>
          <h2 style={{ fontSize: 22, lineHeight: 1.2 }}>On joue ensemble</h2>
          <p className="muted" style={{ fontSize: 14, marginTop: 5, lineHeight: 1.5 }}>
            Des idées toutes simples pour jouer avec {child.first_name}, sans écran, avec ce que vous avez à la maison.
          </p>
        </div>
      </div>
      <p className="oje-disclaimer"><ShieldQuestion size={13} /> {DISCLAIMER}</p>

      <Tabs tabs={[{ key: 'semaine', label: 'Cette semaine' }, { key: 'catalogue', label: 'Tout le catalogue' }]} active={tab} onChange={setTab} />

      {/* Suggestions de la semaine (§4.4) — jamais impératif */}
      {tab === 'semaine' && (suggestions.length > 0 ? (
        <section className="oje-sugg">
          <div className="oje-sugg-cap"><Sparkles size={14} /> Cette semaine, si vous avez un moment</div>
          <div className="oje-sugg-row">
            {suggestions.map((f) => (
              <button key={f.id} className="oje-sugg-card" onClick={() => setOpen(f)}>
                <span className="oje-sugg-pic">{f.picto}</span>
                <span className="oje-sugg-t">{f.title}</span>
                <span className="oje-sugg-meta"><Clock size={11} /> {f.duree} min</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <p className="muted" style={{ textAlign: 'center', padding: 30 }}>Rien de suggéré cette semaine — parcourez tout le catalogue dans l’onglet à côté.</p>
      ))}

      {tab === 'catalogue' && <>
      {/* Filtres */}
      <div className="oje-filters">
        <div className="oje-chips">
          <button className={`oje-chip ${domFilter === 'all' ? 'on' : ''}`} onClick={() => setDomFilter('all')}>Tout</button>
          {DOMAINS.map((d) => (
            <button key={d.key} className={`oje-chip ${domFilter === d.key ? 'on' : ''}`} style={{ '--c': d.tint } as React.CSSProperties} onClick={() => setDomFilter(d.key)}>{d.label}</button>
          ))}
        </div>
        <div className="oje-chips">
          {([['all', 'Toutes durées'], [5, '5 min'], [10, '10 min'], [15, '15 min']] as [DureeFilter, string][]).map(([v, lab]) => (
            <button key={String(v)} className={`oje-chip ghost ${dureeFilter === v ? 'on' : ''}`} onClick={() => setDureeFilter(v)}>{lab}</button>
          ))}
        </div>
      </div>

      {/* Catalogue */}
      <div className="oje-grid">
        {filtered.map((f) => {
          const done = doneMap.get(f.id);
          const d = domainOf(f.domains[0]);
          return (
            <button key={f.id} className="oje-card" style={{ '--c': d.tint } as React.CSSProperties} onClick={() => setOpen(f)}>
              <span className="oje-card-pic">{f.picto}</span>
              <span className="oje-card-body">
                <span className="oje-card-t">{f.title}</span>
                <span className="oje-card-meta">
                  <span className="oje-card-dom">{d.label}</span>
                  <span className="oje-card-age">{ageRef(f.paliers)}</span>
                </span>
              </span>
              <span className="oje-card-side">
                <span className="oje-card-dur"><Clock size={11} /> {f.duree}′</span>
                {done && <span className="oje-card-done" title={`Fait ${done.count}×`}><Check size={11} /></span>}
              </span>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 30 }}>Aucune fiche avec ces filtres.</p>}
      </>}

      {open && <FicheModal fiche={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function FicheModal({ fiche, onClose }: { fiche: Fiche; onClose: () => void }) {
  const d = domainOf(fiche.domains[0]);
  const mirror = fiche.jeuMiroir;
  const [reacted, setReacted] = useState(false);

  function readAll() {
    speak(`${fiche.title}. ${fiche.etapes.join('. ')}`);
  }
  function record(reaction: 'love' | 'meh' | 'not') {
    actions.logTogetherFiche(fiche.id, reaction);
    setReacted(true);
    speak(reaction === 'not' ? 'C’est noté. Une autre fois.' : 'Bravo, c’est noté.');
    setTimeout(onClose, 900);
  }

  return createPortal(
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-card oje-modal" style={{ '--c': d.tint } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
        <div className="oje-m-head">
          <span className="oje-m-pic">{fiche.picto}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ fontSize: 19, lineHeight: 1.2 }}>{fiche.title}</h3>
            <div className="oje-m-tags">
              <span className="oje-m-tag" style={{ '--c': d.tint } as React.CSSProperties}>{d.label}</span>
              <span className="oje-m-tag ghost"><Clock size={11} /> {fiche.duree} min</span>
              <span className="oje-m-tag ghost">{ageRef(fiche.paliers)}</span>
            </div>
          </div>
          <button className="oje-m-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <p className="oje-disclaimer"><ShieldQuestion size={13} /> {DISCLAIMER}</p>

        {/* Matériel */}
        <div className="oje-m-mat">
          <span className="oje-m-lab">Ce qu’il faut</span>
          <div className="oje-m-matrow">{fiche.materiel.map((m) => <span key={m} className="oje-mat">{m}</span>)}</div>
        </div>

        {/* Étapes — audio-first pour les parents peu lecteurs */}
        <div className="oje-m-steps">
          <div className="row between" style={{ alignItems: 'center' }}>
            <span className="oje-m-lab">Comment jouer</span>
            <button className="oje-listen" onClick={readAll}><Volume2 size={14} /> Écouter</button>
          </div>
          <ol className="oje-steps">
            {fiche.etapes.map((s, i) => (
              <li key={i}>
                <span className="oje-step-n">{i + 1}</span>
                <span className="grow">{s}</span>
                <button className="oje-step-au" onClick={() => speak(s)} aria-label="Écouter l’étape"><Volume2 size={14} /></button>
              </li>
            ))}
          </ol>
        </div>

        {/* Variantes */}
        <div className="oje-m-var">
          <div className="oje-var"><b>Plus facile</b><span>{fiche.varianteFacile}</span></div>
          <div className="oje-var"><b>Un peu plus</b><span>{fiche.varianteRiche}</span></div>
        </div>

        {mirror && (
          <div className="oje-mirror"><Gamepad2 size={14} /> Cette activité a aussi son jeu dans le mode enfant : l’écran et le réel se répondent.</div>
        )}

        {/* Signaux d'arrêt + droit au refus (lois fixes) */}
        <p className="oje-stop">{SIGNAUX_STOP}</p>
        <p className="oje-refus"><HandHeart size={13} /> {ENCART_REFUS}</p>

        {/* Retour en 1 tap (§4.4) : on l'a fait + réaction. C'est tout. */}
        {!reacted ? (
          <div className="oje-react">
            <span className="oje-react-cap">On l’a fait ensemble ?</span>
            <div className="oje-react-row">
              {REACTIONS.map(({ key, label, Icon }) => (
                <button key={key} className={`oje-react-b ${key}`} onClick={() => record(key)}>
                  <Icon size={20} /><span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="oje-react done"><Check size={18} /> C’est noté. Merci d’avoir joué avec lui.</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
