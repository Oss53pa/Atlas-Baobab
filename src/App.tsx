import { useState, useRef, useEffect } from 'react';
import {
  Home, DoorOpen, NotebookPen, Brain, Settings, MessagesSquare, Sparkles,
  Compass, GraduationCap, ClipboardCheck, Route, FileText, Blocks, HandHeart,
  Heart, ChevronDown, ShieldAlert, MessageCircleWarning,
} from 'lucide-react';
import { MomentModal } from './components/MomentModal.js';
import { getState, actions, useStore, activeChild } from './lib/store.js';
import { ageYears } from './lib/format.js';
import { dominantPalier } from './lib/paliers.js';
import { useAuth } from './lib/auth.js';
import { Landing } from './screens/Landing.js';
import { Login } from './screens/Login.js';
import { ParentHome } from './screens/ParentHome.js';
import { PorteEntree } from './screens/PorteEntree.js';
import { Journal } from './screens/Journal.js';
import { Carnet } from './screens/Carnet.js';
import { Activites } from './screens/Activites.js';
import { Programme } from './screens/Programme.js';
import { OnJoueEnsemble } from './screens/OnJoueEnsemble.js';
import { Coach } from './screens/Coach.js';
import { Bilan } from './screens/Bilan.js';
import { Gps } from './screens/Gps.js';
import { Rapports } from './screens/Rapports.js';
import { Trajectoires } from './screens/Trajectoires.js';
import { Jumeau } from './screens/Jumeau.js';
import { Reglages } from './screens/Reglages.js';
import { Crise } from './screens/Crise.js';
import { Reagir } from './screens/Reagir.js';
import { CarteCalme } from './screens/CarteCalme.js';
import { Forum } from './screens/Forum.js';
import { ChildShell } from './screens/child/ChildShell.js';
import { PinPad } from './components/PinPad.js';

export type View =
  | 'accueil' | 'porte' | 'journal' | 'carnet' | 'activites' | 'programme' | 'ensemble' | 'coach' | 'bilan' | 'gps' | 'rapports' | 'trajectoires' | 'jumeau' | 'forum' | 'reglages' | 'crise' | 'reagir' | 'carte-calme'
  | 'enfant' | 'enfant-calme';

type Mode = { kind: 'parent' } | { kind: 'child'; start: 'home' | 'calme' } | { kind: 'exit-pin' };

// Onglets mobiles : les 6 essentiels (RÉAGIR reste accessible depuis l'accueil).
const TABS: { view: View; label: string; icon: typeof Home }[] = [
  { view: 'accueil', label: 'Accueil', icon: Home },
  { view: 'porte', label: 'Repérage', icon: DoorOpen },
  { view: 'journal', label: 'Journal', icon: NotebookPen },
  { view: 'jumeau', label: 'CORTEX', icon: Brain },
  { view: 'forum', label: 'Forum', icon: MessagesSquare },
  { view: 'reglages', label: 'Réglages', icon: Settings },
];

// Navigation desktop (Sidebar v2) : les items existants regroupés en 4 temps qui
// racontent le parcours du parent — réagir · vivre · comprendre · avancer · ensemble.
// « Réagir » sort en tête (bouton dédié) ; CORTEX n'est plus une destination (moteur,
// pas un lieu) : ses restitutions sont nommées par leur valeur. Les modules à venir
// gardent leur place logique avec une pastille, jamais un « ghetto Bientôt ».
type NavItem = { view?: View; label: string; icon: typeof Home; soon?: boolean; dot?: boolean };
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Mon quotidien',
    items: [
      { view: 'accueil', label: 'Aujourd’hui', icon: Home },
      { view: 'journal', label: 'Journal des moments', icon: NotebookPen, dot: true },
      { view: 'coach', label: 'Coach du jour', icon: GraduationCap },
      { view: 'ensemble', label: 'On joue ensemble', icon: HandHeart },
    ],
  },
  {
    label: 'Le comprendre',
    items: [
      { view: 'porte', label: 'Repérage · premier point', icon: DoorOpen },
      { view: 'bilan', label: 'Bilan 360', icon: ClipboardCheck },
      { view: 'trajectoires', label: 'Trajectoires · ses acquis', icon: Brain },
      { view: 'jumeau', label: 'CORTEX · son portrait', icon: Heart },
    ],
  },
  {
    label: 'Avancer',
    items: [
      { view: 'gps', label: 'GPS trajectoire', icon: Route },
      { view: 'programme', label: 'Programme de la semaine', icon: Blocks },
      { view: 'rapports', label: 'Rapports', icon: FileText },
    ],
  },
  {
    label: 'Ensemble',
    items: [{ view: 'forum', label: 'Communauté', icon: MessagesSquare }],
  },
];

