/**
 * Horloge logique hybride (HLC) — ordre causal des évènements multi-appareils
 * (CDC §2.4 : "horodatage par appareil (device_id + horloge hybride HLC)").
 *
 * Un timestamp HLC = (wallMs, counter, nodeId). Il progresse de façon monotone
 * même si l'horloge murale recule, et départage les égalités par nodeId pour un
 * ordre total déterministe. Aucune lecture d'horloge implicite : le temps mural
 * est toujours fourni par l'appelant (testabilité).
 */

export interface Hlc {
  /** Millisecondes murales (Unix epoch). */
  wallMs: number;
  /** Compteur logique pour départager les évènements de même wallMs. */
  counter: number;
  /** Identifiant d'appareil (device_id). */
  nodeId: string;
}

export function hlcZero(nodeId: string): Hlc {
  return { wallMs: 0, counter: 0, nodeId };
}

/** Avance l'horloge locale lors d'un évènement local, à l'instant mural `wallMs`. */
export function hlcTick(prev: Hlc, wallMs: number): Hlc {
  if (wallMs > prev.wallMs) return { wallMs, counter: 0, nodeId: prev.nodeId };
  // L'horloge murale n'a pas avancé : on incrémente le compteur logique.
  return { wallMs: prev.wallMs, counter: prev.counter + 1, nodeId: prev.nodeId };
}

/**
 * Met à jour l'horloge locale à la réception d'un timestamp distant `remote`,
 * à l'instant mural `wallMs`. Garantit la monotonie et un compteur supérieur à
 * tout ce qui a été vu.
 */
export function hlcReceive(local: Hlc, remote: Hlc, wallMs: number): Hlc {
  const maxWall = Math.max(local.wallMs, remote.wallMs, wallMs);
  let counter: number;
  if (maxWall === local.wallMs && maxWall === remote.wallMs) {
    counter = Math.max(local.counter, remote.counter) + 1;
  } else if (maxWall === local.wallMs) {
    counter = local.counter + 1;
  } else if (maxWall === remote.wallMs) {
    counter = remote.counter + 1;
  } else {
    counter = 0;
  }
  return { wallMs: maxWall, counter, nodeId: local.nodeId };
}

/** Ordre total déterministe : wallMs, puis counter, puis nodeId. */
export function hlcCompare(a: Hlc, b: Hlc): number {
  if (a.wallMs !== b.wallMs) return a.wallMs < b.wallMs ? -1 : 1;
  if (a.counter !== b.counter) return a.counter < b.counter ? -1 : 1;
  if (a.nodeId !== b.nodeId) return a.nodeId < b.nodeId ? -1 : 1;
  return 0;
}

/** Sérialisation triable lexicographiquement (utile comme clé). */
export function hlcToString(h: Hlc): string {
  const w = h.wallMs.toString().padStart(15, '0');
  const c = h.counter.toString().padStart(6, '0');
  return `${w}:${c}:${h.nodeId}`;
}

export function hlcParse(s: string): Hlc {
  const [w, c, ...rest] = s.split(':');
  return { wallMs: Number(w), counter: Number(c), nodeId: rest.join(':') };
}
