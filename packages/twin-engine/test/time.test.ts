import { describe, it, expect } from 'vitest';
import { toEpoch, isWithinWindow, isSameUtcDay, timeBucket } from '../src/time.js';

const NOW = '2026-07-11T12:00:00Z';

describe('toEpoch', () => {
  it('parses valid ISO', () => {
    expect(toEpoch('2026-07-11T00:00:00Z')).toBe(Date.UTC(2026, 6, 11));
  });
  it('returns NaN for garbage', () => {
    expect(Number.isNaN(toEpoch('not-a-date'))).toBe(true);
  });
});

describe('isWithinWindow', () => {
  it('accepts a timestamp inside the window', () => {
    expect(isWithinWindow('2026-07-01T12:00:00Z', NOW, 30)).toBe(true);
  });
  it('rejects a timestamp older than the window', () => {
    expect(isWithinWindow('2026-05-01T12:00:00Z', NOW, 30)).toBe(false);
  });
  it('rejects a timestamp after computedAt (future)', () => {
    expect(isWithinWindow('2026-07-12T12:00:00Z', NOW, 30)).toBe(false);
  });
  it('rejects invalid inputs', () => {
    expect(isWithinWindow('nope', NOW, 30)).toBe(false);
    expect(isWithinWindow(NOW, 'nope', 30)).toBe(false);
  });
});

describe('isSameUtcDay', () => {
  it('true for same calendar day', () => {
    expect(isSameUtcDay('2026-07-11T01:00:00Z', '2026-07-11T23:00:00Z')).toBe(true);
  });
  it('false across days', () => {
    expect(isSameUtcDay('2026-07-11T23:00:00Z', '2026-07-12T00:30:00Z')).toBe(false);
  });
  it('false on invalid', () => {
    expect(isSameUtcDay('bad', NOW)).toBe(false);
  });
});

describe('timeBucket', () => {
  it('maps hours to buckets', () => {
    expect(timeBucket('2026-07-11T07:00:00Z')).toBe('morning');
    expect(timeBucket('2026-07-11T13:00:00Z')).toBe('afternoon');
    expect(timeBucket('2026-07-11T18:00:00Z')).toBe('evening');
    expect(timeBucket('2026-07-11T02:00:00Z')).toBe('night');
    expect(timeBucket('2026-07-11T23:00:00Z')).toBe('night');
  });
  it('undefined on invalid', () => {
    expect(timeBucket('bad')).toBeUndefined();
  });
});
