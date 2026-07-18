import { useEffect, useState } from 'react';
import { Home } from 'lucide-react';
import { activeChild, useAppState } from '../../lib/store.js';
import { avatarGlyph, avatarImage, ART } from '../../lib/avatars.js';
import { acquiredList } from '../../lib/trajectoires.js';
import { speak } from '../../lib/tts.js';

/**
 * « Mon arbre » (CDC Trois Mondes §3) : l'écran contemplatif du baobab.
 * 1 fruit d'or = 1 compétence « acquise » (bijection CX-01 §8, source de vérité =
 * les états CX-01 ; l'arbre ne stocke rien, il REND VISIBLE). Pas de compteur, pas
 * de récompense, pas de comparaison — un témoignage : quelque chose a poussé en lui.
 * Irréversibilité absolue : un fruit ne disparaît jamais.
 */
const DOMAIN_EMOJI: Record<string, string> = {
  communication: '💬', motricite: '🤸', autonomie: '🥄', social: '🫂', cognition: '🧩', sensoriel: '✋',
};
// Emplacements des fruits sur le houppier (coordonnées SVG stables).
const FRUIT_SLOTS = [
  { x: 200, y: 96 }, { x: 152, y: 118 }, { x: 250, y: 118 }, { x: 178, y: 138 }, { x: 226, y: 138 },
  { x: 120, y: 150 }, { x: 282, y: 150 }, { x: 205, y: 152 }, { x: 158, y: 168 }, { x: 248, y: 168 },
  { x: 190, y: 182 }, { x: 224, y: 182 }, { x: 135, y: 186 }, { x: 270, y: 186 }, { x: 108, y: 176 },
  { x: 300, y: 176 }, { x: 170, y: 108 }, { x: 232, y: 108 }, { x: 150, y: 202 }, { x: 260, y: 202 },
  { x: 205, y: 206 }, { x: 125, y: 128 }, { x: 285, y: 128 }, { x: 205, y: 128 },
];

