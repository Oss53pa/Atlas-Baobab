import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Mic, ChevronRight, X, Phone, Check } from 'lucide-react';
import { activeChild, twinProfile, useAppState } from '../lib/store.js';
import { SITUATIONS, situationByKey, REAGIR_SOURCE } from '../lib/reagir.js';
import type { View } from '../App.js';

const URGENT = [
  { key: 'crise', emoji: '🛡️', title: 'Crise / effondrement', desc: 'Guide d’apaisement immédiat · les gestes d’abord, les explications après' },
  { key: 'auto', emoji: '🫂', title: 'Il se fait mal', desc: 'Sécurité d’abord, gestes immédiats, et quand consulter' },
];
const GROUPS = [
  { title: 'Moments intenses', keys: ['refus', 'autrui', 'cris'] },
  { title: 'Le quotidien', keys: ['repas', 'nuit', 'proprete', 'changement'] },
  { title: 'Communication et repli', keys: ['norep', 'retrait', 'repetitif'] },
];
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function Reagir({ go }: { go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const name = child?.first_name ?? 'votre enfant';
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [listening, setListening] = useState(false);
  const recRef = useRef<unknown>(null);

  const helpedStats = useMemo(() => {
    const inc = state.incidents.filter((i) => i.child_id === child?.id);
    const freq = new Map<string, number>();
    for (const i of inc) for (const w of i.what_helped ?? []) freq.set(cap(w), (freq.get(cap(w)) ?? 0) + 1);
    return { total: inc.length, list: [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n })) };
  }, [state.incidents, child?.id]);

  const cortexCards = useMemo(() => {
    if (!child) return [];
    const top = helpedStats.list[0];
    const cards: { key: string; emoji: string; title: string; note: string }[] = [];
    for (const t of twinProfile(child.id, state).triggers.filter((x) => x.confidence !== 'faible').slice(0, 4)) {
      if (t.dimension === 'noise' || (t.dimension === 'suspected' && /bruit/i.test(t.value))) cards.push({ key: 'cris', emoji: '📢', title: 'Bruit fort, il se couvre les oreilles', note: top ? `Sa stratégie n°1 : ${top.label.toLowerCase()} (${top.n}/${helpedStats.total})` : 'Voir le guide' });
      else if (t.dimension === 'time') cards.push({ key: 'crise', emoji: '🎒', title: 'Fins de journée difficiles', note: `Guide d’apaisement adapté à ${name}` });
      else if (t.dimension === 'place') cards.push({ key: 'changement', emoji: '🔀', title: `Difficile au lieu « ${t.value} »`, note: 'Prévenir avec 2 images · à essayer' });
      else if (t.dimension === 'suspected') cards.push({ key: 'crise', emoji: '⚡', title: `« ${cap(t.value)} »`, note: top ? `${top.label} aide souvent` : 'Voir le guide' });
    }
    const seen = new Set<string>();
    return cards.filter((c) => (seen.has(c.key) ? false : (seen.add(c.key), true))).slice(0, 3);
  }, [child, state, helpedStats, name]);

  function dictate() {
    const w = window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => { lang: string; onresult: (e: unknown) => void; onend: () => void; start: () => void; stop: () => void }) | undefined;
    if (!Ctor) return;
    if (listening) { (recRef.current as { stop: () => void } | null)?.stop(); return; }
    const rec = new Ctor(); rec.lang = 'fr-FR';
    rec.onresult = (e: unknown) => { const ev = e as { results: ArrayLike<ArrayLike<{ transcript: string }>> }; let t = ''; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; setSearch(t.trim()); };
    rec.onend = () => setListening(false);
    recRef.current = rec; setListening(true);
    try { rec.start(); } catch { setListening(false); }
  }

  const q = search.trim().toLowerCase();
  const matches = q ? SITUATIONS.filter((s) => s.label.toLowerCase().includes(q)) : [];

  return (
    <div className="reveal">
      <h2 style={{ fontSize: 24 }}>Que se passe-t-il ?</h2>
      <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px 16px' }}>Choisissez ce que vous observez. CORTEX vous guide, pas à pas, avec ce qui marche <b style={{ color: 'var(--radar-green)' }}>chez {name}</b>.</p>

      <div className="rg-search">
        <span className="rg-search-in"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Décrivez en un mot : « il refuse le bain », « il crie »…" /></span>
        <button className={`rg-mic ${listening ? 'on' : ''}`} onClick={dictate}><Mic size={16} /> {listening ? 'À l’écoute…' : 'Dites-le'}</button>
      </div>

      {q ? (
        <>
          <div className="rg-sec">{matches.length} guide{matches.length > 1 ? 's' : ''} pour « {search} »</div>
          <div className="rg-groups"><div className="rg-group" style={{ gridColumn: '1 / -1' }}>
            {matches.map((s) => <GuideRow key={s.key} s={s} onOpen={() => setOpenKey(s.key)} />)}
            {matches.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Aucun guide ne correspond. Essayez « crise », « refus », « sommeil », « bruit »…</p>}
          </div></div>
        </>
      ) : (
        <>
          <div className="rg-sec danger">Maintenant · besoin d’aide immédiate</div>
          <div className="rg-urgent">
            {URGENT.map((u) => (
              <button className="rg-ucard" key={u.key} onClick={() => setOpenKey(u.key)}>
                <span className="rg-ucard-ic">{u.emoji}</span>
                <span className="grow"><span className="rg-ucard-t">{u.title}</span><span className="rg-ucard-d">{u.desc}</span></span>
                <ChevronRight size={20} color="var(--radar-red)" />
              </button>
            ))}
          </div>

          {cortexCards.length > 0 && (
            <>
              <div className="rg-sec">Chez {name}, en ce moment <span className="r">d’après vos 30 derniers jours</span></div>
              <div className="rg-mine">
                {cortexCards.map((c) => (
                  <button className="rg-mcard" key={c.key + c.title} onClick={() => setOpenKey(c.key)}>
                    <div className="rg-mcard-t">{c.emoji} {c.title}</div>
                    <div className="rg-mcard-d">{c.note}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="rg-sec">Tous les guides</div>
          <div className="rg-groups">
            {GROUPS.map((grp) => (
              <div className="rg-group" key={grp.title}>
                <h3>{grp.title}</h3>
                {grp.keys.map((k) => { const s = situationByKey(k); return s ? <GuideRow key={k} s={s} onOpen={() => setOpenKey(k)} /> : null; })}
              </div>
            ))}
          </div>
        </>
      )}

      <p className="muted mono" style={{ fontSize: 10.5, textAlign: 'center', margin: '22px 0 0' }}>{REAGIR_SOURCE} · adapté à {name} par CORTEX</p>

      {openKey && <GuideOverlay sitKey={openKey} onClose={() => setOpenKey(null)} go={go} />}
    </div>
  );
}

function GuideRow({ s, onOpen }: { s: { emoji: string; label: string }; onOpen: () => void }) {
  const [title, sub] = s.label.includes('(') ? [s.label.split('(')[0].trim(), s.label.split('(')[1]?.replace(')', '')] : [s.label, ''];
  return (
    <button className="rg-g" onClick={onOpen}>
      <span className="rg-g-ic">{s.emoji}</span>
      <span className="grow"><span className="rg-g-t">{title}</span>{sub && <span className="rg-g-d">{sub}</span>}</span>
      <ChevronRight size={16} className="rg-g-ch" />
    </button>
  );
}

// ── Guide 5 volets (overlay) ────────────────────────────────────────────────

const VOLETS = [
  { k: 'instant', tag: 'Dans l’instant · les gestes qui marchent chez', title: 'D’abord, on apaise.' },
  { k: 'aEviter', tag: 'À éviter · sans jugement, on est tous passés par là', title: 'Les pièges naturels' },
  { k: 'comprendre', tag: 'Comprendre · 30 secondes', title: 'Ce n’est pas un caprice.' },
  { k: 'apres', tag: 'Après · quand le calme revient', title: 'Reconnecter, sans rejouer le match.' },
  { k: 'prevenir', tag: 'Pour que ça arrive moins · le fond', title: 'Cette semaine' },
] as const;

function GuideOverlay({ sitKey, onClose, go }: { sitKey: string; onClose: () => void; go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const sit = situationByKey(sitKey)!;
  const name = child?.first_name ?? 'votre enfant';
  const [vi, setVi] = useState(0);
  const [fb, setFb] = useState<string | null>(null);
  const g = sit.guide;

  const helped = useMemo(() => {
    const inc = state.incidents.filter((i) => i.child_id === child?.id);
    const freq = new Map<string, number>();
    for (const i of inc) for (const w of i.what_helped ?? []) freq.set(cap(w), (freq.get(cap(w)) ?? 0) + 1);
    return { total: inc.length, list: [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n })) };
  }, [state.incidents, child?.id]);

  const triggerLine = useMemo(() => {
    if (!child) return '';
    const t = twinProfile(child.id, state).triggers.filter((x) => x.confidence !== 'faible')[0];
    if (!t) return '';
    const w = { place: `au lieu « ${t.value} »`, people: `avec « ${t.value} »`, noise: 'quand il y a du bruit fort', time: { morning: 'le matin', afternoon: 'l’après-midi', evening: 'en fin de journée', night: 'la nuit' }[t.value] ?? '', suspected: `autour de « ${t.value} »` }[t.dimension] ?? '';
    return w ? `Chez ${name}, ça survient surtout ${w}, quand le réservoir est déjà vide.` : '';
  }, [child, state, name]);

  const volet = VOLETS[vi].k;
  const last = vi === VOLETS.length - 1;

  return createPortal(
    <div className="modal-scrim" onClick={onClose}>
      <div className="rg-guide" onClick={(e) => e.stopPropagation()}>
        <div className="rg-ghead">
          <span style={{ fontSize: 20 }}>{sit.emoji}</span>
          <span className="rg-ghead-t">{sit.label.split('(')[0].trim()} · adapté à {name}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="rg-dots">{VOLETS.map((_, i) => <span key={i} className={i <= vi ? 'on' : ''} />)}</div>

        <div className="rg-gbody">
          {sit.safety && vi === 0 && (
            <div className="rg-avoid" style={{ background: 'color-mix(in srgb, var(--radar-red) 12%, var(--surface))', borderColor: 'var(--radar-red)', marginBottom: 12 }}>
              <b>La sécurité d’abord.</b> Si {name} risque de se blesser, protégez-le et demandez vite l’avis d’un professionnel.
              <button className="btn" style={{ marginTop: 8 }} onClick={() => go('porte')}><Phone size={14} /> Structures près de chez vous</button>
            </div>
          )}

          <div className="rg-volet">
            <div className="rg-vtag">{VOLETS[vi].tag}{volet === 'instant' ? ` ${name}` : ''}</div>
            <h3 className="rg-vtitle">{VOLETS[vi].title}{volet === 'prevenir' ? ` · 3 actions` : ''}</h3>

            {volet === 'instant' && (
              <>
                {helped.list.slice(0, 2).map((h, i) => (
                  <div className="rg-step kessy" key={h.label}>
                    <span className="rg-step-n">{i + 1}</span>
                    <span className="rg-step-tx"><b>{cap(h.label)}</b>, d’emblée.<br /><small>⭐ sa stratégie n°{i + 1} — a aidé {h.n} fois sur {helped.total}</small></span>
                  </div>
                ))}
                {g.instant.map((step, i) => (
                  <div className="rg-step" key={i}><span className="rg-step-n">{helped.list.slice(0, 2).length + i + 1}</span><span className="rg-step-tx">{step}</span></div>
                ))}
              </>
            )}

            {volet === 'aEviter' && g.aEviter.map((a, i) => <div className="rg-avoid" key={i}><b>{a.split('(')[0].trim()}</b>{a.includes('(') ? ` — ${a.split('(')[1]?.replace(')', '')}` : ''}</div>)}

            {volet === 'comprendre' && (
              <>
                <p className="rg-p">{g.comprendre}</p>
                {triggerLine && <p className="rg-p" style={{ marginTop: 10 }}><b>{triggerLine}</b></p>}
              </>
            )}

            {volet === 'apres' && <p className="rg-p">{g.apres}</p>}

            {volet === 'prevenir' && g.prevenir.map((p, i) => <div className="rg-step" key={i}><span className="rg-step-n">{['🖼️', '💬', '🧺'][i] ?? '·'}</span><span className="rg-step-tx">{p}</span></div>)}
          </div>
        </div>

        <div className="rg-gfoot">
          {!last ? (
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-block" onClick={() => setVi((v) => Math.max(0, v - 1))} disabled={vi === 0} style={{ flex: 1 }}>‹ Retour</button>
              <button className="btn btn-accent btn-block" onClick={() => setVi((v) => v + 1)} style={{ flex: 1 }}>Suivant ›</button>
            </div>
          ) : fb ? (
            <p className="muted" style={{ fontSize: 13.5, textAlign: 'center' }}><Check size={15} style={{ verticalAlign: -2 }} /> {fb === 'plan' ? 'Ajouté à votre plan — on vous proposera les activités liées.' : `Merci. CORTEX affine les stratégies pour ${name}.`}</p>
          ) : (
            <div className="rg-fb">
              <div className="rg-fb-q">Est-ce que ça a aidé ?</div>
              <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
                <button className="btn" onClick={() => setFb('Oui')}>👍 Oui</button>
                <button className="btn" onClick={() => setFb('En partie')}>😐 En partie</button>
                <button className="btn" onClick={() => setFb('Non')}>👎 Non</button>
              </div>
              <button className="btn btn-accent btn-block" style={{ marginTop: 10 }} onClick={() => setFb('plan')}>＋ Ajouter les 3 actions à notre plan</button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
