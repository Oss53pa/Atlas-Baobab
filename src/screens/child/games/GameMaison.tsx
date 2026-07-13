import { useEffect, useRef, useState } from 'react';
import { GameShell, GameDone, logGameSession, nextLevel, type GameProps, type RoundStats } from './gameKit.js';

/** Chacun sa maison (CDC Jeux §2.4) · tri / catégorisation, domaine `logique`.
 * L'enfant glisse chaque objet dans la bonne maison. Primitive : glisser, enseignée
 * par une main fantôme à la première manche. L'erreur est neutre : l'objet revient. */
const ROUNDS = 3;
const FAMILIES = [
  { key: 'animaux', sample: '🐘', items: ['🐘', '🦁', '🐢', '🦒', '🐆'] },
  { key: 'vehicules', sample: '🚗', items: ['🚗', '🚌', '🚲', '🛵', '🚕'] },
  { key: 'fruits', sample: '🥭', items: ['🥭', '🍌', '🍊', '🍉', '🍍'] },
  { key: 'objets', sample: '🥣', items: ['🥣', '🥄', '🍶', '🪣', '🧹'] },
];
interface Obj { id: number; emoji: string; fam: string; }

export function GameMaison({ onExit, onBulle, startLevel = 3 }: GameProps) {
  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [objects, setObjects] = useState<Obj[]>([]);
  const [houses, setHouses] = useState<typeof FAMILIES>([]);
  const [drag, setDrag] = useState<{ obj: Obj; x: number; y: number } | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const stats = useRef<RoundStats>({ hits: 0, misses: 0, reactions: [] });
  const startedAt = useRef(new Date().toISOString());
  const houseRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const trayRef = useRef<HTMLDivElement | null>(null);

  const nFam = level <= 2 ? 2 : level <= 4 ? 3 : 4;
  const nObj = level <= 2 ? 4 : level <= 3 ? 5 : 6;

  // Prépare une manche : familles + objets mélangés.
  useEffect(() => {
    const fams = shuffle(FAMILIES).slice(0, nFam);
    const objs: Obj[] = [];
    let id = 0;
    for (let i = 0; i < nObj; i++) {
      const fam = fams[i % fams.length];
      objs.push({ id: id++, emoji: fam.items[Math.floor(Math.random() * fam.items.length)], fam: fam.key });
    }
    setHouses(fams); setObjects(shuffle(objs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Main fantôme : démonstration du glisser à la toute première manche.
  useEffect(() => {
    if (round !== 1 || !objects.length) return;
    const t = setTimeout(() => {
      const first = trayRef.current?.querySelector('.gm-obj') as HTMLElement | null;
      const houseIdx = houses.findIndex((h) => h.key === objects[0]?.fam);
      const house = houseRefs.current[houseIdx];
      if (!first || !house) return;
      const a = first.getBoundingClientRect(); const b = house.getBoundingClientRect();
      setGhost({ x: a.left + a.width / 2, y: a.top + a.height / 2, tx: b.left + b.width / 2, ty: b.top + b.height / 2 });
      setTimeout(() => setGhost(null), 2200);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects]);

  function onDown(obj: Obj, e: React.PointerEvent) {
    setGhost(null);
    setDrag({ obj, x: e.clientX, y: e.clientY });
  }
  function onMove(e: React.PointerEvent) { if (drag) setDrag({ ...drag, x: e.clientX, y: e.clientY }); }
  function onUp(e: React.PointerEvent) {
    if (!drag) return;
    const idx = houseRefs.current.findIndex((h) => { if (!h) return false; const r = h.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
    if (idx >= 0) {
      const correct = houses[idx].key === drag.obj.fam;
      if (correct) { stats.current.hits += 1; setObjects((os) => os.filter((o) => o.id !== drag.obj.id)); }
      else stats.current.misses += 1; // erreur neutre : l'objet reste dans la barre
    }
    setDrag(null);
  }

  // Fin de manche quand tous les objets sont rangés.
  useEffect(() => {
    if (phase === 'play' && objects.length === 0 && houses.length > 0) {
      if (round >= ROUNDS) { logGameSession('maison', level, stats.current, ROUNDS, startedAt.current); setPhase('done'); return; }
      const t = setTimeout(() => { setLevel(nextLevel(level, stats.current.hits, stats.current.misses)); setRound((r) => r + 1); }, 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects.length, houses.length]);

  if (phase === 'done') return <GameShell title="Chacun sa maison" onExit={onExit} onBulle={onBulle}><GameDone onExit={onExit} /></GameShell>;

  return (
    <GameShell title="Chacun sa maison" onExit={onExit} onBulle={onBulle}>
      <div className="gm-maison" onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>Range chaque chose dans sa maison.</p>
        <div className="gm-tray" ref={trayRef}>
          {objects.map((o) => (
            <button key={o.id} className="gm-obj" style={{ opacity: drag?.obj.id === o.id ? 0.25 : 1 }} onPointerDown={(e) => onDown(o, e)}>{o.emoji}</button>
          ))}
        </div>
        <div className="gm-houses">
          {houses.map((h, i) => (
            <button key={h.key} ref={(el) => { houseRefs.current[i] = el; }} className="gm-house">
              <span className="gm-house-roof">🏠</span>
              <span className="gm-house-fam">{h.sample}</span>
            </button>
          ))}
        </div>
      </div>
      {drag && <div className="gm-drag" style={{ left: drag.x, top: drag.y }}>{drag.obj.emoji}</div>}
      {ghost && <div className="gm-ghost" style={{ left: ghost.x, top: ghost.y, ['--tx' as string]: `${ghost.tx - ghost.x}px`, ['--ty' as string]: `${ghost.ty - ghost.y}px` }}>👆</div>}
    </GameShell>
  );
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
