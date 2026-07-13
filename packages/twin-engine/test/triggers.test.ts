import { describe, it, expect } from 'vitest';
import { detectTriggers, MIN_OCCURRENCES, triggerKey, recordFactorKeys } from '../src/triggers.js';
import type { IncidentInput, ObservationInput, Trigger, TriggerDimension } from '../src/types.js';

const NOW = '2026-07-11T12:00:00Z';
const EVENING = 'T17:00:00Z';
const MORNING = 'T10:00:00Z';

function incidentsAt(place: string, day: number, count: number, time = EVENING): IncidentInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `inc-${place}-${day}-${i}`,
    started_at: `2026-07-0${day}${time}`,
    context: { place },
  }));
}

function obsAt(place: string, day: number, count: number, kind: ObservationInput['kind'] = 'success'): ObservationInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `obs-${place}-${day}-${i}`,
    kind,
    occurred_at: `2026-07-0${day}${MORNING}`,
    context: { place },
  }));
}

function find(triggers: Trigger[], dimension: TriggerDimension, value: string): Trigger | undefined {
  return triggers.find((t) => t.dimension === dimension && t.value === value);
}

describe('detectTriggers', () => {
  it('ignores factors below the minimum occurrence threshold', () => {
    const triggers = detectTriggers([], incidentsAt('ecole', 5, MIN_OCCURRENCES - 1), NOW, 30);
    expect(find(triggers, 'place', 'ecole')).toBeUndefined();
  });

  it('detects a place trigger at exactly the threshold with no lift', () => {
    const triggers = detectTriggers([], incidentsAt('ecole', 5, 3), NOW, 30);
    const t = find(triggers, 'place', 'ecole');
    expect(t).toBeDefined();
    expect(t!.support).toBe(3);
    expect(t!.confidence).toBe('faible');
    expect(t!.lift).toBeUndefined();
  });

  it('computes lift and upgrades confidence when it is high', () => {
    // 3 incidents at ecole (evening), 2 non-incident obs at ecole (morning),
    // 5 non-incident meals at maison. baseRate = 3/10 = 0.3; lift(ecole)=2.0
    const incidents = incidentsAt('ecole', 5, 3);
    const observations = [...obsAt('ecole', 6, 2), ...obsAt('maison', 6, 5, 'meal')];
    const triggers = detectTriggers(observations, incidents, NOW, 30);
    const t = find(triggers, 'place', 'ecole');
    expect(t).toBeDefined();
    expect(t!.support).toBe(3);
    expect(t!.lift).toBeCloseTo(2.0, 6);
    expect(t!.confidence).toBe('moyen'); // faible -> +1 for lift >= 2
    // triggers are sorted with the strongest confidence first
    expect(triggers[0].confidence).toBe('moyen');
  });

  it('keeps the middle tier when lift is moderate', () => {
    // 5 incidents (moyen base), 1 non-incident at same place, 3 elsewhere -> lift 1.5
    const incidents = incidentsAt('marche', 5, 5);
    const observations = [...obsAt('marche', 6, 1), ...obsAt('maison', 6, 3, 'meal')];
    const t = find(detectTriggers(observations, incidents, NOW, 30), 'place', 'marche');
    expect(t!.lift).toBeCloseTo(1.5, 6);
    expect(t!.confidence).toBe('moyen'); // unchanged by moderate lift
  });

  it('downgrades confidence when lift is weak', () => {
    // 5 incidents + 20 non-incident all at maison -> lift 1.0 -> moyen downgraded to faible
    const incidents = incidentsAt('maison', 4, 5, MORNING);
    const observations = obsAt('maison', 6, 20, 'meal');
    const t = find(detectTriggers(observations, incidents, NOW, 30), 'place', 'maison');
    expect(t!.lift).toBeCloseTo(1.0, 6);
    expect(t!.confidence).toBe('faible');
  });

  it('reaches the strong tier with high support and no lift data', () => {
    const t = find(detectTriggers([], incidentsAt('taxi', 3, 8), NOW, 30), 'place', 'taxi');
    expect(t!.support).toBe(8);
    expect(t!.confidence).toBe('fort');
    expect(t!.lift).toBeUndefined();
  });

  it('detects suspected-trigger, people, noise and time factors', () => {
    const incidents: IncidentInput[] = Array.from({ length: 3 }, (_, i) => ({
      id: `multi-${i}`,
      started_at: `2026-07-0${5 + i}${EVENING}`,
      suspected_trigger: '  bruit du marche  ',
      context: { people: ['nounou'], noise_level: 5 },
    }));
    const triggers = detectTriggers([], incidents, NOW, 30);
    expect(find(triggers, 'suspected', 'bruit du marche')).toBeDefined(); // trimmed
    expect(find(triggers, 'people', 'nounou')?.support).toBe(3);
    expect(find(triggers, 'noise', 'high')?.support).toBe(3);
    expect(find(triggers, 'time', 'evening')?.support).toBe(3);
  });

  it('excludes incidents outside the window', () => {
    const old: IncidentInput[] = Array.from({ length: 5 }, (_, i) => ({
      id: `old-${i}`,
      started_at: '2026-05-01T17:00:00Z',
      context: { place: 'ecole' },
    }));
    expect(detectTriggers([], old, NOW, 30)).toHaveLength(0);
  });

  it('does not double-count observations whose kind is incident', () => {
    // An observation mirror of the incident should not inflate factorTotal.
    const incidents = incidentsAt('ecole', 5, 3);
    const mirror: ObservationInput[] = [
      { id: 'mirror', kind: 'incident', occurred_at: `2026-07-05${EVENING}`, context: { place: 'ecole' } },
    ];
    const t = find(detectTriggers(mirror, incidents, NOW, 30), 'place', 'ecole');
    expect(t!.support).toBe(3);
    expect(t!.lift).toBeUndefined(); // no genuine non-incident record carries the factor
  });

  it('skips blank people entries', () => {
    const incidents: IncidentInput[] = Array.from({ length: 3 }, (_, i) => ({
      id: `blank-${i}`,
      started_at: `2026-07-0${5 + i}${EVENING}`,
      context: { people: ['', 'maman'] },
    }));
    const triggers = detectTriggers([], incidents, NOW, 30);
    expect(find(triggers, 'people', '')).toBeUndefined();
    expect(find(triggers, 'people', 'maman')?.support).toBe(3);
  });
});

describe('helpers reused by the Radar', () => {
  it('triggerKey is stable and dimension-aware', () => {
    expect(triggerKey('place', 'ecole')).toBe(triggerKey('place', 'ecole'));
    expect(triggerKey('place', 'ecole')).not.toBe(triggerKey('people', 'ecole'));
  });
  it('recordFactorKeys includes a trimmed suspected trigger', () => {
    const keys = recordFactorKeys({ place: 'ecole' }, `2026-07-05${EVENING}`, '  bruit ');
    expect(keys.has(triggerKey('place', 'ecole'))).toBe(true);
    expect(keys.has(triggerKey('time', 'evening'))).toBe(true);
    expect(keys.has(triggerKey('suspected', 'bruit'))).toBe(true);
  });
});
