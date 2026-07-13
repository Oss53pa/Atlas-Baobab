import { useMemo, useState } from 'react';
import { Phone, Wind, Check } from 'lucide-react';
import { activeChild, actions, useAppState } from '../lib/store.js';
import type { View } from '../App.js';

/** Bibliothèque de guidances de crise (offline, CDC §8.3). Les stratégies qui ont
 * marché pour CET enfant remontent en premier (CDC §M3). */
const GUIDANCE = [
  { key: 'voix', text: 'Baissez la voix. Phrases très courtes. Un seul message à la fois.' },
  { key: 'sensoriel', text: 'Réduisez la charge : lumière douce, moins de bruit, éloignez la foule.' },
  { key: 'coin calme', text: 'Proposez le Coin Calme ou un espace à part, sans forcer.' },
  { key: 'câlin', text: 'Offrez un contact rassurant s’il l’accepte (pression, câlin).' },
  { key: 'objet', text: 'Donnez l’objet ou le rituel qui apaise d’habitude.' },
  { key: 'présence', text: 'Restez proche, peu de mots. Laissez la vague passer.' },
];

const TRIGGERS = ['bruit', 'foule', 'changement', 'faim', 'fatigue', 'lumière', 'transition'];
const HELPED = ['coin calme', 'câlin', 'objet', 'sortir', 'silence', 'eau'];

export function Crise({ go }: { go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const [startedAt] = useState(() => new Date().toISOString());
  const [phase, setPhase] = useState<'active' | 'debrief'>('active');
  const [suspected, setSuspected] = useState<string | null>(null);
  const [helped, setHelped] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'helped' | 'partial' | 'no' | null>(null);

  // Classe les guidances : celles qui ont aidé par le passé d'abord.
  const ranked = useMemo(() => {
    const counts = new Map<string, number>();
    for (const inc of state.incidents) {
      if (inc.child_id !== child?.id) continue;
      for (const w of inc.what_helped ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    return [...GUIDANCE].sort((a, b) => (counts.get(b.key) ?? 0) - (counts.get(a.key) ?? 0));
  }, [state.incidents, child?.id]);

  function finish() {
    actions.logCrisis({
      startedAt,
      endedAt: new Date().toISOString(),
      suspected: suspected ?? undefined,
      whatHelped: helped,
      feedback: feedback ?? undefined,
    });
    go('accueil');
  }

  if (phase === 'active') {
    return (
      <div className="reveal">
        <div className="card" style={{ background: 'color-mix(in srgb, var(--radar-red) 8%, var(--surface))' }}>
          <div className="section-title" style={{ margin: 0, color: 'var(--radar-red)' }}>Crise en cours · guidance</div>
          <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
            Respirez. Vous savez faire. Suivez une étape à la fois.
          </p>
        </div>

        <div className="stack" style={{ marginTop: 14 }}>
          {ranked.map((g, i) => (
            <div className="card" key={g.key} style={{ padding: 14 }}>
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <div className="ico" style={{ background: 'var(--tile)', fontWeight: 700 }}>{i + 1}</div>
                <p style={{ fontSize: 15, lineHeight: 1.5 }}>{g.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ gap: 10, marginTop: 16 }}>
          <button className="btn grow" onClick={() => go('enfant-calme')}><Wind size={18} /> Coin Calme</button>
          <a className="btn grow" href="tel:" onClick={(e) => e.preventDefault()}><Phone size={18} /> Appeler</a>
        </div>
        <button className="btn btn-accent btn-block" style={{ marginTop: 12 }} onClick={() => go('carte-calme')}>
          🌿 Montrer la Carte Calme
        </button>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => go('reagir')}>
          Voir tous les guides RÉAGIR →
        </button>
        <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }} onClick={() => setPhase('debrief')}>
          C’est passé
        </button>
      </div>
    );
  }

  return (
    <div className="reveal">
      <h2 style={{ fontSize: 20, margin: '4px 4px 10px' }}>Débrief en 4 taps</h2>

      <div className="card">
        <div className="section-title" style={{ margin: '0 0 10px' }}>Déclencheur supposé ?</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {TRIGGERS.map((t) => (
            <button key={t} className="chip" onClick={() => setSuspected(suspected === t ? null : t)}
              style={suspected === t ? { background: 'var(--radar-red)', color: '#fff', borderColor: 'transparent' } : undefined}>{t}</button>
          ))}
        </div>

        <div className="section-title">Qu’est-ce qui a aidé ?</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {HELPED.map((h) => (
            <button key={h} className="chip" onClick={() => setHelped((s) => s.includes(h) ? s.filter((x) => x !== h) : [...s, h])}
              style={helped.includes(h) ? { background: 'var(--primary)', color: 'var(--primary-ink)', borderColor: 'transparent' } : undefined}>{h}</button>
          ))}
        </div>

        <div className="section-title">La guidance a-t-elle aidé ?</div>
        <div className="row" style={{ gap: 8 }}>
          {([['helped', 'Oui'], ['partial', 'Un peu'], ['no', 'Non']] as const).map(([v, l]) => (
            <button key={v} className="btn grow" onClick={() => setFeedback(v)}
              style={feedback === v ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'transparent' } : undefined}>{l}</button>
          ))}
        </div>

        <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }} onClick={finish}>
          <Check size={18} /> Enregistrer
        </button>
      </div>
    </div>
  );
}
