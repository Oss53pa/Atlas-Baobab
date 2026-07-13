/**
 * Kit commun aux jeux sondes (CDC Jeux & Activités v1.0 §6.1) : coquille, écran de
 * fin, télémétrie, règle 70–85 %. Chaque jeu garde sa mécanique ; l'habillage, la
 * sortie 🫧 vers Ma Bulle, la sortie retour et la fin sont mutualisés.
 */
import type { ReactNode } from 'react';
import { ArrowLeft, Wind } from 'lucide-react';
import { actions, activeChild, useAppState } from '../../../lib/store.js';
import { avatarDisplayName, avatarGlyph, avatarLine } from '../../../lib/avatars.js';
import { speak } from '../../../lib/tts.js';

export { speak };
export const GAME_ROUNDS = 6;

export interface GameProps {
  onExit: () => void;
  /** Sortie douce vers Ma Bulle (bouton 🫧, §6.1). */
  onBulle?: () => void;
  /** Niveau de départ dérivé du palier du domaine (CDC Jeux §1). */
  startLevel?: number;
}

/** Coquille : barre du haut (retour + titre + 🫧) puis le corps du jeu. */
export function GameShell({ title, onExit, onBulle, children }: { title: string; onExit: () => void; onBulle?: () => void; children: ReactNode }) {
  return (
    <div className="child-shell" style={{ minHeight: '100vh' }}>
      <div className="child-top">
        <button className="btn" style={{ padding: '8px 12px' }} onClick={onExit} aria-label="Retour"><ArrowLeft size={18} /></button>
        <b style={{ fontFamily: 'var(--font-child)' }}>{title}</b>
        <button className="btn" style={{ padding: '8px 12px' }} onClick={onBulle ?? onExit} aria-label="Ma bulle"><Wind size={18} /></button>
      </div>
      {children}
    </div>
  );
}

/** Écran de fin : l'Avatar félicite, sobrement, jamais de score chiffré (Loi 4). */
export function GameDone({ onExit }: { onExit: () => void }) {
  const child = activeChild(useAppState());
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72 }}>{child ? avatarGlyph(child.avatar_key) : '🌟'}</div>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, fontSize: 22, margin: '10px 0' }}>
          {child ? `${avatarDisplayName(child.avatar_key, child.avatar_custom_name)} : ${avatarLine('success')}` : 'Bravo !'}
        </p>
        <button className="btn btn-primary btn-lg" onClick={onExit}>Terminer</button>
      </div>
    </div>
  );
}

/** Retour neutre après une réponse (jamais de rouge ni de son d'échec, §0.5). */
export function Feedback({ ok }: { ok: 'ok' | 'no' | null }) {
  if (!ok) return null;
  return <p style={{ textAlign: 'center', marginTop: 16, fontSize: 40 }}>{ok === 'ok' ? '✅' : '💛'}</p>;
}

export interface RoundStats { hits: number; misses: number; reactions: number[]; }

export function logGameSession(code: string, level: number, stats: RoundStats, rounds: number, startedAt: string): void {
  const avg = stats.reactions.length ? Math.round(stats.reactions.reduce((a, b) => a + b, 0) / stats.reactions.length) : 0;
  actions.addGameSession({
    game_code: code, difficulty_level: level, duration_seconds: 60,
    telemetry: { rounds, hits: stats.hits, misses: stats.misses, avg_reaction_ms: avg },
    played_at: startedAt,
  });
}

/** Règle 70–85 % : monte d'un cran si ça réussit trop, descend si ça échoue trop. */
export function nextLevel(level: number, hits: number, misses: number, min = 2, max = 7): number {
  const total = hits + misses;
  if (!total) return level;
  const rate = hits / total;
  if (rate > 0.85) return Math.min(max, level + 1);
  if (rate < 0.6) return Math.max(min, level - 1);
  return level;
}

/** Petit son doux (djembé feutré) sans dépendance : sinus court, faible gain.
 * Silencieux si l'audio est indisponible — le jeu reste jouable en visuel. */
export function softBeat(freq = 180): void {
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ac = new Ctx();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime;
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.start(t); o.stop(t + 0.34);
    o.onended = () => ac.close();
  } catch { /* audio indisponible : silencieux, le halo visuel suffit */ }
}
