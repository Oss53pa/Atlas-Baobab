import { useEffect, useState } from 'react';
import { Home } from 'lucide-react';
import { activeChild, useAppState } from '../../lib/store.js';
import { avatarGlyph, avatarImage, ART } from '../../lib/avatars.js';
import { acquiredList } from '../../lib/trajectoires.js';
import { gameByCode } from '../../lib/games.js';
import { playChildSound, haptic } from '../../lib/childAudio.js';
import { speak } from '../../lib/tts.js';

/**
 * « Mon arbre » (CDC Trois Mondes §3 + Mode Enfant v1.1 §5.1). Deux symboles :
 *  🍎 Fruit  = « j'ai réussi une activité » — fréquent ; 10 fruits font grandir l'arbre.
 *  🍃 Feuille d'or = « une compétence est consolidée » — rare, précieux (bijection
 *     CX-01 §8 : 1 feuille d'or = 1 acquise ; l'arbre REND VISIBLE, ne stocke rien).
 * L'arbre ne compte pas, ne compare pas, ne punit pas. Un fruit/une feuille ne
 * disparaît jamais.
 */
const DOMAIN_EMOJI: Record<string, string> = {
  communication: '💬', motricite: '🤸', autonomie: '🥄', social: '🫂', cognition: '🧩', sensoriel: '✋',
};
// Emplacements des fruits (activités) sur le houppier — coordonnées SVG stables.
const FRUIT_SLOTS = [
  { x: 200, y: 96 }, { x: 152, y: 118 }, { x: 250, y: 118 }, { x: 178, y: 138 }, { x: 226, y: 138 },
  { x: 120, y: 150 }, { x: 282, y: 150 }, { x: 205, y: 152 }, { x: 158, y: 168 }, { x: 248, y: 168 },
  { x: 190, y: 182 }, { x: 224, y: 182 }, { x: 135, y: 186 }, { x: 270, y: 186 }, { x: 108, y: 176 },
  { x: 300, y: 176 }, { x: 170, y: 108 }, { x: 232, y: 108 }, { x: 150, y: 202 }, { x: 260, y: 202 },
  { x: 205, y: 206 }, { x: 125, y: 128 }, { x: 285, y: 128 }, { x: 205, y: 128 },
];
// Emplacements des feuilles d'or (compétences acquises) — plus haut, plus rares.
const GOLD_SLOTS = [
  { x: 205, y: 66, r: -8 }, { x: 162, y: 80, r: -28 }, { x: 248, y: 80, r: 22 }, { x: 128, y: 112, r: -42 },
  { x: 286, y: 110, r: 38 }, { x: 188, y: 60, r: -14 }, { x: 224, y: 62, r: 14 }, { x: 205, y: 108, r: 0 },
  { x: 148, y: 142, r: -34 }, { x: 264, y: 142, r: 30 },
];

type Med = { emoji: string; label: string; kind: 'fruit' | 'leaf' };

