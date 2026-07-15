# fuzzyfind

A local desktop file finder from Fuzzy Labs, powered by the same 2KB ranking
core as `fuzzymatch`. Type a few characters, see the matched letters, and open
the best result without leaving the keyboard.

Query `idx` ranks:

1. `src/index.js` — 0.71
2. `dist/index.min.js` — 0.58
3. `docs/intro.md` — 0.32

The app ranks a 10,000-file workspace in under 4 ms. Press Enter or choose
**Open result**. Search stays on device; home-directory prefixes are never shown
in the interface.
