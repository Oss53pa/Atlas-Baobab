/**
 * Rapports (module M7) : toute la valeur des observations, au format que le monde
 * réel comprend. Le parent choisit un gabarit, un destinataire, une période, et
 * SECTION PAR SECTION ce qu'il partage — décoché = absent du document, vraiment.
 * Chaque rapport émis est scellé (SHA-256) et immuable ; aucun envoi automatique.
 */
import type { AppState, Child } from './types.js';
import { portrait, bilanDomain } from './bilan.js';
import { helpsForChild, HELP_BADGE_LABEL } from './coach.js';
import { acquiredCompetences } from './store.js';

export interface Gabarit { key: string; title: string; pages: string; audience: string; }
export const GABARITS: Gabarit[] = [
  { key: 'pro', title: 'Rapport professionnel complet', pages: '6–12 pages', audience: 'orthophoniste, psychologue, médecin' },
  { key: 'ecole', title: 'Synthèse école', pages: '2 pages', audience: 'enseignant·e, encadrant' },
  { key: 'famille', title: 'Point famille', pages: '1 page', audience: 'grands-parents, nounou' },
  { key: 'institution', title: 'Dossier institutionnel', pages: '3–5 pages', audience: 'administrations' },
];
export function gabaritOf(key: string): Gabarit {
  return GABARITS.find((g) => g.key === key) ?? GABARITS[0];
}

export interface Section { key: string; label: string; def: boolean; note?: string; }
export const SECTIONS: Section[] = [
  { key: 'portrait', label: 'Portrait par domaines (Bilan 360)', def: true },
  { key: 'acquis', label: 'Trajectoire des acquisitions — et comment il les a acquises', def: true },
  { key: 'caa', label: 'Sa communication (CAA) : vocabulaire, spontanéité', def: true },
  { key: 'aide', label: 'Ce qui l’aide (journal, activités, Coach)', def: true },
  { key: 'journal', label: 'Journal détaillé & événements de vie', def: false, note: 'Décoché par défaut — souvenirs sensibles, à vous de décider.' },
  { key: 'enfant', label: '« Ce qu’il en dit » (volet enfant)', def: false, note: 'Partagé uniquement avec votre accord ET le sien.' },
];

const MENTION = 'Observations d’usage issues de l’application. Ne constitue ni un bilan ni un diagnostic.';

export interface BuildOpts { childId: string; gabarit: string; recipient: string; period: string; sections: string[]; }

/** Construit le corps HTML du rapport à partir des vraies données + des sections cochées. */
export function buildReport(state: AppState, child: Child, opts: BuildOpts): { title: string; html: string } {
  const g = gabaritOf(opts.gabarit);
  const parts: string[] = [];
  const has = (k: string) => opts.sections.includes(k);

  parts.push(`<header><h1>${g.title}</h1><p class="meta">${child.first_name} · ${opts.period} · pour ${escapeHtml(opts.recipient)}</p></header>`);

  if (has('portrait')) {
    const rows = portrait(child.id, state)
      .filter((t) => t.now !== null)
      .map((t) => `<tr><td>${bilanDomain(t.domain).label}</td><td>${pct(t.prev)}</td><td>${pct(t.now)}</td></tr>`)
      .join('');
    parts.push(`<section><h2>Portrait par domaines</h2><table><thead><tr><th>Domaine</th><th>Il y a 3 mois</th><th>Aujourd’hui</th></tr></thead><tbody>${rows}</tbody></table><p class="soft">Décrit ${child.first_name} par rapport à lui-même, jamais à d’autres enfants.</p></section>`);
  }
  if (has('acquis')) {
    const acq = acquiredCompetences(child.id, state);
    parts.push(`<section><h2>Trajectoire des acquisitions</h2><p>${acq} compétence${acq > 1 ? 's' : ''} consolidée${acq > 1 ? 's' : ''} sur la période, à travers les jeux et les activités du quotidien. Le détail du « comment » (modalité, moment, étayage) accompagne chaque acquisition.</p></section>`);
  }
  if (has('caa')) {
    const cards = new Set(state.aacUsage.filter((u) => u.child_id === child.id).map((u) => u.card_id)).size;
    parts.push(`<section><h2>Sa communication (CAA)</h2><p>Vocabulaire actif : <b>${cards} carte${cards > 1 ? 's' : ''}</b> distincte${cards > 1 ? 's' : ''} utilisée${cards > 1 ? 's' : ''}. La spontanéité et les premières demandes sont suivies dans le temps.</p></section>`);
  }
  if (has('aide')) {
    const items = helpsForChild(child.id, state);
    const li = items.map((h) => `<li>${h.label} <em>(${HELP_BADGE_LABEL[h.badge].toLowerCase()})</em></li>`).join('');
    parts.push(`<section><h2>Ce qui l’aide</h2><ul>${li || '<li>À découvrir au fil des moments notés.</li>'}</ul></section>`);
  }
  if (has('journal')) {
    const obs = state.observations.filter((o) => o.child_id === child.id).slice(0, 8);
    const li = obs.map((o) => `<li>${escapeHtml(String(o.context?.moment_type ?? o.kind))} · intensité ${o.intensity ?? '—'}${o.context?.place ? ` · ${escapeHtml(String(o.context.place))}` : ''}</li>`).join('');
    parts.push(`<section><h2>Journal détaillé & événements</h2><ul>${li}</ul></section>`);
  }
  if (has('enfant')) {
    parts.push(`<section><h2>Ce qu’il en dit</h2><p class="soft">Recueilli avec son accord (volet enfant). — à compléter lors de la prochaine passation.</p></section>`);
  }

  parts.push(`<footer>${MENTION}</footer>`);
  return { title: g.title, html: parts.join('\n') };
}

function pct(v: number | null): string { return v === null ? '—' : `${Math.round(v * 100)} %`; }
function escapeHtml(s: string): string { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)); }

/** Empreinte SHA-256 (le sceau d'intégrité). */
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function hashShort(hex: string): string { return hex ? `${hex.slice(0, 4)}…${hex.slice(-4)}` : '…'; }

/** Ouvre le rapport dans une fenêtre imprimable (le PDF du monde réel). */
export function printReport(title: string, html: string): void {
  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) return;
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title} · Atlas Baobab</title>
    <style>
      body{font-family:'Dosis',system-ui,sans-serif;color:#2A2620;max-width:720px;margin:32px auto;padding:0 28px;line-height:1.55}
      h1{font-size:26px;margin:0 0 4px} h2{font-size:17px;margin:24px 0 8px;color:#1E4A38;border-bottom:1px solid #EAE1CE;padding-bottom:4px}
      .meta{color:#6E6558;font-weight:600;margin:0 0 8px} .soft{color:#6E6558;font-size:13px}
      table{width:100%;border-collapse:collapse;margin:8px 0} th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #EAE1CE;font-size:14px}
      th{color:#6E6558;font-weight:700} ul{margin:6px 0;padding-left:20px} li{margin:3px 0} em{color:#6E6558}
      footer{margin-top:32px;padding-top:12px;border-top:1px solid #EAE1CE;color:#6E6558;font-size:12px}
    </style></head><body>${html}<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}
