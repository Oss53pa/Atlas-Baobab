/**
 * Porte d'Entrée (M1) — pré-dépistage. Questionnaire de REPÉRAGE inspiré de la
 * logique M-CHAT-R/F (18-30 mois) et d'un référentiel 3-9 ans, reformulé pour le
 * contexte culturel ivoirien, français simple (CDC §M1).
 *
 * ⚠ Ce n'est PAS un diagnostic. Les items exacts sont un livrable du partenariat
 * clinique (CDC §8, §14) — ceux-ci sont des placeholders de démonstration. Le
 * scoring est déterministe (jamais de LLM, CDC §4.4). Résultat en 3 niveaux,
 * jamais le mot « diagnostic ». Chaque item est formulé pour qu'une réponse
 * « non » soit le signal à surveiller (comme le M-CHAT), sauf items inversés.
 */

export interface ScreeningItem {
  id: string;
  text: string;
  example: string;
  /** Réponse "à risque" : celle qui compte 1 point. */
  riskAnswer: 'oui' | 'non';
}

export type AgeBandKey = 'toddler' | 'preschool' | 'school' | 'teen';

/** 18 mois – 3 ans : logique M-CHAT-R/F (communication sociale précoce). */
export const TODDLER_ITEMS: ScreeningItem[] = [
  { id: 't1', text: "Quand vous montrez quelque chose du doigt de loin, votre enfant regarde-t-il dans cette direction ?", example: "Ex : vous dites « regarde l'avion ! » en pointant le ciel.", riskAnswer: 'non' },
  { id: 't2', text: "Votre enfant vous regarde-t-il dans les yeux quand vous lui parlez ?", example: "Ex : au moment du repas, quand vous l'appelez.", riskAnswer: 'non' },
  { id: 't3', text: "Votre enfant répond-il quand on l'appelle par son prénom ?", example: "Ex : il tourne la tête quand vous dites son nom.", riskAnswer: 'non' },
  { id: 't4', text: "Votre enfant fait-il « au revoir » de la main ou imite-t-il vos gestes ?", example: "Ex : taper des mains, envoyer un bisou.", riskAnswer: 'non' },
  { id: 't5', text: "Votre enfant joue-t-il à faire semblant ?", example: "Ex : donner à manger à une poupée, faire rouler une voiture en imitant le bruit.", riskAnswer: 'non' },
  { id: 't6', text: "Votre enfant vous apporte-t-il des objets juste pour les montrer ?", example: "Ex : il vient vous montrer un caillou, une image.", riskAnswer: 'non' },
  { id: 't7', text: "Votre enfant sourit-il en retour quand vous lui souriez ?", example: "Ex : échange de sourires pendant un jeu.", riskAnswer: 'non' },
  { id: 't8', text: "Votre enfant s'intéresse-t-il aux autres enfants ?", example: "Ex : il les regarde, s'approche, veut jouer dans la cour.", riskAnswer: 'non' },
  { id: 't9', text: "Votre enfant répète-t-il les mêmes mouvements longtemps ?", example: "Ex : balancer les mains, tourner sur lui-même, aligner des objets.", riskAnswer: 'oui' },
  { id: 't10', text: "Votre enfant réagit-il très fortement à certains bruits ou textures ?", example: "Ex : il se bouche les oreilles au marché, refuse certains habits.", riskAnswer: 'oui' },
];

/** 3 – 6 ans : jeu partagé, langage en phrases, routines, sensorialité. */
export const PRESCHOOL_ITEMS: ScreeningItem[] = [
  { id: 'p1', text: "Votre enfant fait-il des phrases pour vous parler ?", example: "Ex : « maman, encore de l'eau », « on va où ? ».", riskAnswer: 'non' },
  { id: 'p2', text: "Joue-t-il à faire semblant avec de vraies petites histoires ?", example: "Ex : préparer un repas pour ses poupées, jouer au docteur.", riskAnswer: 'non' },
  { id: 'p3', text: "Cherche-t-il à jouer AVEC d'autres enfants, pas seulement à côté ?", example: "Ex : il les rejoint, partage un jeu, attend son tour.", riskAnswer: 'non' },
  { id: 'p4', text: "Vous regarde-t-il dans les yeux pendant que vous échangez ?", example: "Ex : quand il vous montre un dessin qu'il a fait.", riskAnswer: 'non' },
  { id: 'p5', text: "Suit-il une consigne simple et répond-il à son prénom ?", example: "Ex : « viens mettre tes chaussures », et il vient.", riskAnswer: 'non' },
  { id: 'p6', text: "A-t-il un intérêt très intense pour un seul sujet ?", example: "Ex : il ne veut parler que de voitures, de dinosaures, d'un dessin animé.", riskAnswer: 'oui' },
  { id: 'p7', text: "A-t-il besoin que tout se passe toujours pareil ?", example: "Ex : même trajet, même assiette ; il se fâche si ça change.", riskAnswer: 'oui' },
  { id: 'p8', text: "Est-il gêné par des bruits, lumières ou textures que d'autres ne remarquent pas ?", example: "Ex : il se bouche les oreilles, refuse certains habits ou aliments.", riskAnswer: 'oui' },
  { id: 'p9', text: "Répète-t-il les mêmes mouvements longtemps ?", example: "Ex : battre des mains, tourner sur lui-même, aligner des objets.", riskAnswer: 'oui' },
  { id: 'p10', text: "Remarque-t-il quand quelqu'un est content ou triste ?", example: "Ex : il réagit si un ami pleure ou si vous êtes fâchée.", riskAnswer: 'non' },
];

