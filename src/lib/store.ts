/**
 * Store local-first (CDC §2.1, §2.4 mode 1 : écriture locale immédiate < 100 ms).
 * Persistance localStorage (en production : SQLite natif chiffré SQLCipher).
 * Les sélecteurs dérivés branchent le VRAI moteur Jumeau déterministe.
 */

import { useSyncExternalStore } from 'react';
import {
  computeTensionScore,
  computeTwinProfile,
  type TensionScore,
  type TwinProfile,
} from '@atlas-baobab/twin-engine';
import { moderateContent, type ModerationResult } from '@atlas-baobab/moderation';
import { uid } from './ids.js';
import { buildSeed, seedBoards, seedActivityLogs, seedAacUsage, seedGameSessions, seedLifeEvents } from './seed.js';
import { defaultBoard } from './caa.js';
import { momentType, type MomentInput } from './moments.js';
import { seedBilanAnswers } from './bilan.js';
import { seedCaps, MAX_ACTIVE_CAPS } from './gps.js';
import { CHARTER_VERSION, makePseudonym, seedForums } from './forums.js';
import type { ForumPost, ForumThread, ForumStatus } from './types.js';
import type {
  AacCard,
  ActivityLog,
  AppState,
  Child,
  GameSession,
  Observation,
  ScreeningResult,
  TogetherLog,
  CoachAction,
  ParentMood,
  BilanAnswer,
  Cap,
  Milestone,
  ReportRecord,
  LifeEvent,
} from './types.js';

const KEY = 'atlas-baobab-state-v2';

/** Rapports amorcés (démo). Définis ici pour éviter tout cycle store ↔ rapports.
 * L'empreinte est calculée/affichée à la volée par l'écran (SHA-256 du contenu). */
function seedReports(childId: string): ReportRecord[] {
  const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();
  return [
    { id: uid(), child_id: childId, gabarit: 'pro', recipient: 'Dr K. Anoh — psychologue', period: 'janv. → juin', sections: ['portrait', 'acquis', 'caa', 'aide'], created_at: iso(42), hash: '', content: '<header><h1>Rapport professionnel complet</h1></header><section><h2>Portrait par domaines</h2><p>Synthèse janvier → juin.</p></section>' },
    { id: uid(), child_id: childId, gabarit: 'ecole', recipient: 'Enseignante', period: 'le trimestre', sections: ['portrait', 'aide'], created_at: iso(61), hash: '', content: '<header><h1>Synthèse école</h1></header><section><h2>Appuis en classe</h2><p>Le tri, les images, les rythmes.</p></section>' },
    { id: uid(), child_id: childId, gabarit: 'famille', recipient: 'Mamie (WhatsApp)', period: 'le mois', sections: ['acquis'], created_at: iso(101), hash: '', content: '<header><h1>Point famille</h1></header><section><h2>Ses fiertés du mois</h2><p>De beaux petits pas.</p></section>' },
  ];
}

function freshState(): AppState {
  const deviceId = `dev-${uid().slice(0, 8)}`;
  const seed = buildSeed(deviceId);
  const forums = seedForums();
  const pseudoSeed = deviceId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    children: [seed.child],
    activeChildId: seed.child.id,
    observations: seed.observations,
    incidents: seed.incidents,
    aacBoards: seedBoards(seed.child.id),
    aacUsage: seedAacUsage(seed.child.id),
    gameSessions: seedGameSessions(seed.child.id),
    activityLogs: seedActivityLogs(seed.child.id, deviceId),
    togetherLogs: [],
    coachActions: [],
    parentMoods: [],
    bilanAnswers: seedBilanAnswers(seed.child.id),
    caps: seedCaps(seed.child.id),
    reports: seedReports(seed.child.id),
    lifeEvents: seedLifeEvents(seed.child.id),
    screeningResults: [],
    forumThreads: forums.threads,
    forumPosts: forums.posts,
    settings: {
      parentPin: '0000', syncEnabled: false, deviceId,
      pseudonym: makePseudonym(pseudoSeed), charterAccepted: false,
      charterVersion: CHARTER_VERSION, forumInsightsConsent: false, entered: false,
    },
    seeded: true,
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw) as AppState);
  } catch {
    /* ignore, on repart d'un état neuf */
  }
  const s = freshState();
  persist(s);
  return s;
}

