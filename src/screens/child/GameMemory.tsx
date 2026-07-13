import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { actions, activeChild, useAppState } from '../../lib/store.js';
import { avatarDisplayName, avatarGlyph, avatarLine } from '../../lib/avatars.js';

/** Jeu sonde « mémoire visuelle » (CDC §E3) : court, mesure le temps de réaction
 * et la réussite, télémétrie envoyée au Jumeau. Difficulté adaptative (zone 70-85%). */
const ANIMALS = ['🦁', '🐘', '🦒', '🐢', '🦜', '🐆', '🦓', '🐊', '🦏'];

type Phase = 'show' | 'recall' | 'done';

export function GameMemory({ onExit, startLevel = 3 }: { onExit: () => void; startLevel?: number }) {
  const child = activeChild(useAppState());
  const [level, setLevel] = useState(startLevel);
  const [phase, setPhase] = useState<Phase>('show');
  const [target, setTarget] = useState('');
  const [round, setRound] = useState(1);
  const stats = useRef({ hits: 0, misses: 0, reactions: [] as number[], start: 0 });
  const shownAt = useRef(0);
  const startedAt = useRef(new Date().toISOString());
  const [feedback, setFeedback] = useState<'ok' | 'no' | null>(null);

  const pool = ANIMALS.slice(0, Math.min(ANIMALS.length, level + 2));

  useEffect(() => {
    if (phase !== 'show') return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setTarget(pick);
    const t = setTimeout(() => { setPhase('recall'); shownAt.current = performance.now(); }, 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round]);

  function choose(a: string) {
    if (phase !== 'recall') return;
    const rt = performance.now() - shownAt.current;
    const ok = a === target;
    stats.current.reactions.push(rt);
    if (ok) stats.current.hits += 1; else stats.current.misses += 1;
    setFeedback(ok ? 'ok' : 'no');

    setTimeout(() => {
      setFeedback(null);
      if (round >= 6) finish();
      else {
        // difficulté adaptative : monte si ça réussit, descend sinon
        const rate = stats.current.hits / (stats.current.hits + stats.current.misses);
        if (rate > 0.85) setLevel((l) => Math.min(7, l + 1));
        else if (rate < 0.6) setLevel((l) => Math.max(2, l - 1));
        setRound((r) => r + 1);
        setPhase('show');
      }
    }, 650);
  }

  function finish() {
    const s = stats.current;
    const avg = s.reactions.length ? Math.round(s.reactions.reduce((a, b) => a + b, 0) / s.reactions.length) : 0;
    actions.addGameSession({
      game_code: 'memory_visual',
      difficulty_level: level,
      duration_seconds: 60,
      telemetry: { rounds: round, hits: s.hits, misses: s.misses, avg_reaction_ms: avg },
      played_at: startedAt.current,
    });
    setPhase('done');
  }

  return (
    <div className="child-shell" style={{ minHeight: '100vh' }}>
      <div className="child-top">
        <button className="btn" style={{ padding: '8px 12px' }} onClick={onExit}><ArrowLeft size={18} /></button>
        <b style={{ fontFamily: 'var(--font-child)' }}>Mémoire</b>
        <span className="chip">manche {Math.min(round, 6)}/6</span>
      </div>

      {phase === 'show' && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, marginBottom: 12 }}>Regarde bien…</p>
            <div style={{ fontSize: 96 }}>{target}</div>
          </div>
        </div>
      )}

      {phase === 'recall' && (
        <div style={{ flex: 1, padding: 20 }}>
          <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, textAlign: 'center', marginBottom: 16 }}>
            Lequel as-tu vu ?
          </p>
          <div className="caa-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {pool.map((a) => (
              <button key={a} className="caa-card" style={{ fontSize: 40, padding: '18px 6px' }} onClick={() => choose(a)}>{a}</button>
            ))}
          </div>
          {feedback && (
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 40 }}>{feedback === 'ok' ? '✅' : '💛'}</p>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 72 }}>{child ? avatarGlyph(child.avatar_key) : '🌟'}</div>
            <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, fontSize: 22, margin: '10px 0' }}>
              {child ? `${avatarDisplayName(child.avatar_key, child.avatar_custom_name)} : ${avatarLine('success')}` : 'Bravo !'}
            </p>
            <button className="btn btn-primary btn-lg" onClick={onExit}>Terminer</button>
          </div>
        </div>
      )}
    </div>
  );
}
