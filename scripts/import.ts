/**
 * Import script for STEPBible lexicon data.
 *
 * Downloads the TBESH and TBESG TSV files from STEPBible-Data at a pinned commit
 * and writes every row, keyed by its exact disambiguated Strong's number
 * (dStrong), to data/stepbible-tbesh-rows.json and data/stepbible-tbesg-rows.json.
 * No row is chosen over another: STEPBible tags each word with a dStrong (TAHOT,
 * TAGNT), and the dStrong names exactly one row.
 *
 * The eStrong-keyed files (stepbible-tbesh.json, stepbible-tbesg.json,
 * stepbible-tflsj.json) are deprecated and are no longer written by this script.
 * They stay in the package unchanged from 2.1.3 for existing consumers.
 *
 * Usage: npm run import
 */

import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { LexiconRow } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'data');
const SOURCE_DIR = join(ROOT_DIR, 'source');

/**
 * STEPBible-Data commit hash for reproducible imports.
 * Update this when upgrading to a newer version of the data.
 */
export const STEPBIBLE_COMMIT = '52607753604a9a650b9ae62da8d069a8312eb99a';

/**
 * Base URL for raw file access at pinned commit.
 */
const BASE_URL = `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${STEPBIBLE_COMMIT}/Lexicons`;

/**
 * STEPBible lexicons whose rows are exported keyed by dStrong.
 */
export const LEXICONS = [
  {
    id: 'stepbible-tbesh',
    filename: 'TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt',
    url: `${BASE_URL}/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt`,
  },
  {
    id: 'stepbible-tbesg',
    filename: 'TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt',
    url: `${BASE_URL}/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt`,
  },
] as const;

/**
 * Download a file from URL.
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  console.log(`  Downloading: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }

  const text = await response.text();
  await writeFile(destPath, text, 'utf-8');
  console.log(`  Saved to: ${destPath}`);
}

/**
 * Split STEPBible's dStrong column into the tag and its relation note.
 * "H1540G = a Name of" -> { dStrong: "H1540G", relation: "a Name of" }
 * "H1540H ="           -> { dStrong: "H1540H", relation: undefined }
 */
export function splitDStrongField(field: string): { dStrong: string; relation?: string } {
  const eq = field.indexOf('=');
  if (eq === -1) return { dStrong: field.trim() };
  const relation = field.slice(eq + 1).trim();
  return { dStrong: field.slice(0, eq).trim(), relation: relation || undefined };
}

/**
 * Simple Strong's number (sStrong): the Strong's number with every letter after
 * the digits removed, as STEPBible defines it (TinyURL.com/UpgradingTags).
 * "H1540H" -> "H1540", "H1984b" -> "H1984", "G0026G" -> "G0026".
 */
export function simpleStrong(tag: string): string {
  const match = /^([HG]\d+)/.exec(tag);
  return match ? match[1] : tag;
}

/**
 * Parse one TBESH/TBESG data line. Columns (STEPBible header line):
 * eStrong#, dStrong, uStrong, Hebrew/Greek, Transliteration, Morph, Gloss, Meaning.
 * Fields are split on tabs and kept as STEPBible wrote them, trimmed of
 * surrounding whitespace. Returns undefined for a line that is not a data row.
 */
export function parseRow(line: string, lexiconId: string): LexiconRow | undefined {
  const fields = line.replace(/\r$/, '').split('\t');
  if (fields.length < 7) return undefined;
  const eStrong = fields[0].trim();
  if (!/^[HG]\d+[A-Za-z]*$/.test(eStrong)) return undefined;
  const { dStrong, relation } = splitDStrongField(fields[1]);
  if (!/^[HG]\d+[A-Za-z]*$/.test(dStrong)) return undefined;
  const opt = (value: string | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };
  return {
    source: lexiconId,
    strongsDisambiguated: dStrong,
    strongsExtended: eStrong,
    strongsSimple: simpleStrong(dStrong),
    strongsUnified: opt(fields[2]),
    relation,
    lemma: fields[3]?.trim() ?? '',
    transliteration: opt(fields[4]),
    morphology: opt(fields[5]),
    gloss: opt(fields[6]),
    definition: opt(fields[7]),
  };
}

/**
 * Parse a STEPBible lexicon TSV into all of its rows, keyed by dStrong, in file
 * order. Throws if a dStrong occurs twice (STEPBible defines each one once).
 */
export function parseLexiconRows(content: string, lexiconId: string): Record<string, LexiconRow> {
  const rows: Record<string, LexiconRow> = {};
  for (const line of content.split('\n')) {
    const row = parseRow(line, lexiconId);
    if (!row) continue;
    if (rows[row.strongsDisambiguated]) {
      throw new Error(`${lexiconId}: dStrong ${row.strongsDisambiguated} occurs more than once`);
    }
    rows[row.strongsDisambiguated] = row;
  }
  return rows;
}

/**
 * Import a single lexicon.
 */
async function importLexicon(lexicon: (typeof LEXICONS)[number]): Promise<number> {
  console.log(`\nImporting ${lexicon.id}...`);

  const sourcePath = join(SOURCE_DIR, lexicon.filename);

  // Download if not cached
  try {
    await readFile(sourcePath, 'utf-8');
    console.log(`  Using cached source file`);
  } catch {
    await downloadFile(lexicon.url, sourcePath);
  }

  const content = await readFile(sourcePath, 'utf-8');
  const rows = parseLexiconRows(content, lexicon.id);

  const count = Object.keys(rows).length;
  console.log(`  Parsed ${count} rows`);

  const outputPath = join(DATA_DIR, `${lexicon.id}-rows.json`);
  await writeFile(outputPath, JSON.stringify(rows, null, 2) + '\n', 'utf-8');
  console.log(`  Wrote ${outputPath}`);

  return count;
}

/**
 * Main import function.
 */
async function main(): Promise<void> {
  console.log('STEPBible Lexicon Import');
  console.log('========================\n');

  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(SOURCE_DIR, { recursive: true });

  let total = 0;
  for (const lexicon of LEXICONS) {
    total += await importLexicon(lexicon);
  }

  console.log(`\n========================`);
  console.log(`Total: ${total} rows across ${LEXICONS.length} lexicons`);
  console.log('Done!');
}

// Only run main when executed directly (not when imported by tests)
if (process.argv[1]?.includes('import.ts') || process.argv[1]?.includes('import.js')) {
  main().catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
}
