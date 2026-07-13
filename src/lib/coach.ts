/**
 * Coach du jour (CDC module M4) : une leçon par jour, choisie pour CET enfant à
 * partir de ses moments sensibles (CORTEX), jamais plus. Contenu 100 % éditorial,
 * relu clinicien — aucun LLM (invariant CDC §4.4). La sélection est déterministe.
 */
import { twinProfile } from './store.js';
import type { AppState } from './types.js';

export interface Parcours { key: string; label: string; total: number; }
export const PARCOURS: Parcours[] = [
  { key: 'routines', label: 'Routines & transitions', total: 20 },
  { key: 'communiquer', label: 'Communiquer avec lui', total: 20 },
  { key: 'jouer', label: 'Jouer ensemble', total: 20 },
  { key: 'difficiles', label: 'Les moments difficiles', total: 20 },
  { key: 'autonomie', label: 'Autonomie du quotidien', total: 20 },
  { key: 'ecole', label: 'L’école et les autres', total: 20 },
  { key: 'fratrie', label: 'La fratrie et la famille', total: 20 },
  { key: 'vous', label: 'Et vous ?', total: 20 },
];
export function parcoursOf(key: string): Parcours {
  return PARCOURS.find((p) => p.key === key) ?? PARCOURS[0];
}

export interface Lesson {
  id: string;
  parcours: string;
  title: string;
  minutes: number;
  /** Mots-clés reliant la leçon aux déclencheurs / moments sensibles de l'enfant. */
  triggerKeys: string[];
  /** Leçon « régulation d'abord » servie en période de temps difficile. */
  tempsDifficile?: boolean;
  situation: string;
  pourLui: string;
  gestes: [string, string, string];
  /** Le geste à essayer aujourd'hui (une seule chose à la fois). */
  aujourdhui: string;
  siRate: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'dents', parcours: 'routines', title: 'Le brossage des dents, sans bataille', minutes: 5,
    triggerKeys: ['transition', 'soir', 'dents', 'routine', 'fin de journée'],
    situation: '« Chaque soir, c’est la lutte : il serre les dents, se détourne, parfois pleure. »',
    pourLui: 'La brosse, le goût, l’imprévu : beaucoup de sensations d’un coup. Ce n’est pas un caprice, c’est un trop-plein. La prévisibilité est son meilleur allié.',
    gestes: ['Annoncer avec l’image des dents, 5 minutes avant.', 'Toujours le même ordre, la même chanson courte.', 'Le laisser tenir la brosse d’abord, même sans brosser.'],
    aujourdhui: 'annoncer avec l’image des dents, 5 min avant',
    siRate: 'C’est normal, et ce n’est ni vous ni lui. Variante plus douce : juste poser la brosse près de lui pendant la chanson, sans rien demander. On réessaie demain.',
  },
  {
    id: 'changement', parcours: 'routines', title: 'Annoncer les changements avec une image', minutes: 5,
    triggerKeys: ['changement', 'transition', 'imprévu', 'programme'],
    situation: '« Dès que le programme change, tout dérape : il se fige, crie, refuse d’avancer. »',
    pourLui: 'L’imprévu, pour lui, c’est le sol qui se dérobe. Une image qui montre « ce qui vient après » lui rend le sol solide.',
    gestes: ['Montrer l’image du lieu ou de l’activité suivante.', 'Prévenir toujours au même délai (« dans 5 minutes »).', 'Laisser un temps de latence, sans le presser.'],
    aujourdhui: 'prévenir le prochain changement avec une image',
    siRate: 'Parfois il faut plusieurs jours. Variante : prévenir plus tôt encore, et rester tout près sans parler.',
  },
  {
    id: 'calme', parcours: 'difficiles', title: 'Revenir au calme, ensemble', minutes: 5,
    triggerKeys: ['crise', 'débordement', 'bruit', 'foule'], tempsDifficile: true,
    situation: 'Quand le trop-plein déborde, il n’y a plus de mots — ni pour lui, ni pour vous.',
    pourLui: 'En crise, il ne cherche pas à vous défier : son corps est submergé. Ce dont il a besoin, c’est moins, pas plus : moins de bruit, moins de lumière, moins de demandes.',
    gestes: ['Baisser la lumière et le bruit autour de lui.', 'Proposer la pression qui l’apaise (on sait qu’elle aide).', 'Rester à côté, en silence, sans rien demander.'],
    aujourdhui: 'préparer son coin calme avant le soir',
    siRate: 'S’il ne se calme pas tout de suite, ce n’est pas un échec : votre présence calme suffit déjà. Le reste peut attendre.',
  },
  {
    id: 'coin-calme', parcours: 'difficiles', title: 'Le coin calme, avant l’orage', minutes: 5,
    triggerKeys: ['bruit', 'foule', 'sensoriel', 'lumière'],
    situation: '« Je vois la crise monter, mais je ne sais jamais quoi faire au bon moment. »',
    pourLui: 'Un refuge préparé À L’AVANCE, quand tout va bien, devient un réflexe quand tout va mal. Il apprend qu’il a un endroit à lui.',
    gestes: ['Aménager ensemble un coin doux (natte, coussin, objet aimé).', 'Y aller parfois quand c’est calme, pour l’associer au bien-être.', 'Au premier signe de tension, le proposer sans l’imposer.'],
    aujourdhui: 'aménager son coin calme, à un moment tranquille',
    siRate: 'S’il n’y va pas encore seul, c’est déjà bien qu’il sache qu’il existe. Ça vient avec le temps.',
  },
  {
    id: 'deux-choix', parcours: 'communiquer', title: 'Offrir deux choix pour éviter le « non »', minutes: 5,
    triggerKeys: ['refus', 'attente', 'communication', 'demande'],
    situation: '« À chaque demande, c’est non. On dirait qu’il refuse par principe. »',
    pourLui: 'Le « non » global, c’est souvent le seul pouvoir qu’il a. Lui donner deux choix, c’est lui rendre du contrôle — et il coopère.',
    gestes: ['Proposer deux options qui vous conviennent toutes les deux.', 'Les montrer en images ou en objets, pas seulement en mots.', 'Accepter son choix aussitôt, même surprenant.'],
    aujourdhui: 'proposer deux choix pour une routine du jour',
    siRate: 'S’il ne choisit pas encore, choisissez pour lui en nommant : il apprend le mécanisme.',
  },
  {
    id: 'trois-secondes', parcours: 'communiquer', title: 'Attendre trois secondes de plus', minutes: 5,
    triggerKeys: ['communication', 'demande', 'langage'],
    situation: '« Je réponds ou je fais à sa place avant même qu’il ait essayé. »',
    pourLui: 'Il lui faut plus de temps pour traiter et répondre. Ces trois secondes de silence sont l’espace dont il a besoin pour se lancer.',
    gestes: ['Poser la question, puis compter trois secondes en silence.', 'Le regarder, sourire, sans remplir le vide.', 'S’il tente un son, un geste : accueillir comme une réponse.'],
    aujourdhui: 'attendre 3 secondes avant de l’aider',
    siRate: 'Le silence est inconfortable au début — pour vous. Tenez bon : c’est là qu’il apprend à prendre sa place.',
  },
  {
    id: 'cote-a-cote', parcours: 'jouer', title: 'Jouer côte à côte, sans forcer', minutes: 5,
    triggerKeys: ['social', 'jeu', 'partage'],
    situation: '« Il joue seul, dans son coin. J’ai peur de le déranger, ou de mal faire. »',
    pourLui: 'Le jeu parallèle — à côté, pas ensemble — est une vraie étape. En imitant son jeu sans l’envahir, vous devenez un partenaire sûr.',
    gestes: ['S’installer à côté avec le même type d’objet.', 'Imiter ce qu’il fait, à son rythme.', 'Attendre qu’il vous regarde avant d’en faire un peu plus.'],
    aujourdhui: 'jouer 5 min à côté de lui, en l’imitant',
    siRate: 'S’il s’éloigne, c’est OK : vous avez semé. Il reviendra quand ce sera sûr pour lui.',
  },
  {
    id: 'habillage', parcours: 'autonomie', title: 'S’habiller en images', minutes: 5,
    triggerKeys: ['autonomie', 'habillage', 'matin', 'transition'],
    situation: '« Le matin, l’habillage prend une heure et finit en pleurs. »',
    pourLui: 'Une suite d’étapes en images transforme une montagne en petits pas. Il voit le chemin, il sait où il va.',
    gestes: ['Afficher 4 photos des étapes, dans l’ordre.', 'Le laisser suivre les images, une à la fois.', 'N’aider que là où il bloque, pas avant.'],
    aujourdhui: 'afficher la séquence d’habillage en images',
    siRate: 'Réduisez à 2 étapes s’il se décourage. Réussir une petite chose seul vaut mieux que tout rater.',
  },
  {
    id: 'ecole-trajet', parcours: 'ecole', title: 'Préparer le trajet de l’école', minutes: 5,
    triggerKeys: ['école', 'transport', 'séparation', 'transition'],
    situation: '« Le départ à l’école, c’est chaque matin un déchirement. »',
    pourLui: 'La séparation est plus douce quand elle est prévisible et ritualisée. Un même « au revoir », chaque jour, le rassure.',
    gestes: ['Montrer sur une image la journée : école, puis retour.', 'Inventer un petit rituel d’au revoir, toujours le même.', 'Rester bref et confiant : votre calme le porte.'],
    aujourdhui: 'installer un rituel d’au revoir, toujours le même',
    siRate: 'Les pleurs au départ ne veulent pas dire que vous avez tort. Le rituel agit sur la durée.',
  },
  {
    id: 'souffler', parcours: 'vous', title: 'Souffler cinq minutes', minutes: 5,
    triggerKeys: ['vous', 'fatigue', 'épuisement'], tempsDifficile: true,
    situation: 'Une semaine rude vous a vidée. Et pourtant vous tenez, chaque jour.',
    pourLui: 'Ce n’est pas une leçon sur lui, mais sur vous — parce qu’un parent apaisé, c’est un enfant plus serein. Prendre soin de vous, c’est prendre soin de lui.',
    gestes: ['Poser cinq minutes rien qu’à vous, sans écran.', 'Respirer lentement, comme la bulle de l’enfant.', 'Se dire une phrase douce : « je fais de mon mieux, et c’est déjà beaucoup. »'],
    aujourdhui: 'm’accorder 5 minutes rien qu’à moi',
    siRate: 'Même une minute compte. Et demander de l’aide n’est pas un échec — c’est une force.',
  },
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

