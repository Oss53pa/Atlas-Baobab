import { useEffect, useMemo, useRef, useState } from 'react';
import { Key } from 'lucide-react';
import { activeChild, acquiredCompetences, growthPoints, useAppState } from '../../lib/store.js';
import { avatarGlyph, computeGrowthStage } from '../../lib/avatars.js';
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

  const acquired = acquiredCompetences(child.id, state);
  const stage = computeGrowthStage(growthPoints(child.id, state));
  const leaves = Math.min(6, acquired);
  const hasFruit = acquired >= 4 || stage >= 4;

  const hr = new Date().getHours();
  const skyTop = hr < 11 ? '#F6EFDF' : hr < 18 ? '#F3EDE0' : '#F3E9E0';

  const wrap = (node: React.ReactNode) => (
    <div data-theme={child.active_theme} style={{ minHeight: '100vh' }}>
      {node}
      <ParentButton onHold={onExit} theme={child.active_theme} />
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
  const LEAF = [
    { x: 176, y: 196, r: -20 }, { x: 238, y: 158, r: 12 }, { x: 292, y: 188, r: 28 },
    { x: 210, y: 242, r: -8 }, { x: 268, y: 240, r: 18 }, { x: 146, y: 238, r: -30 },
  ];

  return wrap(
    <div className={`child-scene ${isStatic ? 'static' : ''}`} data-theme={child.active_theme}>
      <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={skyTop} /><stop offset="1" style={{ stopColor: 'var(--bg)' }} /></linearGradient>
        </defs>
        <rect width="1000" height="620" fill="url(#cs-sky)" />
        <circle cx="810" cy="110" r="46" fill="#F2DFAE" opacity=".8" />
        <circle cx="810" cy="110" r="64" fill="#F2DFAE" opacity=".22" />
        <ellipse cx="230" cy="640" rx="560" ry="240" style={{ fill: 'color-mix(in srgb, var(--primary) 22%, var(--tile))' }} />
        <ellipse cx="820" cy="680" rx="620" ry="270" style={{ fill: 'color-mix(in srgb, var(--primary) 30%, var(--tile))' }} />

        {/* Baobab de l'enfant */}
        <g>
          <path d="M205 470 C200 380 190 340 208 300 C186 300 172 282 178 262 C150 268 132 246 142 226 C120 228 108 208 120 192 C138 168 196 158 232 176 C286 160 330 190 322 226 C348 234 350 266 326 278 C342 300 326 322 300 318 C310 360 300 400 296 470 Z" fill="#B98A5A" />
          <circle cx="150" cy="212" r="52" style={{ fill: 'color-mix(in srgb, var(--primary) 78%, #fff)' }} />
          <circle cx="222" cy="178" r="64" style={{ fill: 'color-mix(in srgb, var(--primary) 62%, #fff)' }} />
          <circle cx="300" cy="212" r="54" style={{ fill: 'color-mix(in srgb, var(--primary) 78%, #fff)' }} />
          <circle cx="232" cy="236" r="58" style={{ fill: 'color-mix(in srgb, var(--primary) 55%, #fff)' }} />
          <g fill="#EDF6EA">
            {LEAF.slice(0, leaves).map((l, i) => <ellipse key={i} cx={l.x} cy={l.y} rx="9" ry="14" transform={`rotate(${l.r} ${l.x} ${l.y})`} />)}
          </g>
          {hasFruit && (<><circle cx="252" cy="264" r="11" style={{ fill: 'var(--accent)' }} /><path d="M252 253 q3 -8 10 -9" stroke="#B98A5A" strokeWidth="3" fill="none" strokeLinecap="round" /></>)}
        </g>

        {/* Natte + panier (Jouer) + sablier du quota */}
        <g transform="translate(700,362)">
          <ellipse cx="60" cy="86" rx="130" ry="34" style={{ fill: 'color-mix(in srgb, var(--accent) 22%, var(--tile))' }} />
          {!overQuota && (<>
            <path d="M10 60 q50 26 100 0 l-8 34 q-42 20 -84 0 Z" fill="#C89B66" />
            <path d="M10 60 q50 26 100 0" fill="none" stroke="#B98A5A" strokeWidth="5" />
            <circle cx="34" cy="48" r="15" style={{ fill: 'color-mix(in srgb, var(--secondary, #9DBBC6) 90%, #fff)' }} />
            <rect x="58" y="30" width="26" height="26" rx="7" style={{ fill: 'var(--accent)' }} />
            <circle cx="98" cy="46" r="12" style={{ fill: 'var(--primary)' }} />
          </>)}
          <g transform="translate(120,-6)" className={preSignal ? 'cs-hourglass presignal' : 'cs-hourglass'}>
            <rect x="0" y="0" width="52" height="12" rx="6" fill="#EFE8D8" />
            <rect x="0" y="0" width={Math.round(52 * remainFrac)} height="12" rx="6" style={{ fill: 'var(--primary)' }} />
          </g>
        </g>

        {/* Ma bulle : la mare */}
        <g transform="translate(455,415)">
          <ellipse cx="60" cy="52" rx="112" ry="30" style={{ fill: 'color-mix(in srgb, var(--secondary, #9DBBC6) 40%, var(--surface))' }} />
          <ellipse cx="60" cy="52" rx="112" ry="30" fill="none" style={{ stroke: 'color-mix(in srgb, var(--secondary, #9DBBC6) 55%, var(--surface))' }} strokeWidth="4" />
          <g className="cs-floaty">
            <circle cx="46" cy="16" r="17" style={{ fill: 'var(--surface)', stroke: 'color-mix(in srgb, var(--secondary, #9DBBC6) 50%, var(--surface))' }} strokeWidth="3" />
            <circle cx="84" cy="2" r="11" style={{ fill: 'var(--surface)', stroke: 'color-mix(in srgb, var(--secondary, #9DBBC6) 50%, var(--surface))' }} strokeWidth="3" />
            <circle cx="104" cy="26" r="7" style={{ fill: 'var(--surface)', stroke: 'color-mix(in srgb, var(--secondary, #9DBBC6) 50%, var(--surface))' }} strokeWidth="3" />
          </g>
        </g>

        {/* Bibo */}
        <g transform="translate(468,258)">
          <g className="cs-breathe">
            <ellipse cx="32" cy="96" rx="40" ry="10" fill="#3E3A35" opacity=".08" />
            <path d="M32 92 C30 66 28 52 32 38" style={{ stroke: 'var(--primary)' }} strokeWidth="9" fill="none" strokeLinecap="round" />
            <ellipse cx="14" cy="34" rx="17" ry="24" style={{ fill: 'color-mix(in srgb, var(--primary) 78%, #fff)' }} transform="rotate(-24 14 34)" />
            <ellipse cx="50" cy="30" rx="17" ry="24" style={{ fill: 'color-mix(in srgb, var(--primary) 62%, #fff)' }} transform="rotate(24 50 30)" />
            <circle cx="24" cy="30" r="3.4" fill="#3E3A35" />
            <circle cx="40" cy="30" r="3.4" fill="#3E3A35" />
            <path d="M25 41 q7 6 14 0" stroke="#3E3A35" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        </g>
      </svg>

      {/* Zones tactiles géantes */}
      <button className="cs-zone" style={{ left: '3%', top: '17%', width: '35%', height: '50%' }} onClick={() => tapZone('arbre', 'Mon arbre', () => setView('arbre'))}>
        <span className="cs-zlabel" style={{ bottom: '8%' }}>🌳 Mon arbre</span>
      </button>
      <button className={`cs-zone ${overQuota ? 'muted' : ''}`} style={{ left: '62%', top: '42%', width: '35%', height: '34%' }}
        onClick={() => overQuota ? speak(rc.quotaSpeak) : tapZone('jouer', 'Jouer', () => setView('game'))}>
        <span className="cs-zlabel" style={{ bottom: '3%' }}>🧩 {overQuota ? rc.quotaZone : 'Jouer'}</span>
      </button>
      <button className="cs-zone" style={{ left: '38%', top: '58%', width: '26%', height: '22%' }} onClick={() => tapZone('bulle', 'Ma bulle', () => setView('calme'))}>
        <span className="cs-zlabel" style={{ bottom: '2%' }}>🫧 Ma bulle</span>
      </button>
      <button className="cs-zone" style={{ left: '42%', top: '33%', width: '16%', height: '22%' }} onClick={() => speak(`Bonjour ${child.first_name} !`)} aria-label="Bibo" />

      {/* Je parle : barre permanente */}
      <button className="cs-talk" onClick={() => { speak('Je parle'); setView('caa'); }}>
        <span className="cs-talk-pic">💬</span><span className="cs-talk-name">Je parle</span>
      </button>

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
