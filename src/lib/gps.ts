/**
 * GPS trajectoire (module M6) : des caps (objectifs) que la famille se donne, un
 * sentier de marches à franchir, et un itinéraire qui se RECALCULE quand une
 * méthode cesse de marcher — jamais de jugement, jamais de date butoir. Chaque
 * marche franchie devient un fruit sur le baobab de l'enfant (CX-01 §8).
 */
import type { AppState, Cap, Milestone } from './types.js';
import { uid } from './ids.js';

export const MAX_ACTIVE_CAPS = 3;

export interface CapTemplate { domain: string; title: string; milestones: string[]; }
export const CAP_TEMPLATES: CapTemplate[] = [
  { domain: 'Communication', title: 'Qu’il demande au lieu de crier', milestones: ['Utilise 1 carte à table', 'Demande avec sa carte, sur demande', 'Demande spontanément', 'Généralise à l’école'] },
  { domain: 'Autonomie', title: 'Qu’il s’habille seul le matin', milestones: ['Suit la séquence en images', 'Enfile le haut seul', 'S’habille en entier'] },
  { domain: 'Autonomie', title: 'Manger seul, proprement', milestones: ['Tient la cuillère', 'Mange seul un plat', 'Débarrasse son assiette'] },
  { domain: 'Sensoriel', title: 'Supporter le trajet du marché', milestones: ['Accepte le casque', 'Reste 5 min au marché', 'Fait un petit achat'] },
  { domain: 'Social', title: 'Jouer avec un autre enfant', milestones: ['Observe un autre enfant', 'Joue juste à côté', 'Partage un jeu'] },
  { domain: 'Autonomie', title: 'Se préparer pour dormir', milestones: ['Suit le rituel en images', 'Se brosse les dents avec aide', 'Va au lit sans lutte'] },
];

function buildMilestones(labels: string[], doneCount: number, at: string): Milestone[] {
  return labels.map((label, i) => {
    if (i < doneCount) return { id: uid(), label, status: 'done', done_at: at };
    if (i === doneCount) return { id: uid(), label, status: 'now' };
    return { id: uid(), label, status: 'future' };
  });
}

/** Amorce de démonstration : 2 caps actifs (dont un recalculé) + 1 en pause. */
export function seedCaps(childId: string, now = new Date()): Cap[] {
  const may = new Date(now.getTime() - 60 * 86400000).toISOString();
  const jun = new Date(now.getTime() - 22 * 86400000).toISOString();
  const paused = new Date(now.getTime() - 12 * 86400000).toISOString();
  const cap1: Cap = {
    id: uid(), child_id: childId, domain: 'Communication', title: 'Qu’il demande au lieu de crier',
    status: 'active', created_at: may,
    recalc: 'On passe par les photos de la maison — elles fonctionnent mieux que les pictos en ce moment. Rien n’est perdu, on prend juste un autre chemin.',
    milestones: [
      { id: uid(), label: 'Utilise 1 carte à table', status: 'done', done_at: may },
      { id: uid(), label: 'Demande avec sa carte, sur demande', status: 'done', done_at: jun },
      { id: uid(), label: 'Demande spontanément', status: 'now' },
      { id: uid(), label: 'Généralise à l’école', status: 'future' },
    ],
  };
  const cap2: Cap = {
    id: uid(), child_id: childId, domain: 'Autonomie', title: 'Qu’il s’habille seul le matin',
    status: 'active', created_at: jun,
    milestones: buildMilestones(['Suit la séquence en images', 'Enfile le haut seul', 'S’habille en entier'], 1, jun),
  };
  const cap3: Cap = {
    id: uid(), child_id: childId, domain: 'Sensoriel', title: 'Supporter le trajet du marché',
    status: 'paused', created_at: may, paused_at: paused,
    milestones: buildMilestones(['Accepte le casque', 'Reste 5 min au marché', 'Fait un petit achat'], 1, may),
  };
  return [cap1, cap2, cap3];
}

export function capProgress(cap: Cap): { done: number; total: number } {
  return { done: cap.milestones.filter((m) => m.status === 'done').length, total: cap.milestones.length };
}
export function capStatusLabel(cap: Cap): string {
  if (cap.status === 'paused') return 'En pause';
  if (cap.status === 'done') return 'Cap atteint 🎉';
  const { done, total } = capProgress(cap);
  if (done === 0) return 'On démarre';
  return done >= total - 1 ? 'Presque au bout' : 'En bonne route';
}
export function activeCaps(childId: string, state: AppState): Cap[] {
  return state.caps.filter((c) => c.child_id === childId && c.status === 'active');
}
export function pausedCaps(childId: string, state: AppState): Cap[] {
  return state.caps.filter((c) => c.child_id === childId && c.status === 'paused');
}
