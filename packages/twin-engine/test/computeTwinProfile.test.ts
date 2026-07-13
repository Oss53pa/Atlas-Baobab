import { describe, it, expect } from 'vitest';
import { computeTwinProfile, DEFAULT_WINDOW_DAYS } from '../src/computeTwinProfile.js';
import { TWIN_ALGO_VERSION } from '../src/version.js';
import type { IncidentInput, ObservationInput } from '../src/types.js';

const NOW = '2026-07-11T12:00:00Z';

const observations: ObservationInput[] = [
  {
    id: 'o1',
    kind: 'mood',
    occurred_at: '2026-07-10T12:00:00Z',
    context: { sensory: [{ channel: 'auditory', direction: 'hyper', intensity: 5 }] },
  },
];
const incidents: IncidentInput[] = Array.from({ length: 3 }, (_, i) => ({
  id: `inc-${i}`,
  started_at: `2026-07-0${5 + i}T17:00:00Z`,
  context: { place: 'ecole' },
}));

describe('computeTwinProfile', () => {
  it('assembles a versioned profile from sensory + trigger sub-engines', () => {
    const p = computeTwinProfile(observations, incidents, { version: 7, computedAt: NOW });
    expect(p.version).toBe(7);
    expect(p.computed_at).toBe(NOW);
    expect(p.algorithm_version).toBe(TWIN_ALGO_VERSION);
    expect(p.window_days).toBe(DEFAULT_WINDOW_DAYS);
    expect(p.sensory.channels).toHaveLength(8);
    expect(p.triggers.find((t) => t.dimension === 'place' && t.value === 'ecole')).toBeDefined();
    expect(p.interests).toEqual([]);
    expect(p.precrisis_signals).toEqual([]);
    expect(p.strengths).toEqual({});
  });

  it('honours a custom window', () => {
    const p = computeTwinProfile(observations, incidents, {
      version: 1,
      computedAt: NOW,
      windowDays: 7,
    });
    expect(p.window_days).toBe(7);
  });

  it('is a pure function (same inputs -> deep-equal output)', () => {
    const opts = { version: 2, computedAt: NOW };
    expect(computeTwinProfile(observations, incidents, opts)).toEqual(
      computeTwinProfile(observations, incidents, opts),
    );
  });
});
