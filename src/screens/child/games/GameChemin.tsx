import { useEffect, useRef, useState } from 'react';
import { GameShell, GameDone, logGameSession, nextLevel, softBeat, type GameProps, type RoundStats } from './gameKit.js';

/** Le Chemin (CDC Jeux §2.6) · motricité fine / pré-graphisme, domaine `motricite_fine`.
 * L'enfant suit un tracé au doigt. Primitive : tracé. La sortie du chemin n'est
 * JAMAIS signalée (ni son, ni rouge) : le trait s'arrête et reprend au contact (Loi 4). */
const ROUNDS = 3;
const VW = 100;

export function GameChemin({ onExit, onBulle, startLevel = 3 }: GameProps) {
  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [path, setPath] = useState(() => makePath(startLevel));
  const [passed, setPassed] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const stats = useRef<RoundStats>({ hits: 0, misses: 0, reactions: [] });
  const startedAt = useRef(new Date().toISOString());
  const roundStart = useRef(0);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const roadW = level <= 2 ? 26 : level <= 3 ? 18 : level <= 4 ? 12 : 8;
  const hitR = roadW * 0.9 + 6;

  useEffect(() => { setPath(makePath(level)); setPassed(0); setCursor(null); roundStart.current = performance.now(); dragging.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function toSvg(e: React.PointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current; if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return null;
    const loc = pt.matrixTransform(ctm.inverse());
    return { x: loc.x, y: loc.y };
  }
  function advance(p: { x: number; y: number }) {
    setCursor(p);
    const next = path.cps[passed + 1];
    if (next && Math.hypot(p.x - next.x, p.y - next.y) < hitR) {
      const np = passed + 1; setPassed(np); softBeat(220 + np * 20);
      if (np >= path.cps.length - 1) complete();
    }
  }
  function complete() {
    dragging.current = false;
    stats.current.hits += 1; stats.current.reactions.push(performance.now() - roundStart.current);
    setTimeout(() => {
      if (round >= ROUNDS) { logGameSession('chemin', level, stats.current, ROUNDS, startedAt.current); setPhase('done'); return; }
      setLevel(nextLevel(level, stats.current.hits, stats.current.misses)); setRound((r) => r + 1);
    }, 600);
  }
  function onDown(e: React.PointerEvent) { if (phase !== 'play') return; dragging.current = true; const p = toSvg(e); if (p) advance(p); }
  function onMove(e: React.PointerEvent) { if (!dragging.current) return; const p = toSvg(e); if (p) advance(p); }
  function onUp() {
    if (dragging.current && passed < path.cps.length - 1) stats.current.misses += 1; // reprise : signal doux, jamais d'échec affiché
    dragging.current = false; setCursor(null);
  }

  if (phase === 'done') return <GameShell title="Le Chemin" onExit={onExit} onBulle={onBulle}><GameDone onExit={onExit} /></GameShell>;

  const trail = [...path.cps.slice(0, passed + 1), ...(cursor ? [cursor] : [])];
  return (
    <GameShell title="Le Chemin" onExit={onExit} onBulle={onBulle}>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center', marginBottom: 10 }}>Suis le chemin avec ton doigt.</p>
        <svg ref={svgRef} className="gm-chemin" viewBox={`0 0 ${VW} ${path.h}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} style={{ touchAction: 'none' }}>
          <polyline points={path.cps.map((c) => `${c.x},${c.y}`).join(' ')} fill="none" style={{ stroke: 'color-mix(in srgb, var(--primary) 24%, var(--tile))' }} strokeWidth={roadW} strokeLinecap="round" strokeLinejoin="round" />
          {trail.length > 1 && (
            <polyline points={trail.map((c) => `${c.x},${c.y}`).join(' ')} fill="none" style={{ stroke: 'var(--primary)' }} strokeWidth={roadW * 0.55} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {path.cps.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={i === 0 ? 5 : 4}
              style={{ fill: i <= passed ? 'var(--accent)' : (i === passed + 1 ? 'var(--primary)' : 'var(--surface)'), stroke: 'var(--primary)' }} strokeWidth={1.4} />
          ))}
          <text x={path.cps[0].x} y={path.cps[0].y - roadW / 2 - 3} textAnchor="middle" fontSize="7" style={{ fill: 'var(--text-muted)' }}>départ</text>
        </svg>
      </div>
    </GameShell>
  );
}

function makePath(level: number) {
  const n = level <= 2 ? 3 : level <= 3 ? 4 : level <= 4 ? 5 : 6;
  const h = 44 + (n - 1) * 40;
  const cps = Array.from({ length: n }, (_, i) => ({
    x: i % 2 === 0 ? 26 : 74,
    y: 24 + (i * (h - 48)) / (n - 1),
  }));
  return { cps, h };
}
