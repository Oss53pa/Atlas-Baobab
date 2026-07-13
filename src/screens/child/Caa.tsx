import { useMemo, useState } from 'react';
import { Volume2, Eraser, ArrowLeft } from 'lucide-react';
import { activeChild, actions, useAppState } from '../../lib/store.js';
import { AAC_CATEGORIES, defaultBoard } from '../../lib/caa.js';
import { speak } from '../../lib/tts.js';
import type { AacCard } from '../../lib/types.js';

export function Caa({ onExit }: { onExit: () => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const board = (child && state.aacBoards[child.id]) || defaultBoard();
  const [cat, setCat] = useState('base');
  const [sentence, setSentence] = useState<AacCard[]>([]);

  const cards = useMemo(() => board.cards.filter((c) => c.category === cat), [board, cat]);

  function press(card: AacCard) {
    speak(card.label);           // latence tap-vers-voix minimale (CDC §E4)
    actions.pressAacCard(card);  // journal d'usage CAA (flux profil communication)
    setSentence((s) => (s.length >= 6 ? s : [...s, card]));
  }

  function speakSentence() {
    if (sentence.length) speak(sentence.map((c) => c.label).join(' '));
  }

  return (
    <div className="child-shell" style={{ minHeight: '100vh' }}>
      <div className="child-top">
        <button className="btn" style={{ padding: '8px 12px' }} onClick={onExit}><ArrowLeft size={18} /></button>
        <b style={{ fontFamily: 'var(--font-child)' }}>Je parle</b>
        <span style={{ width: 40 }} />
      </div>

      <div className="caa-wrap">
        {/* Barre de phrase (sujet + verbe + complément) */}
        <div className="sentence-bar" onClick={speakSentence}>
          {sentence.length === 0 && <span className="muted" style={{ fontFamily: 'var(--font-child)' }}>Touche les images…</span>}
          {sentence.map((c, i) => (
            <span className="tok" key={i}><span className="p">{c.picto}</span>{c.label}</span>
          ))}
        </div>
        <div className="row" style={{ gap: 10, marginBottom: 12 }}>
          <button className="btn btn-primary grow" onClick={speakSentence}><Volume2 size={18} /> Parler</button>
          <button className="btn" onClick={() => setSentence([])} aria-label="Effacer"><Eraser size={18} /></button>
        </div>

        {/* Catégories */}
        <div className="cat-tabs">
          {AAC_CATEGORIES.map((c) => (
            <button key={c.key} className={cat === c.key ? 'on' : ''} onClick={() => setCat(c.key)}>{c.label}</button>
          ))}
        </div>

        {/* Grille */}
        <div className="caa-grid" style={{ gridTemplateColumns: `repeat(${board.cols}, 1fr)` }}>
          {cards.map((c) => (
            <button key={c.id} className="caa-card" onClick={() => press(c)}>
              <span className="p">{c.picto}</span>
              {c.label}
            </button>
          ))}
        </div>

        <p className="muted" style={{ textAlign: 'center', fontSize: 11, marginTop: 16, fontFamily: 'var(--font-child)' }}>
          La CAA est toujours disponible, jamais limitée.
        </p>
      </div>
    </div>
  );
}
