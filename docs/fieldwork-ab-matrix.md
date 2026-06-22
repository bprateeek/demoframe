# Fieldwork A/B Artifact Matrix

Use this workflow to reproduce the Fieldwork hero comparison artifacts without
committing generated media. The matrix is for local verification and future
visual review.

## Command

```sh
npm run fieldwork:ab -- --out /private/tmp/demoframe-fieldwork-ab-matrix --no-download
```

Omit `--no-download` if the pinned browser has not been installed yet and the
machine is allowed to fetch it. The default output directory is
`dist/fieldwork-ab/`, which is ignored by git.

The runner builds the CLI, generates comparison configs, renders each cell with
`--strict`, and validates each `report.json` for:

- no errors or warnings
- `brief.mode: user-confirmed` and `brief.confirmed: true`
- expected `encoderProfile` and recorded `encoderSettings`
- detected duration, dimensions, budget status, and loop marker
- README-size preview stills

## Matrix Cells

| Cell | Config | Encoder | Purpose |
| --- | --- | --- | --- |
| `legacy-old-comp` | generated from `examples/fieldwork-hero/demo.yml` with only `scene.cinematic` fields removed | `legacy` | Baseline for isolating the composition update |
| `legacy-new-comp` | current `examples/fieldwork-hero/demo.yml` | `legacy` | Treatment for composition, baseline for encoder |
| `modern-new-comp` | current `examples/fieldwork-hero/demo.yml` | `modern` | Treatment for encoder profile |
| `cinematic-later` | placeholder only | n/a | Motion blur remains off; this workflow does not implement blur |

This makes the two intended comparisons explicit:

- A/B #1: `legacy-old-comp` vs `legacy-new-comp` isolates the current cinematic
  composition, float-in motion, and ember ambient scene fields while holding the
  legacy encoder fixed.
- A/B #2: `legacy-new-comp` vs `modern-new-comp` isolates the encoder profile
  delta while holding the current Fieldwork composition fixed.

## Output Layout

For `--out /private/tmp/demoframe-fieldwork-ab-matrix`, expect:

```text
/private/tmp/demoframe-fieldwork-ab-matrix/
  configs/
    fieldwork-old-comp.yml
    fieldwork-new-comp.yml
  legacy-old-comp/
    fieldwork-old-comp.github-readme.webp
    preview/
    report.json
  legacy-new-comp/
    fieldwork-new-comp.github-readme.webp
    preview/
    report.json
  modern-new-comp/
    fieldwork-new-comp.github-readme.webp
    preview/
    report.json
  matrix-report.json
```

Inspect `matrix-report.json` first for the generated matrix summary, then open
each cell's `report.json` if you need full render semantics. For visual review,
compare the `preview/final_readme_size.png` and final-scene stills across
`legacy-old-comp` and `legacy-new-comp`, then compare the rendered WebP files
and encoder settings for `legacy-new-comp` and `modern-new-comp`.
