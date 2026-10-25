/**
 * Source configuration and data loading for STEPBible lexicons.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';
import type { LexiconEntry, LexiconMetadata, LexiconSource } from '@metaxia/scriptures-core';
import type { LexiconRow } from './types.js';

// Resolve paths relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_PATH = join(__dirname, '..', 'data');

/**
 * Lexicon metadata for all included lexicons.
 */
export const metadata: Record<string, LexiconMetadata> = {
  'stepbible-tbesh': {
    id: 'stepbible-tbesh',
    name: 'TBESH - Translators Brief Hebrew Lexicon',
    language: 'hebrew',
    license: 'CC BY 4.0',
    source: 'STEPBible.org / Tyndale House',
    urls: [
      'https://github.com/STEPBible/STEPBible-Data',
      'https://www.stepbible.org/',
    ],
  },
  'stepbible-tbesg': {
    id: 'stepbible-tbesg',
    name: 'TBESG - Translators Brief Greek Lexicon',
    language: 'greek',
    license: 'CC BY 4.0',
    source: 'STEPBible.org / Tyndale House',
    urls: [
      'https://github.com/STEPBible/STEPBible-Data',
      'https://www.stepbible.org/',
    ],
  },
  'stepbible-tflsj': {
    id: 'stepbible-tflsj',
    name: 'TFLSJ - Full LSJ Greek Lexicon',
    language: 'greek',
    license: 'CC BY 4.0',
    source: 'STEPBible.org / Tyndale House',
    urls: [
      'https://github.com/STEPBible/STEPBible-Data',
      'https://www.stepbible.org/',
    ],
  },
};

/**
 * Cache for the deprecated eStrong-keyed lexicon data.
 * Maps lexicon ID -> extended Strong's number -> LexiconEntry
 */
const cache: Map<string, Map<string, LexiconEntry>> = new Map();

/**
 * Cache for lemma lookups.
 * Maps lexicon ID -> lemma -> LexiconEntry[]
 */
const lemmaCache: Map<string, Map<string, LexiconEntry[]>> = new Map();

/**
 * Load the deprecated eStrong-keyed lexicon data (one entry per eStrong, frozen
 * at the 2.1.3 import). Use the dStrong-keyed rows (lookupDStrong) instead.
 */
async function loadLexiconData(lexiconId: string): Promise<Map<string, LexiconEntry>> {
  if (cache.has(lexiconId)) {
    return cache.get(lexiconId)!;
  }

  const filePath = join(DATA_PATH, `${lexiconId}.json`);

  try {
    const content = await readFile(filePath, 'utf-8');
    const data: Record<string, LexiconEntry> = JSON.parse(content);
    const map = new Map(Object.entries(data));
    cache.set(lexiconId, map);

    // Build lemma index
    const lemmaIndex = new Map<string, LexiconEntry[]>();
    for (const entry of map.values()) {
      const existing = lemmaIndex.get(entry.lemma) || [];
      existing.push(entry);
      lemmaIndex.set(entry.lemma, existing);
    }
    lemmaCache.set(lexiconId, lemmaIndex);

    return map;
  } catch (error) {
    throw new Error(`Failed to load lexicon '${lexiconId}': ${error}`);
  }
}

/**
 * Create a lexicon source for a specific lexicon.
 */
