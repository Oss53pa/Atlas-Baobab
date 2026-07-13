/**
 * Données de démonstration : ~3 semaines d'historique pour un enfant, afin que
 * le Jumeau (profil sensoriel, déclencheurs) et le Radar produisent des sorties
 * réalistes dès l'ouverture. Purement local ; remplaçable par de vraies saisies.
 */

import { defaultBoard } from './caa.js';
import { uid } from './ids.js';
import type { ActivityLog, AacUsageEvent, Child, GameSession, Incident, LifeEvent, Observation } from './types.js';

export interface SeedResult {
  child: Child;
  observations: Observation[];
  incidents: Incident[];
}

export function buildSeed(deviceId: string, now = new Date()): SeedResult {
  const childId = uid();
  const child: Child = {
    id: childId,
    first_name: 'Kessy',
    birth_date: isoDate(new Date(now.getFullYear() - 6, 2, 14)),
    active_theme: 'savane',
    screen_quota_minutes: 15,
    created_at: now.toISOString(),
    avatar_key: 'pousse',
    avatar_custom_name: 'Bibo',
    avatar_motion: 'slow',
  };

  const at = (daysAgo: number, hour: number, min = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };

  const observations: Observation[] = [];
  const incidents: Incident[] = [];
  const base = { child_id: childId, device_id: deviceId };

  // Sommeil quotidien (qualité variable ; aujourd'hui médiocre -> tension).
  for (let d = 0; d <= 20; d++) {
    const quality = d === 0 ? 2 : d % 5 === 0 ? 2 : d % 3 === 0 ? 3 : 4;
    observations.push({
      ...base, id: uid(), kind: 'sleep', intensity: quality,
      occurred_at: at(d, 7, 0), author: 'Maman',
      context: {},
    });
    // Repas
    observations.push({
      ...base, id: uid(), kind: 'meal', intensity: 3,
      occurred_at: at(d, 12, 30), author: d % 2 ? 'Aidant·e' : 'Maman',
      context: { place: 'maison' },
    });
  }

  // Charge sensorielle : hyper-réactivité auditive (x6) et visuelle (x5).
  const auditoryDays = [0, 2, 5, 8, 11, 14];
  for (const d of auditoryDays) {
    observations.push({
      ...base, id: uid(), kind: 'mood', intensity: 4, author: 'Maman',
      occurred_at: at(d, 16, 0),
      context: { place: 'marché', sensory: [{ channel: 'auditory', direction: 'hyper', intensity: 5 }] },
    });
  }
  const visualDays = [0, 3, 7, 10, 16];
  for (const d of visualDays) {
    observations.push({
      ...base, id: uid(), kind: 'mood', intensity: 4, author: 'Aidant·e',
      occurred_at: at(d, 15, 0),
      context: { sensory: [{ channel: 'visual', direction: 'hyper', intensity: 4 }] },
    });
  }

  // Crises récurrentes le soir (17h-18h30), surtout à l'école, bruit fort.
  const crisisDays: { d: number; place: string }[] = [
    { d: 1, place: 'école' }, { d: 4, place: 'école' }, { d: 8, place: 'marché' },
    { d: 11, place: 'école' }, { d: 15, place: 'école' }, { d: 18, place: 'marché' },
  ];
  for (const c of crisisDays) {
    const obsId = uid();
    observations.push({
      ...base, id: obsId, kind: 'incident', intensity: 5, author: c.place === 'école' ? 'Enseignant·e' : 'Maman',
      occurred_at: at(c.d, 17, 30),
      context: { place: c.place, noise_level: 5, people: ['enseignant'] },
    });
    incidents.push({
      id: uid(), child_id: childId, observation_id: obsId,
      started_at: at(c.d, 17, 30), ended_at: at(c.d, 17, 55),
      suspected_trigger: 'bruit', what_helped: ['coin calme', 'câlin'],
      context: { place: c.place, noise_level: 5, people: ['enseignant'] },
    });
  }

  // Aujourd'hui : rupture de routine + retour d'école (contexte déclencheur présent).
  observations.push({
    ...base, id: uid(), kind: 'event', intensity: 3, author: 'Enseignant·e',
    occurred_at: at(0, 17, 0),
    context: { place: 'école', routine_break: true, people: ['enseignant'] },
  });

  // Quelques réussites (îlots de compétence à venir).
  for (const d of [2, 6, 12]) {
    observations.push({
      ...base, id: uid(), kind: 'success', intensity: 4, author: d === 6 ? 'Papa' : 'Maman',
      occurred_at: at(d, 10, 0),
      context: { place: 'maison' },
    });
  }

  // Météo du jour (Journal Météo E4) sur ~3 semaines : nourrit le calendrier,
  // la semaine de l'accueil et la répartition du carnet. Quelques jours vides.
  const WX = [
    { wx: '☀️', label: 'Belle journée', intensity: 5 },
    { wx: '🌤️', label: 'Bonne journée', intensity: 4 },
    { wx: '⛅', label: 'Journée moyenne', intensity: 3 },
    { wx: '🌧️', label: 'Journée difficile', intensity: 2 },
    { wx: '⛈️', label: 'Très difficile', intensity: 1 },
  ];
  const wxPattern = [0, 1, 2, 1, 0, 2, 1, 3, 1, 4, 3, 1, 0, 2, 1, 0, 3, 1, 2, 0, 1];
  const wxSkip = new Set([3, 9, 14, 17]);
  for (let d = 0; d <= 20; d++) {
    if (wxSkip.has(d)) continue;
    const w = WX[wxPattern[d] ?? 1];
    observations.push({
      ...base, id: uid(), kind: 'weather', intensity: w.intensity,
      author: d % 4 === 0 ? 'Papa' : 'Maman', occurred_at: at(d, 20, 0),
      context: { weather: w.label, wx: w.wx },
    });
  }

  return { child, observations, incidents };
}

