/**
 * @metaxia/scriptures-source-stepbible-lexicon
 *
 * Hebrew and Greek lexicon data from STEPBible.
 */

export { metadata, lexicons, loadRows, lookupDStrong, rowsForEStrong, rowsForSStrong, parseLemma, buildTransliterationSync, buildTransliteration, lookupTransliteration, PREFIX_TO_STRONGS } from './source.js';
export { registerAll } from './register.js';
export type { LexiconRow } from './types.js';
export type { RowLexiconId } from './source.js';