export function MonArbre({ onExit }: { onExit: () => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const [medallion, setMedallion] = useState<Med | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  const [joy, setJoy] = useState(false);
  const [seenAtMount] = useState(() => {
    try { return parseInt(localStorage.getItem(`ab-arbre-seen-${child?.id}`) || '0', 10) || 0; } catch { return 0; }
  });

  useEffect(() => {
    if (medallion === null) return;
    const t = setTimeout(() => { setMedallion(null); setLit(null); }, 3200);
    return () => clearTimeout(t);
  }, [medallion]);

  // §5.1.5 : à l'arrivée d'un nouveau fruit (retour de jeu), il tombe + Bibo se réjouit.
  useEffect(() => {
    if (!child) return;
    const n = state.gameSessions.filter((g) => g.child_id === child.id).length;
    if (n <= seenAtMount) return;
    setJoy(true);
    playChildSound('fruit');
    haptic(18);
    try { localStorage.setItem(`ab-arbre-seen-${child.id}`, String(n)); } catch { /* ignore */ }
    const t = setTimeout(() => setJoy(false), 1900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!child) return null;
  // 🍎 fruits = activités réussies (chaque partie jouée) ; 🍃 feuilles d'or = acquis.
  const activities = state.gameSessions.filter((g) => g.child_id === child.id);
  const nFruits = activities.length;
  const newCount = Math.max(0, nFruits - seenAtMount); // fruits fraîchement gagnés (les plus récents)
  const goldLeaves = acquiredList(child.id, state);
  const stageIdx = Math.min(4, Math.floor(nFruits / 10)); // 10 fruits → un stade (§5.1)
  const scale = [0.82, 0.92, 1, 1.08, 1.16][stageIdx];
  const decoLeaves = Math.min(16, 5 + Math.floor(nFruits / 2));
  const isStatic = child.avatar_motion === 'static';
  const hr = new Date().getHours();
  const skyTop = hr < 11 ? '#F6EFDF' : hr < 18 ? '#F3EDE0' : '#F3E9E0';

  function tapFruit(i: number, title: string) {
    setLit(`f${i}`);
    setMedallion({ emoji: '🍎', label: title, kind: 'fruit' });
    speak(`Tu as réussi ${title} !`);
  }
  function tapLeaf(i: number, comp: (typeof goldLeaves)[number]) {
    setLit(`l${i}`);
    setMedallion({ emoji: DOMAIN_EMOJI[comp.activity.domain] ?? '🍃', label: comp.activity.label, kind: 'leaf' });
    speak(`${comp.activity.label}. C’est à toi, pour toujours.`);
  }

  return (
    <div className={`arbre-wrap ${isStatic ? 'static' : ''}`} data-theme={child.active_theme}>
      <svg viewBox="0 0 400 360" preserveAspectRatio="xMidYMid slice" className="arbre-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="arbre-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={skyTop} /><stop offset="1" style={{ stopColor: 'var(--bg)' }} /></linearGradient>
          <radialGradient id="arbre-glow"><stop offset="0" stopColor="#F6DFA6" stopOpacity="0.9" /><stop offset="1" stopColor="#F6DFA6" stopOpacity="0" /></radialGradient>
          <linearGradient id="arbre-trunk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#CA9C6C" /><stop offset="0.5" stopColor="#B4855A" /><stop offset="1" stopColor="#9A6E48" /></linearGradient>
          <radialGradient id="arbre-canopy" cx="38%" cy="28%" r="82%">
            <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--primary) 46%, #ffffff)' }} />
            <stop offset="0.55" style={{ stopColor: 'color-mix(in srgb, var(--primary) 84%, #eef7ea)' }} />
            <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--primary) 94%, #33482c)' }} />
          </radialGradient>
          {/* 🍎 fruit = rouge pomme (récompense d'activité) */}
          <radialGradient id="arbre-fruit-g" cx="35%" cy="30%"><stop offset="0" stopColor="#F3A28C" /><stop offset="1" stopColor="#D25A46" /></radialGradient>
          {/* 🍃 feuille d'or = doré précieux (compétence acquise) */}
          <linearGradient id="arbre-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FBEAA6" /><stop offset="1" stopColor="#E3B140" /></linearGradient>
        </defs>
        <rect width="400" height="360" fill="url(#arbre-sky)" />
        <circle cx="330" cy="60" r="30" fill="#F2DFAE" opacity=".55" />
        <ellipse cx="200" cy="330" rx="180" ry="30" style={{ fill: 'color-mix(in srgb, var(--primary) 20%, var(--tile))' }} />
        <ellipse cx="200" cy="335" rx="150" ry="18" fill="#3E3A35" opacity=".05" />

        <g transform={`translate(200 260) scale(${scale}) translate(-200 -260)`}>
          <path d="M188 320 C182 250 176 220 188 190 C170 190 158 176 164 160 C142 164 128 148 136 132 C118 134 108 118 118 106 C134 86 186 78 216 92 C262 80 300 104 292 132 C314 138 316 164 294 174 C308 192 294 210 272 206 C280 240 274 272 270 320 Z" fill="url(#arbre-trunk)" />
          <g>
            <circle cx="152" cy="128" r="52" style={{ fill: 'color-mix(in srgb, var(--primary) 94%, #2c3d26)' }} opacity="0.5" />
            <circle cx="286" cy="128" r="54" style={{ fill: 'color-mix(in srgb, var(--primary) 94%, #2c3d26)' }} opacity="0.5" />
            <circle cx="207" cy="160" r="62" style={{ fill: 'color-mix(in srgb, var(--primary) 94%, #2c3d26)' }} opacity="0.45" />
          </g>
          <circle cx="205" cy="94" r="66" fill="url(#arbre-canopy)" />
          <circle cx="132" cy="120" r="52" fill="url(#arbre-canopy)" />
          <circle cx="284" cy="120" r="54" fill="url(#arbre-canopy)" />
          <circle cx="205" cy="150" r="62" fill="url(#arbre-canopy)" />
          <circle cx="150" cy="176" r="42" fill="url(#arbre-canopy)" />
          <circle cx="260" cy="176" r="42" fill="url(#arbre-canopy)" />
          <ellipse cx="205" cy="186" rx="66" ry="20" style={{ fill: 'color-mix(in srgb, var(--primary) 94%, #2c3d26)' }} opacity="0.25" />
          <g style={{ fill: 'color-mix(in srgb, var(--primary) 34%, #ffffff)' }}>
            <circle cx="184" cy="72" r="24" opacity="0.7" />
            <circle cx="118" cy="104" r="15" opacity="0.6" />
            <circle cx="272" cy="102" r="13" opacity="0.55" />
          </g>
          {/* Feuillage décoratif (densité qui suit la croissance) */}
          <g fill="#EDF6EA">
            {Array.from({ length: decoLeaves }, (_, i) => {
              const a = (i / decoLeaves) * Math.PI * 2;
              const x = 205 + Math.cos(a) * (58 + (i % 3) * 8);
              const y = 132 + Math.sin(a) * (52 + (i % 2) * 6);
              return <ellipse key={i} cx={x} cy={y} rx="6" ry="9" transform={`rotate(${(i * 47) % 360} ${x} ${y})`} />;
            })}
          </g>

          {/* 🍃 Feuilles d'or = compétences acquises (rares, précieuses) */}
          {goldLeaves.slice(0, GOLD_SLOTS.length).map((comp, i) => {
            const s = GOLD_SLOTS[i];
            const on = lit === `l${i}`;
            return (
              <g key={comp.activity.id} className="arbre-fruit" onClick={() => tapLeaf(i, comp)} role="button" style={{ cursor: 'pointer' }} transform={`translate(${s.x} ${s.y}) rotate(${s.r})`}>
                {on && <circle cx="0" cy="-8" r="22" fill="url(#arbre-glow)" />}
                <path d="M0 4 C10 -8 10 -20 0 -30 C-10 -20 -10 -8 0 4 Z" fill="url(#arbre-gold)" stroke="#C99A2E" strokeWidth="0.8" />
                <path d="M0 2 L0 -26" stroke="#C99A2E" strokeWidth="1" opacity="0.6" />
              </g>
            );
          })}

          {/* 🍎 Fruits = activités réussies */}
          {activities.slice(0, FRUIT_SLOTS.length).map((sess, i) => {
            const s = FRUIT_SLOTS[i];
            const on = lit === `f${i}`;
            const title = gameByCode(sess.game_code)?.title ?? 'un jeu';
            return (
              <g key={sess.id} className={`arbre-fruit ${i < newCount ? 'arbre-fruit-new' : ''}`} onClick={() => tapFruit(i, title)} role="button" style={{ cursor: 'pointer' }}>
                {on && <circle cx={s.x} cy={s.y} r="24" fill="url(#arbre-glow)" />}
                <circle cx={s.x} cy={s.y} r="16" fill="transparent" />
                <ellipse cx={s.x} cy={s.y + 2} rx={on ? 9 : 7} ry={on ? 8 : 6.4} fill="#000" opacity="0.12" />
                <circle cx={s.x} cy={s.y} r={on ? 9 : 7} fill="url(#arbre-fruit-g)" />
                <circle cx={s.x - 2.4} cy={s.y - 2.6} r={on ? 2.6 : 2} fill="#fff" opacity="0.7" />
                <path d={`M${s.x} ${s.y - 7} q3 -6 8 -6`} stroke="#5C7A3A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              </g>
            );
          })}
        </g>

        {/* Avatar au pied de l'arbre */}
        {avatarImage(child.avatar_key) ? (
          <image href={avatarImage(child.avatar_key)!} x="272" y="264" width="56" height="56" className={`arbre-av bibo-alive ${joy ? 'arbre-joy' : ''}`} onClick={() => speak('On regarde ton arbre, ensemble.')} style={{ cursor: 'pointer' }} />
        ) : (
          <text x="300" y="300" fontSize="42" textAnchor="middle" className="arbre-av" onClick={() => speak('On regarde ton arbre, ensemble.')} style={{ cursor: 'pointer' }}>
            {avatarGlyph(child.avatar_key, 4)}
          </text>
        )}
      </svg>

      {nFruits === 0 && goldLeaves.length === 0 && (
        <div className="arbre-empty">Ton arbre pousse doucement. Chaque jeu réussi fait pousser un fruit 🍎.</div>
      )}

      {medallion && (
        <div className="arbre-medallion" aria-live="polite">
          {medallion.kind === 'leaf' && <img className="arbre-med-star" src={ART.etoile} alt="" aria-hidden />}
          <span className="arbre-med-e">{medallion.emoji}</span>
          <span className="arbre-med-t">{medallion.label}</span>
        </div>
      )}

      <button className="arbre-home" onClick={onExit} aria-label="Retour au monde"><Home size={26} /></button>
    </div>
  );
}
