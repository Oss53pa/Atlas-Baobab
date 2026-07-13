import type { AacBoard, AacCard } from './types.js';

/**
 * Pack CAA de base (CDC §E4). Le vrai pack v1 = 800 pictos dessinés pour le
 * contexte ivoirien ; ici un noyau représentatif (emoji) avec vocabulaire
 * culturel (attiéké, alloco, taxi, maquis...). La CAA est sanctuarisée :
 * gratuite, offline, jamais quotée. La stabilité motrice prime : les positions
 * ne changent pas automatiquement (§E4).
 */

interface CardSeed {
  label: string;
  picto: string;
  category: string;
}

const SEEDS: CardSeed[] = [
  // Besoins essentiels
  { label: 'Je veux', picto: '🙋', category: 'base' },
  { label: 'Encore', picto: '➕', category: 'base' },
  { label: 'Fini', picto: '✅', category: 'base' },
  { label: 'Oui', picto: '👍', category: 'base' },
  { label: 'Non', picto: '👎', category: 'base' },
  { label: 'Aide', picto: '🆘', category: 'base' },
  // Manger / boire (contexte local)
  { label: 'Manger', picto: '🍚', category: 'repas' },
  { label: 'Boire', picto: '💧', category: 'repas' },
  { label: 'Attiéké', picto: '🍲', category: 'repas' },
  { label: 'Alloco', picto: '🍌', category: 'repas' },
  { label: 'Mangue', picto: '🥭', category: 'repas' },
  { label: 'Eau', picto: '🚰', category: 'repas' },
  // Émotions
  { label: 'Content', picto: '😀', category: 'emotions' },
  { label: 'Triste', picto: '😢', category: 'emotions' },
  { label: 'Fâché', picto: '😠', category: 'emotions' },
  { label: 'Peur', picto: '😨', category: 'emotions' },
  { label: 'Fatigué', picto: '😴', category: 'emotions' },
  { label: 'Mal', picto: '🤕', category: 'emotions' },
  // Personnes
  { label: 'Maman', picto: '👩🏾', category: 'personnes' },
  { label: 'Papa', picto: '👨🏾', category: 'personnes' },
  { label: 'Câlin', picto: '🤗', category: 'personnes' },
  // Lieux / activités
  { label: 'Maison', picto: '🏠', category: 'lieux' },
  { label: 'École', picto: '🏫', category: 'lieux' },
  { label: 'Taxi', picto: '🚕', category: 'lieux' },
  { label: 'Dehors', picto: '🌳', category: 'lieux' },
  { label: 'Jouer', picto: '⚽', category: 'lieux' },
  { label: 'Toilette', picto: '🚽', category: 'lieux' },
  { label: 'Dormir', picto: '🛏️', category: 'lieux' },
];

export function defaultBoard(): AacBoard {
  const cards: AacCard[] = SEEDS.map((s, i) => ({
    id: `card-${i}-${s.label}`,
    label: s.label,
    picto: s.picto,
    category: s.category,
  }));
  return { rows: 4, cols: 4, cards };
}

export const AAC_CATEGORIES: { key: string; label: string }[] = [
  { key: 'base', label: 'Essentiel' },
  { key: 'repas', label: 'Repas' },
  { key: 'emotions', label: 'Émotions' },
  { key: 'personnes', label: 'Personnes' },
  { key: 'lieux', label: 'Lieux' },
];
export function categoryLabel(key: string): string {
  return AAC_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
/** Catégorie d'une carte à partir de son libellé (pour la trajectoire CAA CX-01). */
export function cardCategory(label: string): string {
  return SEEDS.find((s) => s.label === label)?.category ?? 'base';
}
