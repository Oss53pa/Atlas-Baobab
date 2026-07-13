/**
 * Synthèse vocale (CDC §E4 : "synthèse vocale française embarquée, offline,
 * latence tap-vers-voix < 300 ms"). Ici la Web Speech API du navigateur (fr-FR).
 * En production Capacitor : plugin TTS natif embarqué. Voix ivoirienne en cible V2.
 */

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  if (cachedVoice) return cachedVoice;
  const voices = speechSynthesis.getVoices();
  cachedVoice =
    voices.find((v) => v.lang?.toLowerCase().startsWith('fr')) ??
    voices[0] ??
    null;
  return cachedVoice;
}

export function speak(text: string): void {
  if (typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    u.pitch = 1;
    const v = pickVoice();
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch {
    /* voix indisponible : la CAA reste utilisable visuellement */
  }
}

export function ttsAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined';
}
