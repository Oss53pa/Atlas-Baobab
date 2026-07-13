import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { activeChild, useAppState } from '../../lib/store.js';
import { avatarDisplayName, avatarGlyph, avatarLine } from '../../lib/avatars.js';

/** Coin Calme (CDC §E5) : bulle de régulation, respiration guidée visuelle.
 * L'Avatar respire avec l'enfant (C02 §C2.4). Limité à 10 min par session. */
export function CoinCalme({ onExit }: { onExit: () => void }) {
  const child = activeChild(useAppState());
  const [phase, setPhase] = useState<'Inspire' | 'Expire'>('Inspire');
  const [left, setLeft] = useState(120);

  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p === 'Inspire' ? 'Expire' : 'Inspire')), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <div className="child-shell" style={{ minHeight: '100vh', justifyContent: 'space-between' }}>
      <div className="child-top">
        <button className="btn" style={{ padding: '8px 12px' }} onClick={onExit}><ArrowLeft size={18} /></button>
        <b style={{ fontFamily: 'var(--font-child)' }}>Coin calme</b>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="breath" style={{ fontSize: 64 }}>{child ? avatarGlyph(child.avatar_key) : '🫧'}</div>
        <p style={{ fontFamily: 'var(--font-child)', fontWeight: 800, fontSize: 22, marginTop: 10 }}>{phase}…</p>
        {child && (
          <p className="muted" style={{ fontFamily: 'var(--font-child)', fontSize: 13, marginTop: 4 }}>
            {avatarDisplayName(child.avatar_key, child.avatar_custom_name)} : {avatarLine('calm')}
          </p>
        )}
      </div>

      <div style={{ padding: 24, textAlign: 'center' }}>
        {left > 0 ? (
          <p className="muted" style={{ fontFamily: 'var(--font-child)' }}>Encore {Math.ceil(left / 60)} min de calme</p>
        ) : (
          <p className="muted" style={{ fontFamily: 'var(--font-child)' }}>Bravo. Et si on faisait une pause dehors ?</p>
        )}
      </div>
    </div>
  );
}
