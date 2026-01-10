# Third-Party Licenses

This document provides detailed attribution and licensing information for all third-party content included in this package.

## Summary

| Component | License | Source |
|-----------|---------|--------|
| Package Code | MIT | Original work |
| Lexicon Data (TBESH, TBESG, TFLSJ) | CC BY 4.0 | STEPBible-Data |

---

## STEPBible Lexicon Data

**License:** Creative Commons Attribution 4.0 International (CC BY 4.0)

**Source Repository:** https://github.com/STEPBible/STEPBible-Data

**Data Version:** Pinned to commit `52607753604a9a650b9ae62da8d069a8312eb99a`

### Attribution (Required)

> Lexicon data from [STEP Bible](https://www.stepbible.org/) by Tyndale House, Cambridge.

### Included Lexicons

#### TBESH - Translators Brief lexicon of Extended Strongs for Hebrew
- **File:** `data/stepbible-tbesh.json`
- **Source File:** `TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt`
- **Description:** Abridged BDB (Brown-Driver-Briggs) definitions linked to extended Strong's numbers
- **Entries:** ~8,674

#### TBESG - Translators Brief lexicon of Extended Strongs for Greek
- **File:** `data/stepbible-tbesg.json`
- **Source File:** `TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt`
- **Description:** Brief definitions using corrected Abbott-Smith for NT, LXX, and Apocrypha
- **Entries:** ~5,623

#### TFLSJ - Translators Formatted full LSJ Bible lexicon
- **File:** `data/stepbible-tflsj.json`
- **Source File:** `TFLSJ 0-5624 - Translators Formatted full LSJ Bible lexicon - STEPBible.org CC BY.txt`
- **Description:** Full LSJ (Liddell-Scott-Jones) entries for all Bible words, formatted for easy reading
- **Entries:** ~5,624

### License Terms

The STEPBible data is licensed under the Creative Commons Attribution 4.0 International License.

**You are free to:**
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material for any purpose, even commercially

**Under the following terms:**
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

Full license text: https://creativecommons.org/licenses/by/4.0/

### Modifications Made

The original TSV data files have been:
1. Downloaded from the STEPBible-Data GitHub repository at a pinned commit
2. Parsed and converted to JSON format for easier consumption
3. Indexed by extended Strong's numbers for efficient lookup
4. Primary meanings (G-suffix in disambiguated numbers) prioritized for root entries

No modifications were made to the lexical content itself (definitions, glosses, lemmas, etc.).

---

## Underlying Scholarly Works

The STEPBible lexicon data is derived from and references these public domain scholarly works:

### Brown-Driver-Briggs Hebrew Lexicon (BDB)
- **Used by:** TBESH lexicon
- **Citation:** Brown, Francis, S. R. Driver, and Charles A. Briggs. *A Hebrew and English Lexicon of the Old Testament*. Oxford: Clarendon Press, 1906.
- **Status:** Public Domain

### Abbott-Smith Greek Lexicon
- **Used by:** TBESG lexicon
- **Citation:** Abbott-Smith, G. *A Manual Greek Lexicon of the New Testament*. Edinburgh: T&T Clark, 1922.
- **Status:** Public Domain

### Liddell-Scott-Jones Greek Lexicon (LSJ)
- **Used by:** TFLSJ lexicon
- **Citation:** Liddell, Henry George, Robert Scott, and Henry Stuart Jones. *A Greek-English Lexicon*. 9th ed. Oxford: Clarendon Press, 1940.
- **Status:** Public Domain

---

## Development Dependencies

All development dependencies are MIT-licensed and are not included in the distributed package:

| Package | License | Purpose |
|---------|---------|---------|
| @types/node | MIT | TypeScript definitions for Node.js |
| tsx | MIT | TypeScript execution |
| typescript | MIT | TypeScript compiler |
| vitest | MIT | Testing framework |
| @metaxia/scriptures-core | MIT | Core scripture library (peer dependency) |

---

## Contact

For questions about licensing or attribution, please open an issue at:
https://github.com/metaxiamultimedia/scriptures-js-source-stepbible-lexicon/issues

For questions about STEPBible data specifically, refer to:
https://github.com/STEPBible/STEPBible-Data
