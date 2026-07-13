/**
 * Jeu d'icônes « maison » Atlas Baobab — duotone cohérent (trait + aplat doux),
 * dessiné pour remplacer les emoji système par une finition premium et lisible
 * à 24 comme à 48 px. La couleur vient du parent (currentColor) ; l'aplat doux
 * réutilise cette teinte à faible opacité. Un seul langage graphique partout.
 */
import type { SVGProps } from 'react';

type GlyphProps = { size?: number } & Omit<SVGProps<SVGSVGElement>, 'width' | 'height'>;

function frame(size: number, rest: GlyphProps): SVGProps<SVGSVGElement> {
  const { size: _omit, ...p } = rest as GlyphProps & { size?: number };
  return {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
    ...p,
  };
}
const soft = { fill: 'currentColor', stroke: 'none', opacity: 0.15 } as const;

// ── Types de note ──────────────────────────────────────────────────────────

export function GlyphMood({ size = 24, ...p }: GlyphProps) {
  return (
    <svg {...frame(size, p)}>
      <circle cx="12" cy="12" r="8.75" {...soft} />
      <circle cx="12" cy="12" r="8.75" />
      <path d="M8.3 13.8c.85 1.25 2.1 1.95 3.7 1.95s2.85-.7 3.7-1.95" />
      <path d="M9 10.1h.01" strokeWidth="2.3" />
      <path d="M15 10.1h.01" strokeWidth="2.3" />
    </svg>
  );
}

export function GlyphSuccess({ size = 24, ...p }: GlyphProps) {
  const star = 'M12 3.2l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.2l-5.08 2.67.98-5.68L3.75 9.2l5.7-.83z';
  return (
    <svg {...frame(size, p)}>
      <path d={star} {...soft} />
      <path d={star} />
    </svg>
  );
}

export function GlyphSleep({ size = 24, ...p }: GlyphProps) {
  const moon = 'M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a6.7 6.7 0 1 0 10.8 10.8z';
  return (
    <svg {...frame(size, p)}>
      <path d={moon} {...soft} />
      <path d={moon} />
      <path d="M16.4 3.9l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" strokeWidth="1.3" />
    </svg>
  );
}

export function GlyphMeal({ size = 24, ...p }: GlyphProps) {
  const bowl = 'M3.4 10.8h17.2a8.6 8.6 0 0 1-17.2 0z';
  return (
    <svg {...frame(size, p)}>
      <path d={bowl} {...soft} />
      <path d={bowl} />
      <path d="M8.6 3.9c-.6.8-.6 1.6 0 2.5M12 3.5c-.6.8-.6 1.6 0 2.5M15.4 3.9c-.6.8-.6 1.6 0 2.5" />
    </svg>
  );
}

export function GlyphEvent({ size = 24, ...p }: GlyphProps) {
  const mark = 'M6 3.9h12v16.3l-6-3.9-6 3.9z';
  return (
    <svg {...frame(size, p)}>
      <path d={mark} {...soft} />
      <path d={mark} />
    </svg>
  );
}

