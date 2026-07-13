import { useEffect, useMemo, useState } from 'react';
import { Stethoscope, School, Heart, Building2, Check, ShieldCheck, FileDown, Hand } from 'lucide-react';
import { activeChild, actions, getState, useAppState } from '../lib/store.js';
import {
  GABARITS, SECTIONS, gabaritOf, buildReport, sha256, hashShort, printReport,
} from '../lib/rapports.js';
import { isHardTime } from '../lib/coach.js';
import { Tabs } from '../components/Tabs.js';
import type { ReportRecord } from '../lib/types.js';

const GAB_ICON: Record<string, typeof Stethoscope> = { pro: Stethoscope, ecole: School, famille: Heart, institution: Building2 };
const PERIODS = ['Depuis le dernier rapport (janv. → juil.)', 'Le trimestre', 'Depuis le début (T0)'];

export function Rapports() {
  const state = useAppState();
  const child = activeChild(state);
  const [gabarit, setGabarit] = useState('pro');
  const [recipient, setRecipient] = useState('Dr K. Anoh — psychologue');
  const [period, setPeriod] = useState(PERIODS[0]);
  const [sections, setSections] = useState<Set<string>>(() => new Set(SECTIONS.filter((s) => s.def).map((s) => s.key)));
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [verify, setVerify] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'create' | 'emitted'>('create');

  const reports = useMemo(() => (child ? state.reports.filter((r) => r.child_id === child.id) : []), [child, state.reports]);

  // Empreintes affichées (le sceau) : SHA-256 du contenu, calculé à la volée.
  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Record<string, string> = {};
      for (const r of reports) out[r.id] = r.hash || await sha256(r.content);
      if (alive) setHashes(out);
    })();
    return () => { alive = false; };
  }, [reports]);

  if (!child) return null;
  const hard = isHardTime(child.id, state);

  function toggle(key: string) {
    setSections((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  async function generate() {
    const { title, html } = buildReport(getState(), child!, { childId: child!.id, gabarit, recipient, period, sections: [...sections] });
    const hash = await sha256(html);
    actions.addReport({ gabarit, recipient, period, sections: [...sections], hash, content: html });
    printReport(title, html);
  }
  async function doVerify(r: ReportRecord) {
    const h = await sha256(r.content);
    const expected = r.hash || hashes[r.id];
    setVerify((v) => ({ ...v, [r.id]: h === expected ? '✓ Intégrité vérifiée — ce document n’a pas été altéré.' : '⚠ Le contenu a changé.' }));
  }

  return (
    <div className="reveal rp2-wrap">
      <div className="co-head">
        <p className="muted" style={{ fontSize: 14 }}>Toute la valeur de vos observations, au format que le monde réel comprend.</p>
        <span className="pill-soft" style={{ background: 'var(--tile)', color: 'var(--text-muted)' }}>Aucun envoi automatique, jamais</span>
      </div>

      {hard && (
        <div className="co-hard">
          <Hand size={18} />
          <span><b>Temps difficile actif :</b> vos rapports restent disponibles, et l’épisode y figurera sobrement — une information précieuse pour votre professionnel.</span>
        </div>
      )}

      <Tabs tabs={[{ key: 'create', label: 'Créer un rapport' }, { key: 'emitted', label: `Mes rapports émis (${reports.length})` }]} active={tab} onChange={setTab} />

      {tab === 'create' && <>
      {/* 1 · Gabarit */}
      <div className="card">
        <h3 style={{ fontSize: 16 }}>1 · Choisissez le gabarit</h3>
        <div className="rp2-gabs">
          {GABARITS.map((g) => {
            const Icon = GAB_ICON[g.key] ?? Stethoscope;
            return (
              <button key={g.key} className={`rp2-gab ${gabarit === g.key ? 'on' : ''}`} onClick={() => setGabarit(g.key)}>
                <span className="rp2-gab-ic"><Icon size={20} /></span>
                <b>{g.title}</b>
                <span>{g.pages} · {g.audience}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2 + 3 */}
      <div className="card">
          <h3 style={{ fontSize: 16 }}>2 · Pour qui, sur quelle période</h3>
          <div className="row wrap" style={{ gap: 10, margin: '10px 0 18px' }}>
            <input className="field" style={{ flex: 1, minWidth: 180 }} value={recipient} onChange={(e) => setRecipient(e.target.value)} aria-label="Destinataire" />
            <select className="field" style={{ flex: 1, minWidth: 180 }} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Période">
              {PERIODS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>

          <h3 style={{ fontSize: 16 }}>3 · Ce que vous partagez — et rien d’autre</h3>
          <p className="muted" style={{ fontSize: 13 }}>Décoché = absent du document, vraiment.</p>
          <div className="rp2-consent">
            {SECTIONS.map((s) => (
              <button key={s.key} className="rp2-crow" onClick={() => toggle(s.key)}>
                <span className={`rp2-cb ${sections.has(s.key) ? 'on' : ''}`}>{sections.has(s.key) && <Check size={15} />}</span>
                <span><b>{s.label}</b>{s.note && <small>{s.note}</small>}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-accent btn-block btn-lg" style={{ marginTop: 16 }} onClick={generate}><FileDown size={17} /> Générer le rapport (PDF)</button>
          <p className="notice" style={{ marginTop: 10 }}>Mention sur chaque page : « Observations d’usage. Ne constitue ni un bilan ni un diagnostic. »</p>
        </div>
      </>}

      {tab === 'emitted' && (
      /* Rapports émis */
      <div className="card">
          <h3 style={{ fontSize: 16 }}>Mes rapports émis</h3>
          <p className="muted" style={{ fontSize: 13 }}>Un rapport émis ne se modifie jamais — on en émet un nouveau, daté.</p>
          <div className="rp2-list">
            {reports.map((r) => {
              const Icon = GAB_ICON[r.gabarit] ?? Stethoscope;
              return (
                <div className="rp2-doc" key={r.id}>
                  <span className="rp2-doc-ic"><Icon size={20} /></span>
                  <div style={{ minWidth: 0 }}>
                    <b>{gabaritOf(r.gabarit).title}</b>
                    <div className="rp2-doc-meta">{new Date(r.created_at).toLocaleDateString('fr-FR')} · {r.period} · {r.recipient}</div>
                    <div className="rp2-hash">SHA-256 · {hashShort(hashes[r.id] ?? r.hash)} · scellé</div>
                    {verify[r.id] && <div className="rp2-verify">{verify[r.id]}</div>}
                  </div>
                  <div className="rp2-doc-act">
                    <button className="btn" onClick={() => doVerify(r)}>Vérifier</button>
                    <button className="btn" onClick={() => printReport(gabaritOf(r.gabarit).title, r.content)}>Ouvrir</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rp2-seal"><ShieldCheck size={18} /> <span><b>Sceau d’intégrité :</b> chaque rapport porte une empreinte unique. Un professionnel peut vérifier qu’il n’a pas été modifié. C’est notre parole, scellée.</span></div>
      </div>
      )}
    </div>
  );
}
