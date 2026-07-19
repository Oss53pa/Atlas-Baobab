/**
 * Moteur de différenciation du Mode Enfant (CDC v1.1 §2).
 *
 * SOURCE DE VÉRITÉ UNIQUE de la matrice d'adaptation. Aucun écran enfant ne doit
 * coder en dur une taille de cible, un volume, une durée : tout se lit ici via
 * `resolveChildProfile()` puis `profileEffects()`. Fonctions pures, déterministes.
 *
 * Les 4 axes (§2.1) sont dérivés du `Child` (renseigné en Réglages), puis
 * surclassables par le parent (`overrides`). CORTEX propose, n'impose jamais.
 */
import type { Child } from './types.js';
import { ageYears } from './format.js';

export type AgeBand = '2-4' | '5-7' | '8-12';
export type Communication = 'non-verbal' | 'emergent' | 'verbal';
export type Sensory = 'hyper' | 'typique' | 'hypo';
export type SupportLevel = 1 | 2 | 3;
export type Motor = 'fin-ok' | 'fin-difficile';

export interface ChildProfile {
  ageBand: AgeBand;
  communication: Communication;
  sensory: Sensory;
  supportLevel: SupportLevel;
  motor: Motor;
}

/** Effets résolus, consommés par les composants (§2.3 : jamais en dur ailleurs). */
export interface ProfileEffects {
  /** Cible tactile minimale, px (L6 + âge + motricité). */
  targetPx: number;
  /** Densité max d'éléments par écran. */
  maxDensity: number;
  /** Durée cible d'une activité [min, max] en secondes. */
  activitySec: [number, number];
  /** Canal des consignes. */
  consigne: 'audio-demo' | 'audio-picto' | 'audio-picto-text';
  /** Présence des comptines. */
  comptines: 'omnipresent' | 'rituels' | 'none';
  /** Registre de voix des consignes. */
  voice: 'lente-chantante' | 'normale-chaleureuse' | 'normale';
  /** Multiplicateur de volume global (0..1.?). */
  volumeScale: number;
  /** Musique d'ambiance autorisée. */
  musicAllowed: boolean;
  /** Multiplicateur d'amplitude/vitesse des animations. */
  animScale: number;
  /** Particules / confettis autorisés. */
  particles: boolean;
  /** Désaturation de la palette (0..1). */
  desaturate: number;
  /** Retour haptique par défaut. */
  haptic: boolean;
  /** Quand Bibo démontre une activité. */
  demo: 'always' | 'first' | 'onDemand';
  /** Délai avant indice auto (s), ou null. */
  hintAfterSec: number | null;
  /** Nb max de choix nouveaux simultanés (null = pas de limite). */
  maxNewChoices: number | null;
  /** Rayon de tolérance de lâcher pour le drag (px). */
  dragTolerancePx: number;
  /** La CAA est-elle mise en avant sur l'accueil (§2.2 communication) ? */
  caaProminent: boolean;
  /** Modelage : afficher le mot en grand après le picto (emergent). */
  caaWordModeling: boolean;
}

// ── Matrices §2.2 ──────────────────────────────────────────────────────────
const AGE: Record<AgeBand, Pick<ProfileEffects,
  'targetPx' | 'maxDensity' | 'activitySec' | 'consigne' | 'comptines' | 'voice'>> = {
  '2-4': { targetPx: 96, maxDensity: 4, activitySec: [60, 120], consigne: 'audio-demo', comptines: 'omnipresent', voice: 'lente-chantante' },
  '5-7': { targetPx: 80, maxDensity: 6, activitySec: [180, 240], consigne: 'audio-picto', comptines: 'rituels', voice: 'normale-chaleureuse' },
  '8-12': { targetPx: 64, maxDensity: 9, activitySec: [300, 420], consigne: 'audio-picto-text', comptines: 'none', voice: 'normale' },
};

const SENSORY: Record<Sensory, Pick<ProfileEffects,
  'volumeScale' | 'musicAllowed' | 'animScale' | 'particles' | 'desaturate' | 'haptic'>> = {
  hyper: { volumeScale: 0.4, musicAllowed: false, animScale: 0.5, particles: false, desaturate: 0.15, haptic: false },
  typique: { volumeScale: 1, musicAllowed: true, animScale: 1, particles: true, desaturate: 0, haptic: true },
  hypo: { volumeScale: 1, musicAllowed: true, animScale: 1.2, particles: true, desaturate: 0, haptic: true },
};

const SUPPORT: Record<SupportLevel, Pick<ProfileEffects, 'demo' | 'hintAfterSec' | 'maxNewChoices'>> = {
  3: { demo: 'always', hintAfterSec: 8, maxNewChoices: 1 },
  2: { demo: 'first', hintAfterSec: 15, maxNewChoices: null },
  1: { demo: 'onDemand', hintAfterSec: null, maxNewChoices: null },
};

const MOTOR: Record<Motor, { targetScale: number; dragTolerancePx: number }> = {
  'fin-ok': { targetScale: 1, dragTolerancePx: 24 },
  'fin-difficile': { targetScale: 1.25, dragTolerancePx: 60 },
};

// ── Dérivation depuis le Child (Réglages) ──────────────────────────────────
/** Bande d'âge CDC v1.1 (2-4 / 5-7 / 8-12) depuis la date de naissance. */
export function cdcAgeBand(birthIso: string): AgeBand {
  const a = ageYears(birthIso);
  if (a < 5) return '2-4';
  if (a < 8) return '5-7';
  return '8-12';
}

function communicationOf(child: Child): Communication {
  switch (child.communication_level) {
    case 'non_verbal_aac':
    case 'non_verbal_no_aac': return 'non-verbal';
    case 'verbal_emergent': return 'emergent';
    default: return 'verbal';
  }
}

function sensoryOf(child: Child): Sensory {
  const a = child.sensory_input?.auditory ?? 'neutral';
  return a === 'hyper' ? 'hyper' : a === 'hypo' ? 'hypo' : 'typique';
}

function supportOf(child: Child): SupportLevel {
  switch (child.support_level) {
    case 'full': return 3;
    case 'partial': return 2;
    default: return 1;
  }
}

/** Profil résolu (§2.1). `child.child_overrides` peut surclasser chaque axe. */
export function resolveChildProfile(child: Child): ChildProfile {
  const base: ChildProfile = {
    ageBand: cdcAgeBand(child.birth_date),
    communication: communicationOf(child),
    sensory: sensoryOf(child),
    supportLevel: supportOf(child),
    motor: 'fin-ok',
  };
  return { ...base, ...(child.child_overrides ?? {}) };
}

/** Effets consommables par l'UI (§2.2 fusionné). Fonction pure. */
export function profileEffects(p: ChildProfile): ProfileEffects {
  const age = AGE[p.ageBand];
  const sen = SENSORY[p.sensory];
  const sup = SUPPORT[p.supportLevel];
  const mot = MOTOR[p.motor];
  return {
    ...age,
    ...sen,
    ...sup,
    targetPx: Math.round(age.targetPx * mot.targetScale),
    dragTolerancePx: mot.dragTolerancePx,
    caaProminent: p.communication === 'non-verbal',
    caaWordModeling: p.communication === 'emergent',
  };
}

/** Raccourci : profil + effets depuis le Child. */
export function childConfig(child: Child): { profile: ChildProfile; fx: ProfileEffects } {
  const profile = resolveChildProfile(child);
  return { profile, fx: profileEffects(profile) };
}
