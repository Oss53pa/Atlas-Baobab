import { useEffect, useRef, useState } from 'react';
import { GameShell, GameDone, logGameSession, nextLevel, softBeat, type GameProps, type RoundStats } from './gameKit.js';

/** Séquenceur (CDC Kessy §5.8) · domaine `sequencage` (jusque-là sans jeu sonde
 * dédié). Reconstruire une séquence logique universelle (jamais une routine
 * personnelle — contenu volontairement neutre, hors périmètre clinique §9).
 * Primitive : tap dans l'ordre plutôt que glisser (simplification assumée,
 * cohérente avec l'adaptation 3-6a du CDC qui prévoit déjà le tap seul). */
const ROUNDS = 3;
const SEQUENCES = [
  ['🌱', '🌿', '🌳', '🍎'],
  ['🥚', '🐛', '🦋'],
  ['🌅', '☀️', '🌇', '🌙'],
  ['🌑', '🌓', '🌕', '🌗'],
];

export function GameSequenceur({ onExit, onBulle, startLevel = 3 }: GameProps) {
  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [target, setTarget] = useState<string[]>([]);
  const [shuffled, setShuffled] = useState<string[]>([]);
  const [placed, setPlaced] = useState<string[]>([]);
  const stats = useRef<RoundStats>({ hits: 0, misses: 0, reactions: [] });
  const startedAt = useRef(new Date().toISOString());

  useEffect(() => {
    const len = level <= 2 ? 3 : level <= 4 ? 4 : Math.max(4, SEQUENCES.reduce((m, s) => Math.max(m, s.length), 0));
    const pool = SEQUENCES.filter((s) => s.length >= Math.min(len, 3));
    const seq = pool[Math.floor(Math.random() * pool.length)];
    setTarget(seq); setShuffled(shuffle(seq)); setPlaced([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function tap(item: string, idx: number) {
    if (placed.includes(item) && placed.filter((p) => p === item).length >= target.filter((t) => t === item).length) return;
    const wantIdx = placed.length;
    if (item === target[wantIdx]) {
      stats.current.hits += 1;
      softBeat(200 + wantIdx * 20);
      const next = [...placed, item];
      setPlaced(next);
      setShuffled((s) => s.filter((_, i) => i !== idx));
      if (next.length >= target.length) {
        setTimeout(() => {
          if (round >= ROUNDS) { logGameSession('sequenceur', level, stats.current, ROUNDS, startedAt.current); setPhase('done'); return; }
          setLevel(nextLevel(level, stats.current.hits, stats.current.misses)); setRound((r) => r + 1);
        }, 600);
      }
    } else {
      stats.current.misses += 1; // reprise neutre : rien ne se passe, on retente
    }
  }

  if (phase === 'done') return <GameShell title="Séquenceur" onExit={onExit} onBulle={onBulle}><GameDone onExit={onExit} /></GameShell>;

  return (
    <GameShell title="Séquenceur" onExit={onExit} onBulle={onBulle}>
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center', marginBottom: 14 }}>Remets dans l’ordre.</p>
        <div className="gm-seq">
          {target.map((_, i) => <span key={i} className={`gm-seq-i ${placed[i] ? 'filled' : 'gm-q'}`}>{placed[i] ?? '?'}</span>)}
        </div>
        <div className="gm-targets" style={{ marginTop: 'auto' }}>
          {shuffled.map((s, i) => (
            <button key={i} className="gm-target" onClick={() => tap(s, i)}>{s}</button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