/** Rétro-compatibilité : backfill des champs avatar + forums sur états anciens. */
function normalize(s: AppState): AppState {
  s.children = s.children.map((c) => ({
    ...c,
    avatar_key: c.avatar_key ?? 'pousse',
    avatar_motion: c.avatar_motion ?? 'slow',
  }));
  if (!s.forumThreads || !s.forumPosts) {
    const f = seedForums();
    s.forumThreads = s.forumThreads ?? f.threads;
    s.forumPosts = s.forumPosts ?? f.posts;
  }
  // Backfill des séances d'activités. Sur un état de démonstration (seeded), on
  // ré-amorce si vide — pour que la vue Acquis ait de la matière. Jamais sur un
  // état réel (seeded = false) ni s'il contient déjà des séances.
  if (!s.activityLogs || (s.activityLogs.length === 0 && s.seeded)) {
    s.activityLogs = seedActivityLogs(s.activeChildId ?? s.children[0]?.id ?? '');
  }
  if (!s.togetherLogs) s.togetherLogs = [];
  if (s.seeded && (!s.aacUsage || s.aacUsage.length === 0)) s.aacUsage = seedAacUsage(s.activeChildId ?? s.children[0]?.id ?? '');
  if (s.seeded && (!s.gameSessions || s.gameSessions.length === 0)) s.gameSessions = seedGameSessions(s.activeChildId ?? s.children[0]?.id ?? '');
  if (!s.coachActions) s.coachActions = [];
  if (!s.parentMoods) s.parentMoods = [];
  if (!s.bilanAnswers || (s.bilanAnswers.length === 0 && s.seeded)) {
    s.bilanAnswers = seedBilanAnswers(s.activeChildId ?? s.children[0]?.id ?? '');
  }
  if (!s.caps || (s.caps.length === 0 && s.seeded)) {
    s.caps = seedCaps(s.activeChildId ?? s.children[0]?.id ?? '');
  }
  if (!s.reports || (s.reports.length === 0 && s.seeded)) {
    s.reports = seedReports(s.activeChildId ?? s.children[0]?.id ?? '');
  }
  if (!s.lifeEvents || (s.lifeEvents.length === 0 && s.seeded)) {
    s.lifeEvents = seedLifeEvents(s.activeChildId ?? s.children[0]?.id ?? '');
  }
  const st = s.settings as Partial<AppState['settings']> & { deviceId: string };
  const seed = st.deviceId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  s.settings = {
    parentPin: st.parentPin ?? '0000',
    syncEnabled: st.syncEnabled ?? false,
    deviceId: st.deviceId,
    pseudonym: st.pseudonym ?? makePseudonym(seed),
    charterAccepted: st.charterAccepted ?? false,
    charterVersion: st.charterVersion ?? CHARTER_VERSION,
    forumInsightsConsent: st.forumInsightsConsent ?? false,
    entered: st.entered ?? false,
  };
  return s;
}

let state: AppState = load();
const listeners = new Set<() => void>();

function persist(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota plein : l'UI reste fonctionnelle en mémoire */
  }
}

