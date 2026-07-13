import { describe, it, expect } from 'vitest';
import { computeTensionScore, RADAR_WEIGHTS, TENSION_THRESHOLDS } from '../src/radar.js';
import { RADAR_ALGO_VERSION } from '../src/version.js';
import type { IncidentInput, ObservationInput, Trigger } from '../src/types.js';

const DAY = '2026-07-11T12:00:00Z';

function routineObs(count: number): ObservationInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `rb-${i}`,
    kind: 'event',
    occurred_at: `2026-07-11T0${i}:00:00Z`,
    context: { routine_break: true },
  }));
}

function sleepObs(quality: number, at = '2026-07-11T06:00:00Z'): ObservationInput {
  return { id: `sleep-${at}`, kind: 'sleep', intensity: quality, occurred_at: at };
}

function factor(score: ReturnType<typeof computeTensionScore>, key: string) {
  return score.factors.find((f) => f.key === key);
}

describe('computeTensionScore', () => {
  it('is green with no data', () => {
    const s = computeTensionScore([], [], [], DAY);
    expect(s.score).toBe(0);
    expect(s.band).toBe('green');
    expect(s.factors).toEqual([]);
    expect(s.algorithm_version).toBe(RADAR_ALGO_VERSION);
    expect(s.computed_at).toBe(DAY);
  });

  it('scores routine ruptures into the orange band', () => {
    const s = computeTensionScore(routineObs(4), [], [], DAY);
    expect(s.score).toBe(4 * RADAR_WEIGHTS.routineRupture); // 48
    expect(s.band).toBe('orange');
    expect(factor(s, 'routine')?.contribution).toBe(48);
  });

  it('accumulates sensory load from hyper signals', () => {
    const obs: ObservationInput[] = [
      {
        id: 'sens',
        kind: 'mood',
        occurred_at: '2026-07-11T15:00:00Z',
        context: {
          sensory: [
            { channel: 'auditory', direction: 'hyper', intensity: 5 },
            { channel: 'visual', direction: 'hyper', intensity: 5 },
            { channel: 'tactile', direction: 'hypo', intensity: 5 }, // hypo ignored by radar
          ],
        },
      },
    ];
    const s = computeTensionScore(obs, [], [], DAY);
    expect(factor(s, 'sensory')?.contribution).toBe(10 * RADAR_WEIGHTS.sensoryPoint); // 30
    expect(s.band).toBe('green');
  });

  it('penalises poor sleep and uses the latest sleep entry of the day', () => {
    const obs = [
      sleepObs(5, '2026-07-11T06:00:00Z'),
      sleepObs(1, '2026-07-11T20:00:00Z'), // later -> wins, deficit 4
      sleepObs(1, '2026-07-10T20:00:00Z'), // previous day -> ignored
    ];
    const s = computeTensionScore(obs, [], [], DAY);
    expect(factor(s, 'sleep')?.contribution).toBe(4 * RADAR_WEIGHTS.sleepDeficit); // 32
  });

  it('counts only active (moyen/fort) triggers present that day', () => {
    const triggers: Trigger[] = [
      { dimension: 'place', value: 'ecole', support: 6, confidence: 'moyen' },
      { dimension: 'place', value: 'maison', support: 3, confidence: 'faible' },
    ];
    const obs: ObservationInput[] = [
      { id: 'd1', kind: 'mood', occurred_at: '2026-07-11T09:00:00Z', context: { place: 'ecole' } },
      { id: 'd2', kind: 'mood', occurred_at: '2026-07-11T09:00:00Z', context: { place: 'maison' } },
    ];
    const s = computeTensionScore(obs, [], triggers, DAY);
    expect(factor(s, 'triggers')?.contribution).toBe(RADAR_WEIGHTS.triggerHit); // only ecole
  });

  it('matches active triggers carried by incidents (suspected)', () => {
    const triggers: Trigger[] = [
      { dimension: 'suspected', value: 'bruit', support: 8, confidence: 'fort' },
    ];
    const incidents: IncidentInput[] = [
      { id: 'i1', started_at: '2026-07-11T17:00:00Z', suspected_trigger: 'bruit' },
    ];
    const s = computeTensionScore([], incidents, triggers, DAY);
    expect(factor(s, 'triggers')?.contribution).toBe(RADAR_WEIGHTS.triggerHit);
  });

  it('reaches the red band and sorts factors by contribution', () => {
    const obs = [...routineObs(4), sleepObs(1)];
    const s = computeTensionScore(obs, [], [], DAY);
    expect(s.score).toBe(80);
    expect(s.band).toBe('red');
    expect(s.factors[0].key).toBe('routine'); // 48 before sleep 32
    expect(s.factors[1].key).toBe('sleep');
  });

  it('clamps the score to 100', () => {
    const s = computeTensionScore(routineObs(10), [], [], DAY);
    expect(s.score).toBe(100);
    expect(s.band).toBe('red');
  });

  it('exposes thresholds consistent with the CDC', () => {
    expect(TENSION_THRESHOLDS.orange).toBe(40);
    expect(TENSION_THRESHOLDS.red).toBe(70);
  });
});
