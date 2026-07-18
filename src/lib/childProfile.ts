/**
 * Profil fonctionnel de l'enfant (CDC « Interface enfant Kessy » §3) : recueilli à
 * l'onboarding (Réglages), modifiable à tout moment, jamais un diagnostic. Le moteur
 * de reconfiguration (`reconfig`) en dérive des réglages par défaut déterministes —
 * ce sont des points de départ raisonnables, pas des seuils validés cliniquement
 * (§3.2 : recalibrables par un professionnel avant un déploiement à grande échelle).
 */
import type { AgeBandKey } from './screening.js';
import type { Child, SensoryPref } from './types.js';
import { ageYears } from './format.js';

export const INTEREST_SUGGESTIONS = [
  'animaux', 'voitures/trains', 'dinosaures', 'espace', 'musique',
  'dessins animés', 'construction/Lego', 'chiffres', 'dessin', 'nature',
];

/** Tranche d'âge d'interaction (CDC §2), réutilise les libellés de `screening.ts`
 * plutôt que d'introduire un 4ᵉ système de bandes d'âge dans l'app. */
export function interactionAgeBand(birthIso: string): AgeBandKey {
  const a = ageYears(birthIso);
  if (a < 3) return 'toddler';
  if (a < 6) return 'preschool';
  if (a < 12) return 'school';
  return 'teen';
}

export interface ReconfigEffects {
  /** Nombre de choix max présentables sur un écran d'exercice. */
  maxChoices: number;
  /** Aucune réponse texte jamais exigée ; pictogrammes + voix systématiques. */
  pictogramOnly: boolean;
  /** Lecture vocale automatique par défaut. */
  ttsDefault: boolean;
  soundsOn: boolean;
  /** Volume par défaut 0..1. */
  soundVolume: number;
  vibrationOnSelect: boolean;
  /** Renforcement après chaque micro-action (vs. en fin d'exercice seulement). */
  reinforceEachAction: boolean;
}

/** Valeurs par défaut tranchées (§3.2) — modifiables à tout moment via le profil,
 * jamais une prescription clinique. Fonction pure, seule source de vérité. */
export function reconfig(child: Child): ReconfigEffects {
  const support = child.support_level ?? 'autonomous';
  const auditory = child.sensory_input?.auditory ?? 'neutral';
  const nonVerbal = child.communication_level === 'non_verbal_aac' || child.communication_level === 'non_verbal_no_aac';

  const maxChoices = support === 'full' ? 1 : support === 'partial' ? 3 : 4;

  return {
    maxChoices,
    pictogramOnly: nonVerbal,
    ttsDefault: nonVerbal,
    soundsOn: auditory !== 'hyper',
    soundVolume: auditory === 'hypo' ? 0.7 : auditory === 'hyper' ? 0 : 1,
    vibrationOnSelect: auditory === 'hypo',
    reinforceEachAction: support === 'full',
  };
}

const REVIEW_MS = 90 * 24 * 3600 * 1000;

/** Le profil doit-il être reproposé (§3.1 : « est-ce que ça a changé ? » tous les 3 mois) ? */
export function profileNeedsReview(child: Child, nowMs = Date.now()): boolean {
  if (!child.profile_reviewed_at) return true;
  return nowMs - Date.parse(child.profile_reviewed_at) > REVIEW_MS;
}

export const SENSORY_PREF_LABEL: Record<SensoryPref, string> = {
  hyper: 'Hyper-sensible', hypo: 'Hypo-sensible', neutral: 'Neutre',
};
