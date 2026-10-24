import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isPrimaryMeaning, isNameHomograph, ownLetteredRow, selectEntry } from './import.js';
import type { LexiconEntry } from '@metaxia/scriptures-core';
import { parseLemma, lookupTransliteration } from '../src/source.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

describe('isPrimaryMeaning', () => {
  it('returns true for G suffix entries (primary meanings)', () => {
    expect(isPrimaryMeaning('H0430G = a Name of')).toBe(true);
    expect(isPrimaryMeaning('H7225G')).toBe(true);
    expect(isPrimaryMeaning('G0025G')).toBe(true);
    expect(isPrimaryMeaning('H6440G = a Meaning of')).toBe(true);
  });

  it('returns false for non-G suffix entries (secondary meanings)', () => {
    expect(isPrimaryMeaning('H0430H = a Part of')).toBe(false);
    expect(isPrimaryMeaning('H0430I = a Part of')).toBe(false);
    expect(isPrimaryMeaning('H7225H = a Meaning of')).toBe(false);
    expect(isPrimaryMeaning('G0032H = a Meaning of')).toBe(false);
  });

  it('returns false for undefined or empty input', () => {
    expect(isPrimaryMeaning(undefined)).toBe(false);
    expect(isPrimaryMeaning('')).toBe(false);
  });

  it('handles edge cases', () => {
    // Just the Strong's number with G suffix
    expect(isPrimaryMeaning('H0001G')).toBe(true);
    // Lowercase should also work
    expect(isPrimaryMeaning('h0001g')).toBe(true);
    // Extended Strong's with letter before G
    expect(isPrimaryMeaning('H7225aG')).toBe(true);
  });
});

const row = (dStrong: string, lemma: string, gloss: string): LexiconEntry => ({
  source: 'stepbible-tbesh',
  strongsExtended: dStrong.slice(0, 5),
  strongsDisambiguated: dStrong,
  lemma,
  gloss,
});

describe('selectEntry', () => {
  // TBESH rows for H1540, in file order.
  const h1540 = [
    row('H1540G = a Name of', 'הֶגְלָם', 'Heglam'),
    row('H1540H', 'גָּלָה', 'to reveal: reveal'),
    row('H1540I = a Meaning of', 'גָּלָה', 'to reveal: uncover'),
  ];

  it('passes over a proper-name homograph spelled differently from the other rows', () => {
    expect(isNameHomograph(h1540[0], h1540)).toBe(true);
    expect(isNameHomograph(h1540[1], h1540)).toBe(false);
    expect(selectEntry(h1540).gloss).toBe('to reveal: reveal');
  });

  it('keeps a name row that shares its spelling with the other rows', () => {
    // H0430: "God" is "a Name of" H3068G but spelled like the other rows.
    const h0430 = [
      row('H0430G = a Name of', 'אֱלֹהִים', 'God'),
      row('H0430H = a Part of', 'אֱלֹהִים', '(LORD)-Elohe'),
    ];
    expect(isNameHomograph(h0430[0], h0430)).toBe(false);
    expect(selectEntry(h0430).gloss).toBe('God');
  });

  it('keeps a lone name row', () => {
    const only = [row('H1540G = a Name of', 'הֶגְלָם', 'Heglam')];
    expect(selectEntry(only).gloss).toBe('Heglam');
  });

  it('takes a lettered number\'s own plain row over its G row', () => {
    // TBESH rows for H1004b, in file order.
    const h1004b = [
      { ...row('H1004G', 'בַּיִת', 'Beth-(ashbea)'), strongsExtended: 'H1004b' },
      { ...row('H1004B', 'בַּיִת', 'house: home'), strongsExtended: 'H1004b' },
    ];
    expect(ownLetteredRow(h1004b)?.gloss).toBe('house: home');
    expect(selectEntry(h1004b).gloss).toBe('house: home');
  });

  it('does not take an annotated own row ("a Meaning of")', () => {
    const rows = [
      { ...row('H2428G', 'חַ֫יִל', 'strength'), strongsExtended: 'H2428a' },
      { ...row('H2428A = a Meaning of', 'חַ֫יִל', 'strength: soldiers'), strongsExtended: 'H2428a' },
    ];
    expect(ownLetteredRow(rows)).toBeUndefined();
    expect(selectEntry(rows).gloss).toBe('strength');
  });

  it('prefers the first primary (G) row, else the first row', () => {
    const rows = [row('H7225H = a Meaning of', 'רֵאשִׁית', 'first: best'), row('H7225G', 'רֵאשִׁית', 'first: beginning')];
    expect(selectEntry(rows).gloss).toBe('first: beginning');
    expect(selectEntry([row('H0559', 'אָמַר', 'to say')]).gloss).toBe('to say');
  });
});

