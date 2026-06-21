# Landscape Stage Spike

This is a narrow discovery note for `examples/landscape-stage-spike/demo.yml`.
It does not introduce a public stage/canvas API.

## Findings

1. Can `frame: none` render an 854x480 full-bleed composition?
   Yes. The spike uses `frame: { type: none, width: 854, height: 480 }`; the
   scene safe area fills the viewport. Rendering with `--for github-readme`
   scales the encoded output to the README preset width while preserving the
   16:9 landscape composition.

2. Can a device/card sit inside that stage without safe-area clipping?
   Yes for a card-like synthetic product surface. The centered `screen` stack
   has generous frameless padding and the content fits inside the 854x480 stage
   without touching the edges.

3. Can ambient live outside device chrome?
   Yes at the fixture level. The `theme.palette.screen` color creates a
   restrained full-bleed ambient field around the synthetic card stack while the
   card itself keeps its own white surface, border, and shadow.

4. Does this require a new top-level stage model?
   Not for this proof. Existing `frame: none`, custom frame dimensions, theme
   palette, and synthetic `screen` blocks are enough to validate the core
   landscape-stage constraints. A future stage model may still be useful for
   named ambient layers or reusable inner device/card primitives, but this spike
   does not require one.

## Render Observation

Rendered with:

```sh
npm run dev -- render examples/landscape-stage-spike/demo.yml -o dist/landscape-stage-spike --for github-readme --autonomous --assumption "Landscape spike uses an inferred brief to validate stage/canvas constraints."
```

The README-size still is readable at 640x360, keeps generous ambient space
around the card stack, and reports no layout findings in `report.json`.
