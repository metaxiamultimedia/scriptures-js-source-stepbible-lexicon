import type { LexiconEntry } from '@metaxia/scriptures-core';

/**
 * One row of STEPBible's TBESH or TBESG lexicon, exactly as STEPBible defines it.
 *
 * Every row has its own disambiguated Strong's number (dStrong), the tag that
 * STEPBible's tagged texts (TAHOT, TAGNT) put on each word. A dStrong names one
 * row; an extended Strong's number (eStrong) or a simple Strong's number
 * (sStrong) may name several.
 */
export interface LexiconRow extends LexiconEntry {
  /** Lexicon this row is from: "stepbible-tbesh" or "stepbible-tbesg". */
  source: string;
  /** dStrong, the row's key: e.g. "H1540H", "H5483M", "H9005". */
  strongsDisambiguated: string;
  /** eStrong the row maps to (OpenScriptures/BDB letters in lower case): e.g. "H1540", "H5483b". */
  strongsExtended: string;
  /** sStrong: the Strong's number with all letters removed, e.g. "H5483". */
  strongsSimple: string;
  /** uStrong (unified tag) as STEPBible gives it. */
  strongsUnified?: string;
  /**
   * STEPBible's note after "=" in the dStrong column, relating this row to its
   * uStrong: e.g. "a Name of", "a Meaning of", "in Aramaic of". Undefined when
   * the column has none.
   */
  relation?: string;
}
