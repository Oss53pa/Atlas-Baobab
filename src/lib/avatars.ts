/**
 * Système d'Avatars (CDC C02 §C2). CORTEX est le moteur ; l'Avatar est son
 * incarnation côté famille. Toutes les phrases proviennent d'un corpus éditorial
 * validé cliniquement (aucun contenu LLM côté enfant, §C2.5.4).
 *
 * Garde-fous (§C2.5) : l'Avatar ne réclame JAMAIS l'enfant, aucune culpabilisation,
 * aucun compteur d'absence, aucune tristesse simulée. Heureux de le voir, jamais
 * malheureux de ne pas le voir.
 */

export type AvatarKey = 'pousse' | 'luciole' | 'cameleon' | 'tisserin' | 'tortue';
export type AvatarMotion = 'slow' | 'minimal' | 'static';

export interface AvatarDef {
  key: AvatarKey;
  label: string;
  symbol: string;
  suggestedName: string;
  /** Glyphe(s). Pour 'pousse' : 4 stades de croissance. Placeholder des packs illustrés. */
  glyphs: string[];
}

export const AVATARS: readonly AvatarDef[] = [
  { key: 'pousse', label: 'La Pousse de baobab', symbol: 'Grandit avec les progrès', suggestedName: 'Bibo', glyphs: ['🌱', '🌿', '🪴', '🌳'] },
  { key: 'luciole', label: 'La Luciole', symbol: 'La petite lumière qui veille', suggestedName: 'Lila', glyphs: ['✨'] },
  { key: 'cameleon', label: 'Le Caméléon', symbol: "Celui qui s'adapte", suggestedName: 'Kama', glyphs: ['🦎'] },
  { key: 'tisserin', label: "L'Oiseau tisserin", symbol: 'Celui qui construit patiemment', suggestedName: 'Titi', glyphs: ['🐦'] },
  { key: 'tortue', label: 'La Tortue', symbol: 'Chacun son rythme', suggestedName: 'Momo', glyphs: ['🐢'] },
] as const;

export function avatarDef(key: AvatarKey): AvatarDef {
  return AVATARS.find((a) => a.key === key) ?? AVATARS[0];
}

/** Glyphe affiché, en tenant compte du stade de croissance (Pousse uniquement). */
export function avatarGlyph(key: AvatarKey, growthStage = 1): string {
  const def = avatarDef(key);
  if (def.glyphs.length === 1) return def.glyphs[0];
  const idx = Math.min(def.glyphs.length - 1, Math.max(0, growthStage - 1));
  return def.glyphs[idx];
}

/**
 * Stade de croissance (Pousse) dérivé de jalons — ici les réussites loggées
 * comme proxy du Bilan 360 (§C2.6 : jamais lié au temps d'écran ni à l'assiduité).
 * Déterministe, borné 1..4, jamais décrémenté dans l'usage (monotone par construction
 * puisque le nombre de réussites ne décroît pas).
 */
export function computeGrowthStage(milestoneCount: number): number {
  return Math.min(4, 1 + Math.floor(milestoneCount / 2));
}

/** Nom affiché : nom personnalisé s'il existe, sinon nom suggéré. */
export function avatarDisplayName(key: AvatarKey, customName?: string | null): string {
  return customName && customName.trim() ? customName.trim() : avatarDef(key).suggestedName;
}

/** Validation du nom (§C2.3) : 2 à 12 caractères, lettres et espaces uniquement. */
export function isValidAvatarName(name: string): boolean {
  const n = name.trim();
  return n.length >= 2 && n.length <= 12 && /^[\p{L} ]+$/u.test(n);
}

/**
 * Corpus éditorial de l'Avatar (§C2.5.4). Registre côté enfant : accueil,
 * transition, apaisement, encouragement sobre. AUCUNE phrase de réclamation
 * ou de culpabilisation.
 */
export const AVATAR_LINES: Record<'open' | 'close' | 'calm' | 'success', string[]> = {
  open: ['Content de te voir !', 'On est bien, ici.', 'Prêt quand tu veux.'],
  close: ['On a passé un bon moment.', 'À bientôt, prends soin de toi.', "C'est l'heure de fermer, tout doux."],
  calm: ['On respire ensemble…', 'Je suis là, tout près.', 'Doucement, ça va aller.'],
  success: ['Bravo !', 'Bien joué.', 'Tu as réussi.'],
};

/** Sélection déterministe d'une ligne (par index), pour éviter toute génération. */
export function avatarLine(kind: keyof typeof AVATAR_LINES, seed = 0): string {
  const arr = AVATAR_LINES[kind];
  return arr[Math.abs(seed) % arr.length];
}
