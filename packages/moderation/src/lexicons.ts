/**
 * Lexiques de modération VERSIONNÉS (CDC C01 §B4 : "lexiques dédiés versionnés,
 * enrichis par les modérateurs"). Couverture multilingue réelle : français
 * standard, français ivoirien, nouchi. Un filtre calibré sur le seul français
 * standard est un no-go (§C5.8).
 *
 * Toute modification incrémente LEXICON_VERSION.
 */

export const LEXICON_VERSION = 'mod-1.0.0';

export type DangerCategory = 'fake_cure' | 'dangerous_substance' | 'occult_cure' | 'dangerous_medical';

export interface DangerRule {
  category: DangerCategory;
  /** Regex appliquée sur le texte NORMALISÉ (minuscules, sans accents). */
  pattern: RegExp;
  /** Étiquette lisible (raison de mise en quarantaine). */
  label: string;
}

/**
 * Règles de contenus interdits : promotion de "cures"/traitements non fondés.
 * Interdiction absolue et définitive (§B4). Un contenu qui matche part en
 * quarantaine et n'est JAMAIS visible publiquement.
 */
// Connecteur permissif entre deux mots-clés (mots intermédiaires, ponctuation).
// Volontairement large : en cas de doute on met en QUARANTAINE (relecture humaine),
// jamais de suppression automatique (§B4).
const GAP = "[\\sa-z0-9',.\\-]{0,28}";
const g = (a: string, b: string) => new RegExp(`(${a})${GAP}(${b})`);

export const DANGER_RULES: DangerRule[] = [
  // "guérir l'autisme" / "guérison de l'autisme" (fr standard) + ordre inverse
  { category: 'fake_cure', label: 'promesse de guérison de l’autisme', pattern: g('gueri(?:r|son|t|e)', 'autis') },
  { category: 'fake_cure', label: 'promesse de guérison de l’autisme', pattern: g('autis', 'gueri(?:r|son|t|e)') },
  { category: 'fake_cure', label: 'remède/solution miracle', pattern: g('remede|solution|traitement|cure|potion|decoction', 'miracle') },
  { category: 'fake_cure', label: 'remède/solution miracle', pattern: g('miracle', 'remede|solution|traitement|cure|potion') },
  // Substances dangereuses
  { category: 'dangerous_substance', label: 'substance dangereuse (javel/MMS)', pattern: /\bmms\b|eau de javel|\bjavel\b|chlorite|dioxyde de chlore/ },
  { category: 'dangerous_medical', label: 'protocole médical dangereux', pattern: /chelation|chelateur|chelat/ },
  // Cures occultes (fr ivoirien / nouchi) : féticheur/marabout qui "soigne/guérit"
  { category: 'occult_cure', label: 'cure occulte (marabout/féticheur)', pattern: g('marabout|feticheur|feti[ck]e|envoutement|sorcier', 'gueri|soigne|enleve|delivre') },
  { category: 'occult_cure', label: 'cure occulte (marabout/féticheur)', pattern: g('gueri|soigne|delivre', 'marabout|feticheur|feti[ck]e|sorcier') },
  // Nouchi : "cette plante soigne l'autisme"
  { category: 'fake_cure', label: 'plante/décoction présentée comme cure', pattern: g('plante|racine|ecorce|feuille|the', 'gueri|soigne') },
];

/** Motifs de données personnelles identifiantes à masquer (§B4). */
export interface PiiRule {
  kind: 'phone' | 'email' | 'url';
  pattern: RegExp;
  replacement: string;
}

export const PII_RULES: PiiRule[] = [
  // Téléphones ivoiriens (+225 + 10 chiffres) ou suites de 8+ chiffres espacés.
  { kind: 'phone', pattern: /(\+?225[\s.\-]?)?(\d[\s.\-]?){8,}\d/g, replacement: '[numéro masqué]' },
  { kind: 'email', pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: '[email masqué]' },
  { kind: 'url', pattern: /\b(?:https?:\/\/|www\.)\S+/gi, replacement: '[lien masqué]' },
];
