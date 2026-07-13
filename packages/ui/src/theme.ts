/** Métadonnées des 5 thèmes enfant clairs (CDC §9.2) + suggestion par le Jumeau.
 * Le Jumeau SUGGÈRE, le parent DÉCIDE (§9.2) — aucune application automatique. */

export type ChildThemeKey = 'savane' | 'lagune' | 'coton' | 'terre' | 'brume';

export interface ChildTheme {
  key: ChildThemeKey;
  label: string;
  note: string;
  badge: string;
  /** Aperçu (primaire/secondaire/fond) pour le sélecteur. */
  swatch: { bg: string; primary: string; secondary: string };
}

export const CHILD_THEMES: readonly ChildTheme[] = [
  {
    key: 'savane',
    label: 'Savane douce',
    note: 'Sable, vert sauge, ocre karité. Ancrage africain, chaleur, calme.',
    badge: 'Défaut',
    swatch: { bg: '#f7f3ec', primary: '#7a9e7e', secondary: '#d9a66c' },
  },
  {
    key: 'lagune',
    label: 'Lagune calme',
    note: 'Bleu-gris et vert d’eau, les tons les plus documentés comme apaisants.',
    badge: 'Apaisement max',
    swatch: { bg: '#eef4f5', primary: '#6e9fb3', secondary: '#a3c9bc' },
  },
  {
    key: 'coton',
    label: 'Coton lavande',
    note: 'Gris chaud et lavande désaturée. Très basse stimulation.',
    badge: 'Hypersensibles',
    swatch: { bg: '#f4f2f5', primary: '#9b8fb0', secondary: '#b8afa3' },
  },
  {
    key: 'terre',
    label: 'Terre douce',
    note: 'Terracotta désaturé, rose poudré, sauge. Chaleur enveloppante.',
    badge: 'Chaleur',
    swatch: { bg: '#f9f1ec', primary: '#c98a74', secondary: '#e5c3b3' },
  },
  {
    key: 'brume',
    label: 'Brume verte',
    note: 'Eucalyptus, vert brume, sable clair. Fraîcheur végétale.',
    badge: 'Nature',
    swatch: { bg: '#f1f5ee', primary: '#84a98c', secondary: '#b5c9a8' },
  },
] as const;

export const DEFAULT_CHILD_THEME: ChildThemeKey = 'savane';

/** Signal sensoriel minimal attendu (compatible SensoryChannelProfile du Jumeau). */
export interface SensoryHint {
  channel: string;
  classification: string;
  confidence: string;
}

/**
 * Suggestion de thème à partir du profil sensoriel (déterministe, §9.2).
 * Hyper-réactivité visuelle/auditive marquée -> très basse stimulation (coton),
 * puis apaisement max (lagune). Sinon défaut chaleureux (savane).
 * Renvoie aussi une justification affichable au parent (transparence).
 */
export function suggestChildTheme(channels: SensoryHint[]): {
  theme: ChildThemeKey;
  reason: string;
} {
  const strong = (ch: string) =>
    channels.some(
      (c) =>
        c.channel === ch &&
        c.classification === 'hyper' &&
        (c.confidence === 'moyen' || c.confidence === 'fort'),
    );
  const visualHyper = strong('visual');
  const auditoryHyper = strong('auditory');

  if (visualHyper && auditoryHyper) {
    return {
      theme: 'coton',
      reason:
        'Hyper-réactivité visuelle et auditive détectées : thème à très basse stimulation.',
    };
  }
  if (visualHyper || auditoryHyper) {
    return {
      theme: 'lagune',
      reason: `Hyper-réactivité ${visualHyper ? 'visuelle' : 'auditive'} détectée : tons apaisants documentés.`,
    };
  }
  return {
    theme: 'savane',
    reason: 'Pas de signal sensoriel fort : thème chaleureux par défaut.',
  };
}
