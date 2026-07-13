import { useMemo, useState } from 'react';
import { ClipboardCheck, ChevronLeft, ChevronRight, Volume2, UserPlus, Check, Hand } from 'lucide-react';
import { activeChild, actions, useAppState } from '../lib/store.js';
import {
  BILAN_DOMAINS, BILAN_QUESTIONS, BILAN_SCALE, RESPONDENTS, bilanDomain, questionsOf,
  portrait, trendLabel, crossViews, respondentProgress, type Respondent,
} from '../lib/bilan.js';
import { isHardTime } from '../lib/coach.js';
import { speak } from '../lib/tts.js';
import { Tabs } from '../components/Tabs.js';

export function Bilan() {
  const state = useAppState();
  const child = activeChild(state);
  const [respondent, setRespondent] = useState<Respondent>('maman');
  const [idx, setIdx] = useState(0);
  const [invited, setInvited] = useState(false);
  const [voletAsked, setVoletAsked] = useState(false);
  const [tab, setTab] = useState<'passation' | 'portrait' | 'voix'>('passation');

  const trends = useMemo(() => (child ? portrait(child.id, state) : []), [child, state]);
  const cross = useMemo(() => (child ? crossViews(child.id, state) : []), [child, state]);

  if (!child) return null;
  const hard = isHardTime(child.id, state);
  const month = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  const q = BILAN_QUESTIONS[idx];
  const dom = bilanDomain(q.domain);
  const domQs = questionsOf(q.domain);
  const posInDom = domQs.findIndex((x) => x.id === q.id) + 1;
  const current = state.bilanAnswers.find((a) => a.child_id === child.id && a.period === 'now' && a.respondent === respondent && a.question_id === q.id);

  function answer(level: number | null) {
    actions.setBilanAnswer(respondent, q.id, level);
    if (idx + 1 < BILAN_QUESTIONS.length) setIdx(idx + 1);
  }
  function invite() {
    try { navigator.clipboard?.writeText('Rejoignez le Bilan 360 de ' + child!.first_name + ' sur Atlas Baobab (lien valable 14 jours).'); } catch { /* ignore */ }
    setInvited(true);
  }

  return (
    <div className="reveal bl-wrap">
      <div className="co-head">
        <p className="muted" style={{ fontSize: 14 }}>Où en est-il, partout, aux yeux de tous — y compris les siens.</p>
        <span className="pill-soft" style={{ textTransform: 'capitalize' }}>Bilan de {month} · en cours</span>
      </div>

      {hard && (
        <div className="co-hard">
          <Hand size={18} />
          <span><b>Bilan mis en pause pendant les temps difficiles</b> (et 14 jours après). Vos réponses déjà saisies sont gardées à la question près — rien n’est perdu.</span>
        </div>
      )}

      <Tabs tabs={[{ key: 'passation', label: 'La passation' }, { key: 'portrait', label: 'Le portrait' }, { key: 'voix', label: 'Sa voix' }]} active={tab} onChange={setTab} />

      {tab === 'passation' && <>
      {/* Les regards */}
      <div className="card">
        <div className="row between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div><h3 style={{ fontSize: 17 }}>Les regards de ce bilan</h3>
            <p className="muted" style={{ fontSize: 13 }}>Chacun répond seul, sans voir les autres — c’est ce qui rend le 360 honnête.</p></div>
          <button className="btn" onClick={invite}><UserPlus size={15} /> {invited ? 'Lien copié ✓' : 'Inviter un regard'}</button>
        </div>
        <div className="bl-reps">
          {RESPONDENTS.map((r) => {
            const n = respondentProgress(child.id, state, r.key);
            const total = BILAN_QUESTIONS.length;
            const done = n >= total;
            const status = r.key === 'enfant' ? 'Volet enfant · dès P3' : n === 0 ? 'Invité·e' : done ? 'Terminé' : `${n} / ${total}`;
            return (
              <button key={r.key} className={`bl-rep ${respondent === r.key ? 'on' : ''}`} onClick={() => { setRespondent(r.key); setIdx(0); }}>
                <span className="bl-rep-av" style={{ background: r.tint }}>{r.label.charAt(0)}</span>
                <span className="grow"><b>{r.label}</b><span>{status}</span></span>
                {done && <Check size={16} className="bl-rep-ok" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Passation */}
      <div className="card bl-quiz">
          <span className="co-tag">Passation · 1 question par écran</span>
          <div className="bl-qdom">{dom.label.toUpperCase()} · {posInDom} / {domQs.length} · <span style={{ color: 'var(--text-muted)' }}>répond : {RESPONDENTS.find((r) => r.key === respondent)?.label}</span></div>
          <h3 className="bl-q">{q.text}</h3>
          <button className="co-listen" style={{ margin: '2px 0 14px' }} onClick={() => speak(q.text)}><Volume2 size={13} /> Écouter</button>
          <div className="bl-scale">
            {BILAN_SCALE.map((lab, i) => (
              <button key={i} className={`bl-opt ${current?.level === i + 1 ? 'sel' : ''}`} onClick={() => answer(i + 1)}>{lab}</button>
            ))}
          </div>
          <button className="bl-dk" onClick={() => answer(null)}>Je ne sais pas / pas eu l’occasion d’observer</button>
          <div className="bl-nav">
            <button className="btn" disabled={idx === 0} onClick={() => setIdx(Math.max(0, idx - 1))}><ChevronLeft size={16} /> Précédent</button>
            <span className="muted" style={{ fontSize: 11.5, textAlign: 'center' }}>Question {idx + 1} / {BILAN_QUESTIONS.length} · vous pouvez vous arrêter, on reprendra ici</span>
            <button className="btn btn-primary" disabled={idx + 1 >= BILAN_QUESTIONS.length} onClick={() => setIdx(Math.min(BILAN_QUESTIONS.length - 1, idx + 1))}>Suivant <ChevronRight size={16} /></button>
          </div>
        </div>
      </>}

      {tab === 'portrait' && (
      <div className="bl-grid">
        {/* Portrait 360 */}
        <div className="card">
          <div className="row between" style={{ alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 17 }}>Portrait 360 · par domaine</h3>
          </div>
          <div className="bl-legend"><span><i className="prev" /> Il y a 3 mois</span><span><i className="now" /> Aujourd’hui</span></div>
          {trends.map((t) => (
            <div className="bl-domrow" key={t.domain}>
              <b>{bilanDomain(t.domain).label}</b>
              <span className="bl-dbar">
                {t.prev !== null && <i className="prev" style={{ width: `${t.prev * 100}%` }} />}
                {t.now !== null && <i className="now" style={{ width: `${t.now * 100}%` }} />}
              </span>
              <span className="bl-trend">{trendLabel(t)}</span>
            </div>
          ))}
          <p className="notice" style={{ marginTop: 10 }}>Ce portrait décrit {child.first_name} par rapport à lui-même, jamais à d’autres enfants. Ni test, ni diagnostic.</p>
        </div>
        {cross.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: 17 }}>Les regards croisés</h3>
            <p className="muted" style={{ fontSize: 13 }}>Les convergences rassurent, les écarts éclairent.</p>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cross.filter((c) => c.kind === 'accord').slice(0, 2).map((c) => (
                <div className="bl-regard" key={c.domain}><b>Maison et école d’accord :</b> {bilanDomain(c.domain).label.toLowerCase()} est un appui partagé. 🍃</div>
              ))}
              {cross.filter((c) => c.kind === 'ecart').slice(0, 2).map((c) => (
                <div className="bl-regard ecart" key={c.domain}><b>Un écart qui éclaire :</b> sur « {bilanDomain(c.domain).label.toLowerCase()} », les regards diffèrent — souvent selon le contexte (maison / groupe). C’est fréquent et ça se travaille.</div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {tab === 'voix' && (
      <div className="card bl-voix">
          <span className="pill-soft">SA VOIX DANS LE BILAN</span>
          <h3 style={{ fontSize: 17, marginTop: 10 }}>Proposer le volet enfant à {child.first_name} ?</h3>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>8 questions en images et en audio, 5 minutes, avec vous. Il peut s’arrêter à tout moment — un bouton « STOP » reste affiché en permanence, et l’Avatar dit simplement « merci de m’avoir dit ». Son avis n’est jamais partagé sans votre accord ET le sien.</p>
          {voletAsked ? (
            <div className="co-tried" style={{ marginTop: 12 }}><Check size={16} /> Volet enfant préparé — vous le lancerez depuis le mode enfant, à un moment calme.</div>
          ) : (
            <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => { setVoletAsked(true); speak('Volet enfant préparé.'); }}>Lui proposer</button>
              <button className="btn" onClick={() => setVoletAsked(false)}>Plus tard</button>
            </div>
          )}
      </div>
      )}
    </div>
  );
}
