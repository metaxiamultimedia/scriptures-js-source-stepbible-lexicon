import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseRow, parseLexiconRows, splitDStrongField, simpleStrong } from './import.js';
import { parseLemma, lookupTransliteration, lookupDStrong, rowsForEStrong, rowsForSStrong, loadRows } from '../src/source.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

// Data lines copied verbatim from TBESH at the pinned STEPBible-Data commit
// (definitions shortened after the gloss column).
const TBESH_H1540G = 'H1540\tH1540G = a Name of\tH1617J\tהֶגְלָם\tga.lah\tH:V\tHeglam\tA man of the tribe of Benjamin';
const TBESH_H5483M = 'H5483b\tH5483M =\tH5483M\tסוּס\tsus\tH:N-M\thorse\t1) horse<br>1a) chariot horses';
const TBESH_H9005 = 'H9005\tH9005 =\tH9005\t/ל\tl\tPrefix\tto/for\tPrefix lamed: to ';

describe('splitDStrongField / simpleStrong', () => {
  it('splits the dStrong from STEPBible\'s relation note', () => {
    expect(splitDStrongField('H1540G = a Name of')).toEqual({ dStrong: 'H1540G', relation: 'a Name of' });
    expect(splitDStrongField('H1540H =')).toEqual({ dStrong: 'H1540H', relation: undefined });
    expect(splitDStrongField('G0018 =')).toEqual({ dStrong: 'G0018', relation: undefined });
  });

  it('drops every letter after the digits', () => {
    expect(simpleStrong('H1540H')).toBe('H1540');
    expect(simpleStrong('H1984b')).toBe('H1984');
    expect(simpleStrong('H9005')).toBe('H9005');
    expect(simpleStrong('G0026G')).toBe('G0026');
  });
});

describe('parseRow', () => {
  it('keeps every column of a TBESH row', () => {
    expect(parseRow(TBESH_H1540G, 'stepbible-tbesh')).toEqual({
      source: 'stepbible-tbesh',
      strongsDisambiguated: 'H1540G',
      strongsExtended: 'H1540',
      strongsSimple: 'H1540',
      strongsUnified: 'H1617J',
      relation: 'a Name of',
      lemma: 'הֶגְלָם',
      transliteration: 'ga.lah',
      morphology: 'H:V',
      gloss: 'Heglam',
      definition: 'A man of the tribe of Benjamin',
    });
    expect(parseRow(TBESH_H9005, 'stepbible-tbesh')?.definition).toBe('Prefix lamed: to');
  });

  it('skips lines that are not data rows', () => {
    expect(parseRow('eStrong#\tdStrong\tuStrong\tHebrew\tTransliteration\tMorph\tGloss\tMeaning', 'x')).toBeUndefined();
    expect(parseRow('', 'x')).toBeUndefined();
    expect(parseRow('H0001\tonly two', 'x')).toBeUndefined();
  });

  it('keeps every row of an eStrong, keyed by dStrong, and rejects a repeated dStrong', () => {
    const rows = parseLexiconRows([TBESH_H1540G, TBESH_H5483M, TBESH_H9005].join('\n'), 'stepbible-tbesh');
    expect(Object.keys(rows)).toEqual(['H1540G', 'H5483M', 'H9005']);
    expect(() => parseLexiconRows([TBESH_H9005, TBESH_H9005].join('\n'), 'stepbible-tbesh')).toThrow(/more than once/);
  });
});

