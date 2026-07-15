# P5 recipe-compiler acceptance

P5 adds six deterministic recipe skeletons with explicit version-1 variant
registries. Recipe mode is exclusive with `scenes` and direct `shots`; parsing
materializes validated compositor shots and generated profile-specific beats.

The acceptance pair uses the same `metric-proof` recipe and same Trialflow
brand/context:

- [`proof-first`](../../examples/recipes/metric-proof.yml)
- [`surface-first`](../../examples/recipes/metric-proof-surface-first.yml)

Both preserve `hook, build, payoff`. Their resolved signatures differ in
composition family, motif, hero object, motion personality, product-surface
treatment, and supporting-object arrangement—well above the required two
dimensions.

## Verification record

- Both fixtures pass strict check: 3 shots, 10.0 seconds at 15 fps.
- Recipe registry suite: 8 tests pass, including every recipe/variant pair,
  arbitrary-variant rejection, source XOR, deterministic compilation, and the
  same-recipe diversity assertion.
- Acceptance WebP: 720x405, 10.1 seconds, 196 KB, infinite loop, no audio.
- Resolved graph SHA-256:
  `13a542ca5e72b41c3aab1f27f144dab65fade8f027f3fbb9a05b644aebfe3cbd`.
- `report.json.shotGraph` records `source: recipe`, `renderPath: compositor`,
  recipe/version/variant, generated beat sequence, and all six structural
  dimensions.

Visual QA caught and fixed a compiler carry-over defect before acceptance: a
README build surface now carries only when a second build shot exists, leaving
the payoff as one clean proof frame.
