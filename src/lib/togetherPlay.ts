/**
 * Avenant P01 · Module « On joue ensemble » (CDC Jeux & Activités v1.0 §4).
 *
 * Catalogue de fiches d'activités PARENT-ENFANT sans écran. Répond à la vraie
 * demande des familles — « qu'est-ce que je peux FAIRE avec lui ? » — et ferme
 * la boucle écran ↔ réel (§0.3). Chaque fiche est un contenu éditorial validé,
 * jamais généré. Matériel du quotidien uniquement (contexte ivoirien assumé).
 *
 * Les 5 lois du module (§4.1) sont structurelles :
 *  1. jamais prescriptif ni médical (mention fixe DISCLAIMER sur chaque fiche) ;
 *  2. jamais culpabilisant (aucun rappel, aucun compteur de « manqué », aucun streak) ;
 *  3. matériel du quotidien uniquement (zéro achat) ;
 *  4. l'enfant a toujours le droit de refuser (encart fixe ENCART_REFUS) ;
 *  5. accessible aux parents peu lecteurs (audio + illustration, ≤ 5 étapes).
 */

import type { ActivityDomainKey } from './activities.js';
import type { AppState } from './types.js';

export type Palier = 'P1' | 'P2' | 'P3' | 'P4';

export interface Fiche {
  id: string;
  title: string;
  picto: string;
  paliers: Palier[];
  domains: ActivityDomainKey[];
  /** Durée indicative en minutes. */
  duree: 5 | 10 | 15;
  materiel: string[];
  /** Lien vers un jeu écran miroir (code de jeu), si la fiche en a un. */
  jeuMiroir?: string;
  /** Corps de la fiche : 5 étapes maximum, phrases courtes, chacune lisible en audio. */
  etapes: string[];
  varianteFacile: string;
  varianteRiche: string;
  /** Contenu sensible → relecture professionnelle obligatoire avant build (§7.4). */
  needsPro?: boolean;
}

/** Textes fixes, communs à toutes les fiches (lois 1 et 4, signaux d'arrêt). */
export const DISCLAIMER = 'Des idées pour jouer ensemble. Elles ne remplacent pas l’accompagnement d’un professionnel.';
export const SIGNAUX_STOP = 'S’il se bouche les oreilles, se raidit, détourne le regard longtemps ou s’agite : on arrête en douceur. Ce n’est pas un échec.';
export const ENCART_REFUS = 'S’il ne veut pas aujourd’hui, c’est d’accord. On range et on réessaiera un autre jour.';

/** Âge de référence lisible d'un palier (jamais « P1 » face au parent : plus doux). */
export const PALIER_AGE: Record<Palier, string> = {
  P1: '2–5 ans', P2: '6–9 ans', P3: '10–13 ans', P4: '14–18 ans',
};
export function ageRef(paliers: Palier[]): string {
  if (!paliers.length) return '';
  const lo = paliers[0], hi = paliers[paliers.length - 1];
  return lo === hi ? PALIER_AGE[lo] : `${PALIER_AGE[lo].split('–')[0]}–${PALIER_AGE[hi].split('–')[1]}`;
}