function createLexiconSource(lexiconId: string): LexiconSource {
  const meta = metadata[lexiconId];
  if (!meta) {
    throw new Error(`Unknown lexicon: ${lexiconId}`);
  }

  return {
    id: lexiconId,
    metadata: meta,
    dataPath: DATA_PATH,

    /**
     * @deprecated Looks up one entry per extended Strong's number (eStrong) from
     * the eStrong-keyed file frozen at 2.1.3. An eStrong can name several
     * STEPBible rows; use lookupDStrong() with the word's dStrong instead.
     */
    async lookupStrongs(strongsNumber: string): Promise<LexiconEntry | undefined> {
      const data = await loadLexiconData(lexiconId);
      return data.get(strongsNumber);
    },

    async lookupLemma(lemma: string): Promise<LexiconEntry[]> {
      await loadLexiconData(lexiconId); // Ensure loaded
      const index = lemmaCache.get(lexiconId);
      return index?.get(lemma) || [];
    },

    async searchDefinition(query: string): Promise<LexiconEntry[]> {
      const data = await loadLexiconData(lexiconId);
      const results: LexiconEntry[] = [];
      const lowerQuery = query.toLowerCase();

      for (const entry of data.values()) {
        if (
          entry.gloss?.toLowerCase().includes(lowerQuery) ||
          entry.definition?.toLowerCase().includes(lowerQuery)
        ) {
          results.push(entry);
        }
      }

      return results;
    },
  };
}

// ---------------------------------------------------------------------------
// Every TBESH/TBESG row, keyed by its exact dStrong
// ---------------------------------------------------------------------------

/** Lexicons whose rows are available keyed by dStrong. */
export type RowLexiconId = 'stepbible-tbesh' | 'stepbible-tbesg';

const rowsCache: Map<RowLexiconId, Record<string, LexiconRow>> = new Map();

/**
 * All rows of TBESH ("stepbible-tbesh", Hebrew) or TBESG ("stepbible-tbesg",
 * Greek), keyed by dStrong, in STEPBible's file order.
 */
export async function loadRows(lexiconId: RowLexiconId): Promise<Record<string, LexiconRow>> {
  const cached = rowsCache.get(lexiconId);
  if (cached) return cached;
  const content = await readFile(join(DATA_PATH, `${lexiconId}-rows.json`), 'utf-8');
  const rows: Record<string, LexiconRow> = JSON.parse(content);
  rowsCache.set(lexiconId, rows);
  return rows;
}

function rowLexiconFor(tag: string): RowLexiconId {
  if (tag.startsWith('H')) return 'stepbible-tbesh';
  if (tag.startsWith('G')) return 'stepbible-tbesg';
  throw new Error(`Not a Hebrew (H) or Greek (G) Strong's tag: ${tag}`);
}

/**
 * The TBESH/TBESG row for an exact dStrong, e.g. "H1540H" (to reveal: reveal),
 * "H5483M" (horse), "H9005" (to/for). The tag is matched exactly as STEPBible
 * writes it (four digits, upper-case disambiguation letters); no other row is
 * substituted when it is missing.
 */
export async function lookupDStrong(dStrong: string): Promise<LexiconRow | undefined> {
  const rows = await loadRows(rowLexiconFor(dStrong));
  return rows[dStrong];
}

/**
 * Every row that maps to an extended Strong's number (eStrong), in file order.
 * E.g. "H5483b" -> [H5483B (Horse (Gate)), H5483M (horse)].
 */
export async function rowsForEStrong(eStrong: string): Promise<LexiconRow[]> {
  const rows = await loadRows(rowLexiconFor(eStrong));
  return Object.values(rows).filter((row) => row.strongsExtended === eStrong);
}

/**
 * Every row whose simple Strong's number (sStrong: digits only) is the given
 * one, in file order. E.g. "H5483" -> [H5483A, H5483B, H5483M].
 */
export async function rowsForSStrong(sStrong: string): Promise<LexiconRow[]> {
  const rows = await loadRows(rowLexiconFor(sStrong));
  return Object.values(rows).filter((row) => row.strongsSimple === sStrong);
}

/**
 * Pre-built lexicon sources for registration.
 */
export const lexicons: Record<string, LexiconSource> = {
  'stepbible-tbesh': createLexiconSource('stepbible-tbesh'),
  'stepbible-tbesg': createLexiconSource('stepbible-tbesg'),
  'stepbible-tflsj': createLexiconSource('stepbible-tflsj'),
};

/**
 * Mapping from OHB prefix codes to Strong's prefix numbers.
 * OHB uses single-letter codes in lemmas like "b/7225" or "c/d/8064".
 */