function set(next: AppState): void {
  state = next;
  persist(state);
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  return state;
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

/** État complet (référence stable entre deux `set`). Dérivez avec useMemo. */
export function useAppState(): AppState {
  return useStore((s) => s);
}

// ── Sélecteurs ──────────────────────────────────────────────────────────────

export function activeChild(s: AppState = state): Child | null {
  return s.children.find((c) => c.id === s.activeChildId) ?? null;
}

export function childObservations(childId: string, s: AppState = state): Observation[] {
  return s.observations.filter((o) => o.child_id === childId);
}

/** Jalons (proxy Bilan 360) = réussites loggées. Alimente le stade de croissance
 * de l'avatar Pousse (CDC C02 §C2.6, jamais lié au temps d'écran). */
export function milestoneCount(childId: string, s: AppState = state): number {
  return s.observations.filter((o) => o.child_id === childId && o.kind === 'success').length;
}

/** Compétences ACQUISES = activités dont la dernière séance est au niveau 4. */
export function acquiredCompetences(childId: string, s: AppState = state): number {
  const latest = new Map<string, { at: string; level: number }>();
  for (const l of s.activityLogs) {
    if (l.child_id !== childId) continue;
    const cur = latest.get(l.activity_id);
    if (!cur || l.occurred_at > cur.at) latest.set(l.activity_id, { at: l.occurred_at, level: l.level });
  }
  let n = 0;
  for (const v of latest.values()) if (v.level >= 4) n += 1;
  return n;
}

/** Points de croissance de l'avatar = réussites + compétences acquises. Chaque
 * acquis fait donc grandir le Baobab de l'enfant (motivation visible, CDC C02). */
export function growthPoints(childId: string, s: AppState = state): number {
  return milestoneCount(childId, s) + acquiredCompetences(childId, s);
}

export function twinProfile(childId: string, s: AppState = state): TwinProfile {
  const version = s.observations.filter((o) => o.child_id === childId).length;
  return computeTwinProfile(
    s.observations.filter((o) => o.child_id === childId),
    s.incidents.filter((i) => i.child_id === childId),
    { version, computedAt: new Date().toISOString() },
  );
}

export function tensionToday(childId: string, s: AppState = state): TensionScore {
  const profile = twinProfile(childId, s);
  return computeTensionScore(
    s.observations.filter((o) => o.child_id === childId),
    s.incidents.filter((i) => i.child_id === childId),
    profile.triggers,
    new Date().toISOString(),
  );
}

// ── Actions ─────────────────────────────────────────────────────────────────

export const actions = {
  addObservation(input: Omit<Observation, 'id' | 'device_id' | 'child_id'> & { child_id?: string }): void {
    const childId = input.child_id ?? state.activeChildId;
    if (!childId) return;
    const obs: Observation = {
      ...input,
      id: uid(),
      child_id: childId,
      device_id: state.settings.deviceId,
    };
    set({ ...state, observations: [obs, ...state.observations] });
  },

  updateObservation(id: string, patch: Partial<Pick<Observation, 'intensity' | 'context' | 'kind' | 'occurred_at' | 'author'>>): void {
    set({
      ...state,
      observations: state.observations.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
  },

  deleteObservation(id: string): void {
    set({ ...state, observations: state.observations.filter((o) => o.id !== id) });
  },

  /** Complément horodaté (JV-01 A1.3) : après 24 h on ne modifie pas, on AJOUTE une
   * entrée liée, append-only. La fiabilité du suivi reste intacte. */
  addMomentAddendum(obsId: string, text: string, author: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    set({
      ...state,
      observations: state.observations.map((o) => {
        if (o.id !== obsId) return o;
        const prev = Array.isArray(o.context?.addenda) ? (o.context!.addenda as unknown[]) : [];
        return { ...o, context: { ...o.context, addenda: [...prev, { text: trimmed, at: new Date().toISOString(), author }] } };
      }),
    });
  },

  logCrisis(details: {
    startedAt: string;
    endedAt?: string;
    suspected?: string;
    whatHelped?: string[];
    place?: string;
    noiseLevel?: number;
    feedback?: 'helped' | 'partial' | 'no';
  }): void {
    const childId = state.activeChildId;
    if (!childId) return;
    const obsId = uid();
    const context = { place: details.place, noise_level: details.noiseLevel };
    const obs: Observation = {
      id: obsId, child_id: childId, device_id: state.settings.deviceId,
      kind: 'incident', intensity: 5, occurred_at: details.startedAt,
      author: 'Moi', context,
    };
    const incident = {
      id: uid(), child_id: childId, observation_id: obsId,
      started_at: details.startedAt, ended_at: details.endedAt,
      suspected_trigger: details.suspected, what_helped: details.whatHelped,
      guidance_feedback: details.feedback, context,
    };
    set({
      ...state,
      observations: [obs, ...state.observations],
      incidents: [incident, ...state.incidents],
    });
  },

  /** Journal des moments v2 (JV-01) : saisie structurée → observation (+ incident
   * pour crise/moment difficile), chips rangés dans le contexte. Les aides
   * alimentent « Ce qui l'apaise » de CORTEX ; le déclencheur principal, les tendances. */
  logMoment(m: MomentInput): void {
    const childId = state.activeChildId;
    if (!childId) return;
    const def = momentType(m.type);
    const context: Record<string, unknown> = {
      place: m.place,
      moment_type: m.type,
      ...(m.declencheurs?.length ? { declencheurs: m.declencheurs } : {}),
      ...(m.manifestations?.length ? { manifestations: m.manifestations } : {}),
      ...(m.aides?.length ? { aides: m.aides } : {}),
      ...(m.domaines?.length ? { domaines: m.domaines } : {}),
      ...(m.duree ? { duree: m.duree } : {}),
      ...(m.note ? { note: m.note } : {}),
    };
    const obsId = uid();
    const obs: Observation = {
      id: obsId, child_id: childId, device_id: state.settings.deviceId,
      kind: def.kind, intensity: m.intensity, occurred_at: m.occurred_at,
      author: m.author, context,
    };
    const isIncident = m.type === 'crise' || m.type === 'difficile';
    const primaryTrigger = m.declencheurs?.find((d) => d !== 'je ne sais pas');
    const next: AppState = { ...state, observations: [obs, ...state.observations] };
    if (isIncident) {
      next.incidents = [{
        id: uid(), child_id: childId, observation_id: obsId,
        started_at: m.occurred_at,
        ...(primaryTrigger ? { suspected_trigger: primaryTrigger } : {}),
        ...(m.aides?.length ? { what_helped: m.aides } : {}),
        context,
      }, ...state.incidents];
    }
    set(next);
  },

  pressAacCard(card: AacCard): void {
    const childId = state.activeChildId;
    if (!childId) return;
    set({
      ...state,
      aacUsage: [
        { id: uid(), child_id: childId, card_id: card.id, label: card.label, picto: card.picto, pressed_at: new Date().toISOString() },
        ...state.aacUsage,
      ],
    });
  },

  addGameSession(session: Omit<GameSession, 'id' | 'child_id'>): void {
    const childId = state.activeChildId;
    if (!childId) return;
    set({
      ...state,
      gameSessions: [{ ...session, id: uid(), child_id: childId }, ...state.gameSessions],
    });
  },

  logActivity(input: { activity_id: string; domain: string; level: number; note?: string }): void {
    const childId = state.activeChildId;
    if (!childId) return;
    const log: ActivityLog = {
      id: uid(),
      child_id: childId,
      activity_id: input.activity_id,
      domain: input.domain,
      level: input.level,
      occurred_at: new Date().toISOString(),
      author: 'Moi',
      ...(input.note ? { note: input.note } : {}),
    };
    set({ ...state, activityLogs: [log, ...state.activityLogs] });
  },

  deleteActivityLog(id: string): void {
    set({ ...state, activityLogs: state.activityLogs.filter((l) => l.id !== id) });
  },

  /** Coach : « j'essaie aujourd'hui » (une action par jour et par leçon). */
  coachTry(lessonId: string): void {
    const childId = state.activeChildId;
    if (!childId) return;
    const day = new Date().toISOString().slice(0, 10);
    if (state.coachActions.some((a) => a.child_id === childId && a.lesson_id === lessonId && a.day === day)) return;
    const action: CoachAction = { id: uid(), child_id: childId, lesson_id: lessonId, day, tried_at: new Date().toISOString() };
    set({ ...state, coachActions: [action, ...state.coachActions] });
  },

  /** Retour d'hier en 1 tap : renseigne le feedback de la dernière action sans retour. */
  coachFeedback(lessonId: string, feedback: NonNullable<CoachAction['feedback']>): void {
    const childId = state.activeChildId;
    if (!childId) return;
    const target = state.coachActions.find((a) => a.child_id === childId && a.lesson_id === lessonId && !a.feedback);
    if (!target) return;
    set({ ...state, coachActions: state.coachActions.map((a) => (a.id === target.id ? { ...a, feedback } : a)) });
  },

  /** Bien-être parent (jamais dans les données de l'enfant, jamais dans un rapport). */
  logParentMood(level: ParentMood['level']): void {
    set({ ...state, parentMoods: [{ id: uid(), at: new Date().toISOString(), level }, ...state.parentMoods] });
  },

  /** Réponse à une question du Bilan 360 (période « now », upsert par regard+question). */
  setBilanAnswer(respondent: BilanAnswer['respondent'], questionId: string, level: number | null): void {
    const childId = state.activeChildId;
    if (!childId) return;
    const at = new Date().toISOString();
    const existing = state.bilanAnswers.find(
      (a) => a.child_id === childId && a.period === 'now' && a.respondent === respondent && a.question_id === questionId,
    );
    if (existing) {
      set({ ...state, bilanAnswers: state.bilanAnswers.map((a) => (a.id === existing.id ? { ...a, level, at } : a)) });
    } else {
      set({ ...state, bilanAnswers: [{ id: uid(), child_id: childId, respondent, period: 'now', question_id: questionId, level, at }, ...state.bilanAnswers] });
    }
  },

  /** GPS : franchir la marche courante (« now » → « done », la suivante devient
   * « now »). Chaque marche franchie est un fruit d'or sur le baobab (CX-01 §8). */
  gpsAdvance(capId: string): void {
    set({
      ...state,
      caps: state.caps.map((c) => {
        if (c.id !== capId) return c;
        const at = new Date().toISOString();
        const nowIdx = c.milestones.findIndex((m) => m.status === 'now');
        if (nowIdx < 0) return c;
        const milestones: Milestone[] = c.milestones.map((m, i) => {
          if (i === nowIdx) return { ...m, status: 'done', done_at: at };
          if (i === nowIdx + 1) return { ...m, status: 'now' };
          return m;
        });
        const allDone = milestones.every((m) => m.status === 'done');
        return { ...c, milestones, status: allDone ? 'done' : c.status };
      }),
    });
  },

  gpsPause(capId: string): void {
    set({ ...state, caps: state.caps.map((c) => (c.id === capId ? { ...c, status: 'paused', paused_at: new Date().toISOString() } : c)) });
  },
  gpsResume(capId: string): void {
    const childId = state.activeChildId;
    if (childId && state.caps.filter((c) => c.child_id === childId && c.status === 'active').length >= MAX_ACTIVE_CAPS) return;
    set({ ...state, caps: state.caps.map((c) => (c.id === capId ? { ...c, status: 'active', paused_at: undefined } : c)) });
  },
  /** Noter un événement de vie (CX-01 §5) : 100 % volontaire, jamais de relance. */
  addLifeEvent(kind: string, label?: string, at?: string): void {
    const childId = state.activeChildId;
    if (!childId) return;
    const ev: LifeEvent = { id: uid(), child_id: childId, kind, at: at ?? new Date().toISOString(), ...(label ? { label } : {}) };
    set({ ...state, lifeEvents: [ev, ...state.lifeEvents] });
  },
  deleteLifeEvent(id: string): void {
    set({ ...state, lifeEvents: state.lifeEvents.filter((e) => e.id !== id) });
  },

  /** Émettre un rapport scellé (M7). Le contenu et l'empreinte sont calculés par
   * l'écran (async) puis stockés ici — un rapport émis ne se modifie jamais. */
  addReport(record: Omit<ReportRecord, 'id' | 'child_id' | 'created_at'>): void {
    const childId = state.activeChildId;
    if (!childId) return;
    const report: ReportRecord = { ...record, id: uid(), child_id: childId, created_at: new Date().toISOString() };
    set({ ...state, reports: [report, ...state.reports] });
  },

  gpsAddCap(domain: string, title: string, milestoneLabels: string[]): void {
    const childId = state.activeChildId;
    if (!childId) return;
    if (state.caps.filter((c) => c.child_id === childId && c.status === 'active').length >= MAX_ACTIVE_CAPS) return;
    const milestones: Milestone[] = milestoneLabels.map((label, i) => ({ id: uid(), label, status: i === 0 ? 'now' : 'future' }));
    const cap: Cap = { id: uid(), child_id: childId, domain, title, status: 'active', created_at: new Date().toISOString(), milestones };
    set({ ...state, caps: [cap, ...state.caps] });
  },

  /** « On l'a fait » sur une fiche parent (P01 §4.4) : un seul tap, une réaction. */
  logTogetherFiche(fiche_id: string, reaction: TogetherLog['reaction']): void {
    const childId = state.activeChildId;
    if (!childId) return;
    const log: TogetherLog = { id: uid(), child_id: childId, fiche_id, reaction, done_at: new Date().toISOString() };
    set({ ...state, togetherLogs: [log, ...state.togetherLogs] });
  },

  addScreeningResult(r: Omit<ScreeningResult, 'id' | 'created_at'>): void {
    set({
      ...state,
      screeningResults: [
        { ...r, id: uid(), created_at: new Date().toISOString() },
        ...state.screeningResults,
      ],
    });
  },

  createChild(input: { first_name: string; birth_date: string }): string {
    const child: Child = {
      id: uid(),
      first_name: input.first_name,
      birth_date: input.birth_date,
      active_theme: 'savane',
      screen_quota_minutes: 15,
      created_at: new Date().toISOString(),
      avatar_key: 'pousse',
      avatar_motion: 'slow',
    };
    set({
      ...state,
      children: [...state.children, child],
      activeChildId: child.id,
      aacBoards: { ...state.aacBoards, [child.id]: defaultBoard() },
    });
    return child.id;
  },

  updateChild(childId: string, patch: Partial<Child>): void {
    set({
      ...state,
      children: state.children.map((c) => (c.id === childId ? { ...c, ...patch } : c)),
    });
  },

  setActiveChild(childId: string): void {
    set({ ...state, activeChildId: childId });
  },

  setSyncEnabled(enabled: boolean): void {
    set({ ...state, settings: { ...state.settings, syncEnabled: enabled } });
  },

  setEntered(v: boolean): void {
    set({ ...state, settings: { ...state.settings, entered: v } });
  },

  setPin(pin: string): void {
    set({ ...state, settings: { ...state.settings, parentPin: pin } });
  },

  // ── Forums (CDC C01 §B) ────────────────────────────────────────────────
  acceptCharter(): void {
    set({ ...state, settings: { ...state.settings, charterAccepted: true, charterVersion: CHARTER_VERSION } });
  },

  setPseudonym(name: string): void {
    set({ ...state, settings: { ...state.settings, pseudonym: name } });
  },

  setForumInsightsConsent(v: boolean): void {
    set({ ...state, settings: { ...state.settings, forumInsightsConsent: v } });
  },

  createThread(forumId: string, title: string, body: string, isAnonymous: boolean): ModerationResult {
    const names = state.children.map((c) => c.first_name);
    const mb = moderateContent(body, { childNames: names });
    const mt = moderateContent(title, { childNames: names });
    const status: ForumStatus = mb.status === 'quarantined' || mt.status === 'quarantined' ? 'quarantined' : 'published';
    const thread: ForumThread = {
      id: uid(), forum_id: forumId,
      pseudonym: isAnonymous ? 'Anonyme' : state.settings.pseudonym,
      title: mt.masked, body: mb.masked, is_anonymous: isAnonymous,
      helped_count: 0, status, created_at: new Date().toISOString(), own: true,
    };
    set({ ...state, forumThreads: [thread, ...state.forumThreads] });
    return { ...mb, status, reasons: [...new Set([...mb.reasons, ...mt.reasons])] };
  },

  replyToThread(threadId: string, body: string): ModerationResult {
    const names = state.children.map((c) => c.first_name);
    const m = moderateContent(body, { childNames: names });
    const post: ForumPost = {
      id: uid(), thread_id: threadId, pseudonym: state.settings.pseudonym,
      body: m.masked, helped_count: 0, status: m.status, created_at: new Date().toISOString(), own: true,
    };
    set({ ...state, forumPosts: [...state.forumPosts, post] });
    return m;
  },

  markThreadHelped(threadId: string): void {
    set({
      ...state,
      forumThreads: state.forumThreads.map((t) => (t.id === threadId ? { ...t, helped_count: t.helped_count + 1 } : t)),
    });
  },

  markPostHelped(postId: string): void {
    set({
      ...state,
      forumPosts: state.forumPosts.map((p) => (p.id === postId ? { ...p, helped_count: p.helped_count + 1 } : p)),
    });
  },

  resetAll(): void {
    set(freshState());
  },
};