export const FICHES: Fiche[] = [
  // ── Communication (8) ──────────────────────────────────────────────────────
  {
    id: 'com-bulles', title: 'Les bulles de savon', picto: '🫧', paliers: ['P1'], domains: ['communication'],
    duree: 5, materiel: ['eau', 'savon', 'une paille ou un fil'],
    etapes: [
      'Préparez de l’eau savonneuse dans un gobelet.',
      'Regardez votre enfant, attendez qu’il vous regarde.',
      'Quand il vous regarde, soufflez une bulle.',
      'Suivez la bulle des yeux ensemble, montrez-la du doigt.',
      'Recommencez : soufflez seulement quand il vous regarde.',
    ],
    varianteFacile: 'Soufflez sans attendre le regard, juste pour le plaisir des bulles.',
    varianteRiche: 'Attendez qu’il vous demande « encore » d’un mot, d’un son ou d’un geste avant de souffler.',
  },
  {
    id: 'com-deuxchoix', title: 'Deux choix', picto: '🤲', paliers: ['P1'], domains: ['communication'],
    duree: 5, materiel: ['deux objets qu’il aime'],
    etapes: [
      'Tenez un objet dans chaque main, à sa hauteur.',
      'Nommez-les doucement : « le ballon… ou la banane ? »',
      'Attendez : il touche, regarde ou tend la main vers un objet.',
      'Donnez-lui aussitôt celui qu’il a choisi, en le nommant.',
      'Recommencez avec deux autres objets.',
    ],
    varianteFacile: 'Un seul objet tendu : il le prend, vous le nommez.',
    varianteRiche: 'Trois objets ; il montre ou dit lequel avant que vous le donniez.',
  },
  {
    id: 'com-chansons', title: 'Les chansons à gestes', picto: '🎶', paliers: ['P1'], domains: ['communication', 'social'],
    duree: 5, materiel: ['vos mains'],
    etapes: [
      'Choisissez UNE chanson simple avec des gestes.',
      'Chantez-la doucement en faisant les gestes.',
      'Faites une pause juste avant le geste qu’il préfère.',
      'Attendez qu’il fasse le geste ou vous regarde pour continuer.',
      'Chantez la même chanson, les mêmes gestes, chaque jour.',
    ],
    varianteFacile: 'Vous faites tout, il regarde : c’est déjà beaucoup.',
    varianteRiche: 'Il commence le geste, vous complétez la parole.',
  },
  {
    id: 'com-sac', title: 'Le sac mystère', picto: '🎁', paliers: ['P2'], domains: ['communication', 'sensoriel'],
    duree: 10, materiel: ['un sac en tissu', '4 à 6 petits objets connus'],
    etapes: [
      'Cachez quelques objets familiers dans un sac.',
      'Il glisse la main sans regarder et touche un objet.',
      'Il essaie de deviner : en le nommant, ou en montrant sa carte.',
      'Il sort l’objet pour vérifier ensemble : joie tranquille.',
      'À tour de rôle : c’est vous qui devinez ensuite.',
    ],
    varianteFacile: 'Objets bien différents (une cuillère, une balle) et il regarde en touchant.',
    varianteRiche: 'Objets proches au toucher ; il décrit avant de sortir l’objet.',
  },
  {
    id: 'com-photos', title: 'Photos de la famille', picto: '👨‍👩‍👧', paliers: ['P2'], domains: ['communication'],
    duree: 5, materiel: ['quelques photos de proches'],
    etapes: [
      'Posez 3 ou 4 photos de personnes qu’il connaît.',
      'Nommez-en une : « où est papa ? »',
      'Il montre du doigt ou regarde la bonne photo.',
      'Félicitez d’un sourire, nommez à nouveau.',
      'Laissez-le vous montrer qui il veut, à son tour.',
    ],
    varianteFacile: 'Deux photos seulement, très différentes.',
    varianteRiche: 'Il nomme lui-même la personne, ou dit un mot sur elle.',
  },
  {
    id: 'com-message', title: 'Le message', picto: '✉️', paliers: ['P3'], domains: ['communication', 'autonomie'],
    duree: 10, materiel: ['un petit objet à porter'],
    etapes: [
      'Un parent est dans une autre pièce.',
      'Donnez un objet à l’enfant : « porte ça à maman ».',
      'Il traverse et remet l’objet à la bonne personne.',
      'Grand merci joyeux à l’arrivée.',
      'Ensuite, une consigne en deux temps : « la cuillère, puis reviens ».',
    ],
    varianteFacile: 'La personne l’appelle et reste visible pour le guider.',
    varianteRiche: 'Un message avec deux objets à deux personnes différentes.',
  },
  {
    id: 'com-commande', title: 'La commande', picto: '🍲', paliers: ['P4'], domains: ['communication', 'autonomie'],
    duree: 10, materiel: ['sa carte CAA ou son plat préféré en tête'],
    etapes: [
      'Préparez ensemble ce qu’il va commander, avant d’arriver.',
      'Au maquis, laissez-lui le temps.',
      'Il dit ou montre sa carte pour commander son plat.',
      'S’il bloque, montrez le geste puis laissez-le refaire.',
      'Bravo discret : il a demandé lui-même.',
    ],
    varianteFacile: 'Il montre la carte, vous mettez les mots.',
    varianteRiche: 'Il ajoute « s’il vous plaît » ou choisit la boisson en plus.',
  },
  {
    id: 'com-appel', title: 'L’appel', picto: '📞', paliers: ['P4'], domains: ['communication', 'social'],
    duree: 5, materiel: ['un téléphone', 'un proche prévenu'],
    etapes: [
      'Prévenez le proche : un appel court, tranquille.',
      'Préparez ensemble ce qu’il va dire (« bonjour, c’est moi »).',
      'Lancez l’appel, restez à côté sans parler à sa place.',
      'Il dit bonjour, échange trente secondes.',
      'On raccroche en douceur, uniquement s’il est partant.',
    ],
    varianteFacile: 'Il écoute et fait juste un signe ou un son.',
    varianteRiche: 'Il pose une question simple au proche.',
  },
  // ── Sensoriel & régulation (7) ─────────────────────────────────────────────
  {
    id: 'sen-riz', title: 'Le bac de riz', picto: '🌾', paliers: ['P1'], domains: ['sensoriel', 'motricite'],
    duree: 10, materiel: ['une bassine', 'du riz sec', 'petits objets à cacher'],
    etapes: [
      'Versez du riz sec dans une grande bassine.',
      'Plongez vos mains dedans, montrez que c’est doux.',
      'Cachez un petit objet aimé sous le riz.',
      'Il fouille avec les mains pour le retrouver.',
      'Laissez-le transvaser, verser, écouter le bruit du riz.',
    ],
    varianteFacile: 'Juste toucher le riz, sans objet à chercher.',
    varianteRiche: 'Cachez plusieurs objets ; il cherche celui que vous nommez.',
  },
  {
    id: 'sen-bouteilles', title: 'Les bouteilles calmes', picto: '🍾', paliers: ['P1'], domains: ['sensoriel'],
    duree: 5, materiel: ['une bouteille transparente', 'eau', 'un peu d’huile', 'paillettes ou graines'],
    etapes: [
      'Remplissez une bouteille d’eau avec un peu d’huile.',
      'Ajoutez des paillettes, des graines ou du sable fin.',
      'Fermez bien le bouchon (collez-le si besoin).',
      'Retournez la bouteille, regardez ensemble descendre.',
      'Respirez calmement pendant que ça retombe.',
    ],
    varianteFacile: 'Une seule couleur, mouvement lent.',
    varianteRiche: 'Plusieurs bouteilles ; il choisit celle qui l’apaise le plus.',
  },
  {
    id: 'sen-pate', title: 'La pâte maison', picto: '🥟', paliers: ['P2'], domains: ['sensoriel', 'motricite'],
    duree: 15, materiel: ['farine', 'eau', 'un peu de sel', 'un peu d’huile'],
    etapes: [
      'Mélangez farine, eau, sel et un filet d’huile.',
      'Malaxez ensemble jusqu’à une pâte souple.',
      'Roulez des boules, des serpents, aplatissez.',
      'Il découpe, tape, pétrit à son rythme.',
      'Rangez la pâte dans une boîte pour la prochaine fois.',
    ],
    varianteFacile: 'Vous pétrissez, il touche et observe.',
    varianteRiche: 'Il façonne un objet précis (une lettre, un animal).',
  },
  {
    id: 'sen-pagne', title: 'Le rouleau-pagne', picto: '🧣', paliers: ['P2'], domains: ['sensoriel'],
    duree: 5, materiel: ['un grand pagne ou un drap'],
    etapes: [
      'Proposez : « on fait le rouleau ? » — seulement s’il aime la pression.',
      'Il s’allonge au bord du pagne.',
      'Enroulez-le doucement, fermement, dans le tissu.',
      'Pression calme sur les bras, le dos, quelques secondes.',
      'Déroulez tranquillement quand il le souhaite.',
    ],
    varianteFacile: 'Enveloppez juste les épaules, sans rouler.',
    varianteRiche: 'Ajoutez une comptine lente pendant le roulé.',
  },
  {
    id: 'sen-respire', title: 'La respiration de la Bulle', picto: '🌬️', paliers: ['P3'], domains: ['sensoriel'],
    duree: 5, materiel: ['une plume ou un morceau de coton'],
    jeuMiroir: 'bulle',
    etapes: [
      'Posez une plume légère sur la table.',
      'Inspirez ensemble, doucement, par le nez.',
      'Soufflez sur la plume pendant cinq secondes.',
      'Regardez-la bouger, puis recommencez, même rythme.',
      'C’est le même souffle que « Ma bulle » dans l’application.',
    ],
    varianteFacile: 'Vous soufflez, il regarde la plume voler.',
    varianteRiche: 'Il compte cinq temps dans sa tête à chaque souffle.',
  },
  {
    id: 'sen-coin', title: 'Le coin calme', picto: '🛋️', paliers: ['P3'], domains: ['sensoriel', 'autonomie'],
    duree: 15, materiel: ['une natte', 'un coussin', 'son objet préféré'],
    etapes: [
      'Choisissez ENSEMBLE un petit coin tranquille.',
      'Posez une natte, un coussin, une lumière douce.',
      'Ajoutez son objet qui rassure.',
      'Montrez que c’est SON coin, pour se poser quand c’est trop.',
      'Personne n’y gronde jamais : c’est un refuge, pas une punition.',
    ],
    varianteFacile: 'Un simple coussin dans un coin suffit pour commencer.',
    varianteRiche: 'Il y range lui-même ses objets calmes.',
  },
  {
    id: 'sen-meteo', title: 'Ma météo intérieure', picto: '🌤️', paliers: ['P4'], domains: ['sensoriel', 'communication'],
    duree: 5, materiel: ['trois images : soleil, nuage, orage'],
    etapes: [
      'Posez trois images : soleil, nuage, orage.',
      'Demandez une fois : « comment tu te sens ce soir ? »',
      'Il montre une image, sans avoir à expliquer.',
      'Accueillez sans commentaire ni question de plus.',
      'Merci de m’avoir montré : c’est tout ce qu’il faut.',
    ],
    varianteFacile: 'Deux images seulement : ça va / c’est dur.',
    varianteRiche: 'Il ajoute un mot ou un dessin sur sa météo.',
  },
  // ── Motricité (6) ──────────────────────────────────────────────────────────
  {
    id: 'mot-coussins', title: 'Le parcours coussins', picto: '🛏️', paliers: ['P1'], domains: ['motricite'],
    duree: 10, materiel: ['3 coussins', 'un peu d’espace au sol'],
    etapes: [
      'Alignez trois coussins au sol.',
      'Montrez : marcher, ramper, sauter d’un coussin à l’autre.',
      'Il vous imite, à son rythme, tenez-lui la main si besoin.',
      'Changez l’ordre des coussins pour recommencer.',
      'Terminez allongés dessus, tranquilles.',
    ],
    varianteFacile: 'Un seul coussin à enjamber, main dans la main.',
    varianteRiche: 'Ajoutez une consigne : « saute, puis tourne ».',
  },
  {
    id: 'mot-transvaser', title: 'Transvaser', picto: '🥣', paliers: ['P1'], domains: ['motricite', 'autonomie'],
    duree: 10, materiel: ['deux bols', 'eau ou riz', 'une cuillère puis un gobelet'],
    etapes: [
      'Posez deux bols, l’un rempli d’eau ou de riz.',
      'Montrez : transvaser d’un bol à l’autre à la cuillère.',
      'Il essaie, doucement, sans se presser.',
      'Passez au gobelet quand la cuillère est maîtrisée.',
      'Peu importe si ça déborde : on essuie ensemble.',
    ],
    varianteFacile: 'Du riz plutôt que de l’eau, plus facile à viser.',
    varianteRiche: 'Verser jusqu’à un trait marqué sur le bol.',
  },
  {
    id: 'mot-pinces', title: 'Les pinces à linge', picto: '🧷', paliers: ['P2'], domains: ['motricite'],
    duree: 10, materiel: ['une dizaine de pinces à linge', 'une boîte', 'un fil'],
    etapes: [
      'Montrez comment pincer une pince sur le bord d’une boîte.',
      'Il en accroche dix, une à une.',
      'Décrochez-les ensemble, ça pince fort : bravo les doigts.',
      'Ensuite, accrochez-les sur un fil tendu.',
      'Comptez-les à voix haute si ça lui plaît.',
    ],
    varianteFacile: 'De grosses pinces, faciles à ouvrir.',
    varianteRiche: 'Alterner deux couleurs de pinces sur le fil.',
  },
  {
    id: 'mot-marelle', title: 'La marelle douce', picto: '🔢', paliers: ['P2'], domains: ['motricite'],
    duree: 10, materiel: ['de la craie', 'un sol dehors'],
    etapes: [
      'Dessinez à la craie 4 ou 5 cases au sol.',
      'Sautez dedans ensemble, sans compétition.',
      'Il saute à son rythme, tenez-lui la main si besoin.',
      'Pas de gagnant, pas de chrono : juste sauter ensemble.',
      'Effacez, redessinez autrement demain.',
    ],
    varianteFacile: 'Deux cases, on marche d’une à l’autre.',
    varianteRiche: 'Sauter à cloche-pied, ou dans l’ordre des chiffres.',
  },
  {
    id: 'mot-craie', title: 'Le chemin de craie', picto: '🐍', paliers: ['P3'], domains: ['motricite'],
    duree: 10, materiel: ['de la craie', 'un gobelet d’eau'],
    etapes: [
      'Tracez un long chemin qui tourne, au sol.',
      'Il le suit en marchant, un pied devant l’autre.',
      'Refaites-le en portant un gobelet d’eau sans renverser.',
      'Puis suivez le même tracé au doigt, accroupis.',
      'Inventez un nouveau chemin ensemble.',
    ],
    varianteFacile: 'Un chemin droit et court pour commencer.',
    varianteRiche: 'Un chemin avec des boucles serrées à suivre lentement.',
  },
  {
    id: 'mot-marche', title: 'La marche du quartier', picto: '🚶', paliers: ['P4'], domains: ['motricite', 'autonomie'],
    duree: 15, materiel: ['un trajet court et connu'],
    etapes: [
      'Choisissez un trajet fixe, toujours le même.',
      'Marchez ensemble en nommant les repères.',
      'Laissez-le vous guider d’un repère au suivant.',
      'Augmentez la distance d’un lampadaire à la fois.',
      'Rentrez par le même chemin, calmement.',
    ],
    varianteFacile: 'Un aller court, retour porté ou en poussette.',
    varianteRiche: 'Il annonce à l’avance le prochain repère.',
  },
  // ── Logique & quantités (6) ────────────────────────────────────────────────
  {
    id: 'log-tours', title: 'Les tours de boîtes', picto: '📦', paliers: ['P1'], domains: ['cognition', 'motricite'],
    duree: 10, materiel: ['des boîtes vides empilables'],
    etapes: [
      'Rassemblez des boîtes vides de tailles proches.',
      'Empilez-en trois ensemble, doucement.',
      'Laissez-le les faire tomber : cause et effet joyeux.',
      'Remontez plus haut, quatre puis cinq, six.',
      'Encore ? On recommence tant que ça l’amuse.',
    ],
    varianteFacile: 'Deux boîtes, il tape pour faire tomber.',
    varianteRiche: 'Empiler de la plus grande à la plus petite.',
  },
  {
    id: 'log-tri', title: 'Le tri du marché', picto: '🍅', paliers: ['P2'], domains: ['cognition', 'autonomie'],
    duree: 10, materiel: ['3 bols', 'des légumes du marché'],
    etapes: [
      'Au retour du marché, posez trois bols.',
      'Montrez : les tomates ici, les oignons là, les piments là.',
      'Il trie chaque légume dans le bon bol.',
      'Nommez chaque famille à voix haute.',
      'Rangez ensemble : le tri devient utile pour de vrai.',
    ],
    varianteFacile: 'Deux familles bien différentes seulement.',
    varianteRiche: 'Trier par taille en plus de la catégorie.',
  },
  {
    id: 'log-autant', title: 'Autant que moi', picto: '⚫', paliers: ['P2'], domains: ['cognition'],
    duree: 5, materiel: ['des bouchons ou des cailloux'],
    etapes: [
      'Posez trois bouchons devant vous.',
      'Dites : « mets-en autant que moi ».',
      'Il en pose trois de son côté.',
      'Comptez ensemble pour vérifier.',
      'Changez le nombre, recommencez.',
    ],
    varianteFacile: 'Un ou deux bouchons, un pour un.',
    varianteRiche: 'Jusqu’à cinq, puis « un de plus que moi ».',
  },
  {
    id: 'log-table', title: 'La table pour 4', picto: '🍽️', paliers: ['P3'], domains: ['cognition', 'autonomie'],
    duree: 10, materiel: ['assiettes', 'cuillères'],
    etapes: [
      'Comptez ensemble combien de personnes mangent.',
      'Il compte autant d’assiettes.',
      'Une cuillère par assiette, une pour une.',
      'Vérifiez : personne n’est oublié ?',
      'Bravo, la table est prête grâce à lui.',
    ],
    varianteFacile: 'Deux couverts d’abord.',
    varianteRiche: 'Ajouter les verres, adapter si un invité arrive.',
  },
  {
    id: 'log-colliers', title: 'Les colliers-suites', picto: '📿', paliers: ['P3'], domains: ['cognition', 'motricite'],
    duree: 10, materiel: ['un fil', 'des perles ou des bouchons percés'],
    etapes: [
      'Commencez un motif : rouge, bleu, rouge, bleu…',
      'Montrez la suite, dites-la à voix haute.',
      'Il continue le motif sur le fil.',
      'Si le motif casse, reprenez ensemble sans souci.',
      'Fermez le collier, il le porte fièrement.',
    ],
    varianteFacile: 'Une seule couleur, juste enfiler.',
    varianteRiche: 'Un motif à trois éléments qui se répète.',
  },
  {
    id: 'log-courses', title: 'Les courses à 500 F', picto: '🪙', paliers: ['P4'], domains: ['cognition', 'autonomie'],
    duree: 15, materiel: ['des pièces', 'un petit achat prévu'],
    jeuMiroir: 'marche',
    etapes: [
      'Choisissez UN article, préparez les pièces à la maison.',
      'Comptez ensemble le montant avant de partir.',
      'À la boutique, il tend les pièces au vendeur.',
      'Vérifiez ensemble la monnaie rendue.',
      'Si ça ne se passe pas comme prévu, on reporte : c’est très bien quand même.',
    ],
    varianteFacile: 'Montant exact préparé, il le pose simplement.',
    varianteRiche: 'Il compose le montant avec plusieurs pièces.',
  },
  // ── Autonomie (6) ──────────────────────────────────────────────────────────
  {
    id: 'aut-habille', title: 'Je m’habille en images', picto: '👕', paliers: ['P2'], domains: ['autonomie'],
    duree: 10, materiel: ['4 photos des étapes', 'ses vêtements'],
    etapes: [
      'Prenez 4 photos : culotte, pantalon, tee-shirt, sandales.',
      'Affichez-les dans l’ordre, à sa hauteur.',
      'Il suit les images, une étape à la fois.',
      'Aidez seulement là où il bloque, pas avant.',
      'Habillé tout seul, ou presque : quelle fierté.',
    ],
    varianteFacile: 'Deux étapes seulement, le reste avec vous.',
    varianteRiche: 'Il range aussi le pyjama en fin de séquence.',
  },
  {
    id: 'aut-arrose', title: 'J’arrose', picto: '🪴', paliers: ['P2'], domains: ['autonomie'],
    duree: 5, materiel: ['une plante', 'un petit arrosoir ou un gobelet'],
    etapes: [
      'Confiez-lui UNE plante, la sienne.',
      'Chaque jour, à la même heure, ensemble.',
      'Il remplit le gobelet, verse doucement au pied.',
      'Regardez la plante grandir au fil des jours.',
      'C’est lui qui s’en occupe : une petite responsabilité douce.',
    ],
    varianteFacile: 'Vous remplissez, il verse.',
    varianteRiche: 'Il vérifie si la terre est sèche avant d’arroser.',
  },
  {
    id: 'aut-routine', title: 'Ma routine du soir', picto: '🌙', paliers: ['P3'], domains: ['autonomie', 'sensoriel'],
    duree: 10, materiel: ['un planning en images au mur'],
    jeuMiroir: 'journee',
    etapes: [
      'Affichez au mur les étapes du soir en images.',
      'Bain, pyjama, dents, histoire, dodo.',
      'Il retourne chaque image « fait » au fur et à mesure.',
      'Le même ordre chaque soir rassure.',
      'La dernière image retournée : bonne nuit.',
    ],
    varianteFacile: 'Trois étapes seulement pour commencer.',
    varianteRiche: 'Il prépare lui-même les images du lendemain.',
  },
  {
    id: 'aut-linge', title: 'Le linge par couleurs', picto: '🧺', paliers: ['P3'], domains: ['autonomie', 'cognition'],
    duree: 10, materiel: ['du linge propre', 'deux ou trois paniers'],
    etapes: [
      'Posez deux ou trois paniers.',
      'Montrez : le clair ici, le foncé là.',
      'Il trie chaque vêtement dans le bon panier.',
      'Pliez ensemble les plus faciles.',
      'Rangé grâce à lui : merci pour l’aide.',
    ],
    varianteFacile: 'Trier seulement les chaussettes par paires.',
    varianteRiche: 'Trier par personne à qui appartient le vêtement.',
  },
  {
    id: 'aut-recette', title: 'Ma recette du dimanche', picto: '🍚', paliers: ['P4'], domains: ['autonomie', 'motricite'],
    duree: 15, materiel: ['les ingrédients d’un plat simple'],
    jeuMiroir: 'recette',
    etapes: [
      'Choisissez un plat simple (bissap, salade de fruits).',
      'Affichez les étapes en images, une à la fois.',
      'Il réalise chaque étape, vous avancez à son rythme.',
      'Goûtez ensemble le résultat.',
      'C’est SA recette : il l’a faite.',
    ],
    varianteFacile: 'Il fait une ou deux étapes clés seulement.',
    varianteRiche: 'Il annonce l’étape suivante avant de la faire.',
  },
  {
    id: 'aut-sac', title: 'Mon sac tout seul', picto: '🎒', paliers: ['P4'], domains: ['autonomie'],
    duree: 10, materiel: ['une check-list en images', 'son sac'],
    etapes: [
      'Faites une check-list en images de ce qu’il faut.',
      'Il coche ou retourne chaque image en la rangeant.',
      'Cahier, gourde, casquette… un à un.',
      'Vérifiez ensemble à la fin.',
      'Son sac, préparé par lui : prêt à partir.',
    ],
    varianteFacile: 'Trois objets seulement sur la liste.',
    varianteRiche: 'Il prépare son sac la veille, sans rappel.',
  },
  // ── Interaction & tour de rôle (3) ─────────────────────────────────────────
  {
    id: 'int-balle', title: 'La balle qui roule', picto: '⚽', paliers: ['P1'], domains: ['social', 'motricite'],
    duree: 5, materiel: ['une balle', 'un peu d’espace'],
    etapes: [
      'Asseyez-vous face à face, jambes écartées.',
      'Faites rouler la balle vers lui, doucement.',
      'Attendez qu’il vous la renvoie.',
      'Chacun son tour : le va-et-vient, encore et encore.',
      'Nommez le tour : « à toi… à moi… ».',
    ],
    varianteFacile: 'Rapprochez-vous beaucoup, la balle va tout droit.',
    varianteRiche: 'Ajoutez un troisième joueur dans la ronde.',
  },
  {
    id: 'int-coucou', title: 'Coucou-caché', picto: '🙈', paliers: ['P1'], domains: ['social', 'communication'],
    duree: 5, materiel: ['un pagne ou vos mains'],
    jeuMiroir: 'coucou',
    etapes: [
      'Cachez votre visage derrière un pagne.',
      'Attendez un instant, laissez monter l’attente.',
      'Réapparaissez : « coucou ! », grand sourire.',
      'Recommencez, il anticipe et rit.',
      'Laissez-le se cacher à son tour.',
    ],
    varianteFacile: 'Cachez juste vos yeux avec vos mains.',
    varianteRiche: 'Cachez un objet et faites-le réapparaître.',
  },
  {
    id: 'int-tambour', title: 'Chacun son tour au tambour', picto: '🥁', paliers: ['P2', 'P3'], domains: ['social', 'communication'],
    duree: 10, materiel: ['une bassine retournée ou un tam-tam'],
    jeuMiroir: 'tambour',
    etapes: [
      'Retournez une bassine : c’est le tambour.',
      'Vous frappez un petit rythme : deux coups.',
      'Il écoute, puis répond en frappant à son tour.',
      'Recommencez, un peu plus long à chaque fois.',
      'Riez, ralentissez, c’est un dialogue en rythme.',
    ],
    varianteFacile: 'Un seul coup à imiter.',
    varianteRiche: 'Trois à quatre coups, avec des pauses.',
  },
];

