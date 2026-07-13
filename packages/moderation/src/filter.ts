import { DANGER_RULES, PII_RULES, LEXICON_VERSION, type DangerCategory } from './lexicons.js';

export type ModerationStatus = 'published' | 'quarantined';

export interface ModerationResult {
  status: ModerationStatus;
  /** Texte avec données personnelles masquées (affiché si publié). */
  masked: string;
  /** Catégories de danger détectées (vide si publié). */
  dangers: DangerCategory[];
  /** Raisons lisibles (mises en quarantaine ET masquages PII). */
  reasons: string[];
  lexicon_version: string;
}

/** Normalisation pour l'appariement : minuscules + suppression des accents. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Échappe une chaîne pour un usage littéral dans une regex. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Filtre de modération pré-publication (CDC C01 §B4). Déterministe, aucun LLM.
 * - Masque les données personnelles identifiantes (téléphones, emails, liens,
 *   prénoms d'enfants fournis).
 * - Met en QUARANTAINE tout contenu promouvant une cure/traitement non fondé
 *   (multilingue : fr standard, ivoirien, nouchi). Un contenu en quarantaine
 *   n'est jamais rendu public par l'appelant.
 */
export function moderateContent(
  text: string,
  opts: { childNames?: string[] } = {},
): ModerationResult {
  const reasons: string[] = [];

  // 1) Masquage PII sur le texte affichable
  let masked = text;
  for (const rule of PII_RULES) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(masked)) {
      rule.pattern.lastIndex = 0;
      masked = masked.replace(rule.pattern, rule.replacement);
      reasons.push(`pii:${rule.kind}`);
    }
  }
  // Prénoms d'enfants (aucun nom d'enfant dans les espaces publics, §B2)
  for (const name of opts.childNames ?? []) {
    const n = name.trim();
    if (n.length < 2) continue;
    const re = new RegExp(`\\b${escapeRegExp(n)}\\b`, 'gi');
    if (re.test(masked)) {
      masked = masked.replace(re, '[prénom masqué]');
      reasons.push('pii:child_name');
    }
  }

  // 2) Détection de contenus interdits sur le texte normalisé
  const norm = normalize(text);
  const dangers: DangerCategory[] = [];
  for (const rule of DANGER_RULES) {
    if (rule.pattern.test(norm)) {
      if (!dangers.includes(rule.category)) dangers.push(rule.category);
      reasons.push(`danger:${rule.category}`);
    }
  }

  return {
    status: dangers.length > 0 ? 'quarantined' : 'published',
    masked,
    dangers,
    reasons: [...new Set(reasons)],
    lexicon_version: LEXICON_VERSION,
  };
}
