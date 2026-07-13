/** Helpers temporels purs. Aucune lecture d'horloge implicite : le moteur recoit
 * toujours `computedAt` explicitement (determinisme / reproductibilite, CDC 3.3). */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse ISO -> epoch ms. Renvoie NaN si invalide (le filtre fenetre l'ecarte). */
export function toEpoch(iso: string): number {
  return Date.parse(iso);
}

/** Vrai si `iso` est dans la fenetre glissante `[computedAt - windowDays, computedAt]`. */
export function isWithinWindow(iso: string, computedAtIso: string, windowDays: number): boolean {
  const t = toEpoch(iso);
  const end = toEpoch(computedAtIso);
  if (Number.isNaN(t) || Number.isNaN(end)) return false;
  const start = end - windowDays * MS_PER_DAY;
  return t >= start && t <= end;
}

/** Vrai si deux instants ISO tombent le meme jour calendaire UTC. */
export function isSameUtcDay(aIso: string, bIso: string): boolean {
  const a = new Date(toEpoch(aIso));
  const b = new Date(toEpoch(bIso));
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Tranche horaire UTC d'un instant (declencheur temporel, CDC M3
 * "surtout entre 17h et 18h30"). Bornes documentees dans ALGORITHMS.md.
 */
export function timeBucket(iso: string): TimeBucket | undefined {
  const d = new Date(toEpoch(iso));
  if (Number.isNaN(d.getTime())) return undefined;
  const h = d.getUTCHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}
