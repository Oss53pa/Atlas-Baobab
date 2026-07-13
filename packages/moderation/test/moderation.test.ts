import { describe, it, expect } from 'vitest';
import { moderateContent, normalize, LEXICON_VERSION } from '../src/index.js';

describe('normalize', () => {
  it('lowercases and strips accents', () => {
    expect(normalize('GUÉRIR')).toBe('guerir');
    expect(normalize('Féticheur')).toBe('feticheur');
  });
});

describe('moderateContent — contenu sain', () => {
  it('publie un partage ordinaire sans le modifier', () => {
    const r = moderateContent("Mon enfant a fait une grosse crise au marché hier, le bruit l'a submergé. Le coin calme a bien aidé.");
    expect(r.status).toBe('published');
    expect(r.dangers).toEqual([]);
    expect(r.masked).toContain('coin calme');
    expect(r.lexicon_version).toBe(LEXICON_VERSION);
  });
});

describe('moderateContent — masquage PII (§B4)', () => {
  it('masque un numéro de téléphone ivoirien', () => {
    const r = moderateContent('Appelez-moi au +225 07 07 12 34 56 pour en parler.');
    expect(r.masked).toContain('[numéro masqué]');
    expect(r.reasons).toContain('pii:phone');
    expect(r.status).toBe('published');
  });
  it('masque un email et un lien', () => {
    const r = moderateContent('Écris à maman@exemple.ci ou va sur www.site-douteux.ci');
    expect(r.masked).toContain('[email masqué]');
    expect(r.masked).toContain('[lien masqué]');
  });
  it("masque le prénom de l'enfant si fourni", () => {
    const r = moderateContent('Kessy a bien dormi cette nuit.', { childNames: ['Kessy'] });
    expect(r.masked).toBe('[prénom masqué] a bien dormi cette nuit.');
    expect(r.reasons).toContain('pii:child_name');
  });
});

describe('moderateContent — quarantaine des cures interdites (§B4, multilingue)', () => {
  it('met en quarantaine une promesse de guérison (fr standard)', () => {
    const r = moderateContent("J'ai un traitement qui va guérir l'autisme en 3 mois, garanti.");
    expect(r.status).toBe('quarantined');
    expect(r.dangers).toContain('fake_cure');
  });
  it('détecte malgré les accents et l’ordre inverse', () => {
    const r = moderateContent("L'autisme, on peut le guérir avec ça.");
    expect(r.status).toBe('quarantined');
  });
  it('met en quarantaine une substance dangereuse (MMS/javel)', () => {
    expect(moderateContent('donnez-lui du MMS chaque matin').status).toBe('quarantined');
    expect(moderateContent("faites boire de l'eau de javel diluée").dangers).toContain('dangerous_substance');
  });
  it('met en quarantaine une cure occulte (ivoirien/nouchi)', () => {
    const r = moderateContent('Va voir le féticheur du village, il va soigner ton enfant.');
    expect(r.status).toBe('quarantined');
    expect(r.dangers).toContain('occult_cure');
  });
  it('met en quarantaine "le marabout va guérir l’enfant"', () => {
    expect(moderateContent('le marabout va guerir ton enfant').status).toBe('quarantined');
  });
  it('met en quarantaine une plante présentée comme cure de l’autisme', () => {
    const r = moderateContent("cette plante soigne l'autisme, essaie");
    expect(r.status).toBe('quarantined');
    expect(r.dangers).toContain('fake_cure');
  });
  it('ne bloque PAS le discours anti-stigmatisation légitime', () => {
    const r = moderateContent("L'autisme n'est pas de la sorcellerie et ce n'est pas la faute des parents.");
    expect(r.status).toBe('published');
  });
});
