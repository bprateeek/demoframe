# fuzzymatch

Fast fuzzy string matching for command palettes, file pickers, and search-as-you-type. Score, rank, and highlight in about 2KB with zero dependencies.

## Install

```sh
npm install fuzzymatch
```

## Usage

```js
import { score, best, highlight } from 'fuzzymatch';

score('doc', 'docs/readme.md');
// 0.82

best('idx', ['src/index.js', 'docs/intro.md', 'dist/index.min.js']);
// [{ candidate: 'src/index.js', score: 0.71 }, ...]

highlight('rm', 'readme');
// '[r]ead[m]e'
```

## API

| Function | Description |
| --- | --- |
| `score(query, target)` | Returns 0 to ~1. Rewards prefix hits and word boundaries, penalizes gaps. 0 means no subsequence match. |
| `best(query, candidates, limit = 5)` | Scores every candidate, drops non-matches, returns the top results sorted by score. |
| `highlight(query, target, open, close)` | Wraps each matched character, defaults to square brackets. |

## Why not a bigger matcher?

fuzzymatch trades exhaustive scoring models for predictable speed: one pass per candidate, no allocation-heavy dynamic programming. On a 10k-entry file list it ranks in under 4ms.

## License

MIT
