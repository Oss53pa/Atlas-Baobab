import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { X, Mic, Check, Clock } from 'lucide-react';
import { activeChild, actions, useAppState } from '../lib/store.js';
import { CAREGIVERS, caregiverTint } from '../components/journalKit.js';
import type { View } from '../App.js';

type Fact = { txt: string; label: string; free?: boolean };
const FACTS: Fact[] = [
  { txt: 'un changement de routine', label: 'Changement de routine' },
  { txt: 'une sortie dans un nouveau lieu', label: 'Sortie / nouveau lieu' },
  { txt: 'de la visite', label: 'Visite / du monde' },
  { txt: 'un bruit fort', label: 'Bruit fort' },
  { txt: 'une contrariété', label: 'Contrariété' },
  { txt: 'une bonne surprise', label: 'Bonne surprise' },
  { txt: 'un événement', label: 'Autre…', free: true },
];

const REACTIONS = [
  { v: 1, e: '🙂', t: 'Bien', txt: 'l’a bien vécu' },
  { v: 2, e: '😐', t: 'Neutre', txt: 'est resté neutre' },
  { v: 3, e: '😟', t: 'Perturbé', txt: 'a été perturbé' },
  { v: 4, e: '😢', t: 'Très perturbé', txt: 'a été très perturbé' },
  { v: 5, e: '⚡', t: 'Crise', txt: 'a fait une crise' },
];

const PLACES = [
  { v: 'maison', label: 'Maison', txt: 'à la maison' },
  { v: 'école', label: 'École', txt: 'à l’école' },
  { v: 'marché', label: 'Marché', txt: 'au marché' },
  { v: 'transport', label: 'Transport', txt: 'dans le transport' },
  { v: 'dehors', label: 'Dehors', txt: 'dehors' },
];

const HELPED = ['Le coin calme', 'S’éloigner du bruit', 'Son objet d’apaisement', 'Le prévenir', 'Sa carte « pause »', 'Un câlin / une pression'];

