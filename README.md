# @metaxia/scriptures-source-stepbible-lexicon

Hebrew and Greek lexicon data from [STEPBible](https://www.stepbible.org/) for use with [@metaxia/scriptures](https://github.com/metaxiamultimedia/scriptures-js).

## Features

- Strong's number lookup for Hebrew and Greek
- Multiple lexicon sources with varying detail levels
- Lemma, transliteration, gloss, and full definitions

## Included Lexicons

| ID | Name | Language | Description |
|----|------|----------|-------------|
| `stepbible-tbesh` | TBESH | Hebrew | Translators Brief lexicon of Extended Strongs for Hebrew. Abridged BDB (Brown-Driver-Briggs) linked to extended Strong's numbers. |
| `stepbible-tbesg` | TBESG | Greek | Translators Brief lexicon of Extended Strongs for Greek. Brief definitions using corrected Abbott-Smith for NT, LXX, and Apocrypha. |
| `stepbible-tflsj` | TFLSJ | Greek | Full LSJ (Liddell-Scott-Jones) entries for all Bible words, formatted for easy reading with extended Strong's linking. |

## Installation

```bash
npm install @metaxia/scriptures-source-stepbible-lexicon
```

## Usage

```typescript
import '@metaxia/scriptures-source-stepbible-lexicon/register';
import { lookupStrongs } from '@metaxia/scriptures';

// Look up a Hebrew word
const results = await lookupStrongs('H0001');
// Returns entries from all registered Hebrew lexicons

// Look up a Greek word
const logos = await lookupStrongs('G3056');

// Query a specific lexicon
const entry = await lookupStrongs('H0430', { source: 'stepbible-tbesh' });
```

## Data Format

Each lexicon entry contains:

```typescript
interface LexiconEntry {
  source: string;              // e.g., "stepbible-tbesh"
  strongsExtended: string;     // e.g., "H0001"
  strongsDisambiguated: string;
  strongsUnified: string;
  lemma: string;               // Hebrew/Greek Unicode
  transliteration: string;     // e.g., "av" for אָב
  morphology: string;          // e.g., "H:N-M"
  gloss: string;               // Brief meaning: "father"
  definition: string;          // Full definition text
}
```

## Building from Source

The lexicon data is imported from STEPBible's TSV files:

```bash
npm run import   # Download and convert TSV to JSON
npm run build    # Compile TypeScript
```

## Data Source

All lexicon data is sourced from [STEPBible-Data](https://github.com/STEPBible/STEPBible-Data) by Tyndale House, Cambridge.

### Source Files

- **TBESH**: `Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt`
- **TBESG**: `Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt`
- **TFLSJ**: `Lexicons/TFLSJ - Translators Formatted full LSJ Bible lexicon - STEPBible.org CC BY.txt`

## License

### Package Code

MIT License - see [LICENSE](LICENSE)

### Lexicon Data

The lexicon data from STEPBible is licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

> STEPBible Data is licensed under a Creative Commons Attribution 4.0 International License.
>
> You are free to:
> - **Share** — copy and redistribute the material in any medium or format
> - **Adapt** — remix, transform, and build upon the material for any purpose, even commercially
>
> Under the following terms:
> - **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
>
> See: https://creativecommons.org/licenses/by/4.0/

### Attribution

When using this data, please attribute:

> Lexicon data from [STEPBible.org](https://www.stepbible.org/) by Tyndale House, Cambridge. Licensed under CC BY 4.0.

The underlying lexical works have their own scholarly attributions:
- **BDB**: Brown, Driver, Briggs, *Hebrew and English Lexicon*
- **Abbott-Smith**: G. Abbott-Smith, *A Manual Greek Lexicon of the New Testament*
- **LSJ**: Liddell, Scott, Jones, *A Greek-English Lexicon*

## Related Packages

- [@metaxia/scriptures](https://github.com/metaxiamultimedia/scriptures-js) - Core scripture library
- [@metaxia/scriptures-source-crosswire-kjv](https://github.com/metaxiamultimedia/scriptures-js-source-crosswire-kjv) - King James Version
- [@metaxia/scriptures-source-openscriptures-ohb](https://github.com/metaxiamultimedia/scriptures-js-source-openscriptures-ohb) - Open Hebrew Bible
