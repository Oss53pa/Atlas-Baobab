/**
 * Sound design du Mode Enfant (CDC v1.1 §4). Web Audio API, 3 bus indépendants
 * (interactions / musique / voix), préchargement inutile ici car les sons sont
 * SYNTHÉTISÉS (placeholders v1.1 : oscillateurs + enveloppes) — à remplacer par
 * des .mp3/.ogg CC0 (Kenney…) sans changer l'API `playChildSound`.
 *
 * Lois respectées : fade-in 10 ms / fade-out ≥ 30 ms (pas de clic), plafond
 * −6 dBFS, passe-bas 8 kHz sur les interactions (aucune fréquence stridente).
 * Le bus `voix` n'est jamais coupé par le bouton enfant (L5) — parent seul.
 */

export type SensoryMode = 'full' | 'sounds' | 'silence';
export type SoundEvent =
  | 'tap' | 'good' | 'error' | 'fruit' | 'fruitPlace' | 'victory'
  | 'bibo' | 'woosh' | 'breatheIn' | 'breatheOut';

const KEY_MODE = 'ab-sensory-mode';
const PEAK = 0.5; // ≈ −6 dBFS

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let busInter: GainNode | null = null;
let busMusic: GainNode | null = null;
let lowpass: BiquadFilterNode | null = null;
let mode: SensoryMode = loadMode();
let profileVolume = 1; // 0..1, piloté par le profil sensoriel (§2.2)

function loadMode(): SensoryMode {
  try { const m = localStorage.getItem(KEY_MODE); if (m === 'full' || m === 'sounds' || m === 'silence') return m; } catch { /* ignore */ }
  return 'full';
}

/** Construit le graphe audio au premier geste (contrainte navigateur). */
function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 8000; // §4.1 : pas de fréquence stridente
    lowpass.connect(master);
    busInter = ctx.createGain();
    busInter.connect(lowpass);
    busMusic = ctx.createGain();
    busMusic.connect(master);
    applyGains();
  } catch { ctx = null; }
  return ctx;
}

function applyGains() {
  if (!master || !busInter || !busMusic) return;
  const soundsOn = mode !== 'silence';
  const musicOn = mode === 'full';
  master.gain.value = PEAK;
  busInter.gain.value = soundsOn ? profileVolume : 0;
  busMusic.gain.value = musicOn ? profileVolume * 0.2 : 0; // musique à 20 % (§4.3)
}

// ── Contrôle L5 (bouton sensoriel 3 états) ─────────────────────────────────
export function getSensoryMode(): SensoryMode { return mode; }

/** Cycle : full → sounds → silence → full (L5). Persistant. */
export function cycleSensoryMode(): SensoryMode {
  mode = mode === 'full' ? 'sounds' : mode === 'sounds' ? 'silence' : 'full';
  try { localStorage.setItem(KEY_MODE, mode); } catch { /* ignore */ }
  applyGains();
  return mode;
}

/** Volume dérivé du profil sensoriel (§2.2 : hyper=0, hypo/typique=1…). */
export function setProfileVolume(v: number) { profileVolume = Math.max(0, Math.min(1, v)); applyGains(); }

// ── Synthèse des sons (placeholders §4.2) ──────────────────────────────────
function env(g: GainNode, t0: number, peak: number, dur: number) {
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.01);          // fade-in 10 ms
  g.gain.setValueAtTime(peak, t0 + Math.max(0.01, dur - 0.04));
  g.gain.linearRampToValueAtTime(0, t0 + dur);              // fade-out ≥ 30 ms
}

function blip(freq: number, dur: number, type: OscillatorType, peak: number, slideTo?: number, when = 0) {
  const c = ensure(); if (!c || !busInter) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  env(g, t0, peak, dur);
  osc.connect(g); g.connect(busInter);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

function chord(freqs: number[], step: number, dur: number, peak: number) {
  freqs.forEach((f, i) => blip(f, dur, 'sine', peak, undefined, i * step));
}

/** Joue le son d'un événement (§4.2). Sans effet si `silence`. */
export function playChildSound(ev: SoundEvent) {
  if (mode === 'silence') return;
  switch (ev) {
    case 'tap': return blip(440, 0.08, 'triangle', 0.6, 360);          // pop doux boisé
    case 'good': return chord([523, 659, 784], 0.09, 0.22, 0.5);        // 3 notes ascendantes
    case 'error': return blip(240, 0.25, 'sine', 0.5, 150);            // grave descendant doux
    case 'fruit': return (blip(660, 0.12, 'triangle', 0.5, 880), chord([784, 988], 0.08, 0.2, 0.35));
    case 'fruitPlace': return blip(300, 0.12, 'sine', 0.45, 220);       // « toc » doux
    case 'victory': return chord([523, 659, 784, 1047], 0.11, 0.32, 0.5);
    case 'bibo': return blip(520 + Math.round((performance.now() % 5) * 30), 0.3, 'sine', 0.45, 700);
    case 'woosh': return blip(200, 0.3, 'sine', 0.3, 600);
    case 'breatheIn': return blip(300, 1.2, 'sine', 0.28, 520);
    case 'breatheOut': return blip(520, 1.6, 'sine', 0.28, 300);
  }
}

/** Retour haptique (L2 / §2.2 hypo). Silencieux si non supporté. */
export function haptic(ms = 15) {
  try { if ('vibrate' in navigator) navigator.vibrate(ms); } catch { /* ignore */ }
}
