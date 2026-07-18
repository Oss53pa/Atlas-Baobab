import { useEffect, useMemo, useRef, useState } from 'react';
import { Key } from 'lucide-react';
import { actions, activeChild, useAppState } from '../../lib/store.js';
import { avatarGlyph, ART } from '../../lib/avatars.js';
import { childRegistre, registreCopy } from '../../lib/paliers.js';
import { speak } from '../../lib/tts.js';
import { Caa } from './Caa.js';
import { CoinCalme } from './CoinCalme.js';
import { JouerHub } from './JouerHub.js';
import { MonArbre } from './MonArbre.js';

type ChildView = 'home' | 'caa' | 'calme' | 'game' | 'arbre';

export function ChildShell({ onExit, start = 'home' }: { onExit: () => void; start?: ChildView }) {
  const state = useAppState();
  const child = activeChild(state);
  const [view, setView] = useState<ChildView>(start);
  const [armed, setArmed] = useState<string | null>(null);
  const [intro, setIntro] = useState(start === 'home');
  const [closing, setClosing] = useState(false);
  const [exitHint, setExitHint] = useState(() => {
    try { return !localStorage.getItem('ab-exit-hint-seen'); } catch { return false; }
  });
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOver = useRef<boolean | null>(null);
  const preSignaled = useRef(false);

  // E0 · Rituel d'ouverture (CDC Mode Enfant §2) : séquence figée, identique à vie.
  useEffect(() => {
    if (!intro || !child) return;
    const staticMotion = child.avatar_motion === 'static';
    const dur = staticMotion ? 3000 : 6000;
    const key = `ab-opened-${child.id}-${new Date().toISOString().slice(0, 10)}`;
    let firstToday = false;
    try { firstToday = !localStorage.getItem(key); if (firstToday) localStorage.setItem(key, '1'); } catch { /* ignore */ }
    const jour = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][new Date().getDay()];
    const greet = setTimeout(() => speak(`Bonjour ${child.first_name}.${firstToday ? ` On est ${jour}.` : ''}`), staticMotion ? 700 : 2300);
    const end = setTimeout(() => setIntro(false), dur);
    return () => { clearTimeout(greet); clearTimeout(end); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro]);

  const usedSeconds = useMemo(() => {
    const today = new Date().toDateString();
    return state.gameSessions
      .filter((g) => g.child_id === child?.id && new Date(g.played_at).toDateString() === today)
      .reduce((sum, g) => sum + g.duration_seconds, 0);
  }, [state.gameSessions, child?.id]);

  // §5 pré-signal du sablier + §10 rituel de fermeture : déclenchés au fil du quota.
  useEffect(() => {
    if (!child) return;
    const qs = child.screen_quota_minutes * 60;
    const over = usedSeconds >= qs;
    const remain = qs - usedSeconds;
    if (!preSignaled.current && remain > 0 && remain <= 60) { preSignaled.current = true; speak('Bientôt, on range.'); }
    if (wasOver.current === null) { wasOver.current = over; return; } // pas de fermeture si on arrive déjà au bout
    if (over && !wasOver.current) { setClosing(true); speak(registreCopy(childRegistre(child.id, state)).closeSpeak(child.first_name)); }
    wasOver.current = over;
  }, [usedSeconds, child]);

  // Indice de sortie (parent) : affiché une seule fois, se retire seul après 7 s.
  useEffect(() => {
    if (!exitHint) return;
    const t = setTimeout(() => dismissExitHint(), 7000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitHint]);
  function dismissExitHint() {
    setExitHint(false);
    try { localStorage.setItem('ab-exit-hint-seen', '1'); } catch { /* ignore */ }
  }

  // Le rituel de fermeture se retire seul, en douceur (Loi : jamais d'arrêt brutal).
  useEffect(() => {
    if (!closing) return;
    const staticMotion = child?.avatar_motion === 'static';
    const t = setTimeout(() => setClosing(false), staticMotion ? 4000 : 5200);
    return () => clearTimeout(t);
  }, [closing, child]);

  if (!child) return null;
  const quotaSeconds = child.screen_quota_minutes * 60;
  const overQuota = usedSeconds >= quotaSeconds;
  const remainSeconds = quotaSeconds - usedSeconds;
  const remainFrac = Math.max(0, Math.min(1, remainSeconds / quotaSeconds));
  const preSignal = !overQuota && remainSeconds > 0 && remainSeconds <= 60;
  const isStatic = child.avatar_motion === 'static';
  const rc = registreCopy(childRegistre(child.id, state));

  const hr = new Date().getHours();
  const skyTop = hr < 11 ? '#F6EFDF' : hr < 18 ? '#F3EDE0' : '#F3E9E0';

  // Protocole « je ne suis pas bien » (CDC Kessy §6) : un tap, aucune confirmation,
  // toujours à la même place sur tous les écrans. Note neutre + redirection immédiate
  // vers Ma Bulle, aucun nouveau choix à faire en pleine détresse.
  function distress() {
    actions.logChildPause();
    setView('calme');
  }

  const wrap = (node: React.ReactNode) => (
    <div data-theme={child.active_theme} style={{ minHeight: '100vh' }}>
      {node}
      <button className="cs-distress" onClick={distress} aria-label="Une pause">
        {child.exit_pictogram ?? '🫧'}
      </button>
      <ParentButton onHold={onExit} theme={child.active_theme} />
      {exitHint && (
        <button className="cs-exit-hint" onClick={dismissExitHint}>
          <Key size={15} style={{ flex: '0 0 auto', marginTop: 1 }} />
          <span>Appui long sur la clé pour revenir<small>Espace parent · 3 secondes</small></span>
        </button>
      )}
      {/* §10 · Rituel de fermeture : au revoir doux quand le temps est fini */}
      {closing && (
        <div className="cs-close" data-static={String(isStatic)}>
          <span className="cs-close-av">{avatarGlyph(child.avatar_key, 4)}</span>
          <span className="cs-close-msg">{rc.closeMsg}</span>
        </div>
      )}
    </div>
  );
  if (view === 'caa') return wrap(<Caa onExit={() => setView('home')} />);
  if (view === 'calme') return wrap(<CoinCalme onExit={() => setView('home')} />);
  if (view === 'game') return wrap(<JouerHub onExit={() => setView('home')} onBulle={() => setView('calme')} />);
  if (view === 'arbre') return wrap(<MonArbre onExit={() => setView('home')} />);

  // 1er tap : dit le nom + arme ; 2e tap sur la même zone : navigue.
  function tapZone(key: string, label: string, action?: () => void) {
    speak(label);
    if (armed === key && action) { setArmed(null); action(); return; }
    setArmed(key);
    if (armTimer.current) clearTimeout(armTimer.current);
    armTimer.current = setTimeout(() => setArmed(null), 2600);
  }
  return wrap(
    <div className={`child-scene ${isStatic ? 'static' : ''}`} data-theme={child.active_theme}>
      {/* En-tête d'accueil chaleureux */}
      <div className="cs-greet" aria-hidden>
        <h1>Salut {child.first_name} <span className="cs-wave">👋</span></h1>
        <p>Que veux-tu faire aujourd’hui ?</p>
        <span className="cs-greet-div"><i /><span>🌿</span><i /></span>
      </div>
      <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={skyTop} /><stop offset="1" style={{ stopColor: 'var(--bg)' }} /></linearGradient>
        </defs>
        <rect width="1000" height="620" fill="url(#cs-sky)" />
        <circle cx="812" cy="104" r="46" fill="#F4D98C" opacity=".9" />
        <circle cx="812" cy="104" r="66" fill="#F4D98C" opacity=".22" />
        {/* Nuages doux */}
        <g fill="#FFFFFF" opacity=".92" className={isStatic ? '' : 'cs-floaty'}>
          <ellipse cx="716" cy="150" rx="34" ry="18" />
          <ellipse cx="750" cy="142" rx="24" ry="15" />
          <ellipse cx="686" cy="144" rx="20" ry="12" />
        </g>
        <ellipse cx="176" cy="96" rx="26" ry="14" fill="#FFFFFF" opacity=".8" />
        <ellipse cx="204" cy="90" rx="18" ry="11" fill="#FFFFFF" opacity=".8" />
        {/* Feuilles qui flottent */}
        <g className={isStatic ? '' : 'cs-leaf1'} style={{ fill: 'color-mix(in srgb, var(--primary) 55%, #fff)' }}>
          <path d="M596 118 q20 -12 34 4 q-16 16 -34 -4 Z" />
        </g>
        <g className={isStatic ? '' : 'cs-leaf2'} style={{ fill: 'color-mix(in srgb, var(--accent) 62%, #fff)' }}>
          <path d="M902 250 q16 -10 28 3 q-13 13 -28 -3 Z" />
        </g>
        {/* Décor illustré : baobab, mare (Ma bulle), Bibo, panier (Jouer) */}
        <image href="/child/decor.webp" x="0" y="0" width="1000" height="620" preserveAspectRatio="xMidYMid slice" />
        {/* Sablier du quota, par-dessus le décor (près du panier « Jouer ») */}
        <g transform="translate(812,352)" className={preSignal ? 'cs-hourglass presignal' : 'cs-hourglass'}>
          <rect x="0" y="0" width="52" height="12" rx="6" fill="#EFE8D8" />
          <rect x="0" y="0" width={Math.round(52 * remainFrac)} height="12" rx="6" style={{ fill: 'var(--primary)' }} />
        </g>
      </svg>

      {/* Zones tactiles géantes */}
      <button className="cs-zone" style={{ left: '3%', top: '17%', width: '35%', height: '50%' }} onClick={() => tapZone('arbre', 'Mon arbre', () => setView('arbre'))}>
        <span className="cs-zlabel" style={{ bottom: '8%' }}><img className="cs-zi-img" src={ART.arbre} alt="" aria-hidden /><span>Mon arbre</span><span className="cs-zc">›</span></span>
      </button>
      <button className={`cs-zone ${overQuota ? 'muted' : ''}`} style={{ left: '62%', top: '42%', width: '35%', height: '34%' }}
        onClick={() => overQuota ? speak(rc.quotaSpeak) : tapZone('jouer', 'Jouer', () => setView('game'))}>
        <span className="cs-zlabel" style={{ bottom: '3%' }}><span className="cs-zi">🧩</span><span>{overQuota ? rc.quotaZone : 'Jouer'}</span>{!overQuota && <span className="cs-zc">›</span>}</span>
      </button>
      <button className="cs-zone" style={{ left: '38%', top: '58%', width: '26%', height: '22%' }} onClick={() => tapZone('bulle', 'Ma bulle', () => setView('calme'))}>
        <span className="cs-zlabel" style={{ bottom: '2%' }}><span className="cs-zi">🫧</span><span>Ma bulle</span><span className="cs-zc">›</span></span>
      </button>
      <button className="cs-zone" style={{ left: '42%', top: '33%', width: '16%', height: '22%' }} onClick={() => speak(`Bonjour ${child.first_name} !`)} aria-label="Bibo" />

      {/* Je parle : barre permanente */}
      <button className="cs-talk" onClick={() => { speak('Je parle'); setView('caa'); }}>
        <span className="cs-talk-pic">💬</span><span className="cs-talk-name">Je parle</span>
      </button>

      {/* Bandeau de réassurance (doux, non interactif) */}
      <div className="cs-foot" aria-hidden>
        <span className="cs-foot-i"><b>🛡️</b> Sécurisé</span>
        <span className="cs-foot-i"><b>🌿</b> Bienveillant</span>
        <span className="cs-foot-i"><b>💚</b> À ton rythme</span>
      </div>

      {/* E0 · Rituel d'ouverture */}
      {intro && (
        <div className="cs-intro" data-static={String(isStatic)} aria-hidden>
          <span className="cs-intro-av">{avatarGlyph(child.avatar_key, 4)}</span>
        </div>
      )}
    </div>,
  );
}

/** Bouton Parent (CDC Mode Enfant §4) : discret mais découvrable. Un tap ne fait
 * rien (l'enfant apprend qu'il est « mort ») ; un appui long de 3 s remplit un
 * anneau puis ouvre l'espace parents (PIN). Présent sur tous les écrans enfant. */
function ParentButton({ onHold, theme }: { onHold: () => void; theme: string }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function start() {
    setHolding(true);
    timer.current = setTimeout(() => { setHolding(false); onHold(); }, 3000);
  }
  function cancel() {
    setHolding(false);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }
  return (
    <button className="cs-parent" data-theme={theme} onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel} aria-label="Espace parents">
      <svg className="cs-parent-ring" viewBox="0 0 44 44" aria-hidden>
        <circle className="track" cx="22" cy="22" r="20" />
        <circle className={`fill ${holding ? 'on' : ''}`} cx="22" cy="22" r="20" pathLength={100} />
      </svg>
      <Key size={19} />
    </button>
  );
}
