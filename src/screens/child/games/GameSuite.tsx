import { useEffect, useRef, useState } from 'react';
import { GameShell, GameDone, Feedback, GAME_ROUNDS, logGameSession, nextLevel, type GameProps, type RoundStats } from './gameKit.js';

/** La Suite (CDC Jeux §2.2) · patterns, domaine `logique`. Extraire une régularité :
 * on montre une suite et l'enfant tape ce qui vient après. Primitive : tap. */
const SHAPES = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'];

export function GameSuite({ onExit, onBulle, startLevel = 3 }: GameProps) {
  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [feedback, setFeedback] = useState<'ok' | 'no' | null>(null);
  const [puzzle, setPuzzle] = useState(() => makePuzzle(startLevel));
  const stats = useRef<RoundStats>({ hits: 0, misses: 0, reactions: [] });
  const startedAt = useRef(new Date().toISOString());
  const shownAt = useRef(0);

  useEffect(() => { shownAt.current = performance.now(); }, [round]);

  function choose(opt: string) {
    if (feedback) return;
    const ok = opt === puzzle.answer;
    stats.current.reactions.push(performance.now() - shownAt.current);
    if (ok) stats.current.hits += 1; else stats.current.misses += 1;
    setFeedback(ok ? 'ok' : 'no');
    setTimeout(() => {
      setFeedback(null);
      if (round >= GAME_ROUNDS) { logGameSession('suite', level, stats.current, GAME_ROUNDS, startedAt.current); setPhase('done'); return; }
      const nl = nextLevel(level, stats.current.hits, stats.current.misses);
      setLevel(nl); setRound((r) => r + 1); setPuzzle(makePuzzle(nl));
    }, 650);
  }

  if (phase === 'done') return <GameShell title="La Suite" onExit={onExit} onBulle={onBulle}><GameDone onExit={onExit} /></GameShell>;

  return (
    <GameShell title="La Suite" onExit={onExit} onBulle={onBulle}>
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center', marginBottom: 18 }}>Qu’est-ce qui vient après&nbsp;?</p>
        <div className="gm-seq">
          {puzzle.shown.map((s, i) => <span key={i} className="gm-seq-i">{s}</span>)}
          <span className="gm-seq-i gm-q">?</span>
        </div>
        <div className="caa-grid" style={{ gridTemplateColumns: `repeat(${puzzle.options.length}, 1fr)`, marginTop: 'auto' }}>
          {puzzle.options.map((o, i) => <button key={i} className="caa-card" style={{ fontSize: 40, padding: '20px 6px' }} onClick={() => choose(o)}>{o}</button>)}
        </div>
        <Feedback ok={feedback} />
      </div>
    </GameShell>
  );
}

function makePuzzle(level: number) {
  const period = level <= 3 ? 2 : 3;
  const len = Math.min(7, level + 1);
  const alpha = shuffle(SHAPES).slice(0, period);
  const base = Array.from({ length: len }, (_, i) => alpha[i % period]);
  const answer = base[len - 1];
  const nOpt = level <= 2 ? 2 : level <= 4 ? 3 : 4;
  const distract = shuffle(SHAPES.filter((s) => s !== answer)).slice(0, nOpt - 1);
  return { shown: base.slice(0, len - 1), answer, options: shuffle([answer, ...distract]) };
}
function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
