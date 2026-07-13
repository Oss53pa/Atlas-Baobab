import { useEffect, useRef, useState } from 'react';
import { activeChild, useAppState } from '../../../lib/store.js';
import { avatarGlyph } from '../../../lib/avatars.js';
import { GameShell, GameDone, Feedback, GAME_ROUNDS, logGameSession, nextLevel, speak, type GameProps, type RoundStats } from './gameKit.js';

/** Regarde ! (CDC Jeux §2.7) · attention conjointe répondante, domaine `communication`.
 * L'Avatar montre une cible (pointage puis regard seul aux paliers hauts) ; l'enfant
 * tape ce que l'Avatar désigne. Primitive : tap. La latence est la donnée clé. */
const TARGETS = ['🦋', '🌸', '⚽', '🐦', '🚗', '🍌'];
const ANGLES: Record<number, number[]> = { 2: [-32, 32], 3: [-40, 0, 40], 4: [-48, -16, 16, 48] };

export function GameRegarde({ onExit, onBulle, startLevel = 3 }: GameProps) {
  const child = activeChild(useAppState());
  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [feedback, setFeedback] = useState<'ok' | 'no' | null>(null);
  const [q, setQ] = useState(() => makeQ(startLevel));
  const stats = useRef<RoundStats>({ hits: 0, misses: 0, reactions: [] });
  const startedAt = useRef(new Date().toISOString());
  const shownAt = useRef(0);
  const gazeOnly = level >= 4;

  useEffect(() => {
    shownAt.current = performance.now();
    // Indice sonore doux uniquement quand le pointage est encore donné (paliers bas).
    if (!gazeOnly) speak('Regarde…');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function choose(i: number) {
    if (feedback) return;
    const ok = i === q.targetIdx;
    stats.current.reactions.push(performance.now() - shownAt.current);
    if (ok) stats.current.hits += 1; else stats.current.misses += 1;
    setFeedback(ok ? 'ok' : 'no');
    setTimeout(() => {
      setFeedback(null);
      if (round >= GAME_ROUNDS) { logGameSession('regarde', level, stats.current, GAME_ROUNDS, startedAt.current); setPhase('done'); return; }
      const nl = nextLevel(level, stats.current.hits, stats.current.misses);
      setLevel(nl); setRound((r) => r + 1); setQ(makeQ(nl));
    }, 650);
  }

  if (phase === 'done') return <GameShell title="Regarde !" onExit={onExit} onBulle={onBulle}><GameDone onExit={onExit} /></GameShell>;

  const angles = ANGLES[q.items.length] ?? ANGLES[2];
  const aimAngle = angles[q.targetIdx];

  return (
    <GameShell title="Regarde !" onExit={onExit} onBulle={onBulle}>
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
        <div className="gm-targets">
          {q.items.map((t, i) => (
            <button key={i} className="gm-target" onClick={() => choose(i)}>{t}</button>
          ))}
        </div>
        <div className="gm-bibo">
          <span className="gm-bibo-av">{child ? avatarGlyph(child.avatar_key, 3) : '🌳'}</span>
          <span className="gm-bibo-arm" style={{ transform: `rotate(${aimAngle}deg)`, opacity: gazeOnly ? 0.35 : 1 }}>👉</span>
        </div>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center', marginTop: 'auto' }}>
          {gazeOnly ? 'Où regarde Bibo ?' : 'Regarde ce que montre Bibo !'}
        </p>
        <Feedback ok={feedback} />
      </div>
    </GameShell>
  );
}

function makeQ(level: number) {
  const n = level <= 2 ? 2 : level <= 3 ? 3 : 4;
  const items = shuffle(TARGETS).slice(0, n);
  return { items, targetIdx: Math.floor(Math.random() * n) };
}
function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