export function GlyphIncident({ size = 24, ...p }: GlyphProps) {
  return (
    <svg {...frame(size, p)}>
      <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2 2M16.5 16.5l2 2M18.5 5.5l-2 2M7.5 16.5l-2 2" />
      <circle cx="12" cy="12" r="3.5" {...soft} />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

export function GlyphSchool({ size = 24, ...p }: GlyphProps) {
  const cap = 'M12 4.2 21.6 8.4 12 12.6 2.4 8.4z';
  return (
    <svg {...frame(size, p)}>
      <path d={cap} {...soft} />
      <path d={cap} />
      <path d="M6.6 10.4v4c0 1.6 2.4 2.9 5.4 2.9s5.4-1.3 5.4-2.9v-4" />
      <path d="M21.6 8.4v4.2" />
    </svg>
  );
}

export function GlyphNote({ size = 24, ...p }: GlyphProps) {
  const pen = 'M4 20l1.3-4.4L15.8 5.1a2 2 0 0 1 2.9 0l.2.2a2 2 0 0 1 0 2.9L8.4 18.7z';
  return (
    <svg {...frame(size, p)}>
      <path d={pen} {...soft} />
      <path d={pen} />
      <path d="M14.5 6.4l3.1 3.1" />
    </svg>
  );
}

// ── Météo (Journal Météo E4) ────────────────────────────────────────────────

export function GlyphSun({ size = 24, ...p }: GlyphProps) {
  return (
    <svg {...frame(size, p)}>
      <circle cx="12" cy="12" r="4.3" {...soft} />
      <circle cx="12" cy="12" r="4.3" />
      <path d="M12 2.4v2.4M12 19.2v2.4M2.4 12h2.4M19.2 12h2.4M5.1 5.1l1.7 1.7M17.2 17.2l1.7 1.7M18.9 5.1l-1.7 1.7M6.8 17.2l-1.7 1.7" />
    </svg>
  );
}

export function GlyphPartly({ size = 24, ...p }: GlyphProps) {
  const cloud = 'M7 19.2a3.7 3.7 0 0 1 0-7.4 4.7 4.7 0 0 1 9-1.2 3.3 3.3 0 0 1 .5 6.6z';
  return (
    <svg {...frame(size, p)}>
      <circle cx="8.5" cy="7.5" r="3" />
      <path d="M8.5 2.6v1.4M3.6 7.5h1.4M4.9 4l1 1M13 4l-1 1" strokeWidth="1.4" />
      <path d={cloud} fill="var(--surface, #fff)" stroke="none" />
      <path d={cloud} {...soft} />
      <path d={cloud} />
    </svg>
  );
}

export function GlyphCloud({ size = 24, ...p }: GlyphProps) {
  const cloud = 'M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 18z';
  return (
    <svg {...frame(size, p)}>
      <path d={cloud} {...soft} />
      <path d={cloud} />
    </svg>
  );
}

export function GlyphRain({ size = 24, ...p }: GlyphProps) {
  const cloud = 'M7 15.4a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 15.4z';
  return (
    <svg {...frame(size, p)}>
      <path d={cloud} {...soft} />
      <path d={cloud} />
      <path d="M8.4 17.6l-1 2.8M12 17.6l-1 2.8M15.6 17.6l-1 2.8" />
    </svg>
  );
}

export function GlyphStorm({ size = 24, ...p }: GlyphProps) {
  const cloud = 'M7 14.6a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 14.6z';
  const bolt = 'M12.6 14.4l-3 4.3h2.4l-1.2 3.1 3.6-4.6h-2.4l1.2-2.8z';
  return (
    <svg {...frame(size, p)}>
      <path d={cloud} {...soft} />
      <path d={cloud} />
      <path d={bolt} {...soft} />
      <path d={bolt} />
    </svg>
  );
}

// ── Correspondances ─────────────────────────────────────────────────────────

export const KIND_GLYPH: Record<string, (p: GlyphProps) => JSX.Element> = {
  mood: GlyphMood, success: GlyphSuccess, sleep: GlyphSleep, meal: GlyphMeal,
  event: GlyphEvent, incident: GlyphIncident, school: GlyphSchool, free_note: GlyphNote,
  weather: GlyphPartly,
};

export const WEATHER_GLYPH: Record<string, (p: GlyphProps) => JSX.Element> = {
  '☀️': GlyphSun, '🌤️': GlyphPartly, '⛅': GlyphCloud, '🌧️': GlyphRain, '⛈️': GlyphStorm,
};

/** Teinte par type : le badge coloré donne à l'icône une place, pas un flottement. */
export const KIND_TINT: Record<string, string> = {
  mood: '#7a9e7e', success: '#d99c3f', sleep: '#6e9fb3', meal: '#c98a74',
  event: '#9b8fb0', school: '#84a98c', free_note: '#8a8378', incident: '#c46a5a', weather: '#6e9fb3',
};
export const WEATHER_TINT: Record<string, string> = {
  '☀️': '#d99c3f', '🌤️': '#d9a66c', '⛅': '#8a9bb0', '🌧️': '#6e9fb3', '⛈️': '#6a78b0',
};