export function MonArbre({ onExit }: { onExit: () => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const [medallion, setMedallion] = useState<{ emoji: string; label: string } | null>(null);
  const [lit, setLit] = useState<number | null>(null);

  useEffect(() => {
    if (medallion === null) return;
    const t = setTimeout(() => { setMedallion(null); setLit(null); }, 3200);
    return () => clearTimeout(t);
  }, [medallion]);

  if (!child) return null;
  const fruits = acquiredList(child.id, state);
  const n = fruits.length;
  const stade = n <= 2 ? 'pousse' : n <= 7 ? 'jeune' : n <= 15 ? 'arbre' : n <= 30 ? 'grand' : 'majestueux';
  const scale = stade === 'pousse' ? 0.82 : stade === 'jeune' ? 0.92 : stade === 'arbre' ? 1 : stade === 'grand' ? 1.08 : 1.16;
  const leaves = Math.min(14, 4 + n);
  const isStatic = child.avatar_motion === 'static';
  const hr = new Date().getHours();
  const skyTop = hr < 11 ? '#F6EFDF' : hr < 18 ? '#F3EDE0' : '#F3E9E0';

  function tapFruit(i: number, comp: (typeof fruits)[number]) {
    setLit(i);
    setMedallion({ emoji: DOMAIN_EMOJI[comp.activity.domain] ?? '🌟', label: comp.activity.label });
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
          <radialGradient id="arbre-fruit-g"><stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--accent) 60%, #fff)' }} /><stop offset="1" style={{ stopColor: 'var(--accent)' }} /></radialGradient>
        </defs>
        <rect width="400" height="360" fill="url(#arbre-sky)" />
        <circle cx="330" cy="60" r="30" fill="#F2DFAE" opacity=".55" />
        {/* sol + ombre promise (le grand arbre à venir) */}
        <ellipse cx="200" cy="330" rx="180" ry="30" style={{ fill: 'color-mix(in srgb, var(--primary) 20%, var(--tile))' }} />
        <ellipse cx="200" cy="335" rx="150" ry="18" fill="#3E3A35" opacity=".05" />

        <g transform={`translate(200 260) scale(${scale}) translate(-200 -260)`}>
          {/* Tronc baobab */}
          <path d="M188 320 C182 250 176 220 188 190 C170 190 158 176 164 160 C142 164 128 148 136 132 C118 134 108 118 118 106 C134 86 186 78 216 92 C262 80 300 104 292 132 C314 138 316 164 294 174 C308 192 294 210 272 206 C280 240 274 272 270 320 Z" fill="url(#arbre-trunk)" />
          {/* Houppier — profondeur : ombres arrière, masse en dégradé, reflets */}
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
          {/* creux d'ombre sous la canopée (là où naît le tronc) */}
          <ellipse cx="205" cy="186" rx="66" ry="20" style={{ fill: 'color-mix(in srgb, var(--primary) 94%, #2c3d26)' }} opacity="0.25" />
          {/* reflets clairs, haut-gauche */}
          <g style={{ fill: 'color-mix(in srgb, var(--primary) 34%, #ffffff)' }}>
            <circle cx="184" cy="72" r="24" opacity="0.7" />
            <circle cx="118" cy="104" r="15" opacity="0.6" />
            <circle cx="272" cy="102" r="13" opacity="0.55" />
          </g>
          {/* Feuilles (assiduité, purement décoratif) */}
          <g fill="#EDF6EA">
            {Array.from({ length: leaves }, (_, i) => {
              const a = (i / leaves) * Math.PI * 2;
              const x = 205 + Math.cos(a) * (58 + (i % 3) * 8);
              const y = 132 + Math.sin(a) * (52 + (i % 2) * 6);
              return <ellipse key={i} cx={x} cy={y} rx="6" ry="9" transform={`rotate(${(i * 47) % 360} ${x} ${y})`} />;
            })}
          </g>
          {/* Fruits d'or = compétences acquises */}
          {fruits.slice(0, FRUIT_SLOTS.length).map((comp, i) => {
            const s = FRUIT_SLOTS[i];
            const on = lit === i;
            return (
              <g key={comp.activity.id} className="arbre-fruit" onClick={() => tapFruit(i, comp)} role="button" style={{ cursor: 'pointer' }}>
                {on && <circle cx={s.x} cy={s.y} r="26" fill="url(#arbre-glow)" />}
                <circle cx={s.x} cy={s.y} r="18" fill="transparent" />
                <ellipse cx={s.x} cy={s.y + 2} rx={on ? 9 : 7} ry={on ? 8 : 6.4} fill="#000" opacity="0.12" />
                <circle cx={s.x} cy={s.y} r={on ? 9 : 7} fill="url(#arbre-fruit-g)" />
                <circle cx={s.x - 2.4} cy={s.y - 2.6} r={on ? 2.6 : 2} fill="#fff" opacity="0.75" />
                <path d={`M${s.x} ${s.y - 8} q3 -6 9 -7`} stroke="#7a5a3a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              </g>
            );
          })}
        </g>

        {/* Avatar au pied de l'arbre */}
        {avatarImage(child.avatar_key) ? (
          <image href={avatarImage(child.avatar_key)!} x="272" y="264" width="56" height="56" className="arbre-av" onClick={() => speak('On regarde ton arbre, ensemble.')} style={{ cursor: 'pointer' }} />
        ) : (
          <text x="300" y="300" fontSize="42" textAnchor="middle" className="arbre-av" onClick={() => speak('On regarde ton arbre, ensemble.')} style={{ cursor: 'pointer' }}>
            {avatarGlyph(child.avatar_key, 4)}
          </text>
        )}
      </svg>

      {n === 0 && (
        <div className="arbre-empty">Ton arbre pousse doucement. Chaque chose que tu apprends deviendra un fruit d’or.</div>
      )}

      {medallion && (
        <div className="arbre-medallion" aria-live="polite">
          <img className="arbre-med-star" src={ART.etoile} alt="" aria-hidden />
          <span className="arbre-med-e">{medallion.emoji}</span>
          <span className="arbre-med-t">{medallion.label}</span>
        </div>
      )}

      <button className="arbre-home" onClick={onExit} aria-label="Retour au monde"><Home size={26} /></button>
    </div>
  );
}
