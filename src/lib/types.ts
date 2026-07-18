import type { ObservationInput, IncidentInput } from '@atlas-baobab/twin-engine';
import type { ChildThemeKey } from '@atlas-baobab/ui';
import type { AvatarKey, AvatarMotion } from './avatars.js';

export type { ChildThemeKey };

export type CommunicationLevel = 'verbal' | 'verbal_emergent' | 'non_verbal_aac' | 'non_verbal_no_aac';
export type SupportLevel = 'autonomous' | 'partial' | 'full';
export type SensoryPref = 'hyper' | 'hypo' | 'neutral';

/** Profil sensoriel DÉCLARÉ par le parent (CDC Kessy §3.1), un canal → une préférence.
 * Distinct de `TwinProfile.sensory` (packages/twin-engine) qui est CALCULÉ depuis les
 * observations sur 8 canaux avec score/confiance — ne jamais confondre les deux. */
export interface SensoryInput {
  auditory: SensoryPref;
  visual: SensoryPref;
  tactile: SensoryPref;
  vestibular: SensoryPref;
}

export interface Child {
  id: string;
  first_name: string;
  /** ISO date (naissance). */
  birth_date: string;
  active_theme: ChildThemeKey;
  screen_quota_minutes: number;
  created_at: string;
  /** Avatar CORTEX côté famille (CDC C02 §C2). */
  avatar_key: AvatarKey;
  avatar_custom_name?: string | null;
  avatar_motion: AvatarMotion;
  /** Profil fonctionnel (CDC Kessy §3.1-3.3), saisi parent, modifiable à tout moment. */
  communication_level?: CommunicationLevel;
  /** Système CAA déjà utilisé en famille (PECS, pictogrammes, tablette…), si renseigné. */
  aac_system?: string | null;
  sensory_input?: SensoryInput;
  support_level?: SupportLevel;
  interests?: string[];
  sensitivities_to_avoid?: string[];
  /** Pictogramme de sortie déjà utilisé en famille (CDC §6), utilisé par le bouton détresse. */
  exit_pictogram?: string | null;
  /** ISO. Pilote le rappel « à revoir tous les 3 mois » (§3.1). */
  profile_reviewed_at?: string;
  /** Partage avec un professionnel référent (§7) — jamais activé par défaut. */
  professional_sharing_enabled?: boolean;
}

/** Observation locale = ObservationInput (Jumeau) + rattachements. */
export interface Observation extends ObservationInput {
  child_id: string;
  device_id: string;
  /** Nom lisible de l'auteur (multi-aidants). */
  author?: string;
}

export interface Incident extends IncidentInput {
  child_id: string;
}

export interface AacCard {
  id: string;
  label: string;
  /** Emoji/picto du pack local. */
  picto: string;
  category: string;
}

export interface AacBoard {
  rows: number;
  cols: number;
  cards: AacCard[];
}

export interface AacUsageEvent {
  id: string;
  child_id: string;
  card_id: string;
  label: string;
  picto: string;
  pressed_at: string;
}

export interface GameSession {
  id: string;
  child_id: string;
  game_code: string;
  difficulty_level: number;
  duration_seconds: number;
  telemetry: {
    rounds: number;
    hits: number;
    misses: number;
    avg_reaction_ms: number;
  };
  played_at: string;
}

/** Une séance d'activité notée sur l'échelle d'acquisition (1..4). */
export interface ActivityLog {
  id: string;
  child_id: string;
  activity_id: string;
  domain: string;
  /** 1 = pas encore … 4 = acquis. */
  level: number;
  occurred_at: string;
  note?: string;
  author?: string;
}

/** Trace d'une fiche « On joue ensemble » réalisée (P01 §4.4). Aucune note, aucun
 * score : le seul retour est « on l'a fait » + la réaction de l'enfant. */
export interface TogetherLog {
  id: string;
  child_id: string;
  fiche_id: string;
  /** 🙂 il a aimé · 😐 mitigé · 🙅 pas cette fois. */
  reaction: 'love' | 'meh' | 'not';
  done_at: string;
}

/** Coach du jour : une action de leçon essayée + le retour d'efficacité (M4). */
export interface CoachAction {
  id: string;
  child_id: string;
  lesson_id: string;
  /** Jour de la tentative (YYYY-MM-DD). */
  day: string;
  tried_at: string;
  /** Retour d'hier, en 1 tap. */
  feedback?: 'helped' | 'unsure' | 'not' | 'couldnt';
}

