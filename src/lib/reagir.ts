/**
 * Module RÉAGIR (M10, SFD-C1 Partie A). Cœur pédagogique : chaque comportement
 * observé ouvre un guide en 5 volets, structuré sur le modèle ABC et le CST (OMS).
 *
 * Garde-fous cliniques (SFD-C1 A5, no-go) :
 *  - vocabulaire imposé « apaiser / réduire / aider », jamais « supprimer / faire disparaître » ;
 *  - aucune technique aversive, de contention ou de punition ;
 *  - situations d'auto-agression : bandeau sécurité + orientation systématique.
 *
 * Contenu en état `draft_working` : rédigé à partir de sources evidence-based
 * publiques (CST OMS, ABC, JASPER/ESDM/PECS/TEACCH). Chaque guide affiche sa source.
 * Items finaux à valider et signer par le partenaire clinique (CDC §1.3.8).
 */

export interface ReagirGuide {
  /** Volet 1 : ce que le comportement exprime souvent, sans culpabiliser. */
  comprendre: string;
  /** Volet 2 : gestes immédiats, 1 par carte, impératif court. */
  instant: string[];
  /** Volet 3 : réactions contre-productives (max 3), sans jugement. */
  aEviter: string[];
  /** Volet 4 : la conséquence juste, sans renforcement involontaire. */
  apres: string;
  /** Volet 5 : actions de fond (reliées activités/Coach). */
  prevenir: string[];
}

export interface ReagirSituation {
  key: string;
  emoji: string;
  label: string;
  /** Déclenche le bandeau sécurité prioritaire (A5.1). */
  safety?: boolean;
  guide: ReagirGuide;
}

export const REAGIR_SOURCE = 'D’après les approches CST (OMS) et le modèle ABC · contenu en cours de validation clinique';

