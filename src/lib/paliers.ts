/**
 * Paliers développementaux (CDC Jeux & Activités v1.0 §1) — moteur déterministe.
 *
 * L'âge développemental prime sur l'âge civil (§0.1) : chaque enfant est
 * positionné PAR DOMAINE, indépendamment, sur 4 paliers P1–P4. L'âge donne le
 * palier d'entrée ; la réussite au jeu ajuste ensuite (règle 70–85 %, ± 1 cran).
 *
 * Aucun palier n'est JAMAIS affiché à l'enfant (Loi 4 : pas de « niveau », pas de
 * comparaison). Le parent le voit seulement dans l'Atlas des Forces. Ce module ne
 * calcule que des repères déterministes — aucun LLM (invariant CDC §4.4).
 */

import { ageYears } from './format.js';
import type { AppState } from './types.js';

export type Palier = 'P1' | 'P2' | 'P3' | 'P4';
export type GameDomain =
  | 'attention' | 'logique' | 'motricite_fine' | 'communication'
  | 'quantites' | 'sequencage' | 'autonomie';

export const PALIER_ORDER: Palier[] = ['P1', 'P2', 'P3', 'P4'];
export const PALIER_LABEL: Record<Palier, string> = {
  P1: 'Éveil', P2: 'Exploration', P3: 'Consolidation', P4: 'Autonomie',
};
export const PALIER_AGE_REF: Record<Palier, string> = {
  P1: '2–5 ans', P2: '6–9 ans', P3: '10–13 ans', P4: '14–18 ans',
};
export const DOMAIN_LABEL: Record<GameDomain, string> = {
  attention: 'Attention', logique: 'Logique', motricite_fine: 'Motricité fine',
  communication: 'Communication', quantites: 'Quantités', sequencage: 'Séquençage',
  autonomie: 'Autonomie',
};

/** Domaines sondés par chaque jeu (clé = game_code), source unique de vérité. */
export const GAME_DOMAINS: Record<string, GameDomain[]> = {
  memory_visual: ['attention'],
  suite: ['logique'],
  tambour: ['attention'],
  maison: ['logique', 'motricite_fine'],
  combien: ['quantites'],
  chemin: ['motricite_fine'],
  regarde: ['communication', 'attention'],
};
const ALL_DOMAINS = Object.keys(DOMAIN_LABEL) as GameDomain[];

function clampIdx(i: number): number { return Math.max(0, Math.min(PALIER_ORDER.length - 1, i)); }
export function shiftPalier(p: Palier, delta: number): Palier {
  return PALIER_ORDER[clampIdx(PALIER_ORDER.indexOf(p) + delta)];
}

/** Palier d'entrée par l'âge civil (§1, tranches de référence). */
export function agePalier(age: number): Palier {
  if (age < 6) return 'P1';
  if (age < 10) return 'P2';
  if (age < 14) return 'P3';
  return 'P4';
}

/**
 * Positionnement par domaine (§0.1). Base = palier d'âge ; ajustement ± 1 cran
 * selon la réussite agrégée aux jeux du domaine (règle 70–85 %). Il faut au moins
 * deux séances dans le domaine pour bouger, sinon on reste au palier d'entrée.
 */
export function childPaliers(childId: string, state: AppState): Record<GameDomain, Palier> {
  const child = state.children.find((c) => c.id === childId);
  const base = child ? agePalier(ageYears(child.birth_date)) : 'P1';
  const acc: Record<string, { rate: number; n: number }> = {};
  for (const g of state.gameSessions) {
    if (g.child_id !== childId) continue;
    const total = g.telemetry.hits + g.telemetry.misses;
    if (!total) continue;
    const rate = g.telemetry.hits / total;
    for (const d of GAME_DOMAINS[g.game_code] ?? []) {
      const a = (acc[d] ??= { rate: 0, n: 0 });
      a.rate = (a.rate * a.n + rate) / (a.n + 1);
      a.n += 1;
    }
  }
  const out = {} as Record<GameDomain, Palier>;
  for (const d of ALL_DOMAINS) {
    let p = base;
    const a = acc[d];
    if (a && a.n >= 2) {
      if (a.rate > 0.85) p = shiftPalier(base, 1);
      else if (a.rate < 0.6) p = shiftPalier(base, -1);
    }
    out[d] = p;
  }
  return out;
}

/** Palier « dominant » de l'enfant (le plus fréquent par domaine). */
export function dominantPalier(childId: string, state: AppState): Palier {
  const p = childPaliers(childId, state);
  const counts: Record<Palier, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  for (const v of Object.values(p)) counts[v] += 1;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as Palier;
}

/**
 * Registre d'habillage (§1) : « grand » dès que le positionnement P3–P4 est
 * majoritaire — variante de textures + corpus sobre, sans jamais infantiliser un
 * adolescent. Le Monde, la CAA et la Bulle restent structurellement identiques.
 */
export type Registre = 'enfant' | 'grand';
export function childRegistre(childId: string, state: AppState): Registre {
  const vals = Object.values(childPaliers(childId, state));
  const grand = vals.filter((v) => v === 'P3' || v === 'P4').length;
  return grand > vals.length / 2 ? 'grand' : 'enfant';
}

/** Corpus dépendant du registre (mêmes lois, ton différent). */
export interface RegistreCopy {
  play: string;
  quotaZone: string;
  quotaSpeak: string;
  closeMsg: string;
  closeSpeak: (name: string) => string;
}
export function registreCopy(r: Registre): RegistreCopy {
  return r === 'grand'
    ? {
      play: 'Choisis une activité',
      quotaZone: 'C’est fini',
      quotaSpeak: 'C’est fini pour maintenant.',
      closeMsg: 'C’est fini pour aujourd’hui',
      closeSpeak: (n) => `C’est fini pour aujourd’hui, ${n}.`,
    }
    : {
      play: 'On joue ?',
      quotaZone: 'À demain',
      quotaSpeak: 'Le panier se repose. À demain !',
      closeMsg: 'À demain !',
      closeSpeak: (n) => `C’est fini pour aujourd’hui, ${n}. À demain !`,
    };
}

/** Niveau de départ d'un jeu adaptatif selon le palier du domaine sondé. */
export function palierStartLevel(p: Palier): number {
  return { P1: 2, P2: 3, P3: 4, P4: 5 }[p];
}