export default function App() {
  const [view, setView] = useState<View>('accueil');
  const [mode, setMode] = useState<Mode>({ kind: 'parent' });
  const { session, loading: authLoading } = useAuth();
  const entered = useStore((s) => s.settings.entered);
  const [entryPage, setEntryPage] = useState<'landing' | 'login'>('landing');
  const sessionStart = useRef<number | null>(null);
  const [recap, setRecap] = useState<string | null>(null);
  const [noting, setNoting] = useState(false);
  const sideChild = useStore(activeChild);
  const quotaRemain = useStore((s) => {
    const c = activeChild(s);
    if (!c) return 0;
    const today = new Date().toDateString();
    const used = s.gameSessions
      .filter((g) => g.child_id === c.id && new Date(g.played_at).toDateString() === today)
      .reduce((sum, g) => sum + g.duration_seconds, 0);
    return Math.max(0, c.screen_quota_minutes - Math.round(used / 60));
  });

  useEffect(() => {
    if (!recap) return;
    const t = setTimeout(() => setRecap(null), 6000);
    return () => clearTimeout(t);
  }, [recap]);

  const go = (v: View) => {
    if (v === 'enfant') { sessionStart.current = Date.now(); setMode({ kind: 'child', start: 'home' }); return; }
    if (v === 'enfant-calme') { sessionStart.current = Date.now(); setMode({ kind: 'child', start: 'calme' }); return; }
    setView(v);
  };

  // Porte d'entrée : accueil public (landing) / connexion, tant que ni compte
  // connecté ni entrée locale. Une session valide fait passer la porte.
  if (!entered && !session) {
    if (authLoading) {
      return (
        <div className="login-page">
          <img className="logo-anim" src="/baobab.png" width={72} height={72} alt="Atlas Baobab" style={{ filter: 'brightness(0.32) saturate(1.4)', opacity: 0.6 }} />
        </div>
      );
    }
    if (entryPage === 'login') return <Login onBack={() => setEntryPage('landing')} />;
    return (
      <Landing
        onEnter={() => actions.setEntered(true)}
        onLogin={() => setEntryPage('login')}
        onScreening={() => { setView('porte'); actions.setEntered(true); }}
      />
    );
  }

  // Mode enfant (instrument) — plein écran, sortie protégée par PIN parent.
  if (mode.kind === 'child') {
    return (
      <div className="app app-child">
        <ChildShell start={mode.start} onExit={() => setMode({ kind: 'exit-pin' })} />
      </div>
    );
  }

  if (mode.kind === 'exit-pin') {
    return (
      <div className="app">
        <div className="screen" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
          <PinPad
            title="Espace parents"
            subtitle={`Entrez votre code pour revenir au monde de ${activeChild(getState())?.first_name ?? 'l’enfant'}.`}
            expected={getState().settings.parentPin}
            onSuccess={() => { if (sessionStart.current) setRecap(sessionRecap(sessionStart.current)); sessionStart.current = null; setMode({ kind: 'parent' }); setView('accueil'); }}
            onCancel={() => setMode({ kind: 'child', start: 'home' })}
          />
        </div>
      </div>
    );
  }

  if (view === 'carte-calme') return <CarteCalme onClose={() => setView('crise')} />;

  const isActive = (v: View) => view === v
    || (v === 'journal' && view === 'carnet');
  const reagirActive = view === 'reagir' || view === 'crise';
  const logo = (size: number) => (
    <span className="avatar-badge" style={{ width: size + 8, height: size + 8, background: '#F4ECDD' }}>
      <img src="/baobab.png" width={size} height={size} alt="Atlas Baobab"
        style={{ objectFit: 'contain', filter: 'brightness(0.32) saturate(1.4)' }} />
    </span>
  );

  return (
    <div className="app app-parent">
      {recap && <div className="recap-toast" onClick={() => setRecap(null)} role="status"><Sparkles size={16} /> {recap}</div>}
      {noting && <MomentModal onClose={() => setNoting(false)} />}
      {/* Barre latérale v2 (desktop) */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          {logo(30)}
          <div>
            <div className="brand">Atlas Baobab</div>
            <div className="sub">CORTEX + PROPH3T</div>
          </div>
        </div>

        {/* Sélecteur d'enfant (multi-enfants du plan Grand Baobab) */}
        {sideChild && (
          <button className="side-child" onClick={() => setView('reglages')} title="Réglages de l’enfant">
            <span className="side-child-av">{sideChild.first_name.charAt(0)}</span>
            <span className="grow"><b>{sideChild.first_name}</b><span>{ageYears(sideChild.birth_date)} ans · {dominantPalier(sideChild.id, getState())}</span></span>
            <ChevronDown size={16} />
          </button>
        )}

        {/* Réagir : hors liste, toujours en tête (aide douce en 1 tap) */}
        <button className={`side-reagir ${reagirActive ? 'on' : ''}`} onClick={() => setView('reagir')}>
          <span className="side-reagir-ic"><Compass size={18} /></span>
          <span className="grow"><b>Réagir maintenant</b><small>Crise, moment difficile — aide en 1 tap</small></span>
        </button>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map((grp) => (
            <div key={grp.label}>
              <div className="sidebar-section">{grp.label}</div>
              {grp.items.map((it) => {
                const Icon = it.icon;
                if (it.soon) {
                  return (
                    <button key={it.label} className="soon" disabled title="Module prévu au CDC, en cours de construction">
                      <Icon size={19} /> <span>{it.label}</span><span className="soon-badge">bientôt</span>
                    </button>
                  );
                }
                return (
                  <button key={it.view} className={isActive(it.view!) ? 'active' : ''} onClick={() => setView(it.view!)}>
                    <Icon size={19} /> <span>{it.label}</span>
                    {it.dot && <span className="side-dot" title="Un retour vous attend" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button className="side-enfant" onClick={() => go('enfant')}>
            <span className="side-enfant-ic"><Sparkles size={17} /></span>
            <span className="grow"><b>Mode enfant{sideChild ? ` — ${sideChild.first_name}` : ''}</b>
              <small>Son monde à lui{sideChild ? ` · ${quotaRemain} min de jeu` : ''}</small></span>
          </button>
          <button className={`side-regl ${view === 'reglages' ? 'active' : ''}`} onClick={() => setView('reglages')}>
            <Settings size={18} /> <span>Réglages &amp; aidants</span>
          </button>
          <span className="side-veille"><i /> Veille « Temps difficile » : tout va bien</span>
        </div>
      </aside>

      {/* Zone principale */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="brand mobile-only">Atlas Baobab</span>
            <span className="page-title">{pageTitle(view)}</span>
          </div>
          {view === 'accueil' && (
            <div className="topbar-actions">
              <button className="home-qa crisis" onClick={() => setView('crise')}><ShieldAlert size={16} /> <span>Crise en cours</span></button>
              <button className="home-qa" onClick={() => setNoting(true)}><NotebookPen size={16} /> <span>Noter</span></button>
              <button className="home-qa" onClick={() => setView('programme')}><Blocks size={16} /> <span>Programme</span></button>
              <button className="home-qa" onClick={() => go('enfant')}><MessageCircleWarning size={16} /> <span>CAA</span></button>
            </div>
          )}
          {logo(34)}
        </header>

        <div className="screen">
          {view === 'accueil' && <ParentHome go={go} />}
          {view === 'porte' && <PorteEntree />}
          {view === 'journal' && <Journal go={go} />}
          {view === 'carnet' && <Carnet go={go} />}
          {view === 'activites' && <Activites go={go} />}
          {view === 'programme' && <Programme go={go} />}
          {view === 'ensemble' && <OnJoueEnsemble />}
          {view === 'coach' && <Coach go={go} />}
          {view === 'bilan' && <Bilan />}
          {view === 'gps' && <Gps go={go} />}
          {view === 'rapports' && <Rapports />}
          {view === 'trajectoires' && <Trajectoires go={go} />}
          {view === 'jumeau' && <Jumeau go={go} />}
          {view === 'forum' && <Forum />}
          {view === 'reglages' && <Reglages />}
          {view === 'crise' && <Crise go={go} />}
          {view === 'reagir' && <Reagir go={go} />}
        </div>
      </div>

      {/* Onglets (mobile) */}
      <nav className="tabbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.view} className={isActive(t.view) ? 'active' : ''} onClick={() => setView(t.view)}>
              <Icon size={20} />
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function pageTitle(v: View): string {
  return {
    accueil: 'Aujourd’hui', porte: 'Repérage', journal: 'Journal des moments', carnet: 'Le carnet', activites: 'Activités', programme: 'Programme de la semaine', ensemble: 'On joue ensemble', coach: 'Coach du jour', bilan: 'Bilan 360', gps: 'GPS trajectoire', rapports: 'Rapports', trajectoires: 'Trajectoires · ses acquis', jumeau: 'CORTEX · son portrait',
    forum: 'Communauté', reglages: 'Réglages', crise: 'Guidance de crise', reagir: 'RÉAGIR',
    'carte-calme': '', enfant: '', 'enfant-calme': '',
  }[v] ?? '';
}

/** Récap de session enfant (CDC Mode Enfant §4.4), affiché au retour parent. */
function sessionRecap(start: number): string {
  const s = getState();
  const child = activeChild(s);
  const mins = Math.max(1, Math.round((Date.now() - start) / 60000));
  const games = s.gameSessions.filter((g) => g.child_id === child?.id && Date.parse(g.played_at) >= start).length;
  const cards = s.aacUsage.filter((u) => u.child_id === child?.id && Date.parse(u.pressed_at) >= start).length;
  const parts = [`${mins} min`];
  if (games) parts.push(`${games} jeu${games > 1 ? 'x' : ''}`);
  if (cards) parts.push(`${cards} carte${cards > 1 ? 's' : ''} dite${cards > 1 ? 's' : ''}`);
  return `Session de ${child?.first_name ?? 'l’enfant'} · ${parts.join(' · ')}`;
}
