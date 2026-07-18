import { useEffect, useRef, useState } from 'react';
import { GameShell, GameDone, logGameSession, nextLevel, type GameProps, type RoundStats } from './gameKit.js';

/** Association apaisée (CDC Kessy §5.8) · memory sans chrono, domaine `attention`.
 * Grille de paires à retrouver, aucune limite de temps, aucun compteur de coups
 * affiché : le retrait du chronomètre est volontaire (facteur de stress inutile). */
const ROUNDS = 3;
const POOL = ['🐘', '🦁', '🐢', '🦒', '🦋', '🐦', '🌸', '🍊', '🥭', '⚽'];

interface Card { id: number; emoji: string; found: boolean; }

export function GameAssociation({ onExit, onBulle, startLevel = 3 }: GameProps) {
  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const stats = useRef<RoundStats>({ hits: 0, misses: 0, reactions: [] });
  const startedAt = useRef(new Date().toISOString());

  const nPairs = level <= 2 ? 2 : level <= 4 ? 3 : 4;

  useEffect(() => {
    const picks = shuffle(POOL).slice(0, nPairs);
    const deck: Card[] = shuffle(picks.flatMap((e, i) => [
      { id: i * 2, emoji: e, found: false },
      { id: i * 2 + 1, emoji: e, found: false },
    ]));
    setCards(deck); setFlipped([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function tap(idx: number) {
    if (busy || flipped.includes(idx) || cards[idx].found) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length < 2) return;
    setBusy(true);
    const [a, b] = next;
    const match = cards[a].emoji === cards[b].emoji;
    setTimeout(() => {
      if (match) {
        stats.current.hits += 1;
        setCards((cs) => cs.map((c, i) => (i === a || i === b ? { ...c, found: true } : c)));
      } else {
        stats.current.misses += 1;
      }
      setFlipped([]);
      setBusy(false);
    }, match ? 300 : 700);
  }

  // Fin de manche quand toutes les paires sont trouvées.
  useEffect(() => {
    if (phase === 'play' && cards.length > 0 && cards.every((c) => c.found)) {
      if (round >= ROUNDS) { logGameSession('association', level, stats.current, ROUNDS, startedAt.current); setPhase('done'); return; }
      const t = setTimeout(() => { setLevel(nextLevel(level, stats.current.hits, stats.current.misses)); setRound((r) => r + 1); }, 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  if (phase === 'done') return <GameShell title="Association apaisée" onExit={onExit} onBulle={onBulle}><GameDone onExit={onExit} /></GameShell>;

  return (
    <GameShell title="Association apaisée" onExit={onExit} onBulle={onBulle}>
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center', marginBottom: 14 }}>Retrouve les paires.</p>
        <div className="gm-cards">
          {cards.map((c, i) => {
            const shown = c.found || flipped.includes(i);
            return (
              <button key={`${c.id}-${shown}`} className={`gm-card ${shown ? 'flip' : 'back'} ${c.found ? 'found' : ''}`} onClick={() => tap(i)}>
                {shown ? c.emoji : '❔'}
              </button>
            );
          })}
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
