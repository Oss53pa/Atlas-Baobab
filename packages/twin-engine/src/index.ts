/**
 * @atlas-baobab/twin-engine
 * Moteur Jumeau deterministe et versionne (CDC 3). Aucun score, seuil ou
 * prediction n'est jamais calcule par un LLM (CDC 8.2).
 */

export * from './types.js';
export { TWIN_ALGO_VERSION, RADAR_ALGO_VERSION } from './version.js';
export {
  computeTwinProfile,
  DEFAULT_WINDOW_DAYS,
  type ComputeTwinOptions,
} from './computeTwinProfile.js';
export { computeSensoryProfile } from './sensory.js';
export { detectTriggers, MIN_OCCURRENCES } from './triggers.js';
export {
  computeTensionScore,
  RADAR_WEIGHTS,
  TENSION_THRESHOLDS,
} from './radar.js';
export { isWithinWindow, isSameUtcDay, timeBucket } from './time.js';