/** Bien-être du parent — reste ici, jamais dans les données de l'enfant. */
export interface ParentMood {
  id: string;
  at: string;
  level: 'bien' | 'moyen' | 'dur';
}

/** Réponse d'un regard à une question du Bilan 360 (M5). level null = « je ne sais pas ». */
export interface BilanAnswer {
  id: string;
  child_id: string;
  respondent: 'maman' | 'papa' | 'enseignant' | 'enfant';
  period: 'prev' | 'now';
  question_id: string;
  level: number | null;
  at: string;
}

/** GPS trajectoire (M6) : une marche du sentier vers un cap. */
export interface Milestone {
  id: string;
  label: string;
  status: 'done' | 'now' | 'future';
  done_at?: string;
}
/** Un cap = un objectif que la famille se donne, sans date butoir. */
export interface Cap {
  id: string;
  child_id: string;
  domain: string;
  title: string;
  status: 'active' | 'paused' | 'done';
  created_at: string;
  paused_at?: string;
  /** Itinéraire recalculé : la méthode qui marche mieux en ce moment. */
  recalc?: string;
  milestones: Milestone[];
}

/** Rapport émis (M7) : immuable, scellé par une empreinte SHA-256. */
export interface ReportRecord {
  id: string;
  child_id: string;
  gabarit: string;
  recipient: string;
  period: string;
  sections: string[];
  created_at: string;
  /** Empreinte SHA-256 du contenu (vide = à calculer/afficher à la volée). */
  hash: string;
  /** Corps HTML scellé (ré-ouvrable, vérifiable). */
  content: string;
}

/** Événement de vie (CX-01 §5) : le contexte qui empêche l'attribution de mentir.
 * Une régression pendant un déménagement n'est pas un échec de méthode. */
export interface LifeEvent {
  id: string;
  child_id: string;
  kind: string;
  label?: string;
  at: string;
}

export type ScreeningLevel = 'none' | 'watch' | 'advice';

export interface ScreeningResult {
  id: string;
  age_band: 'toddler' | 'preschool' | 'school' | 'teen';
  score: number;
  max: number;
  level: ScreeningLevel;
  created_at: string;
}

export interface AppSettings {
  /** PIN parent (verrou du mode enfant, CDC §14). Démo : '0000'. */
  parentPin: string;
  /** Sync Supabase activée (CDC §2.1 : désactivable, mode 100% local). */
  syncEnabled: boolean;
  deviceId: string;
  /** Pseudonyme forum (obligatoire, lien compte/pseudo invisible, CDC C01 §B2). */
  pseudonym: string;
  /** Charte forum acceptée à la première participation (§B4). */
  charterAccepted: boolean;
  charterVersion: string;
  /** Consentement forum → Insights, distinct, refusable sans perte (§B5). */
  forumInsightsConsent: boolean;
  /** Landing franchie (première entrée). Sinon on affiche l'accueil public. */
  entered: boolean;
}

export type ForumStatus = 'published' | 'quarantined' | 'removed';

export interface ForumThread {
  id: string;
  forum_id: string;
  pseudonym: string;
  title: string;
  body: string;
  is_anonymous: boolean;
  helped_count: number;
  status: ForumStatus;
  created_at: string;
  /** Rédigé sur cet appareil (permet l'affichage de son propre contenu en quarantaine). */
  own: boolean;
}

export interface ForumPost {
  id: string;
  thread_id: string;
  pseudonym: string;
  body: string;
  helped_count: number;
  status: ForumStatus;
  created_at: string;
  own: boolean;
}

export interface AppState {
  children: Child[];
  activeChildId: string | null;
  observations: Observation[];
  incidents: Incident[];
  /** Tableaux CAA par enfant. */
  aacBoards: Record<string, AacBoard>;
  aacUsage: AacUsageEvent[];
  gameSessions: GameSession[];
  activityLogs: ActivityLog[];
  togetherLogs: TogetherLog[];
  coachActions: CoachAction[];
  parentMoods: ParentMood[];
  bilanAnswers: BilanAnswer[];
  caps: Cap[];
  reports: ReportRecord[];
  lifeEvents: LifeEvent[];
  screeningResults: ScreeningResult[];
  forumThreads: ForumThread[];
  forumPosts: ForumPost[];
  settings: AppSettings;
  seeded: boolean;
}
