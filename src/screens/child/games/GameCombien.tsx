import { useEffect, useRef, useState } from 'react';
import { GameShell, GameDone, Feedback, GAME_ROUNDS, logGameSession, nextLevel, type GameProps, type RoundStats } from './gameKit.js';

/** Combien ? (CDC Jeux §2.5) · domaine `quantites`. Correspondance terme à terme,
 * subitisation, puis petite arithmétique imagée. Primitive : tap. */
const OBJ = '🥭';

export function GameCombien({ onExit, onBulle, startLevel = 3 }: GameProps) {
  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [feedback, setFeedback] = useState<'ok' | 'no' | null>(null);
  const [q, setQ] = useState(() => makeQ(startLevel));
  const stats = useRef<RoundStats>({ hits: 0, misses: 0, reactions: [] });
  const startedAt = useRef(new Date().toISOString());
  const shownAt = useRef(0);

  useEffect(() => { shownAt.current = performance.now(); }, [round]);

  function choose(n: number) {
    if (feedback) return;
    const ok = n === q.answer;
    stats.current.reactions.push(performance.now() - shownAt.current);
    if (ok) stats.current.hits += 1; else stats.current.misses += 1;
    setFeedback(ok ? 'ok' : 'no');
    setTimeout(() => {
      setFeedback(null);
      if (round >= GAME_ROUNDS) { logGameSession('combien', level, stats.current, GAME_ROUNDS, startedAt.current); setPhase('done'); return; }
      const nl = nextLevel(level, stats.current.hits, stats.current.misses);
      setLevel(nl); setRound((r) => r + 1); setQ(makeQ(nl));
    }, 650);
  }

  if (phase === 'done') return <GameShell title="Combien ?" onExit={onExit} onBulle={onBulle}><GameDone onExit={onExit} /></GameShell>;

  return (
    <GameShell title="Combien ?" onExit={onExit} onBulle={onBulle}>
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center', marginBottom: 14 }}>Combien y en a-t-il&nbsp;?</p>
        <div className="gm-count">
          <div className="gm-group">{Array.from({ length: q.a }, (_, i) => <span key={i}>{OBJ}</span>)}</div>
          {q.b > 0 && <><span className="gm-plus">+</span><div className="gm-group">{Array.from({ length: q.b }, (_, i) => <span key={i}>{OBJ}</span>)}</div></>}
        </div>
        <div className="caa-grid" style={{ gridTemplateColumns: `repeat(${q.options.length}, 1fr)`, marginTop: 'auto' }}>
          {q.options.map((o) => <button key={o} className="caa-card" style={{ fontSize: 34, padding: '20px 6px', fontWeight: 800 }} onClick={() => choose(o)}>{o}</button>)}
        </div>
        <Feedback ok={feedback} />
      </div>
    </GameShell>
  );
}

function makeQ(level: number) {
  let a: number, b = 0;
  if (level <= 3) { a = rand(1, level <= 2 ? 3 : 5); }
  else { a = rand(1, 5); b = rand(1, level <= 4 ? 5 : 9); }
  const answer = a + b;
  const nOpt = level <= 2 ? 2 : 3;
  const opts = new Set<number>([answer]);
  while (opts.size < nOpt) {
    const d = answer + (Math.random() < 0.5 ? -1 : 1) * rand(1, 2);
    if (d >= 1 && d <= 20) opts.add(d);
  }
  return { a, b, answer, options: shuffle([...opts]) };
}
function rand(lo: number, hi: number) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
