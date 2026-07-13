/**
 * CX-01 · Trajectoires (le « comment » des acquisitions). Restitue ce que
 * l'enfant a acquis, COMMENT il l'a acquis, et sa trajectoire de communication —
 * tout dérivé de la télémétrie EXISTANTE (activités, CAA, régulation), aucune
 * nouvelle capture, aucun LLM. La référence de l'enfant, c'est lui-même à T-antérieur.
 */
import { ACTIVITIES, DOMAINS, domainOf, activitiesOf, type Activity, type ActivityDomainKey } from './activities.js';
import { FICHES } from './togetherPlay.js';
import { cardCategory, categoryLabel } from './caa.js';
import { helpsForChild } from './coach.js';
import { formatDate, relativeDay } from './format.js';
import type { AppState, ActivityLog, LifeEvent } from './types.js';

// ── Chronologie de vie (CX-01 §5) ────────────────────────────────────────────
export interface LifeEventType { key: string; label: string; emoji: string; major: boolean; }
export const LIFE_EVENT_TYPES: LifeEventType[] = [
  { key: 'rentree', label: 'Rentrée / école', emoji: '🎒', major: false },
  { key: 'demenagement', label: 'Déménagement', emoji: '📦', major: true },
  { key: 'maladie', label: 'Maladie', emoji: '🤒', major: true },
  { key: 'suivi', label: 'Changement de suivi', emoji: '💊', major: true },
  { key: 'proche', label: 'Arrivée / départ d’un proche', emoji: '👋', major: false },
  { key: 'voyage', label: 'Voyage', emoji: '✈️', major: false },
  { key: 'aidant', label: 'Changement de nounou / aidant', emoji: '🔄', major: false },
  { key: 'autre', label: 'Autre', emoji: '📝', major: false },
];
export function lifeEventType(key: string): LifeEventType {
  return LIFE_EVENT_TYPES.find((t) => t.key === key) ?? LIFE_EVENT_TYPES[LIFE_EVENT_TYPES.length - 1];
}
export function lifeEventsFor(childId: string, state: AppState): LifeEvent[] {
  return (state.lifeEvents ?? []).filter((e) => e.child_id === childId).sort((a, b) => b.at.localeCompare(a.at));
}
/** Une période tombe-t-elle dans les 14 jours suivant un événement MAJEUR ? */
export function nearMajorEvent(childId: string, state: AppState, atMs: number): LifeEvent | null {
  for (const e of lifeEventsFor(childId, state)) {
    if (!lifeEventType(e.kind).major) continue;
    const d = atMs - Date.parse(e.at);
    if (d >= 0 && d < 14 * 86400000) return e;
  }
  return null;
}

export type CompState = 'non_observee' | 'emergente' | 'en_acquisition' | 'acquise' | 'generalisee';
export const STATE_ORDER: CompState[] = ['non_observee', 'emergente', 'en_acquisition', 'acquise', 'generalisee'];
export const STATE_LABEL: Record<CompState, string> = {
  non_observee: 'Non observé', emergente: 'Émergente', en_acquisition: 'En acquisition', acquise: 'Acquise', generalisee: 'Généralisée',
};
export const STATE_TINT: Record<CompState, string> = {
  non_observee: '#c9c1b2', emergente: '#d9a66c', en_acquisition: '#d99c3f', acquise: '#7a9e7e', generalisee: '#4e7a50',
};

export interface CompStatus {
  activity: Activity;
  state: CompState;
  level: number;
  logs: ActivityLog[]; // ordre chronologique croissant
  emergedAt?: string;
  acquiredAt?: string;
}

