/**
 * Catalogue des jeux sondes (CDC Jeux & Activités v1.0 §2). Chaque jeu garde sa
 * mécanique unique ; CORTEX choisit lesquels présenter sur la « natte » selon le
 * positionnement par domaine. `available` = mécanique réellement implémentée
 * (les autres arrivent — jamais verrouillées par la performance, §0.5).
 */

import { childPaliers, dominantPalier, GAME_DOMAINS, type GameDomain } from './paliers.js';
import type { AppState } from './types.js';

export interface GameDef {
  code: string;
  title: string;
  picto: string;
  domains: GameDomain[];
  available: boolean;
}

export const GAMES: GameDef[] = [
  { code: 'memory_visual', title: 'Les Paires', picto: '🃏', domains: GAME_DOMAINS.memory_visual, available: true },
  { code: 'suite', title: 'La Suite', picto: '🔁', domains: GAME_DOMAINS.suite, available: true },
  { code: 'tambour', title: 'Le Tambour', picto: '🥁', domains: GAME_DOMAINS.tambour, available: true },
  { code: 'maison', title: 'Chacun sa maison', picto: '🏠', domains: GAME_DOMAINS.maison, available: true },
  { code: 'combien', title: 'Combien ?', picto: '🔢', domains: GAME_DOMAINS.combien, available: true },
  { code: 'chemin', title: 'Le Chemin', picto: '✏️', domains: GAME_DOMAINS.chemin, available: true },
  { code: 'regarde', title: 'Regarde !', picto: '👀', domains: GAME_DOMAINS.regarde, available: true },
];

export function gameByCode(code: string): GameDef | undefined {
  return GAMES.find((g) => g.code === code);
}

/**
 * Sélection de la natte (§1) : 2 cartes au palier P1, 3 dès P2. On ne propose que
 * des jeux disponibles, ordonnés pour varier les domaines sondés (jamais deux fois
 * le même domaine en tête si on peut l'éviter).
 */
export function pickGamesForChild(childId: string, state: AppState): GameDef[] {
  const available = GAMES.filter((g) => g.available);
  const nCards = dominantPalier(childId, state) === 'P1' ? 2 : 3;
  const paliers = childPaliers(childId, state);
  // Ordre : domaine le plus consolidé d'abord (repère stable, sans hasard).
  const order = ['P4', 'P3', 'P2', 'P1'];
  const ranked = [...available].sort((a, b) => {
    const pa = order.indexOf(paliers[a.domains[0]] ?? 'P1');
    const pb = order.indexOf(paliers[b.domains[0]] ?? 'P1');
    return pa - pb;
  });
  // Diversité de domaine en tête.
  const picked: GameDef[] = [];
  const seen = new Set<GameDomain>();
  for (const g of ranked) {
    if (picked.length >= nCards) break;
    if (seen.has(g.domains[0]) && ranked.length > nCards) continue;
    picked.push(g); seen.add(g.domains[0]);
  }
  for (const g of ranked) { if (picked.length >= nCards) break; if (!picked.includes(g)) picked.push(g); }
  return picked;
}