/** Période difficile : incidents rapprochés ces 7 derniers jours → le Coach passe
 * en douceur (régulation d'abord, bien-être parent au premier plan). */
export function isHardTime(childId: string, state: AppState, nowMs = Date.now()): boolean {
  const week = state.incidents.filter((i) => i.child_id === childId && nowMs - Date.parse(i.started_at) < 7 * 24 * 3600 * 1000);
  return week.length >= 3;
}

/** Leçon du jour, déterministe : régulation si temps difficile, sinon la leçon qui
 * répond au moment sensible dominant, sinon rotation stable par jour. */
export function lessonOfDay(childId: string, state: AppState, nowMs = Date.now()): { lesson: Lesson; why: string | null } {
  if (isHardTime(childId, state, nowMs)) {
    return { lesson: lessonById('calme')!, why: 'Cette semaine semble plus rude. On se concentre sur le calme — le reste attend.' };
  }
  const triggers = twinProfile(childId, state).triggers ?? [];
  for (const t of triggers) {
    const hay = `${t.dimension} ${t.value}`.toLowerCase();
    const match = LESSONS.find((l) => !l.tempsDifficile && l.triggerKeys.some((k) => hay.includes(k)));
    if (match) return { lesson: match, why: `Choisie parce que « ${t.value} » revient dans votre journal ces temps-ci.` };
  }
  const pool = LESSONS.filter((l) => !l.tempsDifficile);
  const dayIdx = Math.floor(nowMs / (24 * 3600 * 1000)) % pool.length;
  return { lesson: pool[dayIdx], why: null };
}

export type HelpBadge = 'observe' | 'tendance' | 'encore';
export interface HelpItem { label: string; badge: HelpBadge; }

/** « Ce qui aide {enfant} » : les stratégies qui reviennent (incidents.what_helped
 * + gestes de leçons marqués « ça a aidé »), avec badge d'honnêteté statistique. */
export function helpsForChild(childId: string, state: AppState): HelpItem[] {
  const freq = new Map<string, number>();
  const add = (raw: string) => { const k = raw.trim(); if (k) freq.set(cap(k), (freq.get(cap(k)) ?? 0) + 1); };
  for (const i of state.incidents) { if (i.child_id !== childId) continue; for (const h of i.what_helped ?? []) add(h); }
  for (const a of state.coachActions ?? []) {
    if (a.child_id === childId && a.feedback === 'helped') {
      const l = lessonById(a.lesson_id);
      if (l) add(l.aujourdhui);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, n]) => ({ label, badge: n >= 5 ? 'observe' : n >= 2 ? 'tendance' : 'encore' as HelpBadge }));
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

export const HELP_BADGE_LABEL: Record<HelpBadge, string> = {
  observe: 'OBSERVÉ', tendance: 'TENDANCE', encore: 'ON OBSERVE ENCORE',
};
