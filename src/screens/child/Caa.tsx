import { useMemo, useRef, useState } from 'react';
import { activeChild, actions, useAppState } from '../../lib/store.js';
import { AAC_CATEGORIES, defaultBoard } from '../../lib/caa.js';
import { reconfig } from '../../lib/childProfile.js';
import { childConfig } from '../../lib/childProfileConfig.js';
import { haptic } from '../../lib/childAudio.js';
import { speak } from '../../lib/tts.js';
import type { AacCard } from '../../lib/types.js';

/**
 * « Je parle » — CAA (CDC Mode Enfant v1.1 §5.4). Dispositif de communication :
 * rigueur maximale, endroit le plus STABLE de l'app (L4 renforcée : aucun décor
 * animé, aucune musique, fond neutre). 1 tap = mot prononcé + picto animé + ajout
 * à la bande-phrase. Aide toujours visible. Grille adaptée au profil.
 * (Intérim v1.1 : pictos actuels conservés jusqu'à la livraison des symboles Mulberry.)
 */
export function Caa({ onExit }: { onExit: () => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const board = (child && state.aacBoards[child.id]) || defaultBoard();
  const [cat, setCat] = useState('base');
  const [sentence, setSentence] = useState<AacCard[]>([]);
  const ttsDefault = child ? reconfig(child).ttsDefault : false;
  const fx = child ? childConfig(child).fx : null;
  const profile = child ? childConfig(child).profile : null;

  // §5.4.4 : non-verbal 2-4 → 6 pictos max, cibles 96 px, vocabulaire noyau.
  const tightGrid = profile?.communication === 'non-verbal' && profile.ageBand === '2-4';
  const targetPx = fx?.targetPx ?? 80;

  const aide = useMemo(() => board.cards.find((c) => /aide|sos/i.test(c.label) || /aide|sos/i.test(c.id)), [board]);

  const cards = useMemo(() => {
    let list = board.cards.filter((c) => c.category === cat && c.id !== aide?.id);
    if (tightGrid) list = list.slice(0, 6);
    return list;
  }, [board, cat, aide, tightGrid]);

  function press(card: AacCard) {
    speak(card.label);           // §4.2 : le mot EST le feedback sonore, immédiat (< 100 ms)
    if (fx?.haptic) haptic();
    actions.pressAacCard(card);  // journal d'usage CAA (flux profil communication)
    setSentence((s) => {
      const next = s.length >= 6 ? s : [...s, card];
      if (ttsDefault && next.length > 1) speak(next.map((c) => c.label).join(' '));
      return next;
    });
  }

  function speakSentence() { if (sentence.length) speak(sentence.map((c) => c.label).join(' ')); }
  function pressAide() {
    if (!aide) return;
    speak(aide.label);
    if (fx?.haptic) haptic();
    actions.pressAacCard(aide);
    actions.logChildPause(); // notifie l'espace parent (mécanique SOS v1.0)
  }

  return (
    <div className="child-shell cs-caa" style={{ minHeight: '100vh' }}>
      <div className="child-top">
        <button className="cs-iconbtn" onClick={onExit} aria-label="Retour">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <b style={{ fontFamily: 'var(--font-child)' }}>Je parle</b>
        {aide ? (
          <button className="caa-aide" onClick={pressAide} aria-label={aide.label}>
            <span className="p">{aide.picto}</span><span>{aide.label}</span>
          </button>
        ) : <span style={{ width: 40 }} />}
      </div>

      <div className="caa-wrap">
        {/* Bande-phrase */}
        <div className="sentence-bar" onClick={speakSentence}>
          {sentence.length === 0 && (
            <span className="caa-hand" aria-hidden>
              <svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0 0V4a1.5 1.5 0 0 1 3 0v6m0-.5a1.5 1.5 0 0 1 3 0V14c0 3-2 5-5 5h-1.5c-2 0-3-1-4.5-3l-2-3a1.4 1.4 0 0 1 2.2-1.7L9 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          )}
          {sentence.map((c, i) => (
            <span className="tok" key={i}><span className="p">{c.picto}</span>{c.label}</span>
          ))}
        </div>
        <div className="row" style={{ gap: 10, marginBottom: 12 }}>
          <button className="btn btn-primary grow" onClick={speakSentence}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M4 9h3l4-3v12l-4-3H4z" fill="currentColor" /><path d="M14 9.5q2 2.5 0 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> Parler
          </button>
          <EraseButton onLast={() => setSentence((s) => s.slice(0, -1))} onClear={() => setSentence([])} />
        </div>

        {/* Catégories (picto + mot, lu au changement) */}
        <div className="cat-tabs">
          {AAC_CATEGORIES.map((c) => (
            <button key={c.key} className={cat === c.key ? 'on' : ''} onClick={() => { setCat(c.key); speak(c.label); }}>{c.label}</button>
          ))}
        </div>

        {/* Grille — cibles dimensionnées par le profil (§2.2 / L6) */}
        <div className="caa-grid" style={{ gridTemplateColumns: `repeat(${tightGrid ? 2 : board.cols}, 1fr)` }}>
          {cards.map((c) => (
            <button key={c.id} className="caa-card" style={{ minHeight: targetPx }} onClick={() => press(c)}>
              <span className="p">{c.picto}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Gomme (§5.4.2) : 1 tap = retire le dernier ; appui long 1 s = tout effacer,
 * avec anneau de progression (seule exception au 1-tap, standard CAA). */
function EraseButton({ onLast, onClear }: { onLast: () => void; onClear: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  function down() {
    held.current = false;
    setHolding(true);
    timer.current = setTimeout(() => { held.current = true; setHolding(false); onClear(); }, 1000);
  }
  function up() {
    setHolding(false);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!held.current) onLast();
  }
  function cancel() { setHolding(false); if (timer.current) { clearTimeout(timer.current); timer.current = null; } held.current = true; }
  return (
    <button className="btn caa-erase" onPointerDown={down} onPointerUp={up} onPointerLeave={cancel} aria-label="Effacer">
      {holding && <svg className="caa-erase-ring" viewBox="0 0 44 44" aria-hidden><circle cx="22" cy="22" r="20" /></svg>}
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M8 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-5-6 5-6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M11 10l5 5M16 10l-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    </button>
  );
}
