import type { TensionBand } from '@atlas-baobab/twin-engine';

const BAND_COLOR: Record<TensionBand, string> = {
  green: 'var(--radar-green)',
  orange: 'var(--radar-orange)',
  red: 'var(--radar-red)',
};

const BAND_LABEL: Record<TensionBand, string> = {
  green: 'calme',
  orange: 'vigilance',
  red: 'tension',
};

export function Gauge({ score, band }: { score: number; band: TensionBand }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <div className="gauge-ring" role="img" aria-label={`Tension ${score} sur 100, ${BAND_LABEL[band]}`}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={BAND_COLOR[band]} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <div className="gauge-val">
        <b>{score}</b>
        <span>{BAND_LABEL[band]}</span>
      </div>
    </div>
  );
}