describe('imported lexicon data - primary meaning prioritization', () => {
  it('TBESH (Hebrew) has correct primary glosses for common words', async () => {
    const content = await readFile(join(DATA_DIR, 'stepbible-tbesh.json'), 'utf-8');
    const data = JSON.parse(content);

    // H0430 (Elohim) should be "God", not "(Gibeath)-elohim"
    expect(data['H0430']).toBeDefined();
    expect(data['H0430'].gloss).toBe('God');
    expect(data['H0430'].strongsDisambiguated).toMatch(/G/);

    // H7225 (reshit) should be "first: beginning", not "first: best"
    expect(data['H7225']).toBeDefined();
    expect(data['H7225'].gloss).toBe('first: beginning');

    // H6440 (panim) should be "face: before", not "face: kindness"
    expect(data['H6440']).toBeDefined();
    expect(data['H6440'].gloss).toBe('face: before');

    // H4325 (mayim) should be "water", not "Water (Gate)"
    expect(data['H4325']).toBeDefined();
    expect(data['H4325'].gloss).toBe('water');

    // H7200 (ra'ah) should be "to see: see", not "Provider"
    expect(data['H7200']).toBeDefined();
    expect(data['H7200'].gloss).toBe('to see: see');

    // H1540 (galah) should be the verb, not the name homograph Heglam
    expect(data['H1540'].gloss).toBe('to reveal: reveal');
    expect(data['H1540'].lemma.normalize('NFC')).toBe('גָּלָה'.normalize('NFC'));

    // H8077a (shemamah) should be "devastation", not the name "Desolate"
    expect(data['H8077a'].gloss).toBe('devastation');

    // Lettered numbers take their own row, not a name filed first under G
    expect(data['H1004b'].gloss).toBe('house: home');
    expect(data['H5971a'].gloss).toBe('people');
    expect(data['H1121a'].gloss).toBe('son: child');
  });

  it('TBESH entries with primary meanings have G suffix in disambiguated field', async () => {
    const content = await readFile(join(DATA_DIR, 'stepbible-tbesh.json'), 'utf-8');
    const data = JSON.parse(content);

    // Sample check: common words should have G suffix
    const commonWords = ['H0430', 'H7225', 'H6440', 'H4325', 'H7200', 'H0001', 'H3068'];

    for (const strongs of commonWords) {
      if (data[strongs]) {
        const dStrong = data[strongs].strongsDisambiguated;
        expect(
          isPrimaryMeaning(dStrong),
          `${strongs} should have primary meaning (G suffix), got: ${dStrong}`
        ).toBe(true);
      }
    }
  });

  it('TBESG (Greek) has correct primary glosses', async () => {
    const content = await readFile(join(DATA_DIR, 'stepbible-tbesg.json'), 'utf-8');
    const data = JSON.parse(content);

    // G0025 (agapao) should be "to love"
    expect(data['G0025']).toBeDefined();
    expect(data['G0025'].gloss).toBe('to love');

    // G0032 (angelos) should be "angel"
    expect(data['G0032']).toBeDefined();
    expect(data['G0032'].gloss).toBe('angel');

    // G0165 (aion) should be "an age: age"
    expect(data['G0165']).toBeDefined();
    expect(data['G0165'].gloss).toBe('an age: age');
  });
});

describe('parseLemma', () => {
  it('parses lemma without prefix', () => {
    expect(parseLemma('7225')).toEqual({ prefixes: [], root: '7225' });
    expect(parseLemma('1254 a')).toEqual({ prefixes: [], root: '1254 a' });
  });

  it('parses lemma with single prefix', () => {
    expect(parseLemma('b/7225')).toEqual({ prefixes: ['b'], root: '7225' });
    expect(parseLemma('d/8064')).toEqual({ prefixes: ['d'], root: '8064' });
    expect(parseLemma('c/853')).toEqual({ prefixes: ['c'], root: '853' });
  });

  it('parses lemma with multiple prefixes', () => {
    expect(parseLemma('c/d/8064')).toEqual({ prefixes: ['c', 'd'], root: '8064' });
    expect(parseLemma('c/b/7225')).toEqual({ prefixes: ['c', 'b'], root: '7225' });
  });
});

describe('lookupTransliteration', () => {
  it('returns transliteration for word without prefix', async () => {
    const result = await lookupTransliteration('7225');
    expect(result).toBe('re.shit');
  });

  it('returns combined transliteration for word with prefix', async () => {
    // b/7225 = beth + reshit = "bre.shit"
    const result = await lookupTransliteration('b/7225');
    expect(result).toBe('bre.shit');
  });

  it('returns combined transliteration for word with article prefix', async () => {
    // d/8064 = article + shamayim = "hasha.ma.yim"
    const result = await lookupTransliteration('d/8064');
    expect(result).toBe('hasha.ma.yim');
  });

  it('returns combined transliteration for word with multiple prefixes', async () => {
    // c/853 = vav + et = "vet"
    const result = await lookupTransliteration('c/853');
    expect(result).toBe('vet');
  });
});
