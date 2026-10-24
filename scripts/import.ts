/**
 * Import script for STEPBible lexicon data.
 *
 * Downloads TSV files from GitHub and converts to JSON format.
 *
 * Usage: npm run import
 */

import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { LexiconEntry } from '@metaxia/scriptures-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'data');
const SOURCE_DIR = join(ROOT_DIR, 'source');

/**
 * STEPBible-Data commit hash for reproducible imports.
 * Update this when upgrading to a newer version of the data.
 */
const STEPBIBLE_COMMIT = '52607753604a9a650b9ae62da8d069a8312eb99a';

/**
 * Base URL for raw file access at pinned commit.
 */
const BASE_URL = `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${STEPBIBLE_COMMIT}/Lexicons`;

/**
 * STEPBible lexicon file definitions.
 */
const LEXICONS = [
  {
    id: 'stepbible-tbesh',
    language: 'hebrew' as const,
    filename: 'TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt',
    url: `${BASE_URL}/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt`,
  },
  {
    id: 'stepbible-tbesg',
    language: 'greek' as const,
    filename: 'TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt',
    url: `${BASE_URL}/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt`,
  },
  {
    id: 'stepbible-tflsj',
    language: 'greek' as const,
    filename: 'TFLSJ  0-5624 - Translators Formatted full LSJ Bible lexicon - STEPBible.org CC BY.txt',
    url: `${BASE_URL}/TFLSJ%20%200-5624%20-%20Translators%20Formatted%20full%20LSJ%20Bible%20lexicon%20-%20STEPBible.org%20CC%20BY.txt`,
  },
];

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
 * Parse a TSV line, handling quoted fields.
 */
function parseTsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === '\t' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Check if a disambiguated Strong's number has a "G" suffix (primary meaning).
 * Examples: "H0430G = a Name of" -> true, "H0430H = a Part of" -> false
 */
export function isPrimaryMeaning(dStrong: string | undefined): boolean {
  if (!dStrong) return false;
  // Match pattern like "H0430G" or "G0025G" - number followed by "G"
  // The "G" suffix indicates the primary/general meaning in STEPBible data
  return /^[HG]\d+[a-z]*G\b/i.test(dStrong);
}

/**
 * True when a row is a proper name spelled differently from every other row
 * of the same extended Strong's number: a name homograph filed under another
 * lexeme. TBESH files the name Heglam (הֶגְלָם, "H1540G = a Name of", unified
 * H1617J) under H1540 next to the verb galah (גָּלָה, H1540H-K). The G suffix
 * is only the first letter of STEPBible's disambiguation series, not a mark of
 * the main sense, so the name must not stand for the number.
 */
export function isNameHomograph(row: LexiconEntry, rows: LexiconEntry[]): boolean {
  if (rows.length < 2) return false;
  if (!/=\s*a Name of\b/i.test(row.strongsDisambiguated ?? '')) return false;
  return rows.every((other) => other === row || other.lemma !== row.lemma);
}

/**
 * The row that is the lettered number's own plain entry: dStrong is the
 * extended number upper-cased with no annotation ("H1004B" or "H1004B =" for
 * H1004b), not "a Meaning of"/"a Part of" another row. Under H1004b the G row
 * is the place name Beth-(ashbea) and H1004B is "house: home".
 */
export function ownLetteredRow(rows: LexiconEntry[]): LexiconEntry | undefined {
  const eStrong = rows[0]?.strongsExtended ?? '';
  if (!/^[HG]\d+[a-z]$/.test(eStrong)) return undefined;
  const own = eStrong.toUpperCase();
  return rows.find((row) => row.strongsDisambiguated?.replace(/\s*=\s*$/, '').trim() === own);
}

/**
 * Pick the one entry stored for an extended Strong's number from all of its
 * TBESH/TBESG rows (in file order).
 *
 * A lettered number (H1004b) takes its own plain row (ownLetteredRow) when it
 * has one. Otherwise the first primary-meaning row (G suffix in dStrong) wins,
 * else the first row. A proper-name homograph (isNameHomograph) is passed over
 * when another row exists.
 */
