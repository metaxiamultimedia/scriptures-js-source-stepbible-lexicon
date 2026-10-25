/**
 * Checks the committed dStrong-keyed rows against STEPBible's own TSV files at
 * the pinned commit, read independently of the import code: every data row of
 * TBESH and TBESG must be present once, with every column unchanged (trimmed),
 * and nothing else. Uses source/ when `npm run import` has cached the files,
 * otherwise downloads them from GitHub.
 */
import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LEXICONS } from './import.js';
import type { LexiconRow } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function stepFile(lexicon: (typeof LEXICONS)[number]): Promise<string> {
  try {
    return await readFile(join(ROOT, 'source', lexicon.filename), 'utf-8');
  } catch {
    const response = await fetch(lexicon.url);
    if (!response.ok) throw new Error(`download failed: ${lexicon.url}: ${response.status}`);
    return await response.text();
  }
}

describe.each(LEXICONS.map((l) => [l.id, l] as const))('%s matches STEPBible-Data', (id, lexicon) => {
  it('has every data row with every column', { timeout: 120_000 }, async () => {
    const tsv = await stepFile(lexicon);
    const rows: Record<string, LexiconRow> = JSON.parse(
      await readFile(join(ROOT, 'data', `${id}-rows.json`), 'utf-8'),
    );

    const seen = new Set<string>();
    let dataLines = 0;
    for (const raw of tsv.split('\n')) {
      const cols = raw.replace(/\r$/, '').split('\t');
      if (cols.length < 7 || !/^[HG]\d+[A-Za-z]*$/.test(cols[0].trim())) continue;
      dataLines++;
      const [dStrong, ...rel] = cols[1].split('=');
      const key = dStrong.trim();
      const row = rows[key];
      expect(row, `row ${key}`).toBeDefined();
      expect(seen.has(key), `dStrong ${key} repeated in STEPBible file`).toBe(false);
      seen.add(key);
      const relation = rel.join('=').trim();
      expect(row.strongsExtended).toBe(cols[0].trim());
      expect(row.relation ?? '').toBe(relation);
      expect(row.strongsUnified ?? '').toBe(cols[2].trim());
      expect(row.lemma).toBe(cols[3].trim());
      expect(row.transliteration ?? '').toBe(cols[4].trim());
      expect(row.morphology ?? '').toBe(cols[5].trim());
      expect(row.gloss ?? '').toBe(cols[6].trim());
      expect(row.definition ?? '').toBe((cols[7] ?? '').trim());
    }
    expect(dataLines).toBeGreaterThan(10000);
    expect(Object.keys(rows).sort()).toEqual([...seen].sort());
  });
});