export const PREFIX_TO_STRONGS: Record<string, string> = {
  b: 'H9003', // beth - "in/on/with"
  c: 'H9002', // vav conjunctive - "and"
  d: 'H9009', // article hé - "the"
  k: 'H9004', // kaph - "like/as"
  l: 'H9005', // lamed - "to/for"
  m: 'H9006', // mem - "from"
  s: 'H9007', // shin - "which/that"
  h: 'H9008', // interrogative hé - "?"
};

/**
 * Parse an OHB-style lemma into prefix codes and root Strong's number.
 * Examples:
 *   "b/7225" -> { prefixes: ["b"], root: "7225" }
 *   "c/d/8064" -> { prefixes: ["c", "d"], root: "8064" }
 *   "1254 a" -> { prefixes: [], root: "1254 a" }
 */
export function parseLemma(lemma: string): { prefixes: string[]; root: string } {
  const parts = lemma.split('/');
  if (parts.length === 1) {
    return { prefixes: [], root: lemma };
  }
  const prefixes = parts.slice(0, -1);
  const root = parts[parts.length - 1];
  return { prefixes, root };
}

/**
 * Build a combined transliteration from prefix codes and a root transliteration.
 * Synchronous version that accepts pre-loaded lexicon data.
 *
 * @param lemma - OHB-style lemma like "b/7225"
 * @param rootTransliteration - The root word's transliteration (e.g., "re.shit")
 * @param lexiconData - Pre-loaded lexicon object mapping Strong's numbers to entries
 */
export function buildTransliterationSync(
  lemma: string,
  rootTransliteration: string,
  lexiconData: Record<string, LexiconEntry>
): string {
  const { prefixes } = parseLemma(lemma);
  if (prefixes.length === 0) {
    return rootTransliteration;
  }

  const prefixTranslits: string[] = [];

  for (const prefix of prefixes) {
    const strongsNum = PREFIX_TO_STRONGS[prefix];
    if (strongsNum) {
      const entry = lexiconData[strongsNum];
      if (entry?.transliteration) {
        prefixTranslits.push(entry.transliteration);
      }
    }
  }

  return prefixTranslits.join('') + rootTransliteration;
}

/**
 * Build a combined transliteration from prefix codes and a root transliteration.
 * Looks up each prefix's transliteration from the Hebrew lexicon.
 */
export async function buildTransliteration(
  lemma: string,
  rootTransliteration: string
): Promise<string> {
  const { prefixes } = parseLemma(lemma);
  if (prefixes.length === 0) {
    return rootTransliteration;
  }

  const hebrewLexicon = await loadLexiconData('stepbible-tbesh');
  const prefixTranslits: string[] = [];

  for (const prefix of prefixes) {
    const strongsNum = PREFIX_TO_STRONGS[prefix];
    if (strongsNum) {
      const entry = hebrewLexicon.get(strongsNum);
      if (entry?.transliteration) {
        prefixTranslits.push(entry.transliteration);
      }
    }
  }

  return prefixTranslits.join('') + rootTransliteration;
}

/**
 * Look up a word's full transliteration given its OHB-style lemma.
 * Combines prefix transliterations with the root word transliteration.
 *
 * Example: "b/7225" -> "bre.shit" (b + re.shit)
 */
export async function lookupTransliteration(lemma: string): Promise<string | undefined> {
  const { prefixes, root } = parseLemma(lemma);
  const hebrewLexicon = await loadLexiconData('stepbible-tbesh');

  // Normalize root to Strong's format (H + padded number)
  const rootNum = root.replace(/\D/g, '');
  const strongsKey = `H${rootNum.padStart(4, '0')}`;

  const rootEntry = hebrewLexicon.get(strongsKey);
  if (!rootEntry?.transliteration) {
    return undefined;
  }

  if (prefixes.length === 0) {
    return rootEntry.transliteration;
  }

  return buildTransliteration(lemma, rootEntry.transliteration);
}