export function selectEntry(rows: LexiconEntry[]): LexiconEntry {
  const own = ownLetteredRow(rows);
  if (own) return own;
  const candidates = rows.filter((row) => !isNameHomograph(row, rows));
  const pool = candidates.length > 0 ? candidates : rows;
  return pool.find((row) => isPrimaryMeaning(row.strongsDisambiguated)) ?? pool[0];
}

/**
 * Parse STEPBible TSV file into lexicon entries.
 *
 * TSV columns (may vary slightly by file):
 * 0: eStrong# (Extended Strong's)
 * 1: dStrong# (Disambiguated)
 * 2: uStrong# (Unified)
 * 3: Hebrew/Greek text
 * 4: Transliteration
 * 5: Morph (grammatical info)
 * 6: Gloss (brief meaning)
 * 7: Meaning (full definition)
 */
function parseLexiconTsv(
  content: string,
  lexiconId: string
): Record<string, LexiconEntry> {
  const entries: Record<string, LexiconEntry> = {};
  const groups: Record<string, LexiconEntry[]> = {};
  const lines = content.split('\n');

  let dataStarted = false;
  let headerLine = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Look for the header line (contains column names)
    if (!dataStarted) {
      if (
        trimmed.includes('eStrong') ||
        trimmed.includes('Strong') ||
        trimmed.includes('Hebrew') ||
        trimmed.includes('Greek')
      ) {
        headerLine = trimmed;
        dataStarted = true;
        continue;
      }
      // Skip preamble text
      continue;
    }

    // Parse data line
    const fields = parseTsvLine(trimmed);

    // Need at least: eStrong, dStrong, uStrong, lemma, translit, morph, gloss
    if (fields.length < 7) {
      continue;
    }

    // Skip if first field doesn't look like a Strong's number
    const eStrong = fields[0];
    if (!eStrong.match(/^[HG]\d+/)) {
      continue;
    }

    const entry: LexiconEntry = {
      source: lexiconId,
      strongsExtended: eStrong,
      strongsDisambiguated: fields[1] || undefined,
      strongsUnified: fields[2] || undefined,
      lemma: fields[3] || '',
      transliteration: fields[4] || undefined,
      morphology: fields[5] || undefined,
      gloss: fields[6] || undefined,
      definition: fields[7] || undefined,
    };

    // Clean up "=" suffixes in disambiguated numbers (e.g., "G0025 =" -> "G0025")
    if (entry.strongsDisambiguated) {
      entry.strongsDisambiguated = entry.strongsDisambiguated.replace(/\s*=\s*$/, '').trim();
    }

    (groups[eStrong] ||= []).push(entry);
  }

  for (const [eStrong, rows] of Object.entries(groups)) {
    entries[eStrong] = selectEntry(rows);
  }

  return entries;
}

/**
 * Import a single lexicon.
 */
async function importLexicon(lexicon: typeof LEXICONS[0]): Promise<number> {
  console.log(`\nImporting ${lexicon.id}...`);

  const sourcePath = join(SOURCE_DIR, lexicon.filename);

  // Download if not cached
  try {
    await readFile(sourcePath, 'utf-8');
    console.log(`  Using cached source file`);
  } catch {
    await downloadFile(lexicon.url, sourcePath);
  }

  // Parse TSV
  const content = await readFile(sourcePath, 'utf-8');
  const entries = parseLexiconTsv(content, lexicon.id);

  const count = Object.keys(entries).length;
  console.log(`  Parsed ${count} entries`);

  // Write JSON
  const outputPath = join(DATA_DIR, `${lexicon.id}.json`);
  await writeFile(outputPath, JSON.stringify(entries, null, 2), 'utf-8');
  console.log(`  Wrote ${outputPath}`);

  return count;
}

/**
 * Main import function.
 */
async function main(): Promise<void> {
  console.log('STEPBible Lexicon Import');
  console.log('========================\n');

  // Create directories
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(SOURCE_DIR, { recursive: true });

  let totalEntries = 0;

  for (const lexicon of LEXICONS) {
    const count = await importLexicon(lexicon);
    totalEntries += count;
  }

  console.log(`\n========================`);
  console.log(`Total: ${totalEntries} entries across ${LEXICONS.length} lexicons`);
  console.log('Done!');
}

// Only run main when executed directly (not when imported by tests)
if (process.argv[1]?.includes('import.ts') || process.argv[1]?.includes('import.js')) {
  main().catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
}