const WHENS = [
  { v: 'now', label: 'Maintenant' },
  { v: 'morning', label: 'Ce matin', h: 9, m: 0 },
  { v: 'noon', label: 'À midi', h: 12, m: 30 },
  { v: 'afternoon', label: 'Cet après-midi', h: 16, m: 0 },
];

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** M2-F1b — Compte rendu d'événement. Divulgation progressive, phrase qui s'écrit
 * seule, branchement selon la réaction (crise → guide, réussite → étoile,
 * négatif → « qu'est-ce qui a aidé » suggéré par CORTEX). Écrit déterministe. */
export function EventCapture({ onClose, go }: { onClose: () => void; go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const name = child?.first_name ?? 'l’enfant';

  const [when, setWhen] = useState('now');
  const [fact, setFact] = useState<Fact | null>(null);
  const [factFree, setFactFree] = useState('');
  const [reactV, setReactV] = useState(0);
  const [place, setPlace] = useState<(typeof PLACES)[number] | null>(null);
  const [helped, setHelped] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [star, setStar] = useState(false);
  const [follow, setFollow] = useState(false);
  const [author, setAuthor] = useState('Maman');
  const [listening, setListening] = useState(false);
  const recRef = useRef<unknown>(null);

  // « marche souvent » : suggestions issues de l'historique (CORTEX déterministe).
  const pastHelped = useMemo(
    () => state.incidents.filter((i) => i.child_id === child?.id).flatMap((i) => i.what_helped ?? []).map((s) => s.toLowerCase()),
    [state.incidents, child?.id],
  );
  const isOften = (label: string) => {
    const l = label.toLowerCase();
    return pastHelped.some((h) => l.includes(h) || h.includes(l.replace(/^(le |la |les |un |une |son |sa |s’)/, '').split(/[ ’]/)[0]));
  };
  const helpedOptions = useMemo(() => [...HELPED].sort((a, b) => Number(isOften(b)) - Number(isOften(a))), [pastHelped]);

  const react = REACTIONS.find((r) => r.v === reactV) ?? null;
  const factTxt = fact?.free ? (factFree.trim() || 'un événement') : fact?.txt ?? '';
  const negative = reactV >= 3;

  function sentence(): string {
    if (!fact) return '';
    let t = place ? cap(place.txt) + ', ' : '';
    t += factTxt + (react ? ` — ${name} ${react.txt}` : '') + '.';
    if (negative && helped.length) t += ` Ce qui a aidé : ${helped.join(', ')}.`;
    if (star) t += ' Ajouté aux réussites.';
    return cap(t);
  }
  const summary = sentence();
  const ready = !!fact && reactV > 0;

  function occurredAt(): string {
    const d = new Date();
    const w = WHENS.find((x) => x.v === when);
    if (w && w.h != null) d.setHours(w.h, w.m ?? 0, 0, 0);
    return d.toISOString();
  }

  function toggleHelped(h: string) {
    setHelped((cur) => (cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h]));
  }

  function dictate() {
    const SR = (window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown });
    const Ctor = (SR.SpeechRecognition ?? SR.webkitSpeechRecognition) as (new () => {
      lang: string; interimResults: boolean; onresult: (e: unknown) => void; onend: () => void; start: () => void; stop: () => void;
    }) | undefined;
    if (!Ctor) { setNote((n) => n + (n ? ' ' : '') + '[Dictée non disponible sur ce navigateur]'); return; }
    if (listening) { (recRef.current as { stop: () => void } | null)?.stop(); return; }
    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.interimResults = false;
    rec.onresult = (e: unknown) => {
      const ev = e as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
      let txt = '';
      for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
      setNote((n) => (n ? n + ' ' : '') + txt.trim());
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  }

  function save() {
    if (!ready) return;
    const at = occurredAt();
    const finalNote = note.trim() || summary;
    if (reactV === 5) {
      actions.logCrisis({ startedAt: at, suspected: factTxt, whatHelped: helped, place: place?.v });
    } else {
      const kind = star && reactV === 1 ? 'success' : 'event';
      const ctx: Record<string, unknown> = {
        trigger: factTxt,
        reaction: react?.txt,
        note: finalNote,
        ...(place ? { place: place.v } : {}),
        ...(negative && helped.length ? { what_helped: helped } : {}),
        ...(follow ? { follow_up: true } : {}),
      };
      actions.addObservation({ kind, intensity: star && reactV === 1 ? 4 : reactV, occurred_at: at, author, context: ctx });
    }
    onClose();
  }

  function openGuide() {
    save();
    go('reagir');
  }

  return createPortal(
    <div className="modal-scrim" onClick={onClose}>
      <div className="ec-sheet" onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className="ec-head">
          <div className="row between" style={{ alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 19 }}>Que s’est-il passé ?</h3>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Journal de {name} · par {author}</div>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
          </div>
          <div className="ec-when">
            {WHENS.map((w) => (
              <button key={w.v} className={`ec-chip ${when === w.v ? 'on' : ''}`} onClick={() => setWhen(w.v)}>
                {w.v === 'now' ? <><Clock size={13} /> {w.label}</> : w.label}
              </button>
            ))}
          </div>
          <button className={`ec-voice ${listening ? 'live' : ''}`} onClick={dictate}>
            <span className="ec-mic"><Mic size={18} /></span>
            <span className="ec-voice-t">
              <b>{listening ? 'À l’écoute… reparlez pour compléter' : 'Pressé·e ? Racontez, on remplit pour vous.'}</b>
              <small>{listening ? 'Touchez pour arrêter.' : 'Dictez, le mot se pré-remplit. Vous validez.'}</small>
            </span>
          </button>
        </div>

        {/* Corps */}
        <div className="ec-body">
          <div className="ec-step show">
            <label className="ec-sec">L’événement</label>
            <div className="ec-chips">
              {FACTS.map((f) => (
                <button key={f.label} className={`ec-chip ${fact?.label === f.label ? 'on' : ''}`} onClick={() => setFact(f)}>
                  {f.label}
                </button>
              ))}
            </div>
            {fact?.free && (
              <textarea className="jl-note-input" style={{ marginTop: 8 }} value={factFree} onChange={(e) => setFactFree(e.target.value)}
                placeholder="En une phrase (ex : le courant a sauté pendant le dessin animé)" />
            )}
          </div>

          <div className={`ec-step ${fact ? 'show' : ''}`}>
            <label className="ec-sec">Comment {name} a réagi</label>
            <div className="ec-react">
              {REACTIONS.map((r) => (
                <button key={r.v} className={reactV === r.v ? 'on' : ''} onClick={() => { setReactV(r.v); if (r.v !== 1) setStar(false); if (r.v < 3) setHelped([]); }}>
                  <span className="e">{r.e}</span>
                  <span className="t">{r.t}</span>
                </button>
              ))}
            </div>
            {reactV === 5 && (
              <div className="ec-crisis">
                <b>Crise en cours ?</b> Passez au guide d’apaisement — le compte rendu se finit tout seul après.
                <button onClick={openGuide}>Ouvrir le guide d’apaisement</button>
              </div>
            )}
            {reactV === 1 && (
              <div className="ec-success">
                <span>Beau moment. <b>L’ajouter aux réussites de {name} ?</b></span>
                <button className={`switch ${star ? 'on' : ''}`} onClick={() => setStar((s) => !s)} aria-label="Ajouter aux réussites"><i /></button>
              </div>
            )}
          </div>

          <div className={`ec-step ${reactV > 0 ? 'show' : ''}`}>
            <label className="ec-sec">Où <span>· facultatif</span></label>
            <div className="ec-chips">
              {PLACES.map((p) => (
                <button key={p.v} className={`ec-chip ${place?.v === p.v ? 'on' : ''}`} onClick={() => setPlace(place?.v === p.v ? null : p)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`ec-step ${negative ? 'show' : ''}`}>
            <label className="ec-sec">Qu’est-ce qui a aidé ? <span>· plusieurs choix</span></label>
            <div className="ec-chips">
              {helpedOptions.map((h) => (
                <button key={h} className={`ec-chip amber ${helped.includes(h) ? 'on' : ''}`} onClick={() => toggleHelped(h)}>
                  {h}{isOften(h) && <span className="ec-badge">✓ marche souvent</span>}
                </button>
              ))}
              <button className={`ec-chip ${helped.includes('__none') ? 'on' : ''}`} onClick={() => toggleHelped('__none')}>Rien n’a aidé</button>
            </div>
          </div>

          <div className={`ec-step ${reactV > 0 ? 'show' : ''}`}>
            <label className="ec-sec">Qui raconte ?</label>
            <div className="row wrap" style={{ gap: 8 }}>
              {CAREGIVERS.map((c) => (
                <button key={c} className={`who-chip ${author === c ? 'on' : ''}`} onClick={() => setAuthor(c)} style={{ '--who': caregiverTint(c) } as CSSProperties}>{c}</button>
              ))}
            </div>

            <label className="ec-sec" style={{ marginTop: 16 }}>Un mot de plus <span>· facultatif</span></label>
            <textarea className="jl-note-input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Ce que vous voulez retenir de ce moment…" />
            <div className="ec-follow">
              <div className="ec-follow-t">Marquer « à suivre »<small>Signalé aux autres aidants · rappelé au prochain point</small></div>
              <button className={`switch ${follow ? 'on' : ''}`} onClick={() => setFollow((f) => !f)} aria-label="Marquer à suivre"><i /></button>
            </div>
          </div>
        </div>

        {/* Le compte rendu qui s'écrit tout seul */}
        <div className="ec-foot">
          <div className="ec-resume">
            <span className="ec-resume-lbl">Votre compte rendu</span>
            <span>{summary || <em style={{ color: 'var(--text-muted)' }}>Il s’écrira ici au fil de vos choix…</em>}</span>
          </div>
          <button className={`btn btn-primary btn-block btn-lg ${ready ? '' : 'ec-disabled'}`} style={{ marginTop: 10 }} onClick={save} disabled={!ready}>
            <Check size={18} /> Enregistrer
          </button>
          <div className="ec-hint">Modifiable 24 h par son auteur · un journal ne se supprime pas</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