/** 6 – 12 ans : réciprocité, implicite social, rigidité, contexte scolaire. */
export const SCHOOL_ITEMS: ScreeningItem[] = [
  { id: 's1', text: "Votre enfant se fait-il des amis et arrive-t-il à les garder ?", example: "Ex : un copain régulier à l'école ou dans le quartier.", riskAnswer: 'non' },
  { id: 's2', text: "Tient-il une conversation à double sens ?", example: "Ex : il écoute, répond, relance, pas seulement son propre sujet.", riskAnswer: 'non' },
  { id: 's3', text: "Comprend-il l'humour, les taquineries, quand on plaisante ?", example: "Ex : il saisit une blague sans la prendre au premier degré.", riskAnswer: 'non' },
  { id: 's4', text: "A-t-il un intérêt qui prend toute la place ?", example: "Ex : il en parle sans arrêt, au point d'oublier le reste.", riskAnswer: 'oui' },
  { id: 's5', text: "A-t-il besoin de routines et supporte-t-il mal l'imprévu ?", example: "Ex : un changement d'emploi du temps le déstabilise beaucoup.", riskAnswer: 'oui' },
  { id: 's6', text: "Est-il très gêné par l'environnement sensoriel ?", example: "Ex : cantine bruyante, étiquettes de vêtements, lumières fortes.", riskAnswer: 'oui' },
  { id: 's7', text: "Regarde-t-il les gens dans les yeux pendant l'échange ?", example: "Ex : quand il vous raconte sa journée.", riskAnswer: 'non' },
  { id: 's8', text: "Répète-t-il des mots, phrases ou gestes de façon inhabituelle ?", example: "Ex : il redit une réplique, bouge les mains de façon répétée.", riskAnswer: 'oui' },
  { id: 's9', text: "Comprend-il les règles sociales non dites ?", example: "Ex : attendre son tour de parole, garder une bonne distance.", riskAnswer: 'non' },
  { id: 's10', text: "Est-il souvent épuisé ou très irritable après l'école ?", example: "Ex : il « tient » toute la journée puis explose à la maison.", riskAnswer: 'oui' },
];

/** 12 – 18 ans : amitiés réciproques, second degré, masquage, anxiété. */
export const TEEN_ITEMS: ScreeningItem[] = [
  { id: 'a1', text: "A-t-il des amitiés proches et réciproques ?", example: "Ex : pas seulement des connaissances, mais des amis avec qui il partage vraiment.", riskAnswer: 'non' },
  { id: 'a2', text: "Comprend-il le second degré, le sarcasme, les sous-entendus ?", example: "Ex : il saisit quand quelqu'un dit l'inverse de ce qu'il pense.", riskAnswer: 'non' },
  { id: 'a3', text: "Se sent-il souvent en décalage ou épuisé après les moments en groupe ?", example: "Ex : il a besoin de s'isoler longtemps pour récupérer.", riskAnswer: 'oui' },
  { id: 'a4', text: "A-t-il des intérêts très intenses et spécialisés ?", example: "Ex : une passion pointue qu'il connaît en profondeur.", riskAnswer: 'oui' },
  { id: 'a5', text: "A-t-il un fort besoin de prévisibilité ?", example: "Ex : l'imprévu ou les changements génèrent beaucoup d'anxiété.", riskAnswer: 'oui' },
  { id: 'a6', text: "Est-il très sensible au bruit, à la lumière ou à la foule ?", example: "Ex : il évite certains lieux, porte un casque, se sent vite submergé.", riskAnswer: 'oui' },
  { id: 'a7', text: "A-t-il tendance à se forcer à « faire comme les autres », puis à s'effondrer ?", example: "Ex : il masque en public et craque une fois seul.", riskAnswer: 'oui' },
  { id: 'a8', text: "A-t-il du mal à deviner ce que ressentent ou pensent les autres ?", example: "Ex : il ne perçoit pas qu'il a vexé quelqu'un.", riskAnswer: 'non' },
  { id: 'a9', text: "A-t-il des gestes répétitifs ou un besoin de bouger pour se calmer ?", example: "Ex : balancer la jambe, triturer un objet, faire les cent pas.", riskAnswer: 'oui' },
  { id: 'a10', text: "Évite-t-il les situations sociales ou de groupe ?", example: "Ex : il refuse les fêtes, les travaux de groupe, les appels.", riskAnswer: 'oui' },
];