export const SITUATIONS: ReagirSituation[] = [
  {
    key: 'crise', emoji: '😤', label: 'Crise / effondrement',
    guide: {
      comprendre: 'Se boucher les oreilles, crier, se laisser tomber : ce n’est pas un caprice, c’est souvent un trop-plein. Le cerveau de l’enfant reçoit trop d’un coup (bruit, lumière, émotion, changement) et déborde. Il ne cherche pas à vous embêter, il ne contrôle plus.',
      instant: [
        'Baissez votre voix, presque un chuchotement.',
        'Réduisez tout de suite : éteignez, éloignez la foule, tamisez la lumière.',
        'Proposez son objet d’apaisement sans parler.',
        'Restez à côté, calmes. Votre calme est le message.',
      ],
      aEviter: [
        'Élever la voix (ça ajoute du bruit au trop-plein).',
        'Forcer le contact ou le tenir (ça peut augmenter la détresse).',
        'Négocier ou raisonner pendant la tempête (il ne peut pas entendre là).',
      ],
      apres: 'Une fois le calme revenu, reconnectez simplement, sans revenir longuement sur l’épisode. Si la crise a permis d’échapper à une demande, re-proposez-la un peu plus tard, en version plus facile.',
      prevenir: [
        'Repérez et allégez les déclencheurs connus (bruit, transitions).',
        'Ajoutez le mot « pause » à sa CAA.',
        'Une activité sensorielle apaisante chaque jour, avant les moments à risque.',
      ],
    },
  },
  {
    key: 'refus', emoji: '🙅', label: 'Refus (s’habiller, manger, sortir…)',
    guide: {
      comprendre: 'Le refus dit souvent « c’est trop, je ne comprends pas, ou j’ai besoin de prévisibilité ». Ce n’est pas de l’opposition gratuite : c’est une manière de dire un inconfort ou un besoin de contrôle sur un monde imprévisible.',
      instant: [
        'Prévenez et montrez ce qui vient (image, objet, geste).',
        'Proposez un choix simple entre deux options (« le rouge ou le bleu ? »).',
        'Découpez la tâche en une seule petite étape à la fois.',
        'Laissez un court délai, sans pression.',
      ],
      aEviter: [
        'Répéter l’ordre de plus en plus fort.',
        'Enchaîner plusieurs consignes d’un coup.',
        'Céder complètement dans la tempête (re-proposez plus tard, facilité).',
      ],
      apres: 'Dès qu’il coopère, même un peu, reconnaissez-le calmement. Si le refus visait à éviter la tâche, revenez-y ensuite en plus facile, pour qu’éviter ne devienne pas la solution.',
      prevenir: [
        'Une séquence en images pour les moments-clés (habillage, sortie).',
        'Prévenir les transitions 5 minutes avant.',
        'Intégrer ses intérêts pour motiver (l’intérêt comme moteur, PRT).',
      ],
    },
  },
  {
    key: 'repetitif', emoji: '🔁', label: 'Gestes répétés (stéréotypies)',
    guide: {
      comprendre: 'Se balancer, aligner, battre des mains : ce sont souvent des façons de s’auto-réguler, de se rassurer ou de gérer une émotion. Quand ce n’est ni dangereux ni gênant, ce n’est pas un problème à corriger : c’est un outil pour lui.',
      instant: [
        'Observez : c’est plutôt du plaisir, ou de la tension ?',
        'Si c’est de la tension, réduisez ce qui pèse autour de lui.',
        'S’il est concentré et bien, laissez-le faire.',
        'Proposez une alternative seulement si le geste gêne (objet à manipuler).',
      ],
      aEviter: [
        'Interdire ou bloquer un geste inoffensif.',
        'Le gronder pour un comportement d’auto-régulation.',
        'Chercher à tout « normaliser ».',
      ],
      apres: 'S’il s’agissait de tension, notez ce qui l’avait fait monter : c’est une information précieuse pour CORTEX. Si tout va bien, il n’y a rien à faire.',
      prevenir: [
        'Prévoir des moments sensoriels réguliers dans la journée.',
        'Offrir des objets à manipuler acceptés socialement.',
        'Réduire les sources de stress de fond.',
      ],
    },
  },
  {
    key: 'autrui', emoji: '✋', label: 'Gestes envers les autres (taper, mordre)',
    guide: {
      comprendre: 'Taper ou mordre, à cet âge, est souvent une communication d’urgence : « arrête, j’ai mal, je veux, je n’ai pas les mots ». Le geste dit un besoin que la parole ne peut pas encore dire. Comprendre le message aide à le remplacer.',
      instant: [
        'Assurez la sécurité : écartez calmement, sans brusquer.',
        'Phrase très courte et neutre : « on ne tape pas ».',
        'Montrez tout de suite quoi faire à la place (carte « stop », « pause »).',
        'Aidez-le à retrouver le calme avant toute discussion.',
      ],
      aEviter: [
        'Taper en retour ou punir physiquement (jamais).',
        'Faire un long discours moralisateur sur le moment.',
        'Réagir avec beaucoup d’émotion (ça peut renforcer le geste).',
      ],
      apres: 'Au calme, rejouez la scène avec la bonne façon de demander (geste, carte). Renforcez fort chaque fois qu’il utilise la communication plutôt que le geste.',
      prevenir: [
        'Enrichir sa CAA des mots « stop », « à moi », « aide ».',
        'Repérer les situations à risque et les anticiper.',
        'Apprendre l’attente et le tour de rôle par le jeu.',
      ],
    },
  },
  {
    key: 'auto', emoji: '💥', label: 'Gestes envers lui-même', safety: true,
    guide: {
      comprendre: 'Se frapper ou se mordre soi-même exprime souvent une douleur, un trop-plein intense, ou une frustration sans issue. C’est un signal fort de détresse. La priorité est de le protéger et d’en parler à un professionnel.',
      instant: [
        'Protégez sans contenir : coussin, éloigner l’objet dur, distance douce.',
        'Réduisez radicalement les stimulations autour de lui.',
        'Restez présent, très calme, peu de mots.',
        'Proposez une alternative sensorielle forte mais sûre (presser un coussin).',
      ],
      aEviter: [
        'Le maintenir de force (peut aggraver la détresse et le risque).',
        'Crier ou paniquer devant lui.',
        'Rester seul avec la situation sans chercher de l’aide.',
      ],
      apres: 'Au calme, notez précisément le contexte (avant / pendant / après) pour le professionnel. Ces gestes justifient un avis rapide : ils ont souvent une cause qu’on peut soulager.',
      prevenir: [
        'Chercher une cause médicale possible (douleur, dents, ventre).',
        'Travailler un canal de communication de la douleur (carte « mal »).',
        'Avis professionnel : construire un plan de sécurité personnalisé.',
      ],
    },
  },
  {
    key: 'repas', emoji: '🍚', label: 'Repas difficiles',
    guide: {
      comprendre: 'Manger toujours la même chose, refuser des textures : c’est fréquent et souvent sensoriel (l’odeur, le contact en bouche, la couleur sont trop). Ce n’est pas de la comédie. On avance par très petits pas, sans bataille.',
      instant: [
        'Gardez le repas calme, sans forcer ni supplier.',
        'Présentez le nouvel aliment à côté, sans obligation d’y toucher.',
        'Félicitez le fait de regarder, sentir, toucher (avant même de goûter).',
        'Arrêtez avant la crise : mieux vaut court et positif.',
      ],
      aEviter: [
        'Forcer à finir l’assiette.',
        'Cacher l’aliment (ça casse la confiance).',
        'Transformer le repas en négociation ou en punition.',
      ],
      apres: 'Chaque petite exploration compte, même sans avaler. Notez ce qui passe mieux. La régularité et le zéro-pression font plus que l’insistance.',
      prevenir: [
        'Introduire un nouvel aliment très progressivement, à côté des connus.',
        'Impliquer l’enfant (toucher, transvaser) hors du moment du repas.',
        'Des repas à horaires et lieux stables (prévisibilité).',
      ],
    },
  },
  {
    key: 'nuit', emoji: '🌙', label: 'Nuits difficiles',
    guide: {
      comprendre: 'Difficultés d’endormissement, réveils : le sommeil est souvent fragile, sensible aux écrans, au bruit, à l’anxiété et aux ruptures de routine. Un cadre très prévisible le soir aide plus que tout.',
      instant: [
        'Baissez lumières et sons une heure avant.',
        'Suivez toujours le même ordre : bain, histoire, lumière douce.',
        'Objet rassurant à disposition.',
        'Présence calme et brève, sans stimulation.',
      ],
      aEviter: [
        'Écrans juste avant le coucher.',
        'Changer le rituel d’un soir à l’autre.',
        'Transformer le réveil nocturne en long moment d’attention.',
      ],
      apres: 'Notez l’heure du coucher et la qualité de la nuit : CORTEX repère les liens (sieste, cantine, journée agitée). Un même rituel, chaque soir, finit par apaiser.',
      prevenir: [
        'Un rituel du soir identique, illustré si besoin.',
        'Réduire la charge sensorielle en fin de journée.',
        'Une activité motrice dans la journée (dépense douce).',
      ],
    },
  },
  {
    key: 'proprete', emoji: '🚽', label: 'Propreté',
    guide: {
      comprendre: 'L’apprentissage de la propreté peut prendre plus de temps : sensations corporelles perçues autrement, besoin de repères, appréhension des lieux. Les accidents ne sont pas de la provocation. On avance par étapes visibles.',
      instant: [
        'Restez neutre et rassurant à chaque accident.',
        'Accompagnez aux toilettes avec la même séquence à chaque fois.',
        'Félicitez chaque étape réussie (y aller, s’asseoir).',
        'Prévoyez de quoi changer sans dramatiser.',
      ],
      aEviter: [
        'Gronder ou montrer du dégoût après un accident.',
        'Changer sans cesse de méthode.',
        'Mettre la pression avec le regard des autres.',
      ],
      apres: 'Chaque petit pas se félicite. Notez les moments favorables (après le repas). La régularité et la bienveillance construisent la confiance nécessaire.',
      prevenir: [
        'Une séquence en 5 images affichée près du robinet et des toilettes.',
        'Des passages aux toilettes à horaires réguliers.',
        'Des vêtements faciles à gérer seul (autonomie).',
      ],
    },
  },
  {
    key: 'changement', emoji: '🔀', label: 'Changements / transitions',
    guide: {
      comprendre: 'Passer d’une activité à l’autre, un imprévu, une routine qui saute : c’est souvent très déstabilisant. Le monde devient soudain imprévisible. Rendre le changement visible et annoncé le rend supportable.',
      instant: [
        'Annoncez le changement avant qu’il arrive (« dans 5 minutes, on range »).',
        'Montrez ce qui vient ensuite avec une image.',
        'Utilisez une minuterie visuelle si possible.',
        'Marquez la fin par un petit rituel identique.',
      ],
      aEviter: [
        'Interrompre brutalement sans prévenir.',
        'Multiplier les imprévus le même jour.',
        'Se fâcher devant la résistance (c’est de l’angoisse).',
      ],
      apres: 'Si la transition s’est bien passée, reconnaissez-le. Si elle a été dure, notez le contexte : les transitions se préparent, et se travaillent en douceur.',
      prevenir: [
        'Un emploi du temps visuel de la journée.',
        'Prévenir systématiquement les changements (2 images).',
        'Des routines stables comme points d’ancrage.',
      ],
    },
  },
  {
    key: 'norep', emoji: '🗣️', label: 'Il ne répond pas (prénom, consignes)',
    guide: {
      comprendre: 'Ne pas répondre à son prénom ou à une consigne n’est souvent ni de l’indifférence ni de la désobéissance : l’information n’a pas été captée, ou le traitement prend plus de temps. Se mettre à sa portée change tout.',
      instant: [
        'Approchez-vous, à sa hauteur, dans son champ de vision.',
        'Attirez l’attention avant de parler (geste, objet).',
        'Une consigne courte, une seule à la fois.',
        'Laissez-lui le temps de traiter avant de répéter.',
      ],
      aEviter: [
        'Parler de loin, de dos, dans le bruit.',
        'Enchaîner plusieurs consignes.',
        'Conclure « il fait exprès » (souvent faux).',
      ],
      apres: 'Quand il répond ou suit la consigne, renforcez chaleureusement. Notez ce qui aide à capter son attention : c’est la clé de la communication.',
      prevenir: [
        'Suivre d’abord SON attention avant de la demander (JASPER).',
        'Associer le prénom à des moments positifs.',
        'Simplifier le langage : concret, court, appuyé d’images.',
      ],
    },
  },
  {
    key: 'retrait', emoji: '😢', label: 'Il semble triste / se retire',
    guide: {
      comprendre: 'Se replier, perdre l’envie, s’isoler : cela peut signaler de la fatigue, une surcharge, une douleur, ou un mal-être. L’enfant se protège. La présence douce, sans forcer, vaut mieux que la sollicitation.',
      instant: [
        'Approchez-vous doucement, sans envahir.',
        'Proposez une présence calme, pas une animation.',
        'Offrez son activité ou objet réconfortant.',
        'Vérifiez le confort de base (faim, douleur, bruit).',
      ],
      aEviter: [
        'Le forcer à jouer ou à parler.',
        'Multiplier les questions.',
        'Minimiser (« ce n’est rien »).',
      ],
      apres: 'S’il revient vers vous, accueillez-le simplement. Si le repli dure ou s’installe, parlez-en à un professionnel : un mal-être qui dure mérite un regard.',
      prevenir: [
        'Préserver des temps calmes et prévisibles.',
        'Repérer les signes de surcharge en amont.',
        'Nourrir ses intérêts et ses réussites (estime de soi).',
      ],
    },
  },
  {
    key: 'cris', emoji: '📢', label: 'Cris / sons forts',
    guide: {
      comprendre: 'Crier ou faire des sons forts peut être une auto-régulation, une demande, une réaction à un environnement trop bruyant, ou l’expression d’une émotion sans les mots. Le cri a souvent une fonction : la comprendre aide à répondre.',
      instant: [
        'Observez la fonction : demande, plaisir, ou trop-plein ?',
        'Réduisez le bruit ambiant autour de lui.',
        'Proposez un moyen de dire la même chose (carte, geste).',
        'Restez calme, baissez votre propre voix.',
      ],
      aEviter: [
        'Crier « chut » plus fort que lui.',
        'Céder systématiquement au cri (ça l’installe comme moyen).',
        'Le punir pour une auto-régulation.',
      ],
      apres: 'Renforcez chaque fois qu’il utilise un autre moyen que le cri. Notez les contextes : souvent, le cri baisse quand l’environnement et la communication s’améliorent.',
      prevenir: [
        'Enrichir la CAA pour dire « trop fort », « encore », « fini ».',
        'Réduire les environnements bruyants ou prévoir un casque.',
        'Anticiper les moments de surcharge sonore.',
      ],
    },
  },
];

export function situationByKey(key: string): ReagirSituation | undefined {
  return SITUATIONS.find((s) => s.key === key);
}
