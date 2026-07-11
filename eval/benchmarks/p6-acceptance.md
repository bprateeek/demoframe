# P6 QA and diversity acceptance

P6 keeps ordinary check browser-free, adds deterministic signatures to check
and report, and runs full-timeline rendered QA only during preview/render.

## Verification record

- `npm run test:qa`: 9 tests pass.
- Browser-free assertion: ordinary check never calls the render-session entry
  point and performs the locked weighted dwell estimate.
- Seeded rendered defects detected: persistent readable collision, two-second
  empty/static interval, sub-dwell durable copy, and clipping.
- Strict atomic gate: the seeded collision encodes only inside the staging
  directory; strict rejects it and leaves neither the output nor report in the
  destination.
- Clean strict acceptance: Trialflow renders 720x405 WebP, 10.1 seconds,
  196 KB, infinite loop, with `renderedQa: []`.
- Check/report both record all structural and appearance dimensions. Recipe
  acceptance graph SHA-256:
  `13a542ca5e72b41c3aab1f27f144dab65fade8f027f3fbb9a05b644aebfe3cbd`.
- Relationship-aware comparisons cover six fixture identities across the eval
  pair set, including held-out analytics and collaboration extraction cases.
  Same-brand recipe siblings assert six differing film dimensions without an
  appearance requirement.

Rendered findings remain report warnings for their first minor release, as
locked by the P0 detector specification; `--strict` already blocks them.
