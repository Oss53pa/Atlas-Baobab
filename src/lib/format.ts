/** Formatage — montants FCFA (jamais de float, CDC §2.2), dates, âge. */

/** Formate un montant en FCFA. Entrée en entier XOF (pas de centimes en UEMOA). */
export function formatXof(amount: number | bigint): string {
  const n = typeof amount === 'bigint' ? amount : Math.round(amount);
  const s = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${s} FCFA`;
}

const MOIS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function relativeDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return formatDate(iso);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const MOIS_LONG = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** Clé de mois stable (YYYY-MM) pour grouper et ancrer le Carnet. */
export function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'invalide';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Libellé de mois lisible : « juillet 2026 ». */
export function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${MOIS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** Libellé de jour complet : « lundi 7 juillet ». */
export function dayLabelFull(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS_LONG[d.getMonth()]}`;
}

/** Âge en années à partir d'une date de naissance ISO. */
export function ageYears(birthIso: string, now = new Date()): number {
  const b = new Date(birthIso);
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return Math.max(0, age);
}

/** Bande d'âge GPS (CDC §6). */
export function ageBand(birthIso: string): '3-6' | '7-12' | '13-18' | 'other' {
  const a = ageYears(birthIso);
  if (a >= 3 && a <= 6) return '3-6';
  if (a >= 7 && a <= 12) return '7-12';
  if (a >= 13 && a <= 18) return '13-18';
  return 'other';
}