export function ficheById(id: string): Fiche | undefined {
  return FICHES.find((f) => f.id === id);
}

// ── Suggestions CORTEX (§4.4) ────────────────────────────────────────────────
// Jamais impératif, jamais un enclos : un simple raccourci hebdomadaire, stable.

/** Domaines « en émergence » : notés avec aide/presque (2-3), pas encore acquis. */
function emergingDomains(childId: string, state: AppState): ActivityDomainKey[] {
  const tally: Record<string, { emerging: number; last: number }> = {};
  for (const log of state.activityLogs) {
    if (log.child_id !== childId) continue;
    const t = (tally[log.domain] ??= { emerging: 0, last: 0 });
    if (log.level === 2 || log.level === 3) t.emerging += 1;
    t.last = Math.max(t.last, Date.parse(log.occurred_at) || 0);
  }
  return Object.entries(tally)
    .sort((a, b) => b[1].emerging - a[1].emerging || b[1].last - a[1].last)
    .map(([k]) => k as ActivityDomainKey);
}

/** Numéro de semaine stable (rotation des suggestions sans rien répéter trop vite). */
function weekIndex(nowMs: number): number {
  return Math.floor(nowMs / (7 * 24 * 3600 * 1000));
}

/**
 * 2 à 3 fiches suggérées pour la semaine (§4.4). Croisement : domaines en
 * émergence × fiches peu/pas proposées. Exclut les fiches faites récemment et
 * celles marquées « pas cette fois » deux fois (masquées 60 jours).
 */
