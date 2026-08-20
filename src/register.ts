/**
 * Lazy registration entry point.
 *
 * Import this to register all lexicon sources.
 */

import { registerLexicon } from '@metaxia/scriptures-core';
import { lexicons } from './source.js';

/**
 * Register all lexicon sources.
 */
export function registerAll(): void {
  for (const source of Object.values(lexicons)) {
    registerLexicon(source);
  }
}

// Auto-register when this module is imported
registerAll();
