import { useState } from 'react';
import { ChevronRight, ChevronLeft, Phone, ShieldCheck, Volume2, Share2, Bell, Check, WifiOff, Lock } from 'lucide-react';
import {
  AGE_BANDS, bandOf, LEVEL_COPY, scoreScreening, levelForBand,
  type ScreeningAnswer, type ScreeningItem, type AgeBandKey,
} from '../lib/screening.js';
import { DIRECTORY } from '../lib/directory.js';
import { actions } from '../lib/store.js';
import { speak } from '../lib/tts.js';

type Step = 'intro' | 'quiz' | 'result';
const BAND_EMOJI: Record<string, string> = { toddler: '👶', preschool: '🧒', school: '🎒', teen: '🧑' };
const TONE: Record<string, { icon: string; cls: string }> = { none: { icon: '☀️', cls: 'green' }, watch: { icon: '🌤️', cls: 'orange' }, advice: { icon: '🌧️', cls: 'red' } };

export function PorteEntree() {
  const [step, setStep] = useState<Step>('intro');
  const [bandKey, setBandKey] = useState<AgeBandKey>('toddler');
  const [answers, setAnswers] = useState<Record<string, ScreeningAnswer | 'skip'>>({});
  const [idx, setIdx] = useState(0);

  const band = bandOf(bandKey);
  const items: ScreeningItem[] = band.items;

  function start(b: AgeBandKey) { setBandKey(b); setAnswers({}); setIdx(0); setStep('quiz'); }
  function answer(a: ScreeningAnswer | 'skip') {
    const item = items[idx];
    const next = { ...answers, [item.id]: a };
    setAnswers(next);
    if (idx + 1 < items.length) setIdx(idx + 1);
    else {
      const scored: Record<string, ScreeningAnswer> = {};
      for (const [k, v] of Object.entries(next)) if (v !== 'skip') scored[k] = v;
      const score = scoreScreening(items, scored);
      actions.addScreeningResult({ age_band: bandKey, score, max: items.length, level: levelForBand(score, band) });
      setStep('result');
    }
  }

  if (step === 'intro') {
    return (
      <div className="reveal onb">
        <aside className="onb-aside">
          <div className="rp-hero">
            <div className="rp-tree">🌳</div>
            <h2 style={{ fontSize: 23, lineHeight: 1.3 }}>Vous vous posez des questions sur votre enfant ?</h2>
            <p className="muted" style={{ fontSize: 14.5, marginTop: 8, lineHeight: 1.55 }}>Vous avez bien fait de venir. Faisons le point ensemble, tranquillement. <b style={{ color: 'var(--text)' }}>Quelques questions simples, 5 minutes.</b> Personne d’autre que vous ne verra vos réponses.</p>
          </div>
          <div className="rp-trust">
            <span className="rp-t"><Check size={12} /> Gratuit</span>
            <span className="rp-t"><Lock size={12} /> Anonyme, sans compte</span>
            <span className="rp-t"><WifiOff size={12} /> Sans internet</span>
            <span className="rp-t"><Volume2 size={12} /> Questions à écouter</span>
          </div>
        </aside>

        <div className="onb-main">
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Quel âge a votre enfant ?</div>
            <div className="rp-ages">
              {AGE_BANDS.map((b) => (
                <button key={b.key} className="rp-age" onClick={() => start(b.key)}>
                  <span className="rp-age-e">{BAND_EMOJI[b.key]}</span>
                  <span className="grow"><span className="rp-age-t">{b.label}</span><span className="rp-age-d">{b.sub} · {b.items.length} questions</span></span>
                  <ChevronRight size={18} className="rp-age-ch" />
                </button>
              ))}
            </div>
          </div>

          <div className="card rp-know">
            <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>💛 <b>À savoir avant de commencer :</b> l’autisme n’est ni une malédiction, ni une faute des parents, ni un manque d’éducation. Et plus on comprend tôt, plus on peut aider.</p>
            <button className="rp-share" onClick={() => shareWa('Atlas Baobab — un outil gratuit pour faire le point sur le développement de son enfant, sans compte, sans internet.')}><Share2 size={14} /> Partager ces infos sur WhatsApp</button>
          </div>
          <p className="notice" style={{ textAlign: 'center', marginTop: 14 }}><ShieldCheck size={13} style={{ verticalAlign: -2 }} /> Outil de repérage, pas un diagnostic médical.</p>
        </div>
      </div>
    );
  }

  if (step === 'quiz') {
    const item = items[idx];
    const dom = itemIllus(item.text);
    return (
      <div className="reveal rp-wrap">
        <div className="rp-prog"><i style={{ width: `${(idx / items.length) * 100}%` }} /></div>
        <div className="rp-pcap">question {idx + 1} sur {items.length} · {band.label}</div>
        <div className="card">
          <div className="rp-illus">{dom}</div>
          <h3 style={{ fontSize: 18, lineHeight: 1.45 }}>{item.text}</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{item.example}</p>
          <button className="rp-aud" onClick={() => speak(item.text)}><Volume2 size={15} /> Écouter la question</button>
          <div className="rp-ans">
            <button className="rp-a" onClick={() => answer('oui')}>Oui</button>
            <button className="rp-a" onClick={() => answer('non')}>Non</button>
            <button className="rp-a rp-a-skip" onClick={() => answer('skip')}>Je ne sais pas<small>je n’ai pas eu l’occasion d’observer</small></button>
          </div>
          {idx > 0 && <button className="rp-back" onClick={() => setIdx(idx - 1)}><ChevronLeft size={14} /> Question précédente</button>}
        </div>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 12 }}>Vos réponses sont gardées 72 h si vous devez vous interrompre.</p>
      </div>
    );
  }

  // result
  const scored: Record<string, ScreeningAnswer> = {};
  for (const [k, v] of Object.entries(answers)) if (v !== 'skip') scored[k] = v;
  const score = scoreScreening(items, scored);
  const level = levelForBand(score, band);
  const copy = LEVEL_COPY[level];
  const tone = TONE[level];
  const domains = [...new Set(items.filter((it) => scored[it.id] === it.riskAnswer).map((it) => itemDomain(it.text)))].slice(0, 3);

  return (
    <div className="reveal rp-wrap">
      <div className={`card rp-res ${tone.cls}`}>
        <div className="rp-res-ic">{tone.icon}</div>
        <h2 style={{ fontSize: 19, marginTop: 6 }}>{copy.title}</h2>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{band.label} · {score} {score > 1 ? 'signaux repérés' : 'signal repéré'} sur {items.length}</p>
        {domains.length > 0 && level !== 'none' && (
          <div className="rp-doms">{domains.map((d) => <span key={d}>{d}</span>)}</div>
        )}
        <p style={{ fontSize: 14.5, marginTop: 10, lineHeight: 1.6 }}>{copy.body}</p>
        <div className="rp-notdiag"><ShieldCheck size={13} style={{ verticalAlign: -2 }} /> Ce résultat est un repérage, pas un diagnostic. Seul un professionnel peut évaluer votre enfant. Aucun score ne vous juge, ni vous, ni lui.</div>
      </div>

      {level !== 'none' && (
        <>
          <div className="section-title">Structures près de chez vous</div>
          {DIRECTORY.map((s) => (
            <div className="card" key={s.name} style={{ padding: 14, marginBottom: 10 }}>
              <div className="row between">
                <div><b style={{ fontSize: 14 }}>{s.name}</b><div className="muted" style={{ fontSize: 12 }}>{s.kind} · {s.city}</div></div>
                <a className="btn" href="tel:" onClick={(e) => e.preventDefault()} style={{ padding: 10 }}><Phone size={16} /></a>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="rp-res-cta">
        <button className="btn btn-accent btn-block btn-lg" onClick={() => alert('Un rappel sera proposé dans 3 mois.')}><Bell size={16} /> Me le rappeler dans 3 mois</button>
        <button className="btn btn-block" onClick={() => setStep('intro')}>Refaire le point</button>
      </div>
      <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>Le résultat ne se partage pas — il vous appartient. Les fiches d’information, elles, se partagent librement.</p>
      <button className="rp-share" style={{ margin: '10px auto 0', width: 'auto' }} onClick={() => shareWa('Atlas Baobab — repérage gratuit et fiches d’information sur l’autisme, sans compte.')}><Share2 size={14} /> Partager les fiches</button>
    </div>
  );
}

function shareWa(text: string) {
  try { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener'); } catch { /* ignore */ }
}

function itemIllus(text: string): string {
  const t = text.toLowerCase();
  if (/doigt|montre/.test(t)) return '👉';
  if (/yeux|regarde|regard/.test(t)) return '👀';
  if (/prénom|appelle/.test(t)) return '📣';
  if (/mot|phrase|parl|conversation|humour|sarcasme|picto|carte|demand/.test(t)) return '💬';
  if (/jou|semblant|imit/.test(t)) return '🧸';
  if (/ami|camarade|autres enfant|groupe|tour/.test(t)) return '👥';
  if (/bruit|lumièr|texture|sensible|odeur/.test(t)) return '🔊';
  if (/mouvement|balanc|répèt|gestes|tourner/.test(t)) return '🔁';
  if (/sourit|sourire|content|triste|émotion|ressent/.test(t)) return '🙂';
  if (/routine|change|imprévu|pareil|transition/.test(t)) return '🔀';
  if (/mange|repas|nuit|sommeil/.test(t)) return '🍚';
  return '🌱';
}
function itemDomain(text: string): string {
  const t = text.toLowerCase();
  if (/doigt|montre|apporte/.test(t)) return 'L’attention partagée';
  if (/yeux|regarde|regard/.test(t)) return 'Le regard partagé';
  if (/prénom|mot|phrase|parl|conversation|carte|picto|demand/.test(t)) return 'La communication';
  if (/ami|camarade|autres|groupe|tour|masqu/.test(t)) return 'Le social';
  if (/bruit|lumièr|texture|sensible|odeur/.test(t)) return 'Le sensoriel';
  if (/mouvement|balanc|répèt|gestes/.test(t)) return 'Les gestes répétés';
  if (/routine|change|imprévu|pareil|transition/.test(t)) return 'Les routines';
  if (/émotion|triste|humour|comprend|ressent|sourit/.test(t)) return 'Les émotions';
  return 'Le développement';
}
