import { useEffect, useRef, useState } from 'react';
import { GameShell, GameDone, Feedback, GAME_ROUNDS, logGameSession, nextLevel, softBeat, type GameProps, type RoundStats } from './gameKit.js';

/** Le Tambour (CDC Jeux §2.3) · rythme, domaines `attention`/`imitation`. L'Avatar
 * joue une suite de frappes, l'enfant la reproduit. Primitive : tap. Son doux
 * (djembé feutré) + halo visuel — jouable en visuel pur si l'audio est coupé. */
export function GameTambour({ onExit, onBulle, startLevel = 3 }: GameProps) {
  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'demo' | 'input' | 'done'>('demo');
  const [seq, setSeq] = useState<number[]>([]);
  const [pulse, setPulse] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'ok' | 'no' | null>(null);
  const input = useRef<number[]>([]);
  const stats = useRef<RoundStats>({ hits: 0, misses: 0, reactions: [] });
  const startedAt = useRef(new Date().toISOString());
  const shownAt = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const zones = level <= 2 ? 1 : level <= 4 ? 2 : 3;
  const beats = Math.min(6, Math.max(2, level));

  // Génère + joue la démo à chaque nouvelle manche.
  useEffect(() => {
    const s = Array.from({ length: beats }, () => Math.floor(Math.random() * zones));
    setSeq(s); setPhase('demo'); input.current = [];
    timers.current.forEach(clearTimeout); timers.current = [];
    s.forEach((z, i) => {
      timers.current.push(setTimeout(() => { setPulse(z); softBeat(160 + z * 40); }, 500 + i * 720));
      timers.current.push(setTimeout(() => setPulse(null), 500 + i * 720 + 340));
    });
    timers.current.push(setTimeout(() => { setPhase('input'); shownAt.current = performance.now(); }, 500 + s.length * 720 + 200));
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function tap(z: number) {
    if (phase !== 'input' || feedback) return;
    setPulse(z); softBeat(160 + z * 40);
    setTimeout(() => setPulse(null), 220);
    input.current.push(z);
    if (input.current.length < seq.length) return;
    const ok = input.current.every((v, i) => v === seq[i]);
    stats.current.reactions.push(performance.now() - shownAt.current);
    if (ok) stats.current.hits += 1; else stats.current.misses += 1;
    setFeedback(ok ? 'ok' : 'no');
    setTimeout(() => {
      setFeedback(null);
      if (round >= GAME_ROUNDS) { logGameSession('tambour', level, stats.current, GAME_ROUNDS, startedAt.current); setPhase('done'); return; }
      setLevel(nextLevel(level, stats.current.hits, stats.current.misses));
      setRound((r) => r + 1);
    }, 700);
  }

  if (phase === 'done') return <GameShell title="Le Tambour" onExit={onExit} onBulle={onBulle}><GameDone onExit={onExit} /></GameShell>;

  return (
    <GameShell title="Le Tambour" onExit={onExit} onBulle={onBulle}>
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center', marginBottom: 18 }}>
          {phase === 'demo' ? 'Écoute et regarde…' : 'À toi ! Refais pareil.'}
        </p>
        <div className="gm-drums" data-n={zones}>
          {Array.from({ length: zones }, (_, z) => (
            <button key={z} className={`gm-drum ${pulse === z ? 'hit' : ''}`} disabled={phase === 'demo'} onClick={() => tap(z)} aria-label={`tambour ${z + 1}`}>
              🥁
            </button>
          ))}
        </div>
        <Feedback ok={feedback} />
      </div>
    </GameShell>
  );
}
