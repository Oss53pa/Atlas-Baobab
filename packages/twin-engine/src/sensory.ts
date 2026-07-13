import { isWithinWindow } from './time.js';
import {
  SENSORY_CHANNELS,
  type Confidence,
  type IncidentInput,
  type ObservationInput,
  type SensoryChannel,
  type SensoryChannelProfile,
  type SensoryClassification,
  type SensoryProfile,
  type SensorySignal,
} from './types.js';

/** Echelle max d'un signal sensoriel (intensite 1..5). */
const MAX_INTENSITY = 5;

/** Seuils de taille d'echantillon -> confiance (documente ALGORITHMS.md). */
const CONF_FAIBLE_MIN = 3;
const CONF_MOYEN_MIN = 5;
const CONF_FORT_MIN = 10;

/** Zone morte : en dessous, un canal est "neutral" plutot que classe. */
const NEUTRAL_CEILING = 0.1;
/** Ecart hypo/hyper en dessous duquel un canal est "mixed". */
const MIXED_BAND = 0.15;

function confidenceForSample(n: number): Confidence {
  if (n < CONF_FAIBLE_MIN) return 'insufficient';
  if (n < CONF_MOYEN_MIN) return 'faible';
  if (n < CONF_FORT_MIN) return 'moyen';
  return 'fort';
}

function clampIntensity(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > MAX_INTENSITY) return MAX_INTENSITY;
  return v;
}

function classify(
  hypo: number,
  hyper: number,
  sampleSize: number,
): SensoryClassification {
  if (sampleSize < CONF_FAIBLE_MIN) return 'insufficient_data';
  if (hypo < NEUTRAL_CEILING && hyper < NEUTRAL_CEILING) return 'neutral';
  const diff = hyper - hypo;
  if (Math.abs(diff) < MIXED_BAND) return 'mixed';
  return diff > 0 ? 'hyper' : 'hypo';
}

interface ChannelAccumulator {
  hypoSum: number;
  hyperSum: number;
  count: number;
}

function emptyAccumulators(): Record<SensoryChannel, ChannelAccumulator> {
  const acc = {} as Record<SensoryChannel, ChannelAccumulator>;
  for (const c of SENSORY_CHANNELS) acc[c] = { hypoSum: 0, hyperSum: 0, count: 0 };
  return acc;
}

function ingestSignals(
  signals: SensorySignal[] | undefined,
  acc: Record<SensoryChannel, ChannelAccumulator>,
): void {
  if (!signals) return;
  for (const s of signals) {
    const bucket = acc[s.channel];
    if (!bucket) continue; // canal inconnu ignore
    const intensity = clampIntensity(s.intensity);
    if (s.direction === 'hyper') bucket.hyperSum += intensity;
    else if (s.direction === 'hypo') bucket.hypoSum += intensity;
    else continue;
    bucket.count += 1;
  }
}

/**
 * Profil sensoriel par canal, agrege sur la fenetre glissante.
 *
 * Pour chaque canal : hypo_score / hyper_score = somme des intensites de la
 * direction / (count total du canal * 5), donc dans [0,1] et hypo+hyper <= 1.
 * Classification et confiance dependent de la taille d'echantillon.
 */
export function computeSensoryProfile(
  observations: ObservationInput[],
  incidents: IncidentInput[],
  computedAtIso: string,
  windowDays: number,
): SensoryProfile {
  const acc = emptyAccumulators();

  for (const o of observations) {
    if (!isWithinWindow(o.occurred_at, computedAtIso, windowDays)) continue;
    ingestSignals(o.context?.sensory, acc);
  }
  for (const inc of incidents) {
    if (!isWithinWindow(inc.started_at, computedAtIso, windowDays)) continue;
    ingestSignals(inc.context?.sensory, acc);
  }

  const channels: SensoryChannelProfile[] = SENSORY_CHANNELS.map((channel) => {
    const { hypoSum, hyperSum, count } = acc[channel];
    const denom = count * MAX_INTENSITY;
    const hypo_score = denom > 0 ? hypoSum / denom : 0;
    const hyper_score = denom > 0 ? hyperSum / denom : 0;
    return {
      channel,
      hypo_score,
      hyper_score,
      classification: classify(hypo_score, hyper_score, count),
      sample_size: count,
      confidence: confidenceForSample(count),
    };
  });

  return { channels };
}
