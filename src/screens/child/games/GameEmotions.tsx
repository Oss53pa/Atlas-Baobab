import { useEffect, useRef, useState } from 'react';
import { GameShell, GameDone, Feedback, GAME_ROUNDS, logGameSession, nextLevel, type GameProps, type RoundStats } from './gameKit.js';

/** Jeu des émotions en images (CDC Kessy §5.8) · domaine `communication`.
 * Reconnaissance neutre visage↔mot — un mécanisme de vocabulaire, jamais un
 * protocole de régulation (§5.7 reste hors périmètre, non signé cliniquement).
 * Aucune réponse n'est présentée comme fausse. Primitive : tap. */
const FACES: { e: string; label: string }[] = [
  { e: '😀', label: 'Content' }, { e: '😢', label: 'Triste' },
  { e: '😠', label: 'Fâché' }, { e: '😮', label: 'Surpris' },
  { e: '😴', label: 'Fatigué' }, { e: '😌', label: 'Calme' },
];

export function GameEmotions({ onExit, onBulle, startLevel = 3 }: GameProps) {
  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [feedback, setFeedback] = useState<'ok' | 'no' | null>(null);
  const [q, setQ] = useState(() => makeQ(startLevel));
  const stats = useRef<RoundStats>({ hits: 0, misses: 0, reactions: [] });
  const startedAt = useRef(new Date().toISOString());
  const shownAt = useRef(0);

  useEffect(() => { shownAt.current = performance.now(); }, [round]);

  function choose(label: string) {
    if (feedback) return;
    const ok = label === q.target.label;
    stats.current.reactions.push(performance.now() - shownAt.current);
    if (ok) stats.current.hits += 1; else stats.current.misses += 1;
    setFeedback(ok ? 'ok' : 'no');
    setTimeout(() => {
      setFeedback(null);
      if (round >= GAME_ROUNDS) { logGameSession('emotions', level, stats.current, GAME_ROUNDS, startedAt.current); setPhase('done'); return; }
      const nl = nextLevel(level, stats.current.hits, stats.current.misses);
      setLevel(nl); setRound((r) => r + 1); setQ(makeQ(nl));
    }, 650);
  }

  if (phase === 'done') return <GameShell title="Les émotions" onExit={onExit} onBulle={onBulle}><GameDone onExit={onExit} /></GameShell>;

  return (
    <GameShell title="Les émotions" onExit={onExit} onBulle={onBulle}>
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center', marginBottom: 4 }}>Quelle émotion ?</p>
        <div className="gm-face">{q.target.e}</div>
        <div className="caa-grid" style={{ gridTemplateColumns: `repeat(${q.options.length}, 1fr)`, marginTop: 'auto' }}>
          {q.options.map((o) => (
            <button key={o.label} className="gm-choice" onClick={() => choose(o.label)}>{o.label}</button>
          ))}
        </div>
        <Feedback ok={feedback} />
      </div>
    </GameShell>
  );
}

function makeQ(level: number) {
  const n = level <= 2 ? 2 : level <= 4 ? 3 : 4;
  const pool = shuffle(FACES).slice(0, n);
  const target = pool[Math.floor(Math.random() * pool.length)];
  return { target, options: shuffle(pool) };
}
function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
