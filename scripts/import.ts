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

    // Prioritize primary meanings (G suffix in dStrong) over secondary meanings.
    // STEPBible uses suffixes like G (primary), H, I, J... for disambiguated entries.
    // Only overwrite an existing entry if:
    // 1. No entry exists yet, OR
    // 2. The new entry is a primary meaning (G suffix) and the existing one isn't
    const existingEntry = entries[eStrong];
    const newIsPrimary = isPrimaryMeaning(entry.strongsDisambiguated);
    const existingIsPrimary = existingEntry && isPrimaryMeaning(existingEntry.strongsDisambiguated);

    if (!existingEntry || (newIsPrimary && !existingIsPrimary)) {
      entries[eStrong] = entry;
    }
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
