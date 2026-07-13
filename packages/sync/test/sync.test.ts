import { describe, it, expect } from 'vitest';
import {
  hlcZero,
  hlcTick,
  hlcReceive,
  hlcCompare,
  hlcToString,
  hlcParse,
  type Hlc,
  setField,
  mergeRecord,
  materialize,
  mergeCollections,
  type LwwRecord,
  emptyOutbox,
  enqueue,
  ack,
  markAttempt,
  backoffMs,
  nextBatch,
} from '../src/index.js';

describe('HLC', () => {
  it('advances counter when wall clock does not move', () => {
    const a = hlcTick(hlcZero('devA'), 1000);
    const b = hlcTick(a, 1000);
    expect(b.wallMs).toBe(1000);
    expect(b.counter).toBe(1);
  });
  it('resets counter when wall clock advances', () => {
    const a = hlcTick(hlcZero('devA'), 1000);
    const b = hlcTick(a, 2000);
    expect(b).toEqual({ wallMs: 2000, counter: 0, nodeId: 'devA' });
  });
  it('stays monotonic even if wall clock goes backwards', () => {
    const a = hlcTick(hlcZero('devA'), 5000);
    const b = hlcTick(a, 3000); // clock skew backwards
    expect(hlcCompare(b, a)).toBeGreaterThan(0);
  });
  it('receive merges remote knowledge', () => {
    const local = hlcTick(hlcZero('devA'), 1000);
    const remote: Hlc = { wallMs: 1000, counter: 5, nodeId: 'devB' };
    const merged = hlcReceive(local, remote, 1000);
    expect(merged.counter).toBe(6);
    expect(merged.nodeId).toBe('devA');
  });
  it('receive advances to a strictly greater remote wall', () => {
    const local: Hlc = { wallMs: 1000, counter: 2, nodeId: 'devA' };
    const remote: Hlc = { wallMs: 4000, counter: 0, nodeId: 'devB' };
    expect(hlcReceive(local, remote, 1000)).toEqual({ wallMs: 4000, counter: 1, nodeId: 'devA' });
  });
  it('receive jumps to fresh wall time', () => {
    const local: Hlc = { wallMs: 1000, counter: 2, nodeId: 'devA' };
    const remote: Hlc = { wallMs: 1500, counter: 0, nodeId: 'devB' };
    expect(hlcReceive(local, remote, 9000)).toEqual({ wallMs: 9000, counter: 0, nodeId: 'devA' });
  });
  it('breaks ties by nodeId', () => {
    const a: Hlc = { wallMs: 1, counter: 1, nodeId: 'devA' };
    const b: Hlc = { wallMs: 1, counter: 1, nodeId: 'devB' };
    expect(hlcCompare(a, b)).toBeLessThan(0);
    expect(hlcCompare(a, a)).toBe(0);
  });
  it('round-trips through string form', () => {
    const h: Hlc = { wallMs: 1720000000000, counter: 3, nodeId: 'dev:A' };
    expect(hlcParse(hlcToString(h))).toEqual(h);
  });
});

