import { useEffect, useRef, useState } from 'react';
import { activeChild, useAppState } from '../../lib/store.js';
import { childConfig } from '../../lib/childProfileConfig.js';
import { playChildSound, haptic } from '../../lib/childAudio.js';
import { AvatarPic } from '../../components/AvatarPic.js';
import { speak } from '../../lib/tts.js';

/**
 * Coin Calme (CDC Mode Enfant v1.1 §5.2) — 100 % utilisable SANS lire.
 * Un grand cercle respire, Bibo au centre, synchronisé. Le rythme est porté par
 * l'animation + le souffle (son), pas par le texte. Cycle 4-2-6 (inspire-pause-
 * expire). Anneau de progression autour, pas de compteur écrit. Durée par âge.
 */
type Phase = 'in' | 'hold' | 'out';
const DUR: Record<Phase, number> = { in: 4000, hold: 2000, out: 6000 };
const R = 132, CIRC = 2 * Math.PI * R;

export function CoinCalme({ onExit }: { onExit: () => void }) {
  const child = activeChild(useAppState());
  const fx = child ? childConfig(child).fx : null;
  const band = child ? childConfig(child).profile.ageBand : '5-7';
  const totalSec = band === '2-4' ? 60 : band === '5-7' ? 120 : 180;

  const [phase, setPhase] = useState<Phase>('in');
  const [left, setLeft] = useState(totalSec);
  const [ending, setEnding] = useState(false);
  const cycles = useRef(0);

  // Machine à états respiratoire (son + haptique + voix des 2 premiers cycles).
  useEffect(() => {
    if (ending) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const enter = (p: Phase) => {
      if (!alive) return;
      setPhase(p);
      if (p === 'in') { playChildSound('breatheIn'); if (fx?.haptic) haptic(18); if (cycles.current < 2) speak('On gonfle le ventre'); }
      if (p === 'out') { playChildSound('breatheOut'); if (fx?.haptic) haptic(18); if (cycles.current < 2) speak('Et on souffle doucement'); cycles.current += 1; }
      const nx: Phase = p === 'in' ? 'hold' : p === 'hold' ? 'out' : 'in';
      t = setTimeout(() => enter(nx), DUR[p]);
    };
    t = setTimeout(() => enter('in'), 300);
    return () => { alive = false; clearTimeout(t); };
  }, [ending]);

  // Décompte (invisible : porté par l'anneau).
  useEffect(() => {
    if (left <= 0 || ending) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, ending]);

  // Fin douce : lucioles qui s'éteignent + Bibo dodo, puis retour.
  useEffect(() => {
    if (left > 0 || ending) return;
    setEnding(true);
    const t = setTimeout(onExit, 2600);
    return () => clearTimeout(t);
  }, [left, ending, onExit]);

  if (!child) return null;
  const scale = ending ? 0.7 : phase === 'out' ? 0.62 : 1;
  const secs = phase === 'in' ? 4 : phase === 'hold' ? 0 : 6;
  const frac = Math.max(0, left / totalSec);

  return (
    <div className="child-shell cs-calme" style={{ minHeight: '100vh' }}>
      <div className="child-top">
        <button className="cs-iconbtn" onClick={onExit} aria-label="Retour">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <b style={{ fontFamily: 'var(--font-child)' }}>Coin calme</b>
        <span style={{ width: 40 }} />
      </div>

      <div className="cc-stage">
        <div className="cc-halo" data-phase={phase} data-ending={String(ending)}>
          {/* Anneau de progression (durée), pas de texte */}
          <svg className="cc-ring" viewBox="0 0 300 300" aria-hidden>
            <circle cx="150" cy="150" r={R} className="cc-ring-bg" />
            <circle cx="150" cy="150" r={R} className="cc-ring-fg" style={{ strokeDasharray: CIRC, strokeDashoffset: CIRC * (1 - frac) }} />
          </svg>
          <div className="cc-breath" style={{ transform: `scale(${scale})`, transitionDuration: `${secs}s` }}>
            <AvatarPic akey={child.avatar_key} className="cc-bibo" />
          </div>
        </div>
        <p className="cc-cue" aria-live="polite">{ending ? '…' : phase === 'out' ? 'Souffle' : 'Inspire'}</p>
      </div>
    </div>
  );
}
