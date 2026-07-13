/**
 * Types du moteur Jumeau. Les types d'ENTREE (Observation/Incident/GameSession)
 * sont decouples des lignes Postgres (CDC 7) mais s'y projettent trivialement :
 * un `ObservationInput` = une ligne `observations`, etc. Le moteur reste ainsi
 * pur, testable hors ligne et sans dependance a Supabase (CDC 2.2, 3.1).
 */

// ---------------------------------------------------------------------------
// Canaux sensoriels (CDC 3.2 : "8 sens, seuils hypo/hyper par canal")
// ---------------------------------------------------------------------------

export type SensoryChannel =
  | 'visual'
  | 'auditory'
  | 'tactile'
  | 'gustatory'
  | 'olfactory'
  | 'vestibular'
  | 'proprioceptive'
  | 'interoceptive';

export const SENSORY_CHANNELS: readonly SensoryChannel[] = [
  'visual',
  'auditory',
  'tactile',
  'gustatory',
  'olfactory',
  'vestibular',
  'proprioceptive',
  'interoceptive',
] as const;

export type SensoryDirection = 'hypo' | 'hyper';

/** Un signal sensoriel observe, porte par le contexte d'une observation. */
export interface SensorySignal {
  channel: SensoryChannel;
  direction: SensoryDirection;
  /** Intensite 1..5 (echelle CDC de saisie journal). */
  intensity: number;
}

// ---------------------------------------------------------------------------
// Entrees : observations & incidents (projection de CDC 7)
// ---------------------------------------------------------------------------

export type ObservationKind =
  | 'mood'
  | 'incident'
  | 'success'
  | 'sleep'
  | 'meal'
  | 'event'
  | 'school'
  | 'free_note'
  | 'weather';

/** Contexte libre d'une observation : lieu, personnes, bruit, moment, signaux. */
export interface ObservationContext {
  place?: string;
  /** Personnes presentes (maman, nounou, enseignant...). */
  people?: string[];
  /** Niveau de bruit ambiant 0..5. */
  noise_level?: number;
  /** Rupture de routine signalee ce jour (alimente le Radar). */
  routine_break?: boolean;
  /** Signaux sensoriels observes durant l'evenement. */
  sensory?: SensorySignal[];
  [key: string]: unknown;
}

export interface ObservationInput {
  id: string;
  kind: ObservationKind;
  /** Intensite 1..5. Pour kind='sleep', represente la QUALITE de sommeil. */
  intensity?: number;
  context?: ObservationContext;
  /** ISO 8601. */
  occurred_at: string;
  /** Croisement des regards multi-aidants (CDC 6.2). */
  author_membership_id?: string;
}

export interface IncidentInput {
  id: string;
  observation_id?: string;
  /** ISO 8601. */
  started_at: string;
  ended_at?: string;
  /** Declencheur suppose saisi par l'aidant (CDC M2, table incidents). */
  suspected_trigger?: string;
  what_helped?: string[];
  /** Contexte resolu de la crise (souvent celui de l'observation liee). */
  context?: ObservationContext;
}

// ---------------------------------------------------------------------------
// Sorties : structures du profil Jumeau (CDC 3.2)
// ---------------------------------------------------------------------------

/**
 * Confiance statistique affichee a l'aidant. Jamais presentee comme certitude
 * (CDC 3.3 : "Jamais presente comme certitude").
 */
export type Confidence = 'insufficient' | 'faible' | 'moyen' | 'fort';

export type SensoryClassification =
  | 'hypo'
  | 'hyper'
  | 'mixed'
  | 'neutral'
  | 'insufficient_data';

export interface SensoryChannelProfile {
  channel: SensoryChannel;
  /** Score hypo-reactivite normalise 0..1. */
  hypo_score: number;
  /** Score hyper-reactivite normalise 0..1. */
  hyper_score: number;
  classification: SensoryClassification;
  /** Nombre de signaux agreges pour ce canal. */
  sample_size: number;
  confidence: Confidence;
}

export interface SensoryProfile {
  channels: SensoryChannelProfile[];
}

/** Dimension d'un declencheur candidat. */
export type TriggerDimension = 'place' | 'people' | 'noise' | 'time' | 'suspected';

export interface Trigger {
  dimension: TriggerDimension;
  value: string;
  /** Nombre d'incidents distincts, sur la fenetre, portant ce facteur. */
  support: number;
  /**
   * Lift = P(incident | facteur) / P(incident) sur la fenetre. Defini seulement
   * si des observations non-incident portant le facteur existent.
   */
  lift?: number;
  confidence: Confidence;
}

/** Profil Jumeau versionne (CDC 3.2 / table twin_profiles). */
export interface TwinProfile {
  version: number;
  /** ISO 8601. */
  computed_at: string;
  algorithm_version: string;
  /** Fenetre glissante utilisee pour la detection (jours). */
  window_days: number;
  sensory: SensoryProfile;
  triggers: Trigger[];
  /**
   * Champs prevus par CDC 3.2 mais rattaches aux vagues ulterieures
   * (interets intenses, signaux pre-crise, ilots de competence, autonomie,
   * regulation, routines). Types stricts a livrer avec leur moteur.
   */
  interests: never[];
  precrisis_signals: never[];
  strengths: Record<string, never>;
}

// ---------------------------------------------------------------------------
// Radar (score de tension, CDC 3.3 / Vague 2)
// ---------------------------------------------------------------------------

export type TensionBand = 'green' | 'orange' | 'red';

export interface TensionFactor {
  key: string;
  label: string;
  /** Points ajoutes au score par ce facteur. */
  contribution: number;
}

export interface TensionScore {
  /** 0..100. */
  score: number;
  band: TensionBand;
  /** Facteurs contributifs, affiches en clair a l'aidant (CDC M3). */
  factors: TensionFactor[];
  algorithm_version: string;
  /** ISO 8601 (jour evalue). */
  computed_at: string;
}
