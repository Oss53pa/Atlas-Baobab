/**
 * Bilan 360 (module M5) : où en est l'enfant, par domaine, aux yeux de tous les
 * regards (parents, école, et lui-même). Passation 1 question par écran, échelle à
 * 4 crans + « je ne sais pas ». Le portrait décrit l'enfant PAR RAPPORT À LUI-MÊME,
 * jamais à d'autres enfants (loi produit). Calcul déterministe, aucun LLM.
 */
import type { AppState, BilanAnswer } from './types.js';
import { uid } from './ids.js';

export type Respondent = 'maman' | 'papa' | 'enseignant' | 'enfant';
export const RESPONDENTS: { key: Respondent; label: string; tint: string }[] = [
  { key: 'maman', label: 'Maman', tint: '#c98a74' },
  { key: 'papa', label: 'Papa', tint: '#6e9fb3' },
  { key: 'enseignant', label: 'Enseignant·e', tint: '#7a9e7e' },
  { key: 'enfant', label: 'Kessy', tint: '#d99c3f' },
];

export const BILAN_SCALE = ['Pas encore', 'Avec beaucoup d’aide', 'Avec un peu d’aide', 'Tout seul'];

export interface BilanDomain { key: string; label: string; }
export const BILAN_DOMAINS: BilanDomain[] = [
  { key: 'communication', label: 'Communication' },
  { key: 'relations', label: 'Relations & jeu' },
  { key: 'autonomie', label: 'Autonomie quotidienne' },
  { key: 'sensoriel', label: 'Sensorialité & régulation' },
  { key: 'motricite', label: 'Motricité' },
  { key: 'apprentissages', label: 'Apprentissages' },
  { key: 'participation', label: 'Participation' },
];
export function bilanDomain(key: string): BilanDomain {
  return BILAN_DOMAINS.find((d) => d.key === key) ?? BILAN_DOMAINS[0];
}

export interface BilanQuestion { id: string; domain: string; text: string; }
export const BILAN_QUESTIONS: BilanQuestion[] = [
  { id: 'com1', domain: 'communication', text: 'Quand il veut quelque chose, il le demande (geste, carte, mot).' },
  { id: 'com2', domain: 'communication', text: 'Il répond quand on l’appelle par son prénom.' },
  { id: 'com3', domain: 'communication', text: 'Il partage un plaisir en vous regardant (montre du doigt, tend un objet).' },
  { id: 'rel1', domain: 'relations', text: 'Il s’intéresse à un autre enfant, l’observe ou s’en approche.' },
  { id: 'rel2', domain: 'relations', text: 'Il attend son tour dans un jeu simple.' },
  { id: 'rel3', domain: 'relations', text: 'Il accepte un jeu à deux, même court.' },
  { id: 'aut1', domain: 'autonomie', text: 'Il mange seul à la cuillère.' },
  { id: 'aut2', domain: 'autonomie', text: 'Il participe à s’habiller (enfile un vêtement).' },
  { id: 'aut3', domain: 'autonomie', text: 'Il se lave les mains en imitant.' },
  { id: 'sen1', domain: 'sensoriel', text: 'Il supporte les bruits du quotidien sans être débordé.' },
  { id: 'sen2', domain: 'sensoriel', text: 'Il retrouve son calme après une contrariété.' },
  { id: 'sen3', domain: 'sensoriel', text: 'Il tolère de nouvelles textures (aliments, matières).' },
  { id: 'mot1', domain: 'motricite', text: 'Il monte et descend un escalier.' },
  { id: 'mot2', domain: 'motricite', text: 'Il tient un crayon et fait des traits.' },
  { id: 'mot3', domain: 'motricite', text: 'Il attrape et lance un ballon.' },
  { id: 'app1', domain: 'apprentissages', text: 'Il associe des objets identiques (paires).' },
  { id: 'app2', domain: 'apprentissages', text: 'Il suit une consigne simple en deux étapes.' },
  { id: 'app3', domain: 'apprentissages', text: 'Il reconnaît des images familières.' },
  { id: 'par1', domain: 'participation', text: 'Il participe à un moment de groupe (chanson, repas).' },
  { id: 'par2', domain: 'participation', text: 'Il reste à une activité proposée quelques minutes.' },
  { id: 'par3', domain: 'participation', text: 'Il suit une routine collective (ranger, se mettre en rang).' },
];
export function questionsOf(domain: string): BilanQuestion[] {
  return BILAN_QUESTIONS.filter((q) => q.domain === domain);
}

