import { RADAR_ALGO_VERSION } from './version.js';
import { isSameUtcDay, toEpoch } from './time.js';
import { recordFactorKeys, triggerKey } from './triggers.js';
import {
  type IncidentInput,
  type ObservationInput,
  type TensionBand,
  type TensionFactor,
  type TensionScore,
  type Trigger,
} from './types.js';

/**
 * Poids du score de tension (CDC 3.3). Formule lineaire bornee 0..100, entierement
 * deterministe et auditable. Toute modification incremente RADAR_ALGO_VERSION.
 */
export const RADAR_WEIGHTS = {
  /** Points par rupture de routine du jour. */
  routineRupture: 12,
  /** Points par point d'intensite de charge sensorielle (hyper) du jour. */
  sensoryPoint: 3,
  /** Points par point de deficit de sommeil (5 - qualite, 0..4). */
  sleepDeficit: 8,
  /** Points par declencheur actif (moyen/fort) present dans la journee. */
  triggerHit: 15,
} as const;

/** Seuils de bande (CDC 3.3 : vert < 40, orange 40-70, rouge > 70). */
export const TENSION_THRESHOLDS = { orange: 40, red: 70 } as const;

const SLEEP_MAX_QUALITY = 5;

function bandFor(score: number): TensionBand {
  if (score > TENSION_THRESHOLDS.red) return 'red';
  if (score >= TENSION_THRESHOLDS.orange) return 'orange';
  return 'green';
}

function clampScore(v: number): number {
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v);
}

/** Qualite du dernier sommeil enregistre le jour donne (intensite 1..5), sinon undefined. */
function sleepQualityForDay(observations: ObservationInput[], dayIso: string): number | undefined {
  let best: { at: number; quality: number } | undefined;
  for (const o of observations) {
    if (o.kind !== 'sleep') continue;
    if (typeof o.intensity !== 'number') continue;
    if (!isSameUtcDay(o.occurred_at, dayIso)) continue;
    const at = toEpoch(o.occurred_at);
    if (!best || at > best.at) best = { at, quality: o.intensity };
  }
  return best?.quality;
}

/**
 * Score de tension du jour (Radar, CDC 3.3 / M3). Combinaison lineaire de :
 * ruptures de routine, charge sensorielle, deficit de sommeil, presence de
 * declencheurs actifs. Renvoie score 0..100, bande, et facteurs contributifs
 * affichables en clair. Uniquement des declencheurs moyen/fort comptent.
 */
export function computeTensionScore(
  observations: ObservationInput[],
  incidents: IncidentInput[],
  triggers: Trigger[],
  dayIso: string,
): TensionScore {
  const dayObs = observations.filter((o) => isSameUtcDay(o.occurred_at, dayIso));
  const dayIncidents = incidents.filter((i) => isSameUtcDay(i.started_at, dayIso));

  // 1. Ruptures de routine
  const routineRuptures = dayObs.filter((o) => o.context?.routine_break === true).length;

  // 2. Charge sensorielle (somme des intensites hyper du jour)
  let sensoryPoints = 0;
  for (const o of dayObs) {
    for (const s of o.context?.sensory ?? []) {
      if (s.direction === 'hyper' && Number.isFinite(s.intensity)) {
        sensoryPoints += Math.max(0, Math.min(SLEEP_MAX_QUALITY, s.intensity));
      }
    }
  }

  // 3. Deficit de sommeil
  const quality = sleepQualityForDay(observations, dayIso);
  const sleepDeficit = quality === undefined ? 0 : Math.max(0, SLEEP_MAX_QUALITY - quality);

  // 4. Declencheurs actifs presents dans la journee
  const activeKeys = new Set(
    triggers
      .filter((t) => t.confidence === 'moyen' || t.confidence === 'fort')
      .map((t) => triggerKey(t.dimension, t.value)),
  );
  const dayKeys = new Set<string>();
  for (const o of dayObs) {
    for (const k of recordFactorKeys(o.context, o.occurred_at)) dayKeys.add(k);
  }
  for (const inc of dayIncidents) {
    for (const k of recordFactorKeys(inc.context, inc.started_at, inc.suspected_trigger)) {
      dayKeys.add(k);
    }
  }
  let triggerHits = 0;
  for (const k of activeKeys) if (dayKeys.has(k)) triggerHits += 1;

  const raw: TensionFactor[] = [
    {
      key: 'routine',
      label: `Ruptures de routine (${routineRuptures})`,
      contribution: routineRuptures * RADAR_WEIGHTS.routineRupture,
    },
    {
      key: 'sensory',
      label: `Charge sensorielle (${sensoryPoints})`,
      contribution: sensoryPoints * RADAR_WEIGHTS.sensoryPoint,
    },
    {
      key: 'sleep',
      label: `Deficit de sommeil (${sleepDeficit})`,
      contribution: sleepDeficit * RADAR_WEIGHTS.sleepDeficit,
    },
    {
      key: 'triggers',
      label: `Declencheurs actifs presents (${triggerHits})`,
      contribution: triggerHits * RADAR_WEIGHTS.triggerHit,
    },
  ];

  const total = raw.reduce((sum, f) => sum + f.contribution, 0);
  const factors = raw
    .filter((f) => f.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution);
  const score = clampScore(total);

  return {
    score,
    band: bandFor(score),
    factors,
    algorithm_version: RADAR_ALGO_VERSION,
    computed_at: dayIso,
  };
}
