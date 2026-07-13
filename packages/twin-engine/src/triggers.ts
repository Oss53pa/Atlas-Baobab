import { isWithinWindow, timeBucket } from './time.js';
import {
  type Confidence,
  type IncidentInput,
  type ObservationContext,
  type ObservationInput,
  type Trigger,
  type TriggerDimension,
} from './types.js';

/** Occurrences minimales pour retenir un declencheur (CDC 3.3 : "seuil de
 * confiance minimal 3 occurrences"). */
export const MIN_OCCURRENCES = 3;

/** Niveau de bruit a partir duquel on retient un facteur 'noise:high'. */
const NOISE_HIGH_THRESHOLD = 4;

const KEY_SEP = '␟'; // separateur d'unite, absent des saisies utilisateur

interface FactorRef {
  dimension: TriggerDimension;
  value: string;
}

function keyOf(dim: TriggerDimension, value: string): string {
  return `${dim}${KEY_SEP}${value}`;
}

/** Facteurs candidats derives d'un contexte + instant (partages obs & incidents). */
function factorsFromContext(context: ObservationContext | undefined, iso: string): FactorRef[] {
  const out: FactorRef[] = [];
  if (context?.place) out.push({ dimension: 'place', value: context.place });
  if (context?.people) {
    for (const p of context.people) {
      if (p) out.push({ dimension: 'people', value: p });
    }
  }
  if (typeof context?.noise_level === 'number' && context.noise_level >= NOISE_HIGH_THRESHOLD) {
    out.push({ dimension: 'noise', value: 'high' });
  }
  const bucket = timeBucket(iso);
  if (bucket) out.push({ dimension: 'time', value: bucket });
  return out;
}

/** Facteurs d'un incident : contexte + declencheur suppose saisi. */
function incidentFactors(inc: IncidentInput): FactorRef[] {
  const out = factorsFromContext(inc.context, inc.started_at);
  const suspected = inc.suspected_trigger?.trim();
  if (suspected) out.push({ dimension: 'suspected', value: suspected });
  return out;
}

/** Dedoublonne les facteurs d'un enregistrement (un facteur compte 1x par record). */
function uniqueKeys(factors: FactorRef[]): Map<string, FactorRef> {
  const m = new Map<string, FactorRef>();
  for (const f of factors) m.set(keyOf(f.dimension, f.value), f);
  return m;
}

const TIER: Record<Exclude<Confidence, 'insufficient'>, number> = {
  faible: 1,
  moyen: 2,
  fort: 3,
};
const TIER_NAME: Record<number, Exclude<Confidence, 'insufficient'>> = {
  1: 'faible',
  2: 'moyen',
  3: 'fort',
};

function baseTier(support: number): number {
  if (support >= 8) return 3;
  if (support >= 5) return 2;
  return 1; // support in [MIN_OCCURRENCES, 4]
}

function adjustForLift(tier: number, lift: number | undefined): number {
  if (lift === undefined) return tier;
  if (lift < 1.2) return Math.max(1, tier - 1);
  if (lift >= 2) return Math.min(3, tier + 1);
  return tier;
}

/**
 * Detection de declencheurs par correlation sur fenetre glissante.
 *
 * support(facteur) = nb d'incidents distincts, dans la fenetre, portant le
 * facteur. On exige support >= MIN_OCCURRENCES. Le lift, quand des enregistrements
 * non-incident portent aussi le facteur, mesure P(incident|facteur)/P(incident)
 * et module la confiance. Jamais presente comme certitude (CDC 3.3).
 */
export function detectTriggers(
  observations: ObservationInput[],
  incidents: IncidentInput[],
  computedAtIso: string,
  windowDays: number,
): Trigger[] {
  const windowIncidents = incidents.filter((i) =>
    isWithinWindow(i.started_at, computedAtIso, windowDays),
  );
  const windowObservations = observations.filter((o) =>
    isWithinWindow(o.occurred_at, computedAtIso, windowDays),
  );

  const support = new Map<string, number>();
  const factorTotal = new Map<string, number>();
  const refs = new Map<string, FactorRef>();

  const bump = (map: Map<string, number>, k: string) => map.set(k, (map.get(k) ?? 0) + 1);

  // Incidents : alimentent support ET factorTotal.
  for (const inc of windowIncidents) {
    const keys = uniqueKeys(incidentFactors(inc));
    for (const [k, ref] of keys) {
      refs.set(k, ref);
      bump(support, k);
      bump(factorTotal, k);
    }
  }
  // Observations non-incident : alimentent seulement factorTotal (denominateur lift).
  for (const o of windowObservations) {
    if (o.kind === 'incident') continue; // evite le double comptage avec la table incidents
    const keys = uniqueKeys(factorsFromContext(o.context, o.occurred_at));
    for (const [k, ref] of keys) {
      if (!refs.has(k)) refs.set(k, ref);
      bump(factorTotal, k);
    }
  }

  const totalRecords = windowIncidents.length + windowObservations.filter((o) => o.kind !== 'incident').length;
  const totalIncidents = windowIncidents.length;
  const baseRate = totalRecords > 0 ? totalIncidents / totalRecords : 0;

  const triggers: Trigger[] = [];
  for (const [k, sup] of support) {
    if (sup < MIN_OCCURRENCES) continue;
    const ref = refs.get(k)!;
    const total = factorTotal.get(k) ?? sup;

    let lift: number | undefined;
    // Lift defini seulement si des records non-incident portent le facteur.
    if (total > sup && baseRate > 0) {
      lift = sup / total / baseRate;
    }

    const tier = adjustForLift(baseTier(sup), lift);
    const trigger: Trigger = {
      dimension: ref.dimension,
      value: ref.value,
      support: sup,
      confidence: TIER_NAME[tier],
    };
    if (lift !== undefined) trigger.lift = lift;
    triggers.push(trigger);
  }

  return sortTriggers(triggers);
}

/** Cle stable d'un declencheur, pour comparer aux facteurs d'une journee (Radar). */
export function triggerKey(dimension: TriggerDimension, value: string): string {
  return keyOf(dimension, value);
}

/** Ensemble des cles de facteurs portees par un enregistrement d'une journee. */
export function recordFactorKeys(
  context: ObservationContext | undefined,
  iso: string,
  suspected?: string,
): Set<string> {
  const factors = factorsFromContext(context, iso);
  const s = suspected?.trim();
  if (s) factors.push({ dimension: 'suspected', value: s });
  return new Set(factors.map((f) => keyOf(f.dimension, f.value)));
}

function sortTriggers(triggers: Trigger[]): Trigger[] {
  triggers.sort((a, b) => {
    const ta = TIER[a.confidence as Exclude<Confidence, 'insufficient'>];
    const tb = TIER[b.confidence as Exclude<Confidence, 'insufficient'>];
    if (tb !== ta) return tb - ta;
    if (b.support !== a.support) return b.support - a.support;
    if (a.dimension !== b.dimension) return a.dimension.localeCompare(b.dimension);
    return a.value.localeCompare(b.value);
  });

  return triggers;
}