// ── Scores ───────────────────────────────────────────────────────────────────
/** Réponses d'un enfant pour une période, indexées par respondent+question. */
function pick(state: AppState, childId: string, period: 'prev' | 'now'): BilanAnswer[] {
  return state.bilanAnswers.filter((a) => a.child_id === childId && a.period === period);
}

/** Score 0..1 d'un domaine pour une période (moyenne des niveaux répondus). */
export function domainScore(answers: BilanAnswer[], domain: string): number | null {
  const qIds = new Set(questionsOf(domain).map((q) => q.id));
  const vals = answers.filter((a) => qIds.has(a.question_id) && typeof a.level === 'number').map((a) => (a.level! - 1) / 3);
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

export interface DomainTrend { domain: string; prev: number | null; now: number | null; }
export function portrait(childId: string, state: AppState): DomainTrend[] {
  const prev = pick(state, childId, 'prev');
  const now = pick(state, childId, 'now');
  return BILAN_DOMAINS.map((d) => ({ domain: d.key, prev: domainScore(prev, d.key), now: domainScore(now, d.key) }));
}
export function trendLabel(t: DomainTrend): string {
  if (t.now === null) return '';
  if (t.prev === null) return t.now >= 0.6 ? 'solide' : 'en chemin';
  const delta = t.now - t.prev;
  if (delta > 0.08) return t.now >= 0.66 ? 'appui 🍃' : 'en chemin ↗';
  if (delta < -0.08) return 'en refresh';
  return t.now >= 0.66 ? 'appui 🍃' : 'stable';
}

/** Combien de questions un regard a renseignées (période « now »). */
export function respondentProgress(childId: string, state: AppState, r: Respondent): number {
  return state.bilanAnswers.filter((a) => a.child_id === childId && a.period === 'now' && a.respondent === r && typeof a.level === 'number').length;
}

export interface Cross { domain: string; kind: 'accord' | 'ecart'; a: number; b: number; }
/** Regards croisés maman ↔ papa : convergences (accord) et écarts qui éclairent. */
export function crossViews(childId: string, state: AppState): Cross[] {
  const now = pick(state, childId, 'now');
  const byR = (r: Respondent) => now.filter((a) => a.respondent === r);
  const out: Cross[] = [];
  for (const d of BILAN_DOMAINS) {
    const a = domainScore(byR('maman'), d.key);
    const b = domainScore(byR('papa'), d.key);
    if (a === null || b === null) continue;
    const diff = Math.abs(a - b);
    if (diff <= 0.12) out.push({ domain: d.key, kind: 'accord', a, b });
    else if (diff >= 0.28) out.push({ domain: d.key, kind: 'ecart', a, b });
  }
  return out;
}

// ── Amorce de démonstration ──────────────────────────────────────────────────
/** Un bilan « avant » (il y a ~3 mois) + un « aujourd'hui » pour Maman, plus un
 * regard Papa partiel : de quoi montrer l'avant/après et les regards croisés. */
export function seedBilanAnswers(childId: string, now = new Date()): BilanAnswer[] {
  const prevAt = new Date(now.getTime() - 92 * 86400000).toISOString();
  const nowAt = new Date(now.getTime() - 2 * 86400000).toISOString();
  const out: BilanAnswer[] = [];
  BILAN_QUESTIONS.forEach((q, i) => {
    const base = 1 + ((i * 7) % 3); // 1..3, réparti
    const prevLvl = Math.min(4, base);
    const nowLvl = Math.min(4, base + (i % 3 === 0 ? 2 : 1)); // progression variable
    out.push({ id: uid(), child_id: childId, respondent: 'maman', period: 'prev', question_id: q.id, level: prevLvl, at: prevAt });
    out.push({ id: uid(), child_id: childId, respondent: 'maman', period: 'now', question_id: q.id, level: nowLvl, at: nowAt });
    // Papa a renseigné les 12 premières, avec un léger écart sur le social/école.
    if (i < 12) {
      const shift = q.domain === 'relations' || q.domain === 'participation' ? -1 : 0;
      out.push({ id: uid(), child_id: childId, respondent: 'papa', period: 'now', question_id: q.id, level: Math.max(1, Math.min(4, nowLvl + shift)), at: nowAt });
    }
  });
  return out;
}
