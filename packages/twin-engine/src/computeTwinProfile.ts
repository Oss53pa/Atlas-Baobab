import { computeSensoryProfile } from './sensory.js';
import { detectTriggers } from './triggers.js';
import { TWIN_ALGO_VERSION } from './version.js';
import {
  type IncidentInput,
  type ObservationInput,
  type TwinProfile,
} from './types.js';

export interface ComputeTwinOptions {
  /** Numero de version du profil (incremente a chaque recalcul, CDC 3.3). */
  version: number;
  /** Instant du recalcul, ISO 8601. Toujours explicite (determinisme). */
  computedAt: string;
  /** Fenetre glissante de detection en jours (CDC 3.3 : 30 par defaut). */
  windowDays?: number;
}

export const DEFAULT_WINDOW_DAYS = 30;

/**
 * Recalcul complet du profil Jumeau v1 (CDC 3.2, Vague 1) : profil sensoriel +
 * declencheurs. Fonction pure : memes entrees -> meme sortie, aucun effet de
 * bord, aucun appel reseau, aucun LLM (CDC 8.2). Le Radar (score de tension)
 * est calcule separement par computeTensionScore (rattache a la Vague 2).
 */
export function computeTwinProfile(
  observations: ObservationInput[],
  incidents: IncidentInput[],
  options: ComputeTwinOptions,
): TwinProfile {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const computedAt = options.computedAt;

  return {
    version: options.version,
    computed_at: computedAt,
    algorithm_version: TWIN_ALGO_VERSION,
    window_days: windowDays,
    sensory: computeSensoryProfile(observations, incidents, computedAt, windowDays),
    triggers: detectTriggers(observations, incidents, computedAt, windowDays),
    interests: [],
    precrisis_signals: [],
    strengths: {},
  };
}