describe('dStrong-keyed rows (STEPBible tags)', () => {
  it('has every TBESH and TBESG row', async () => {
    const tbesh = await loadRows('stepbible-tbesh');
    const tbesg = await loadRows('stepbible-tbesg');
    expect(Object.keys(tbesh)).toHaveLength(11682);
    expect(Object.keys(tbesg)).toHaveLength(11035);
    for (const [key, row] of [...Object.entries(tbesh), ...Object.entries(tbesg)]) {
      expect(row.strongsDisambiguated).toBe(key);
    }
  });

  it('H1540: the name Heglam and the verb galah are separate rows', async () => {
    const g = await lookupDStrong('H1540G');
    expect(g?.gloss).toBe('Heglam');
    expect(g?.relation).toBe('a Name of');
    expect(g?.strongsUnified).toBe('H1617J');
    expect(g?.strongsExtended).toBe('H1540');
    const h = await lookupDStrong('H1540H');
    expect(h?.gloss).toBe('to reveal: reveal');
    expect(h?.lemma.normalize('NFC')).toBe('גָּלָה'.normalize('NFC'));
    expect((await rowsForSStrong('H1540')).map((r) => r.strongsDisambiguated)).toEqual([
      'H1540G', 'H1540H', 'H1540I', 'H1540J', 'H1540K',
    ]);
  });

  it('H5483: swallow (H5483a), Horse Gate and horse (both H5483b)', async () => {
    expect((await lookupDStrong('H5483A'))?.gloss).toBe('swallow');
    expect((await lookupDStrong('H5483A'))?.strongsExtended).toBe('H5483a');
    expect((await lookupDStrong('H5483B'))?.gloss).toBe('Horse (Gate)');
    expect((await lookupDStrong('H5483M'))?.gloss).toBe('horse');
    expect((await rowsForEStrong('H5483b')).map((r) => r.strongsDisambiguated)).toEqual(['H5483B', 'H5483M']);
    expect((await rowsForSStrong('H5483')).map((r) => r.strongsDisambiguated)).toEqual(['H5483A', 'H5483B', 'H5483M']);
  });

  it('H1984B, H9005, H9035', async () => {
    const praise = await lookupDStrong('H1984B');
    expect(praise?.gloss).toBe('to boast: praise');
    expect(praise?.strongsExtended).toBe('H1984b');
    expect((await lookupDStrong('H9005'))?.gloss).toBe('to/for');
    expect((await lookupDStrong('H9005'))?.morphology).toBe('Prefix');
    expect((await lookupDStrong('H9035'))?.gloss).toBe('us');
  });

  it('matches tags exactly and substitutes nothing', async () => {
    expect(await lookupDStrong('H1540')).toBeUndefined();
    expect(await lookupDStrong('H1540h')).toBeUndefined();
    expect(await lookupDStrong('H5483b')).toBeUndefined();
  });

  it('Greek rows are keyed the same way', async () => {
    const g = await lookupDStrong('G0018');
    expect(g?.gloss).toBe('good');
    expect(g?.strongsExtended).toBe('G0018');
    expect(g?.source).toBe('stepbible-tbesg');
  });
});

describe('deprecated eStrong-keyed files', () => {
  // SHA-256 of the files published in 2.1.3. They are kept unchanged for
  // existing consumers and are no longer written by the import.
  const published = {
    'stepbible-tbesh.json': '2c9346bb2a4224a4bd6072a510e93e03fc85d8e0a1550a6472cab8773a21576e',
    'stepbible-tbesg.json': 'edcbae75d7b2d221953abcb4cd1ded5f2abf2d97b44ac69b29e7571ccb47b4c3',
    'stepbible-tflsj.json': 'c21acfaa48089d1dc13a4aa9c6459f7cc73fa7daf32084ad4683e4754905a791',
  };
  for (const [file, sha] of Object.entries(published)) {
    it(`${file} is byte-identical to 2.1.3`, async () => {
      const content = await readFile(join(DATA_DIR, file));
      expect(createHash('sha256').update(content).digest('hex')).toBe(sha);
    });
  }
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
    expect(await lookupTransliteration('7225')).toBe('re.shit');
  });

  it('returns combined transliteration for word with prefix', async () => {
    // b/7225 = beth + reshit = "bre.shit"
    expect(await lookupTransliteration('b/7225')).toBe('bre.shit');
  });

  it('returns combined transliteration for word with article prefix', async () => {
    // d/8064 = article + shamayim = "hasha.ma.yim"
    expect(await lookupTransliteration('d/8064')).toBe('hasha.ma.yim');
  });

  it('returns combined transliteration for word with multiple prefixes', async () => {
    // c/853 = vav + et = "vet"
    expect(await lookupTransliteration('c/853')).toBe('vet');
  });
});
