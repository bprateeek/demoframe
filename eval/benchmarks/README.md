# P0 cinematic benchmarks

P0 covers every promised profile with one subject and three artifacts:

| Benchmark | Profile | Current-renderer baseline | Timed target | Gap mapping |
| --- | --- | --- | --- | --- |
| shipcheck | `readme-loop` | `readme-loop-cli/baseline.demo.yml` | `readme-loop-cli/target.html` (10.2s) | `capability-gap-memo.md` |
| pulseboard | `social-film` | `social-film-dashboard/baseline.demo.yml` | `social-film-dashboard/target.html` (20s) | `capability-gap-memo.md` |
| fuzzymatch | `product-tour` | `product-tour-ui/baseline.demo.yml` | `product-tour-ui/target.html` (25s) | `capability-gap-memo.md` |

The target HTML files are deterministic timeline artifacts. They autoplay in a
browser and expose `window.__seek(milliseconds)` for frame-exact review. Static
storyboards may be derived from them, but do not replace them as approval
subjects.

## Reproduce the contact strips

```sh
npm run build
node eval/benchmarks/render-contact-strips.mjs
```

The script samples every target shot at entry, peak, and exit, samples the
baseline at corresponding normalized times, and writes baseline, target, and
pairwise PNG strips under `eval/benchmarks/artifacts/<benchmark>/`.

## Review gate

1. Inspect each timed target, its target strip, and its baseline-to-target strip.
2. Run an independent judge with `eval/judge-rubric.md` against the timed target
   and contact strip. Record the JSON in `target-scores.json`.
3. Each target needs `overall >= 4`, `distinctiveness >= 4`, and no individual
   dimension below 4.
4. The user approves all three targets and `capability-gap-memo.md`.

Baselines are evidence only. Their honest manual scores live in
`baseline-scores.json`; failure is not manufactured, while the seeded empty
frames and readable-text crossfade collisions remain visible to the new QA
specification.