function logsFor(activityId: string, childId: string, state: AppState): ActivityLog[] {
  return state.activityLogs
    .filter((l) => l.child_id === childId && l.activity_id === activityId)
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

function hasMirrorLove(domain: string, childId: string, state: AppState): boolean {
  const inDomain = new Set(FICHES.filter((f) => f.domains.includes(domain as ActivityDomainKey)).map((f) => f.id));
  return (state.togetherLogs ?? []).some((l) => l.child_id === childId && l.reaction === 'love' && inDomain.has(l.fiche_id));
}

export function competenceStatus(activity: Activity, childId: string, state: AppState): CompStatus {
  const logs = logsFor(activity.id, childId, state);
  if (!logs.length) return { activity, state: 'non_observee', level: 0, logs };
  const level = logs[logs.length - 1].level;
  const emergedAt = logs[0].occurred_at;
  const acquiredAt = logs.find((l) => l.level >= 4)?.occurred_at;
  const generalized = level >= 4 && hasMirrorLove(activity.domain, childId, state);
  const s: CompState = generalized ? 'generalisee' : level >= 4 ? 'acquise' : level >= 2 ? 'en_acquisition' : 'emergente';
  return { activity, state: s, level, logs, emergedAt, acquiredAt };
}

export function allStatuses(childId: string, state: AppState): CompStatus[] {
  return ACTIVITIES.map((a) => competenceStatus(a, childId, state));
}
export function acquiredList(childId: string, state: AppState): CompStatus[] {
  return allStatuses(childId, state)
    .filter((s) => s.state === 'acquise' || s.state === 'generalisee')
    .sort((a, b) => (b.acquiredAt ?? '').localeCompare(a.acquiredAt ?? ''));
}
export function emergingList(childId: string, state: AppState): CompStatus[] {
  return allStatuses(childId, state).filter((s) => s.state === 'emergente' || s.state === 'en_acquisition');
}

export interface DomainTrend { domain: ActivityDomainKey; label: string; tint: string; avant: number | null; apres: number | null; acquired: number; total: number; }
export function domainTrends(childId: string, state: AppState): DomainTrend[] {
  return DOMAINS.map((d) => {
    const withLogs = allStatuses(childId, state).filter((s) => s.activity.domain === d.key && s.logs.length);
    if (!withLogs.length) return { domain: d.key, label: d.label, tint: d.tint, avant: null, apres: null, acquired: 0, total: 0 };
    const avant = withLogs.reduce((sum, s) => sum + s.logs[0].level / 4, 0) / withLogs.length;
    const apres = withLogs.reduce((sum, s) => sum + s.logs[s.logs.length - 1].level / 4, 0) / withLogs.length;
    const acquired = withLogs.filter((s) => s.state === 'acquise' || s.state === 'generalisee').length;
    return { domain: d.key, label: d.label, tint: d.tint, avant, apres, acquired, total: withLogs.length };
  });
}

export interface AcqFiche {
  resume: string;
  curve: number[];
  helped: string[];
  next: string | null;
  mirror: string | null;
  contextEvent: string | null;
}
/** La Fiche d'acquisition (CX-01 §3.2) : le résumé, la courbe, ce qui l'a aidé, et la suite. */
export function acquisitionFiche(s: CompStatus, childId: string, state: AppState, childName: string): AcqFiche {
  const label = s.activity.label.charAt(0).toLowerCase() + s.activity.label.slice(1);
  const resume = s.acquiredAt && s.emergedAt
    ? `${childName} a appris à ${label} entre le ${formatDate(s.emergedAt)} et le ${formatDate(s.acquiredAt)}, en ${s.logs.length} séance${s.logs.length > 1 ? 's' : ''}.`
    : `${childName} progresse sur « ${label} » depuis le ${formatDate(s.emergedAt ?? s.logs[0]?.occurred_at ?? '')}.`;

  // Ce qui l'a aidé (constat, jamais « il faut ») : auteur dominant + apaisants + régularité.
  const authors = new Map<string, number>();
  for (const l of s.logs) if (l.author) authors.set(l.author, (authors.get(l.author) ?? 0) + 1);
  const topAuthor = [...authors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const helped: string[] = [];
  if (topAuthor) helped.push(`Les séances se sont surtout passées avec ${topAuthor}`);
  const calms = helpsForChild(childId, state).slice(0, 2).map((h) => h.label.toLowerCase());
  for (const c of calms) helped.push(`Il était plus disponible avec ${c}`);
  if (s.logs.length >= 3) helped.push('La régularité, une petite touche à la fois, a fait la différence');

  // Et maintenant : la prochaine marche du domaine + une fiche miroir à faire en vrai.
  const nextAct = activitiesOf(s.activity.domain).find((a) => {
    const st = competenceStatus(a, childId, state);
    return st.state !== 'acquise' && st.state !== 'generalisee';
  });
  const mirrorFiche = FICHES.find((f) => f.domains.includes(s.activity.domain as ActivityDomainKey));

  // Événement de vie croisant la période d'acquisition (repère de contexte §5).
  let contextEvent: string | null = null;
  if (s.emergedAt && s.acquiredAt) {
    const lo = Date.parse(s.emergedAt), hi = Date.parse(s.acquiredAt);
    const ev = lifeEventsFor(childId, state).find((e) => { const t = Date.parse(e.at); return t >= lo && t <= hi; });
    if (ev) contextEvent = lifeEventType(ev.kind).label;
  }

  return {
    resume, curve: s.logs.map((l) => l.level),
    helped: helped.slice(0, 4),
    next: nextAct ? nextAct.label : null,
    mirror: mirrorFiche ? mirrorFiche.title : null,
    contextEvent,
  };
}

// ── Trajectoire CAA « Sa voix » (CX-01 §4) ───────────────────────────────────
export interface CaaTrajectory {
  vocabNow: number;
  vocabBefore: number;
  categories: { key: string; label: string; count: number }[];
  premieres: { label: string; picto: string; at: string; category: string }[];
  totalPresses: number;
}
export function caaTrajectory(childId: string, state: AppState, nowMs = Date.now()): CaaTrajectory {
  const presses = state.aacUsage
    .filter((u) => u.child_id === childId)
    .sort((a, b) => a.pressed_at.localeCompare(b.pressed_at));
  const distinct = new Set(presses.map((p) => p.card_id));
  const beforeCut = nowMs - 14 * 86400000;
  const before = new Set(presses.filter((p) => Date.parse(p.pressed_at) < beforeCut).map((p) => p.card_id));

  // Étendue des catégories.
  const catCount = new Map<string, number>();
  const firstOfCat = new Map<string, typeof presses[number]>();
  for (const p of presses) {
    const cat = cardCategory(p.label);
    catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
    if (!firstOfCat.has(cat)) firstOfCat.set(cat, p);
  }
  const categories = [...catCount.entries()].map(([key, count]) => ({ key, label: categoryLabel(key), count }))
    .sort((a, b) => b.count - a.count);

  // Premières historiques : première carte de chaque catégorie (jalon à vie).
  const premieres = [...firstOfCat.values()]
    .map((p) => ({ label: p.label, picto: p.picto, at: p.pressed_at, category: cardCategory(p.label) }))
    .sort((a, b) => a.at.localeCompare(b.at));

  return { vocabNow: distinct.size, vocabBefore: before.size, categories, premieres, totalPresses: presses.length };
}

// ── Détection des plateaux (CX-01 §7.4) ──────────────────────────────────────
// Affiner les méthodes, c'est surtout savoir QUAND en changer. Une compétence
// émergente qui ne progresse plus depuis plusieurs séances = un plateau — SAUF
// pendant une fenêtre d'événement de vie (§5) où c'est le contexte qui explique.
export interface Plateau { status: CompStatus; sessions: number; mirror: string | null; }
export function plateaus(childId: string, state: AppState): Plateau[] {
  const out: Plateau[] = [];
  for (const s of emergingList(childId, state)) {
    if (s.logs.length < 4) continue;
    const win = s.logs.slice(-4);
    const startLevel = win[0].level;
    const noProgress = Math.max(...win.map((l) => l.level)) <= startLevel; // aucune montée sur la fenêtre
    if (!noProgress) continue;
    // Hors fenêtre d'événement majeur : là, c'est le contexte, pas un plateau.
    if (nearMajorEvent(childId, state, Date.parse(win[win.length - 1].occurred_at))) continue;
    const mirror = FICHES.find((f) => f.domains.includes(s.activity.domain as ActivityDomainKey))?.title ?? null;
    out.push({ status: s, sessions: win.length, mirror });
  }
  return out;
}

// ── Trajectoire de régulation « Son calme » (CX-01 §4.3) ─────────────────────
export interface CalmTrajectory {
  hardBefore: number;
  hardNow: number;
  trend: 'mieux' | 'stable' | 'plus' | null;
  calms: { label: string; badge: 'observe' | 'tendance' | 'encore' }[];
}
export function calmTrajectory(childId: string, state: AppState, nowMs = Date.now()): CalmTrajectory {
  const inc = state.incidents.filter((i) => i.child_id === childId);
  const now = inc.filter((i) => nowMs - Date.parse(i.started_at) < 14 * 86400000).length;
  const before = inc.filter((i) => { const d = nowMs - Date.parse(i.started_at); return d >= 14 * 86400000 && d < 28 * 86400000; }).length;
  const trend = (before === 0 && now === 0) ? null : now < before ? 'mieux' : now > before ? 'plus' : 'stable';
  return { hardBefore: before, hardNow: now, trend, calms: helpsForChild(childId, state).slice(0, 4) };
}

// ── Profil d'apprentissage · les 8 axes (CX-01 §7) ───────────────────────────
// Honnêteté statistique BLOQUANTE (§7.2) : formulation corrélationnelle (« les
// réussites sont plus fréquentes quand… », jamais « il faut… »), et un axe sans
// signal reste vide (« on observe encore »). Un vide est une réponse honnête.
export type AxisBadge = 'observe' | 'tendance' | 'tot';
export const AXIS_BADGE_LABEL: Record<AxisBadge, string> = { observe: 'Observé', tendance: 'Tendance', tot: 'On observe encore' };
export interface Axis { key: string; label: string; finding: string | null; badge: AxisBadge; }

function badgeFor(n: number, obs: number, tend: number): AxisBadge {
  return n >= obs ? 'observe' : n >= tend ? 'tendance' : 'tot';
}
const median = (arr: number[]): number => (arr.length ? [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)] : 0);

export function learningProfile(childId: string, state: AppState): Axis[] {
  const games = state.gameSessions.filter((g) => g.child_id === childId);
  const ng = games.length;
  const acquired = acquiredList(childId, state);
  const incidents = state.incidents.filter((i) => i.child_id === childId);

  // 4 · Moment de la journée : taux de réussite par créneau.
  const bucketOf = (h: number) => (h < 12 ? 'le matin' : h < 17 ? 'l’après-midi' : 'le soir');
  const buckets: Record<string, { h: number; t: number }> = {};
  for (const g of games) {
    const b = bucketOf(new Date(g.played_at).getHours());
    (buckets[b] ??= { h: 0, t: 0 });
    buckets[b].h += g.telemetry.hits; buckets[b].t += g.telemetry.hits + g.telemetry.misses;
  }
  const rates = Object.entries(buckets).filter(([, v]) => v.t > 0).map(([k, v]) => [k, v.h / v.t] as [string, number]).sort((a, b) => b[1] - a[1]);
  const moment = (ng >= 6 && rates.length >= 2 && rates[0][1] - rates[rates.length - 1][1] >= 0.12) ? `Les réussites sont plus fréquentes ${rates[0][0]}.` : null;

  // 8 · Nouveauté : temps de réaction du 1er passage vs suivants.
  let nouveaute: string | null = null;
  if (ng >= 8) {
    const sorted = [...games].sort((a, b) => a.played_at.localeCompare(b.played_at));
    const first = new Map<string, number>(); const rest: number[] = [];
    for (const g of sorted) { if (!first.has(g.game_code)) first.set(g.game_code, g.telemetry.avg_reaction_ms); else rest.push(g.telemetry.avg_reaction_ms); }
    const af = [...first.values()].reduce((a, b) => a + b, 0) / first.size;
    const ar = rest.length ? rest.reduce((a, b) => a + b, 0) / rest.length : af;
    if (ar < af - 150) nouveaute = 'Il s’installe vite dans un jeu nouveau — sa main devient plus sûre à chaque fois.';
    else if (ar > af + 150) nouveaute = 'Un jeu nouveau lui demande plusieurs présentations avant de se lancer.';
  }

  // 5 · Format de session : durée médiane.
  const format = ng >= 8 ? (median(games.map((g) => g.duration_seconds)) <= 65
    ? 'Les sessions courtes et fréquentes lui réussissent mieux que les longues.'
    : 'Il tient plus longtemps sur une même session.') : null;

  // 7 · Rythme de progression : médiane des séances émergence → acquisition.
  const rythme = acquired.length >= 3 ? `En médiane, ${median(acquired.map((s) => s.logs.length))} séances entre l’apparition d’une compétence et sa consolidation.` : null;

  // 6 · Régulation : effet de Ma Bulle dans « ce qui a aidé ».
  const bulleN = incidents.filter((i) => (i.what_helped ?? []).some((h) => /bulle/i.test(h))).length;
  const regulation = (incidents.length >= 4 && bulleN >= 2) ? 'Les moments difficiles se sont mieux passés après un passage par Ma Bulle.' : null;

  return [
    { key: 'modalite', label: 'Ce qui capte son attention', finding: null, badge: 'tot' },
    { key: 'demonstration', label: 'La démonstration', finding: null, badge: 'tot' },
    { key: 'thematisation', label: 'Ses intérêts intenses', finding: null, badge: 'tot' },
    { key: 'moment', label: 'Le moment de la journée', finding: moment, badge: moment ? badgeFor(ng, 20, 10) : 'tot' },
    { key: 'format', label: 'Le format de session', finding: format, badge: format ? badgeFor(ng, 20, 10) : 'tot' },
    { key: 'regulation', label: 'Le rôle de Ma Bulle', finding: regulation, badge: regulation ? badgeFor(incidents.length, 10, 4) : 'tot' },
    { key: 'rythme', label: 'Son rythme de progression', finding: rythme, badge: rythme ? badgeFor(acquired.length, 8, 3) : 'tot' },
    { key: 'nouveaute', label: 'Face à la nouveauté', finding: nouveaute, badge: nouveaute ? badgeFor(ng, 20, 10) : 'tot' },
  ];
}

/** Boucle d'affinage (§7.3) : le profil informe ce que CORTEX propose, et le parent
 * voit POURQUOI. Un « pourquoi » d'une ligne, tiré des tendances réelles — jamais
 * une injonction. `null` s'il n'y a pas encore de signal. */
export function profileTip(childId: string, state: AppState): string | null {
  const ax = learningProfile(childId, state);
  const moment = ax.find((a) => a.key === 'moment' && a.finding);
  if (moment) {
    const when = moment.finding!.includes('matin') ? 'le matin' : moment.finding!.includes('après-midi') ? 'l’après-midi' : 'le soir';
    return `En ce moment, ${when} lui réussit bien — un beau créneau pour ces idées.`;
  }
  const format = ax.find((a) => a.key === 'format' && a.finding);
  if (format) return format.finding!.includes('courtes') ? 'Des moments courts et fréquents lui vont bien ces temps-ci.' : 'Il tient sur des moments plus longs, en ce moment.';
  return null;
}

export { relativeDay };
