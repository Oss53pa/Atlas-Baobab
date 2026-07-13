import { uid } from './ids.js';
import type { ForumPost, ForumThread } from './types.js';

/** Forums thématiques (CDC C01 §B2), croisés avec des tranches d'âge. Gratuits à vie. */
export interface Forum {
  id: string;
  title: string;
  emoji: string;
  age_band?: string;
}

export const FORUMS: Forum[] = [
  { id: 'scolarite', title: 'Scolarité & école', emoji: '🏫' },
  { id: 'alimentation', title: 'Alimentation', emoji: '🍚' },
  { id: 'sommeil', title: 'Sommeil', emoji: '😴' },
  { id: 'crises', title: 'Crises & régulation', emoji: '🌀' },
  { id: 'ado', title: 'Adolescence', emoji: '🧑🏾', age_band: '13-18' },
  { id: 'demarches', title: 'Démarches administratives', emoji: '📄' },
];

export const CHARTER_VERSION = 'charte-1.0';

export const CHARTER_TEXT = [
  'Bienvenue. Ici on partage son expérience avec respect et bienveillance.',
  'Pseudonyme obligatoire. Aucune photo d’enfant, aucun nom d’enfant, aucun numéro : ils sont masqués automatiquement.',
  'Interdiction absolue de promouvoir des « cures » ou traitements non fondés : ces messages sont mis de côté avant toute lecture.',
  'Pas de messagerie privée. Pour être accompagné, passez par le parrainage encadré.',
  'Un signalement suffit pour alerter la modération.',
];

const HANDLES = ['Baobab', 'Karité', 'Lagune', 'Sahel', 'Colombe', 'Wax', 'Hibiscus', 'Kola', 'Zébu', 'Manguier'];

/** Pseudonyme chaleureux, non identifiant (lien compte/pseudo invisible, §B2). */
export function makePseudonym(seed: number): string {
  const h = HANDLES[Math.abs(seed) % HANDLES.length];
  const n = 10 + (Math.abs(seed * 7) % 89);
  return `${h}_${n}`;
}

export function seedForums(): { threads: ForumThread[]; posts: ForumPost[] } {
  const t = (forum_id: string, pseudonym: string, title: string, body: string, helped: number, daysAgo: number): ForumThread => ({
    id: uid(), forum_id, pseudonym, title, body, is_anonymous: false,
    helped_count: helped, status: 'published',
    created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(), own: false,
  });

  const threads: ForumThread[] = [
    t('crises', 'Karité_23', 'Crises au retour de l’école', "Chaque jour vers 17h c’est la crise. J’ai commencé à préparer un coin calme et à réduire le bruit en rentrant, ça aide un peu. Vos astuces ?", 12, 3),
    t('alimentation', 'Lagune_41', 'Refuse tout sauf le riz blanc', "Mon fils ne mange presque que du riz. On introduit très lentement l’attiéké à côté, sans forcer. Patience…", 8, 6),
    t('scolarite', 'Baobab_15', 'Fiche pour la maîtresse', "J’ai fait une petite fiche « comment fonctionne mon enfant » pour l’école, ça a changé les choses. Je recommande.", 21, 10),
    t('sommeil', 'Colombe_58', 'Rituel du soir', "Même ordre chaque soir : bain, histoire, lumière douce. La régularité l’a beaucoup apaisé.", 15, 8),
  ];

  const first = threads[0];
  const posts: ForumPost[] = [
    { id: uid(), thread_id: first.id, pseudonym: 'Sahel_33', body: "Pareil ici. Un objet rassurant dans le sac aide beaucoup au moment du retour.", helped_count: 5, status: 'published', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), own: false },
    { id: uid(), thread_id: first.id, pseudonym: 'Wax_77', body: "Nous, on annonce la transition 10 min avant. Moins de surprise, moins de crise.", helped_count: 3, status: 'published', created_at: new Date(Date.now() - 1 * 86400000).toISOString(), own: false },
  ];

  return { threads, posts };
}
