# @metaxia/scriptures-source-stepbible-lexicon

It is a data source for [GematriaBible.com](https://gematriabible.com) — an interlinear Bible with gematria values and Strong's numbers.

Hebrew and Greek lexicon data from [STEPBible](https://www.stepbible.org/) for use with [@metaxia/scriptures](https://github.com/metaxiamultimedia/scriptures-js).

## Features

- Every TBESH and TBESG row, keyed by its exact disambiguated Strong's number (dStrong)
- Rows by extended (eStrong) or simple (sStrong) Strong's number
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

### Look up a word by its STEPBible tag (dStrong)

STEPBible tags every word of its tagged texts (TAHOT for the Hebrew OT, TAGNT
for the Greek NT) with a disambiguated Strong's number (dStrong), such as
`H1540H` or `H5483M`. Each TBESH/TBESG row has its own dStrong, so the tag names
exactly one row:

```typescript
import { lookupDStrong, rowsForEStrong, rowsForSStrong } from '@metaxia/scriptures-source-stepbible-lexicon';

await lookupDStrong('H1540H');   // { gloss: 'to reveal: reveal', strongsExtended: 'H1540', ... }
await lookupDStrong('H1540G');   // { gloss: 'Heglam', relation: 'a Name of', strongsUnified: 'H1617J', ... }
await lookupDStrong('H5483M');   // { gloss: 'horse', strongsExtended: 'H5483b', ... }
await lookupDStrong('H9005');    // { gloss: 'to/for', morphology: 'Prefix', ... }

// Every row of an extended (eStrong) or simple (sStrong) Strong's number, in file order
await rowsForEStrong('H5483b');  // [H5483B Horse (Gate), H5483M horse]
await rowsForSStrong('H5483');   // [H5483A swallow, H5483B Horse (Gate), H5483M horse]
```

The tag is matched exactly; no other row is substituted when it is missing.
The rows are also available as JSON keyed by dStrong:
`@metaxia/scriptures-source-stepbible-lexicon/data/stepbible-tbesh-rows.json` and
`.../data/stepbible-tbesg-rows.json`.

### Deprecated: one entry per eStrong

```typescript
import '@metaxia/scriptures-source-stepbible-lexicon/register';
import { lookupStrongs } from '@metaxia/scriptures';

const entry = await lookupStrongs('H0430', { source: 'stepbible-tbesh' });
```

`lookupStrongs()` and the files `data/stepbible-tbesh.json`,
`data/stepbible-tbesg.json` and `data/stepbible-tflsj.json` return one entry per
extended Strong's number (eStrong). An eStrong often has several STEPBible rows
(H5483b has the Horse Gate and the noun horse), and STEPBible's data does not
choose one of them. These files are kept byte-identical to 2.1.3 for existing
consumers, are no longer regenerated, and will be removed in the next major
version. Tag words with STEPBible's dStrong (e.g. from
`@metaxia/scriptures-source-stepbible-tahot`) and use `lookupDStrong()` instead.

## Data Format

Each row (`LexiconRow`) contains:

```typescript
interface LexiconRow {
  source: string;               // "stepbible-tbesh" | "stepbible-tbesg"
  strongsDisambiguated: string; // dStrong, the key: "H5483M"
  strongsExtended: string;      // eStrong it maps to: "H5483b"
  strongsSimple: string;        // sStrong (digits only): "H5483"
  strongsUnified?: string;      // uStrong: "H5483M"
  relation?: string;            // STEPBible's note after "=": "a Name of", "a Meaning of", ...
  lemma: string;                // Hebrew/Greek Unicode
  transliteration?: string;     // "sus"
  morphology?: string;          // "H:N-M"
  gloss?: string;               // "horse"
  definition?: string;          // full meaning text
}
```

Columns are kept as STEPBible wrote them, trimmed of surrounding whitespace.

## Building from Source

The lexicon data is imported from STEPBible's TSV files:

```bash
npm run import   # Download TBESH/TBESG at the pinned commit and write the *-rows.json files
npm run build    # Compile TypeScript
npm test         # Includes a check of every row against STEPBible's TSV files
```

The import is pinned to STEPBible-Data commit
`52607753604a9a650b9ae62da8d069a8312eb99a`.

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

See [NOTICE](NOTICE). Changes made to the data: the TSV files are converted to
JSON; in the `*-rows.json` files each row is keyed by its dStrong, each column
is trimmed of surrounding whitespace, and the dStrong column is split into the
tag and its relation note.

The underlying lexical works have their own scholarly attributions:
- **BDB**: Brown, Driver, Briggs, *Hebrew and English Lexicon*
- **Abbott-Smith**: G. Abbott-Smith, *A Manual Greek Lexicon of the New Testament*
- **LSJ**: Liddell, Scott, Jones, *A Greek-English Lexicon*

## Related Packages

- [@metaxia/scriptures](https://github.com/metaxiamultimedia/scriptures-js) - Core scripture library
- [@metaxia/scriptures-source-crosswire-kjv](https://github.com/metaxiamultimedia/scriptures-js-source-crosswire-kjv) - King James Version
- [@metaxia/scriptures-source-openscriptures-ohb](https://github.com/metaxiamultimedia/scriptures-js-source-openscriptures-ohb) - Open Hebrew Bible
