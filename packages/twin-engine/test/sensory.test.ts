import { describe, it, expect } from 'vitest';
import { computeSensoryProfile } from '../src/sensory.js';
import type {
  IncidentInput,
  ObservationInput,
  SensoryChannel,
  SensorySignal,
} from '../src/types.js';

const NOW = '2026-07-11T12:00:00Z';

function obs(signals: SensorySignal[], occurred_at = '2026-07-10T12:00:00Z'): ObservationInput {
  return { id: `o-${occurred_at}-${Math.round(signals.length)}-${signals[0]?.channel ?? 'x'}`, kind: 'mood', occurred_at, context: { sensory: signals } };
}

function chan(profile: ReturnType<typeof computeSensoryProfile>, c: SensoryChannel) {
  const found = profile.channels.find((x) => x.channel === c);
  if (!found) throw new Error(`channel ${c} missing`);
  return found;
}

function repeat(signal: SensorySignal, n: number): ObservationInput[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `r-${signal.channel}-${signal.direction}-${i}`,
    kind: 'mood',
    occurred_at: '2026-07-09T12:00:00Z',
    context: { sensory: [signal] },
  }));
}

describe('computeSensoryProfile', () => {
  it('returns all 8 channels as insufficient when empty', () => {
    const p = computeSensoryProfile([], [], NOW, 30);
    expect(p.channels).toHaveLength(8);
    for (const c of p.channels) {
      expect(c.sample_size).toBe(0);
      expect(c.classification).toBe('insufficient_data');
      expect(c.confidence).toBe('insufficient');
      expect(c.hypo_score).toBe(0);
      expect(c.hyper_score).toBe(0);
    }
  });

  it('classifies a clear hyper channel', () => {
    const p = computeSensoryProfile(
      repeat({ channel: 'auditory', direction: 'hyper', intensity: 5 }, 3),
      [],
      NOW,
      30,
    );
    const a = chan(p, 'auditory');
    expect(a.sample_size).toBe(3);
    expect(a.hyper_score).toBe(1);
    expect(a.hypo_score).toBe(0);
    expect(a.classification).toBe('hyper');
    expect(a.confidence).toBe('faible');
  });

  it('classifies a clear hypo channel', () => {
    const p = computeSensoryProfile(
      repeat({ channel: 'tactile', direction: 'hypo', intensity: 4 }, 4),
      [],
      NOW,
      30,
    );
    const t = chan(p, 'tactile');
    expect(t.classification).toBe('hypo');
    expect(t.hypo_score).toBeGreaterThan(t.hyper_score);
  });

  it('classifies mixed when hypo ~ hyper', () => {
    const p = computeSensoryProfile(
      [
        ...repeat({ channel: 'visual', direction: 'hypo', intensity: 3 }, 2),
        ...repeat({ channel: 'visual', direction: 'hyper', intensity: 3 }, 2),
      ],
      [],
      NOW,
      30,
    );
    const v = chan(p, 'visual');
    expect(v.sample_size).toBe(4);
    expect(v.classification).toBe('mixed');
  });

  it('classifies neutral when signals carry near-zero intensity', () => {
    const p = computeSensoryProfile(
      repeat({ channel: 'olfactory', direction: 'hypo', intensity: 0 }, 3),
      [],
      NOW,
      30,
    );
    const o = chan(p, 'olfactory');
    expect(o.sample_size).toBe(3);
    expect(o.classification).toBe('neutral');
  });

  it('escalates confidence with sample size', () => {
    const moyen = chan(
      computeSensoryProfile(repeat({ channel: 'vestibular', direction: 'hyper', intensity: 4 }, 5), [], NOW, 30),
      'vestibular',
    );
    expect(moyen.confidence).toBe('moyen');
    const fort = chan(
      computeSensoryProfile(repeat({ channel: 'vestibular', direction: 'hyper', intensity: 4 }, 10), [], NOW, 30),
      'vestibular',
    );
    expect(fort.confidence).toBe('fort');
  });

  it('clamps out-of-range and non-finite intensities', () => {
    const p = computeSensoryProfile(
      [obs([{ channel: 'proprioceptive', direction: 'hyper', intensity: 99 }])],
      [],
      NOW,
      30,
    );
    // clamped to 5 -> hyper_score = 5 / (1*5) = 1
    expect(chan(p, 'proprioceptive').hyper_score).toBe(1);

    const neg = computeSensoryProfile(
      [obs([{ channel: 'proprioceptive', direction: 'hypo', intensity: -4 }])],
      [],
      NOW,
      30,
    );
    expect(chan(neg, 'proprioceptive').hypo_score).toBe(0);
    expect(chan(neg, 'proprioceptive').sample_size).toBe(1);

    const nan = computeSensoryProfile(
      [obs([{ channel: 'interoceptive', direction: 'hyper', intensity: Number.NaN }])],
      [],
      NOW,
      30,
    );
    expect(chan(nan, 'interoceptive').hyper_score).toBe(0);
  });

  it('ignores unknown channels and invalid directions', () => {
    const p = computeSensoryProfile(
      [
        obs([
          { channel: 'taste' as unknown as SensoryChannel, direction: 'hyper', intensity: 5 },
          { channel: 'auditory', direction: 'sideways' as unknown as SensorySignal['direction'], intensity: 5 },
          { channel: 'auditory', direction: 'hyper', intensity: 5 },
        ]),
      ],
      [],
      NOW,
      30,
    );
    expect(chan(p, 'auditory').sample_size).toBe(1);
  });

  it('excludes signals outside the sliding window', () => {
    const p = computeSensoryProfile(
      [obs([{ channel: 'auditory', direction: 'hyper', intensity: 5 }], '2026-05-01T12:00:00Z')],
      [],
      NOW,
      30,
    );
    expect(chan(p, 'auditory').sample_size).toBe(0);
  });

  it('also ingests sensory signals carried by incidents', () => {
    const incidents: IncidentInput[] = [
      {
        id: 'inc-1',
        started_at: '2026-07-10T17:00:00Z',
        context: { sensory: [{ channel: 'auditory', direction: 'hyper', intensity: 5 }] },
      },
    ];
    const p = computeSensoryProfile([], incidents, NOW, 30);
    expect(chan(p, 'auditory').sample_size).toBe(1);
  });

  it('ignores observations without sensory context', () => {
    const p = computeSensoryProfile(
      [{ id: 'plain', kind: 'meal', occurred_at: '2026-07-10T12:00:00Z' }],
      [],
      NOW,
      30,
    );
    expect(chan(p, 'auditory').sample_size).toBe(0);
  });
});
