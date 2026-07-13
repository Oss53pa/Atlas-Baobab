import { useState } from 'react';
import { Home } from 'lucide-react';
import { activeChild, useAppState } from '../../lib/store.js';
import { childPaliers, childRegistre, registreCopy, palierStartLevel, GAME_DOMAINS, type GameDomain } from '../../lib/paliers.js';
import { pickGamesForChild } from '../../lib/games.js';
import { speak } from '../../lib/tts.js';
import { GameMemory } from './GameMemory.js';
import { GameSuite } from './games/GameSuite.js';
import { GameTambour } from './games/GameTambour.js';
import { GameMaison } from './games/GameMaison.js';
import { GameCombien } from './games/GameCombien.js';
import { GameChemin } from './games/GameChemin.js';
import { GameRegarde } from './games/GameRegarde.js';
import type { GameProps } from './games/gameKit.js';

/**
 * La « natte » (CDC Jeux & Activités v1.0 §1) : 2 à 3 grands choix de jeux,
 * choisis par CORTEX selon le positionnement par domaine. Aucun palier ni niveau
 * n'est montré à l'enfant. Le jeu lancé démarre à une difficulté adaptée au palier.
 */
const GAME_COMPONENTS: Record<string, (p: GameProps) => JSX.Element> = {
  memory_visual: GameMemory,
  suite: GameSuite,
  tambour: GameTambour,
  maison: GameMaison,
  combien: GameCombien,
  chemin: GameChemin,
  regarde: GameRegarde,
};
// Domaine sondé de référence, pour le niveau de départ de chaque jeu.
const GAME_MAIN_DOMAIN: Record<string, GameDomain> = {
  memory_visual: GAME_DOMAINS.memory_visual[0],
  suite: GAME_DOMAINS.suite[0],
  tambour: GAME_DOMAINS.tambour[0],
  maison: GAME_DOMAINS.maison[0],
  combien: GAME_DOMAINS.combien[0],
  chemin: GAME_DOMAINS.chemin[0],
  regarde: GAME_DOMAINS.regarde[0],
};

export function JouerHub({ onExit, onBulle }: { onExit: () => void; onBulle?: () => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const [playing, setPlaying] = useState<string | null>(null);

  if (!child) return null;
  const paliers = childPaliers(child.id, state);
  const registre = childRegistre(child.id, state);
  const games = pickGamesForChild(child.id, state);

  if (playing) {
    const Comp = GAME_COMPONENTS[playing];
    if (Comp) {
      const dom = GAME_MAIN_DOMAIN[playing] ?? 'attention';
      return <Comp startLevel={palierStartLevel(paliers[dom])} onExit={() => setPlaying(null)} onBulle={onBulle} />;
    }
  }

  return (
    <div className="cs-natte" data-theme={child.active_theme}>
      <button className="cs-natte-home" onClick={onExit} aria-label="Retour au monde"><Home size={26} /></button>
      <h2 className="cs-natte-title">{registreCopy(registre).play}</h2>
      <div className="cs-natte-grid" data-n={games.length}>
        {games.map((g) => (
          <button key={g.code} className="cs-natte-card" onClick={() => { speak(g.title); setPlaying(g.code); }}>
            <span className="cs-natte-pic">{g.picto}</span>
            <span className="cs-natte-name">{g.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