export function seedBoards(childId: string) {
  return { [childId]: defaultBoard() };
}

/** Séances d'activités de démonstration : progression réaliste sur ~3 semaines,
 * pour que la vue « Acquis » ait de la matière dès l'ouverture. */
export function seedActivityLogs(childId: string, deviceId = 'seed', now = new Date()): ActivityLog[] {
  const at = (daysAgo: number, hour = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  // [activity_id, domain, séances : jours-avant → niveau]
  const plan: [string, string, [number, number][]][] = [
    ['com-choice', 'communication', [[18, 2], [10, 3], [3, 4]]],
    ['com-name', 'communication', [[16, 2], [6, 3]]],
    ['aut-eat', 'autonomie', [[19, 2], [9, 3], [2, 4]]],
    ['aut-wash', 'autonomie', [[12, 1], [4, 2]]],
    ['mot-stack', 'motricite', [[15, 3], [5, 4]]],
    ['soc-turn', 'social', [[14, 1], [7, 2], [1, 3]]],
    ['cog-pair', 'cognition', [[13, 2], [3, 3]]],
    ['sen-texture', 'sensoriel', [[11, 1], [2, 2]]],
  ];
  const logs: ActivityLog[] = [];
  for (const [activity_id, domain, sessions] of plan) {
    for (const [daysAgo, level] of sessions) {
      logs.push({
        id: uid(), child_id: childId, activity_id, domain, level,
        occurred_at: at(daysAgo), author: 'Maman',
      });
    }
  }
  return logs.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

/** Historique CAA de démo (JV/CX-01 « Sa voix ») : le vocabulaire actif grandit,
 * avec une première émotion — de quoi montrer la trajectoire de communication. */
export function seedAacUsage(childId: string, now = new Date()): AacUsageEvent[] {
  const at = (daysAgo: number, hour = 11) => {
    const d = new Date(now); d.setDate(d.getDate() - daysAgo); d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const plan: [string, string, number][] = [
    ['Je veux', '🙋', 20], ['Manger', '🍚', 20], ['Encore', '➕', 19],
    ['Eau', '🚰', 14], ['Câlin', '🤗', 13], ['Je veux', '🙋', 12],
    ['Dehors', '🌳', 8], ['Content', '😀', 7], ['Jouer', '⚽', 6], ['Manger', '🍚', 6],
    ['Papa', '👨🏾', 3], ['École', '🏫', 3], ['Content', '😀', 2], ['Dehors', '🌳', 2], ['Eau', '🚰', 1],
  ];
  return plan.map(([label, picto, d]) => ({
    id: uid(), child_id: childId, card_id: `caa-${label.toLowerCase().replace(/\s+/g, '-')}`,
    label, picto, pressed_at: at(d),
  }));
}

/** Historique de jeu de démo (CX-01 §7 Profil d'apprentissage) : heures variées,
 * réussites plutôt le matin, temps de réaction qui baisse avec la familiarité —
 * de quoi faire émerger des tendances honnêtes (jamais fabriquées). */
export function seedGameSessions(childId: string, now = new Date()): GameSession[] {
  const at = (daysAgo: number, hour: number) => {
    const d = new Date(now); d.setDate(d.getDate() - daysAgo); d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  // [game_code, joursAvant, heure, niveau, hits, misses, durée, avg_rt_ms]
  const plan: [string, number, number, number, number, number, number, number][] = [
    ['memory_visual', 20, 10, 3, 4, 2, 60, 1850], ['memory_visual', 14, 10, 3, 5, 1, 60, 1450], ['memory_visual', 6, 9, 4, 5, 1, 55, 1200],
    ['suite', 18, 10, 3, 4, 2, 60, 1900], ['suite', 10, 15, 3, 3, 3, 60, 1750], ['suite', 4, 10, 3, 5, 1, 58, 1350],
    ['combien', 16, 16, 3, 3, 3, 60, 2000], ['combien', 8, 10, 3, 5, 1, 60, 1500],
    ['regarde', 12, 9, 3, 5, 0, 50, 1600], ['regarde', 3, 16, 3, 3, 2, 60, 1550],
    ['tambour', 15, 10, 3, 4, 1, 62, 1700], ['tambour', 5, 10, 3, 5, 1, 60, 1400],
    ['maison', 9, 9, 3, 4, 1, 65, 1800], ['chemin', 7, 16, 3, 3, 2, 70, 1950],
  ];
  return plan.map(([game_code, d, h, lvl, hits, misses, dur, rt]) => ({
    id: uid(), child_id: childId, game_code, difficulty_level: lvl, duration_seconds: dur,
    telemetry: { rounds: hits + misses, hits, misses, avg_reaction_ms: rt }, played_at: at(d, h),
  }));
}

/** Chronologie de vie de démo (CX-01 §5). */
export function seedLifeEvents(childId: string, now = new Date()): LifeEvent[] {
  const at = (daysAgo: number) => { const d = new Date(now); d.setDate(d.getDate() - daysAgo); return d.toISOString(); };
  return [
    { id: uid(), child_id: childId, kind: 'rentree', at: at(26) },
    { id: uid(), child_id: childId, kind: 'aidant', label: 'nouvelle nounou', at: at(11) },
  ];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
