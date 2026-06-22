# Landscape Frame-None Checkpoint

This is a narrow discovery note for `examples/landscape-stage-spike/demo.yml`.
It is the Phase 2 architecture checkpoint for the premium product-motion
roadmap, not a proposal for a public stage/canvas API.

## Checkpoint

The current in-frame API is enough for the near-term full-bleed landscape
genre. We should not add a first-class stage/canvas model yet.

Evidence:

- `frame: { type: none, width: 854, height: 480 }` gives a true 16:9
  full-bleed stage, and `--for github-readme` preserves the landscape
  composition at README size.
- A `screen` scene with `cinematic: { composition: center-hero, motion:
  float-in, ambient: ember }` can float a compact synthetic product surface
  inside that stage without safe-area clipping.
- The timeline ambient layer and `theme.palette.screen` create restrained
  atmosphere around the product surface, outside any device chrome.
- The proof remains deterministic and screenshot-free, so it exercises the same
  synthetic scene contract as the rest of demoframe.

Keep watching for two pressures before revisiting a stage model: reusable
inner device/card primitives that cannot be expressed as scene content, and
named ambient/backdrop layers that need independent timing or placement. This
proof did not hit either blocker.

## Render Observation

Rendered with:

```sh
npm run dev -- render examples/landscape-stage-spike/demo.yml -o /private/tmp/demoframe-landscape-proof-phase2 --for github-readme --autonomous --assumption "Phase 2 proof uses an inferred brief to validate stage/canvas constraints."
```

The README-size still is readable at 640x360, keeps visible ambient around the
card stack, and reports no layout findings in `report.json`.
