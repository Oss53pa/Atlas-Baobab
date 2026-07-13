/**
 * Avenant JV-01 · Journal des moments v2 (Partie A). Saisie structurée d'un moment :
 * le « quoi » se dit en chips-pictos (déclencheur, manifestation, ce qui a aidé),
 * pas en pavés de texte. Vocabulaire de CONSTAT, jamais de jugement (loi A1.4).
 *
 * Les chips sont des enums VERSIONNÉS (A5) : on n'édite jamais une valeur en place,
 * on ajoute une version. Les « aides » alimentent directement « Ce qui l'apaise »
 * de CORTEX (what_helped) ; le déclencheur principal alimente les tendances.
 */
import type { ObservationKind } from '@atlas-baobab/twin-engine';

export type MomentType = 'reussite' | 'crise' | 'difficile' | 'calme';

export interface MomentTypeDef {
  key: MomentType;
  label: string;
  emoji: string;
  kind: ObservationKind;
  /** 5 crans nommés propres au type (« 3/5 » ne veut rien dire dans l'absolu). */
  scale: [string, string, string, string, string];
  tint: string;
}

// Emojis cohérents avec la métaphore météo déjà installée dans l'app (⛈️/🌧️).
export const MOMENT_TYPES: MomentTypeDef[] = [
  { key: 'reussite', label: 'Réussite', emoji: '🌟', kind: 'success', tint: '#d99c3f',
    scale: ['Petit pas', 'Jolie étape', 'Belle réussite', 'Grande fierté', 'Exploit'] },
  { key: 'crise', label: 'Crise', emoji: '⛈️', kind: 'incident', tint: '#c46a5a',
    scale: ['Petite tension', 'Contrariété', 'Débordement', 'Forte crise', 'Très forte'] },
  { key: 'difficile', label: 'Moment difficile', emoji: '🌧️', kind: 'incident', tint: '#6e9fb3',
    scale: ['À peine', 'Un peu', 'Moyen', 'Marqué', 'Très marqué'] },
  { key: 'calme', label: 'Moment calme', emoji: '🍃', kind: 'mood', tint: '#7a9e7e',
    scale: ['Calme', 'Serein', 'Paisible', 'Très paisible', 'Rayonnant'] },
];
export function momentType(key: MomentType): MomentTypeDef {
  return MOMENT_TYPES.find((t) => t.key === key) ?? MOMENT_TYPES[0];
}

export const LIEUX = ['maison', 'école', 'dehors', 'transport', 'chez un proche', 'autre'];

// ── Enums versionnés (A5) ────────────────────────────────────────────────────
export const DECLENCHEURS_V1 = [
  'bruit fort', 'monde / foule', 'changement de programme', 'transition',
  'refus reçu', 'attente', 'faim', 'fatigue', 'douleur possible',
  'vêtement / sensoriel', 'séparation', 'je ne sais pas',
];
export const MANIFESTATIONS_V1 = [
  'pleurs', 'cris', 'se met en boule / se fige', 's’enfuit',
  'gestes vers lui-même', 'gestes vers les autres', 'jette / casse', 'se bouche les oreilles',
];
export const AIDES_V1 = [
  'pause au calme', 'pression profonde / câlin', 'casque / moins de bruit', 'objet préféré',
  'carte CAA', 'Ma Bulle', 'chanson / routine', 'le temps, simplement', 'rien n’a semblé aider',
];
export const DUREES_V1 = ['< 5 min', '5–15 min', '15–30 min', '> 30 min'];
export const DOMAINES_V1 = [
  'a communiqué / demandé', 'autonomie', 'école / apprentissage', 'avec les autres',
  'alimentation', 'sommeil', 'motricité', 'a géré une frustration',
];

/** Entrée du modal, transformée par le store en observation (+ incident). */
export interface MomentInput {
  type: MomentType;
  intensity: number;
  place?: string;
  occurred_at: string;
  author: string;
  declencheurs?: string[];
  manifestations?: string[];
  aides?: string[];
  duree?: string;
  domaines?: string[];
  note?: string;
}
