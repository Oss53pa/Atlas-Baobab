import { useState } from 'react';
import { Delete } from 'lucide-react';

/** Saisie de PIN parent (CDC §14 : verrou du mode enfant sur appareil partagé). */
export function PinPad({
  title,
  subtitle,
  expected,
  onSuccess,
  onCancel,
}: {
  title: string;
  subtitle?: string;
  expected: string;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function push(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (next === expected) setTimeout(onSuccess, 120);
      else setTimeout(() => { setError(true); setPin(''); }, 250);
    }
  }

  return (
    <div className="card reveal" style={{ textAlign: 'center' }}>
      <h3>{title}</h3>
      {subtitle && <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>{subtitle}</p>}
      <div className="pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < pin.length ? 'on' : ''} style={error ? { borderColor: 'var(--radar-red)' } : undefined} />
        ))}
      </div>
      {error && <p style={{ color: 'var(--radar-red)', fontSize: 13, marginBottom: 12 }}>Code incorrect</p>}
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => push(d)}>{d}</button>
        ))}
        <button className="btn-ghost" onClick={onCancel} style={{ border: 'none', background: 'none', fontSize: 13 }}>
          {onCancel ? 'Annuler' : ''}
        </button>
        <button onClick={() => push('0')}>0</button>
        <button onClick={() => setPin(pin.slice(0, -1))} aria-label="Effacer"><Delete size={20} /></button>
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 14 }}>Démo : code 0000</p>
    </div>
  );
}
