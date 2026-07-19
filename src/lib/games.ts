/**
 * Catalogue des jeux sondes (CDC Jeux & Activités v1.0 §2). Chaque jeu garde sa
 * mécanique unique ; CORTEX choisit lesquels présenter sur la « natte » selon le
 * positionnement par domaine. `available` = mécanique réellement implémentée
 * (les autres arrivent — jamais verrouillées par la performance, §0.5).
 */

import { childPaliers, dominantPalier, GAME_DOMAINS, type GameDomain } from './paliers.js';
import { cdcAgeBand, type AgeBand } from './childProfileConfig.js';
import type { AppState } from './types.js';

export interface GameDef {
  code: string;
  title: string;
  picto: string;
  domains: GameDomain[];
  available: boolean;
  /** Tranches d'âge où le jeu est proposé (CDC Mode Enfant v1.1 §6.4).
   * ⚠️ Intérim : seuls les gates EXPLICITES du tableau §6.3 sont posés
   * (Émotions : pas avant 5-7). Le reste ouvert à toutes les bandes en
   * attendant la confirmation du mapping code↔activité (voir note P5). */
  ageBands: AgeBand[];
}

const ALL_BANDS: AgeBand[] = ['2-4', '5-7', '8-12'];

export const GAMES: GameDef[] = [
  { code: 'memory_visual', title: 'Les Paires', picto: '🃏', domains: GAME_DOMAINS.memory_visual, available: true, ageBands: ALL_BANDS },
  { code: 'suite', title: 'La Suite', picto: '🔁', domains: GAME_DOMAINS.suite, available: true, ageBands: ALL_BANDS },
  { code: 'tambour', title: 'Le Tambour', picto: '🥁', domains: GAME_DOMAINS.tambour, available: true, ageBands: ALL_BANDS },
  { code: 'maison', title: 'Chacun sa maison', picto: '🏠', domains: GAME_DOMAINS.maison, available: true, ageBands: ALL_BANDS },
  { code: 'combien', title: 'Combien ?', picto: '🔢', domains: GAME_DOMAINS.combien, available: true, ageBands: ALL_BANDS },
  { code: 'chemin', title: 'Le Chemin', picto: '✏️', domains: GAME_DOMAINS.chemin, available: true, ageBands: ALL_BANDS },
  { code: 'regarde', title: 'Regarde !', picto: '👀', domains: GAME_DOMAINS.regarde, available: true, ageBands: ALL_BANDS },
  { code: 'association', title: 'Association apaisée', picto: '🍃', domains: GAME_DOMAINS.association, available: true, ageBands: ALL_BANDS },
  { code: 'sequenceur', title: 'Le Séquenceur', picto: '🔢', domains: GAME_DOMAINS.sequenceur, available: true, ageBands: ALL_BANDS },
  { code: 'puzzle', title: 'Puzzle calme', picto: '🧩', domains: GAME_DOMAINS.puzzle, available: true, ageBands: ALL_BANDS },
  { code: 'emotions', title: 'Les émotions', picto: '😌', domains: GAME_DOMAINS.emotions, available: true, ageBands: ['5-7', '8-12'] },
  { code: 'chasse', title: 'Chasse à l’objet', picto: '🔍', domains: GAME_DOMAINS.chasse, available: true, ageBands: ['2-4', '5-7'] },
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
  const child = state.children.find((c) => c.id === childId);
  const band = child ? cdcAgeBand(child.birth_date) : '5-7';
  // §6.4 : ne proposer que les activités de la tranche d'âge de l'enfant.
  const available = GAMES.filter((g) => g.available && g.ageBands.includes(band));
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
