import { useEffect, useRef, useState } from 'react';
import { GameShell, GameDone, logGameSession, nextLevel, softBeat, type GameProps, type RoundStats } from './gameKit.js';

/** Chasse à l'objet (CDC Kessy §5.8) · domaine `attention`. Attention visuelle
 * soutenue dans une scène calme (peu chargée, pas d'animation) : repérer les
 * objets liés à un même thème parmi des distracteurs. Primitive : tap. */
const ROUNDS = 3;
const THEMES = [
  { target: '🍎', distract: ['🍌', '🍊', '🍉', '🥭', '🍍'] },
  { target: '⭐', distract: ['🌙', '☁️', '🌸', '🍃', '🌊'] },
  { target: '🐘', distract: ['🐢', '🦒', '🦋', '🐦', '🦓'] },
];

interface Cell { id: number; e: string; isTarget: boolean; found: boolean; }

export function GameChasse({ onExit, onBulle, startLevel = 3 }: GameProps) {
  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [cells, setCells] = useState<Cell[]>([]);
  const stats = useRef<RoundStats>({ hits: 0, misses: 0, reactions: [] });
  const startedAt = useRef(new Date().toISOString());
  const roundStart = useRef(0);

  const gridN = level <= 2 ? 9 : level <= 4 ? 12 : 16;
  const nTargets = level <= 2 ? 1 : level <= 4 ? 2 : 3;

  useEffect(() => {
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    const arr: Cell[] = [];
    for (let i = 0; i < gridN; i++) {
      const isTarget = i < nTargets;
      arr.push({ id: i, e: isTarget ? theme.target : theme.distract[Math.floor(Math.random() * theme.distract.length)], isTarget, found: false });
    }
    setCells(shuffle(arr));
    roundStart.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function tap(c: Cell) {
    if (c.found) return;
    if (c.isTarget) {
      stats.current.hits += 1;
      softBeat(240);
      setCells((cs) => cs.map((x) => (x.id === c.id ? { ...x, found: true } : x)));
    } else {
      stats.current.misses += 1; // neutre : pas de son négatif, la chasse continue
    }
  }

  useEffect(() => {
    if (phase === 'play' && cells.length > 0 && cells.filter((c) => c.isTarget).every((c) => c.found)) {
      stats.current.reactions.push(performance.now() - roundStart.current);
      if (round >= ROUNDS) { logGameSession('chasse', level, stats.current, ROUNDS, startedAt.current); setPhase('done'); return; }
      const t = setTimeout(() => { setLevel(nextLevel(level, stats.current.hits, stats.current.misses)); setRound((r) => r + 1); }, 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells]);

  if (phase === 'done') return <GameShell title="Chasse à l’objet" onExit={onExit} onBulle={onBulle}><GameDone onExit={onExit} /></GameShell>;

  const target = cells.find((c) => c.isTarget)?.e ?? '⭐';

  return (
    <GameShell title="Chasse à l’objet" onExit={onExit} onBulle={onBulle}>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center', marginBottom: 14 }}>Trouve tous les {target}</p>
        <div className="gm-scene">
          {cells.map((c) => (
            <button key={c.id} className={`gm-cell ${c.found ? 'found' : ''}`} onClick={() => tap(c)}>{c.e}</button>
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
