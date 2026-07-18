import { useEffect, useRef, useState } from 'react';
import { GameShell, GameDone, logGameSession, nextLevel, softBeat, type GameProps, type RoundStats } from './gameKit.js';

/** Puzzle calme (CDC Kessy §5.8) · domaine `motricite_fine`. Reconstitution d'une
 * image, aucune limite de temps, aucun objectif cognitif de catégorisation — un
 * sas apaisant plutôt qu'une évaluation. Primitive : tap pièce puis tap case
 * (simplification assumée d'un glisser-déposer, cohérente avec le reste de l'app). */
const ROUNDS = 3;
const IMG = '/child/decor.webp';

interface Piece { row: number; col: number; }

export function GamePuzzle({ onExit, onBulle, startLevel = 3 }: GameProps) {
  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [rows, cols] = level <= 2 ? [2, 2] : level <= 4 ? [2, 3] : [3, 3];
  const [tray, setTray] = useState<Piece[]>([]);
  const [slots, setSlots] = useState<(Piece | null)[]>([]);
  const [selected, setSelected] = useState<Piece | null>(null);
  const stats = useRef<RoundStats>({ hits: 0, misses: 0, reactions: [] });
  const startedAt = useRef(new Date().toISOString());

  useEffect(() => {
    const pieces: Piece[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pieces.push({ row: r, col: c });
    setTray(shuffle(pieces));
    setSlots(Array.from({ length: rows * cols }, () => null));
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, rows, cols]);

  function tapTray(p: Piece) {
    setSelected((s) => (s && s.row === p.row && s.col === p.col ? null : p));
  }
  function tapSlot(idx: number) {
    if (!selected || slots[idx]) return;
    const wantIdx = Math.floor(idx / cols) * cols + (idx % cols);
    const correct = wantIdx === selected.row * cols + selected.col;
    if (correct) {
      stats.current.hits += 1;
      softBeat(220);
      setSlots((s) => s.map((v, i) => (i === idx ? selected : v)));
      setTray((t) => t.filter((p) => !(p.row === selected.row && p.col === selected.col)));
      setSelected(null);
    } else {
      stats.current.misses += 1; // reprise neutre : la pièce reste dans le bac
      setSelected(null);
    }
  }

  useEffect(() => {
    if (phase === 'play' && tray.length === 0 && slots.length > 0) {
      if (round >= ROUNDS) { logGameSession('puzzle', level, stats.current, ROUNDS, startedAt.current); setPhase('done'); return; }
      const t = setTimeout(() => { setLevel(nextLevel(level, stats.current.hits, stats.current.misses)); setRound((r) => r + 1); }, 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tray, slots]);

  if (phase === 'done') return <GameShell title="Puzzle calme" onExit={onExit} onBulle={onBulle}><GameDone onExit={onExit} /></GameShell>;

  const bg = (p: Piece) => ({
    backgroundImage: `url(${IMG})`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${cols <= 1 ? 0 : (p.col / (cols - 1)) * 100}% ${rows <= 1 ? 0 : (p.row / (rows - 1)) * 100}%`,
  });

  return (
    <GameShell title="Puzzle calme" onExit={onExit} onBulle={onBulle}>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center' }}>Reconstitue l’image, sans te presser.</p>
        <div className="gp-board" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, aspectRatio: `${cols}/${rows}` }}>
          {slots.map((p, i) => (
            <button key={i} className={`gp-slot ${p ? '' : 'empty'}`} onClick={() => tapSlot(i)} style={p ? bg(p) : undefined} />
          ))}
        </div>
        <div className="gp-tray">
          {tray.map((p, i) => (
            <button key={i} className={`gp-piece ${selected && selected.row === p.row && selected.col === p.col ? 'sel' : ''}`}
              onClick={() => tapTray(p)} style={bg(p)} />
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