describe('LWW per-field merge', () => {
  const h = (wallMs: number, counter: number, nodeId: string): Hlc => ({ wallMs, counter, nodeId });

  it('keeps concurrent edits to DIFFERENT fields (no loss)', () => {
    let a: LwwRecord = { id: 'child-1', fields: {} };
    a = setField(a, 'first_name', 'Kofi', h(1000, 0, 'devA'));
    let b: LwwRecord = { id: 'child-1', fields: {} };
    b = setField(b, 'active_theme', 'lagune', h(1000, 0, 'devB'));
    const merged = materialize<{ first_name: string; active_theme: string }>(mergeRecord(a, b));
    expect(merged.first_name).toBe('Kofi');
    expect(merged.active_theme).toBe('lagune');
  });

  it('resolves concurrent edits to the SAME field deterministically', () => {
    let a: LwwRecord = { id: 'child-1', fields: {} };
    a = setField(a, 'screen_quota_minutes', 15, h(1000, 0, 'devA'));
    let b: LwwRecord = { id: 'child-1', fields: {} };
    b = setField(b, 'screen_quota_minutes', 20, h(1000, 0, 'devB'));
    // devB wins the tie (nodeId ordering), and merge is commutative.
    const ab = materialize<{ screen_quota_minutes: number }>(mergeRecord(a, b));
    const ba = materialize<{ screen_quota_minutes: number }>(mergeRecord(b, a));
    expect(ab.screen_quota_minutes).toBe(20);
    expect(ba.screen_quota_minutes).toBe(20);
  });

  it('later HLC wins for the same field', () => {
    let a: LwwRecord = { id: 'c', fields: {} };
    a = setField(a, 'x', 'old', h(1000, 0, 'devA'));
    let b: LwwRecord = { id: 'c', fields: {} };
    b = setField(b, 'x', 'new', h(2000, 0, 'devA'));
    expect(materialize<{ x: string }>(mergeRecord(a, b)).x).toBe('new');
  });

  it('rejects merging different ids', () => {
    expect(() =>
      mergeRecord({ id: 'a', fields: {} }, { id: 'b', fields: {} }),
    ).toThrow(/id mismatch/);
  });

  it('merges append-only collections without duplicates', () => {
    const local: LwwRecord[] = [
      { id: 'obs-1', fields: {} },
      { id: 'obs-2', fields: {} },
    ];
    const remote: LwwRecord[] = [
      { id: 'obs-2', fields: {} }, // duplicate id
      { id: 'obs-3', fields: {} },
    ];
    const merged = mergeCollections(local, remote);
    expect([...merged.keys()].sort()).toEqual(['obs-1', 'obs-2', 'obs-3']);
  });
});

describe('two devices offline then resync (CDC §13.2)', () => {
  it('double simultaneous entry resyncs with no loss and no duplicate', () => {
    // Nounou (devB) et maman (devA) loggent hors-ligne le même enfant.
    const nannyObs: LwwRecord[] = [{ id: 'obs-nanny-1', fields: {} }];
    const momObs: LwwRecord[] = [{ id: 'obs-mom-1', fields: {} }];

    // Chacun édite AUSSI un champ différent du profil enfant, en concurrence.
    let momChild: LwwRecord = setField({ id: 'child-1', fields: {} }, 'active_theme', 'coton', {
      wallMs: 100,
      counter: 0,
      nodeId: 'devA',
    });
    let nannyChild: LwwRecord = setField({ id: 'child-1', fields: {} }, 'first_name', 'Ama', {
      wallMs: 100,
      counter: 0,
      nodeId: 'devB',
    });

    // Resync : union des observations, fusion du profil.
    const obs = mergeCollections(nannyObs, momObs);
    const child = materialize<{ active_theme: string; first_name: string }>(
      mergeRecord(momChild, nannyChild),
    );

    expect([...obs.keys()].sort()).toEqual(['obs-mom-1', 'obs-nanny-1']); // no loss, no dup
    expect(child.active_theme).toBe('coton');
    expect(child.first_name).toBe('Ama'); // both concurrent edits preserved
  });
});

describe('Outbox', () => {
  const op = (opId: string) => ({ opId, table: 'observations', recordId: 'r', patch: {} });

  it('enqueues idempotently by opId', () => {
    let ob = emptyOutbox();
    ob = enqueue(ob, op('op-1'));
    ob = enqueue(ob, op('op-1')); // dup ignored
    ob = enqueue(ob, op('op-2'));
    expect(ob.pending).toHaveLength(2);
  });
  it('acks remove confirmed ops', () => {
    let ob = enqueue(enqueue(emptyOutbox(), op('a')), op('b'));
    ob = ack(ob, ['a']);
    expect(ob.pending.map((o) => o.opId)).toEqual(['b']);
  });
  it('markAttempt increments attempts and drives backoff', () => {
    let ob = enqueue(emptyOutbox(), op('a'));
    ob = markAttempt(ob, ['a']);
    ob = markAttempt(ob, ['a']);
    expect(ob.pending[0].attempts).toBe(2);
    expect(backoffMs(0)).toBe(1000);
    expect(backoffMs(2)).toBe(4000);
    expect(backoffMs(100)).toBe(60000); // capped
  });
  it('batches at most N ops', () => {
    let ob = emptyOutbox();
    for (let i = 0; i < 120; i++) ob = enqueue(ob, op(`op-${i}`));
    expect(nextBatch(ob, 50)).toHaveLength(50);
  });
});
