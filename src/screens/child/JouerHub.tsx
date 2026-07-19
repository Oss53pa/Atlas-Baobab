import { useEffect, useState, type CSSProperties } from 'react';
import { Home } from 'lucide-react';
import { activeChild, actions, gameLevelFor, useAppState } from '../../lib/store.js';
import { playChildSound, haptic } from '../../lib/childAudio.js';
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
import { GameAssociation } from './games/GameAssociation.js';
import { GameSequenceur } from './games/GameSequenceur.js';
import { GamePuzzle } from './games/GamePuzzle.js';
import { GameEmotions } from './games/GameEmotions.js';
import { GameChasse } from './games/GameChasse.js';
import type { GameProps } from './games/gameKit.js';

/**
 * La « natte » (CDC Jeux & Activités v1.0 §1) : 2 à 3 grands choix de jeux,
 * choisis par CORTEX selon le positionnement par domaine. Aucun palier ni niveau
 * n'est montré à l'enfant. Le jeu lancé démarre à une difficulté adaptée au palier.
 */
// Teintes ludiques par carte (les jeux ont droit à la couleur, moins strict que l'UI).
const GAME_TINTS = ['#7a9e7e', '#d99c3f', '#c46a5a', '#6e9fb3', '#9b8fb0'];

const GAME_COMPONENTS: Record<string, (p: GameProps) => JSX.Element> = {
  memory_visual: GameMemory,
  suite: GameSuite,
  tambour: GameTambour,
  maison: GameMaison,
  combien: GameCombien,
  chemin: GameChemin,
  regarde: GameRegarde,
  association: GameAssociation,
  sequenceur: GameSequenceur,
  puzzle: GamePuzzle,
  emotions: GameEmotions,
  chasse: GameChasse,
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
  association: GAME_DOMAINS.association[0],
  sequenceur: GAME_DOMAINS.sequenceur[0],
  puzzle: GAME_DOMAINS.puzzle[0],
  emotions: GAME_DOMAINS.emotions[0],
  chasse: GAME_DOMAINS.chasse[0],
};

export function JouerHub({ onExit, onBulle }: { onExit: () => void; onBulle?: () => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const [playing, setPlaying] = useState<string | null>(null);

  // §6.1 : au retour sur la natte (fin de jeu), Bibo annonce un passage de niveau.
  useEffect(() => {
    if (playing || !state.lastLevelUp) return;
    playChildSound('victory');
    if (child) haptic(20);
    speak('Bravo ! Tu es prêt pour plus difficile !');
    actions.clearLevelUp();
  }, [playing, state.lastLevelUp]);

  if (!child) return null;
  const paliers = childPaliers(child.id, state);
  const registre = childRegistre(child.id, state);
  const games = pickGamesForChild(child.id, state);

  if (playing) {
    const Comp = GAME_COMPONENTS[playing];
    if (Comp) {
      const dom = GAME_MAIN_DOMAIN[playing] ?? 'attention';
      // Difficulté adaptative (§6.1) : palier de base + niveau N1/N2/N3 de l'activité.
      const startLevel = palierStartLevel(paliers[dom]) + (gameLevelFor(child.id, playing) - 1);
      return <Comp startLevel={startLevel} onExit={() => setPlaying(null)} onBulle={onBulle} />;
    }
  }

  return (
    <div className="cs-natte" data-theme={child.active_theme}>
      <button className="cs-natte-home" onClick={onExit} aria-label="Retour au monde"><Home size={26} /></button>
      <div className="cs-natte-hero">
        <img className="cs-natte-bibo bibo-alive" src="/avatars/bibo.webp" alt="" />
        <h2 className="cs-natte-title">{registreCopy(registre).play}</h2>
        <p className="cs-natte-sub">Choisis un jeu, on y va ensemble.</p>
      </div>
      <div className="cs-natte-mat">
        <div className="cs-natte-grid" data-n={games.length}>
          {games.map((g, i) => (
            <button key={g.code} className="cs-natte-card" style={{ '--gi': GAME_TINTS[i % GAME_TINTS.length] } as CSSProperties} onClick={() => { speak(g.title); setPlaying(g.code); }}>
              <span className="cs-natte-pic">{g.picto}</span>
              <span className="cs-natte-name">{g.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