export interface AgeBand {
  key: AgeBandKey;
  label: string;
  sub: string;
  items: ScreeningItem[];
  /** Score (en nombre de signaux) à partir duquel on passe « à surveiller ». */
  watchAt: number;
  /** Score à partir duquel on suggère l'avis d'un professionnel. */
  adviceAt: number;
}

/**
 * Les tranches d'âge proposées à la Porte d'Entrée. Chacune a SON questionnaire
 * ET SES seuils : un tout-petit se repère plus tôt (logique M-CHAT, sensible),
 * un adolescent masque davantage et demande un faisceau de signes plus net avant
 * de suggérer un avis. Seuils exprimés en nombre de signaux (déterministe).
 */
export const AGE_BANDS: AgeBand[] = [
  { key: 'toddler', label: '18 mois – 3 ans', sub: 'Tout-petit', items: TODDLER_ITEMS, watchAt: 2, adviceAt: 4 },
  { key: 'preschool', label: '3 – 6 ans', sub: 'Maternelle', items: PRESCHOOL_ITEMS, watchAt: 3, adviceAt: 5 },
  { key: 'school', label: '6 – 12 ans', sub: 'Âge scolaire', items: SCHOOL_ITEMS, watchAt: 3, adviceAt: 6 },
  { key: 'teen', label: '12 – 18 ans', sub: 'Adolescent', items: TEEN_ITEMS, watchAt: 4, adviceAt: 6 },
];

export function bandOf(key: AgeBandKey): AgeBand {
  return AGE_BANDS.find((b) => b.key === key) ?? AGE_BANDS[0];
}

/** Niveau selon les seuils PROPRES à la tranche d'âge (CDC §M1). */
export function levelForBand(score: number, band: AgeBand): ScreeningLevel {
  if (score >= band.adviceAt) return 'advice';
  if (score >= band.watchAt) return 'watch';
  return 'none';
}

export type ScreeningAnswer = 'oui' | 'non';

export function scoreScreening(items: ScreeningItem[], answers: Record<string, ScreeningAnswer>): number {
  let score = 0;
  for (const it of items) {
    if (answers[it.id] === it.riskAnswer) score += 1;
  }
  return score;
}

export type ScreeningLevel = 'none' | 'watch' | 'advice';

/**
 * 3 niveaux (CDC §M1). Seuils déterministes documentés. Jamais « diagnostic ».
 * Toujours accompagné du renvoi vers l'annuaire (fait dans l'UI).
 */
export function screeningLevel(score: number, max: number): ScreeningLevel {
  const ratio = score / max;
  if (ratio < 0.2) return 'none';
  if (ratio < 0.45) return 'watch';
  return 'advice';
}

export const LEVEL_COPY: Record<
  ScreeningLevel,
  { title: string; body: string; tone: 'green' | 'orange' | 'red' }
> = {
  none: {
    title: 'Pas de signal particulier',
    body: "Rien de particulier ne ressort de ce repérage aujourd'hui. Continuez à observer votre enfant ; vous pourrez refaire le point plus tard si besoin.",
    tone: 'green',
  },
  watch: {
    title: 'Quelques signaux à surveiller',
    body: "Quelques réponses méritent de l'attention. Ce n'est pas un diagnostic. Refaites le point dans 3 mois, et notez ce que vous observez au quotidien.",
    tone: 'orange',
  },
  advice: {
    title: "Des signaux qui méritent l'avis d'un professionnel",
    body: "Plusieurs signaux ressortent. Ce n'est pas un diagnostic, mais l'avis d'un professionnel aiderait. Voici des structures près de chez vous.",
    tone: 'red',
  },
};
