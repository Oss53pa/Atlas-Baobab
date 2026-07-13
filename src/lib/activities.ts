/**
 * Catalogue d'activités & acquis (CDC : module Activités + proxy Bilan 360).
 *
 * Idée : au-delà de l'humeur, on trace ce que l'enfant FAIT et ce qu'il ACQUIERT.
 * Chaque activité vise une compétence dans un domaine du développement. On note
 * une séance sur une échelle d'acquisition à 4 crans (« pas encore » → « acquis »).
 * Le suivi des acquis est purement déterministe (aucune IA), calculé à partir des
 * séances enregistrées. Contenu de démonstration adapté au contexte ivoirien ;
 * la grille clinique fine reste un livrable du partenariat (CDC §8, §14).
 */

export type ActivityDomainKey = 'communication' | 'motricite' | 'autonomie' | 'social' | 'cognition' | 'sensoriel';

export interface ActivityDomain {
  key: ActivityDomainKey;
  label: string;
  /** Nom d'icône lucide utilisé côté écran. */
  icon: string;
  tint: string;
}

export interface Activity {
  id: string;
  domain: ActivityDomainKey;
  /** La compétence visée, formulée simplement. */
  label: string;
  example: string;
}

/** Échelle d'acquisition à 4 crans (1 = pas encore … 4 = acquis). */
export const ACQ_LEVELS: { level: number; label: string; short: string; tint: string }[] = [
  { level: 1, label: 'Pas encore', short: 'Pas encore', tint: '#c46a5a' },
  { level: 2, label: 'Avec de l’aide', short: 'Avec aide', tint: '#d9a66c' },
  { level: 3, label: 'Presque seul', short: 'Presque', tint: '#d99c3f' },
  { level: 4, label: 'Acquis, tout seul', short: 'Acquis', tint: '#7a9e7e' },
];
export function acqLevel(level: number) {
  return ACQ_LEVELS.find((l) => l.level === level) ?? ACQ_LEVELS[0];
}

export const DOMAINS: ActivityDomain[] = [
  { key: 'communication', label: 'Communication', icon: 'MessagesSquare', tint: '#7a9e7e' },
  { key: 'motricite', label: 'Motricité', icon: 'PersonStanding', tint: '#6e9fb3' },
  { key: 'autonomie', label: 'Autonomie', icon: 'Utensils', tint: '#c98a74' },
  { key: 'social', label: 'Social & émotions', icon: 'Users', tint: '#9b8fb0' },
  { key: 'cognition', label: 'Cognition & jeu', icon: 'Puzzle', tint: '#84a98c' },
  { key: 'sensoriel', label: 'Régulation sensorielle', icon: 'Hand', tint: '#8a9bb0' },
];
export function domainOf(key: ActivityDomainKey) {
  return DOMAINS.find((d) => d.key === key) ?? DOMAINS[0];
}

export const ACTIVITIES: Activity[] = [
  // Communication
  { id: 'com-point', domain: 'communication', label: 'Montrer du doigt ce qu’il veut', example: 'Il pointe un objet hors de portée au lieu de pleurer.' },
  { id: 'com-name', domain: 'communication', label: 'Répondre à son prénom', example: 'Il tourne la tête quand on l’appelle.' },
  { id: 'com-choice', domain: 'communication', label: 'Faire un choix entre deux images', example: 'Il désigne l’eau ou le jus (pictos / objets).' },
  { id: 'com-ask', domain: 'communication', label: 'Demander avec un mot ou un picto', example: 'Il dit « encore » ou montre la carte pour redemander.' },
  // Motricité
  { id: 'mot-stack', domain: 'motricite', label: 'Empiler des cubes', example: 'Il pose 3 à 5 cubes l’un sur l’autre.' },
  { id: 'mot-ball', domain: 'motricite', label: 'Attraper et lancer un ballon', example: 'Il attrape à deux mains et relance.' },
  { id: 'mot-draw', domain: 'motricite', label: 'Tenir un crayon et gribouiller', example: 'Il fait des traits sur une feuille.' },
  { id: 'mot-jump', domain: 'motricite', label: 'Sauter à pieds joints', example: 'Il saute par-dessus une ligne au sol.' },
  // Autonomie
  { id: 'aut-shoes', domain: 'autonomie', label: 'Mettre ses chaussures', example: 'Il enfile ses sandales, même sans les fermer.' },
  { id: 'aut-eat', domain: 'autonomie', label: 'Manger seul à la cuillère', example: 'Il porte la cuillère à la bouche sans aide.' },
  { id: 'aut-wash', domain: 'autonomie', label: 'Se laver les mains', example: 'Il mouille, savonne et rince en imitant.' },
  { id: 'aut-tidy', domain: 'autonomie', label: 'Ranger ses jouets', example: 'Il remet les objets dans la caisse à la demande.' },
  // Social
  { id: 'soc-eye', domain: 'social', label: 'Regarder dans les yeux pendant un jeu', example: 'Coucou-caché, chatouilles : il cherche votre regard.' },
  { id: 'soc-turn', domain: 'social', label: 'Attendre son tour', example: 'Chacun son tour de lancer le dé, de pousser la voiture.' },
  { id: 'soc-imit', domain: 'social', label: 'Imiter un geste', example: 'Taper des mains, envoyer un bisou après vous.' },
  { id: 'soc-play', domain: 'social', label: 'Jouer avec un autre enfant', example: 'Il partage un jeu, pas seulement à côté.' },
  // Cognition
  { id: 'cog-sort', domain: 'cognition', label: 'Trier par couleur ou forme', example: 'Il met les rouges ensemble, les ronds ensemble.' },
  { id: 'cog-pair', domain: 'cognition', label: 'Associer des paires', example: 'Il retrouve deux images identiques (memory simple).' },
  { id: 'cog-puzzle', domain: 'cognition', label: 'Compléter un puzzle simple', example: 'Puzzle de 2 à 6 pièces à encastrer.' },
  { id: 'cog-2step', domain: 'cognition', label: 'Suivre une consigne en 2 étapes', example: '« Prends la balle et donne-la à papa. »' },
  // Sensoriel
  { id: 'sen-texture', domain: 'sensoriel', label: 'Tolérer une texture nouvelle', example: 'Toucher du sable, de la pâte, une éponge.' },
  { id: 'sen-calm', domain: 'sensoriel', label: 'Se calmer avec le coin calme', example: 'Il va au coin calme et redescend en pression.' },
  { id: 'sen-sound', domain: 'sensoriel', label: 'Accepter un bruit court', example: 'Aspirateur, mixeur : il reste, casque si besoin.' },
  { id: 'sen-deep', domain: 'sensoriel', label: 'Accepter une pression profonde', example: 'Câlin serré, couverture lourde, massage des bras.' },
];

export function activityById(id: string) {
  return ACTIVITIES.find((a) => a.id === id);
}
export function activitiesOf(domain: ActivityDomainKey) {
  return ACTIVITIES.filter((a) => a.domain === domain);
}