export function suggestedFiches(childId: string, state: AppState, nowMs = Date.now()): Fiche[] {
  const logs = state.togetherLogs?.filter((l) => l.child_id === childId) ?? [];
  const recentDone = new Set(
    logs.filter((l) => nowMs - Date.parse(l.done_at) < 14 * 24 * 3600 * 1000).map((l) => l.fiche_id),
  );
  const refusals: Record<string, number> = {};
  for (const l of logs) {
    if (l.reaction === 'not' && nowMs - Date.parse(l.done_at) < 60 * 24 * 3600 * 1000) {
      refusals[l.fiche_id] = (refusals[l.fiche_id] ?? 0) + 1;
    }
  }
  const hidden = new Set(Object.entries(refusals).filter(([, n]) => n >= 2).map(([id]) => id));
  const emerging = emergingDomains(childId, state);
  const rank = (f: Fiche): number => {
    const domHit = f.domains.some((d) => emerging.slice(0, 3).includes(d)) ? 0 : 1;
    const doneOnce = logs.some((l) => l.fiche_id === f.id) ? 1 : 0; // jamais faites d'abord
    return domHit * 2 + doneOnce;
  };
  const pool = FICHES.filter((f) => !recentDone.has(f.id) && !hidden.has(f.id));
  const sorted = [...pool].sort((a, b) => rank(a) - rank(b));
  // Rotation hebdomadaire dans le meilleur tiers, pour varier sans perdre la pertinence.
  const top = sorted.slice(0, Math.max(6, Math.ceil(sorted.length / 3)));
  const off = weekIndex(nowMs) % Math.max(1, top.length);
  const rotated = [...top.slice(off), ...top.slice(0, off)];
  return rotated.slice(0, 3);
}
