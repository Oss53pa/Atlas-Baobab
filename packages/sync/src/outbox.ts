/**
 * Outbox pattern (CDC §2.4, mode 2 : "file d'attente locale poussée vers
 * Supabase dès que le réseau est disponible, avec reprise et backoff"). Ici : la
 * structure de file pure et déterministe (persistance/transport branchés par
 * l'app). Chaque opération est idempotente par `opId` côté serveur.
 */

import type { Hlc } from './hlc.js';

export interface OutboxOp {
  opId: string;
  table: string;
  recordId: string;
  /** Champs modifiés, avec leur HLC (compatibles LWW). */
  patch: Record<string, { value: unknown; hlc: Hlc }>;
  /** Nombre de tentatives d'envoi effectuées. */
  attempts: number;
}

export interface Outbox {
  pending: OutboxOp[];
}

export function emptyOutbox(): Outbox {
  return { pending: [] };
}

export function enqueue(outbox: Outbox, op: Omit<OutboxOp, 'attempts'>): Outbox {
  // Idempotent : un opId déjà présent n'est pas ré-empilé.
  if (outbox.pending.some((o) => o.opId === op.opId)) return outbox;
  return { pending: [...outbox.pending, { ...op, attempts: 0 }] };
}

/** Marque des opérations comme confirmées (ACK serveur) et les retire. */
export function ack(outbox: Outbox, opIds: string[]): Outbox {
  const done = new Set(opIds);
  return { pending: outbox.pending.filter((o) => !done.has(o.opId)) };
}

/** Incrémente le compteur de tentatives des opérations données (échec d'envoi). */
export function markAttempt(outbox: Outbox, opIds: string[]): Outbox {
  const target = new Set(opIds);
  return {
    pending: outbox.pending.map((o) =>
      target.has(o.opId) ? { ...o, attempts: o.attempts + 1 } : o,
    ),
  };
}

/** Délai de backoff exponentiel plafonné (ms) pour la n-ième tentative. */
export function backoffMs(attempts: number, baseMs = 1000, capMs = 60000): number {
  const raw = baseMs * 2 ** attempts;
  return Math.min(raw, capMs);
}

/** Lot d'envoi (CDC : "lots de 50 évènements max"). */
export function nextBatch(outbox: Outbox, size = 50): OutboxOp[] {
  return outbox.pending.slice(0, size);
}
