# Fieldwork Cinematic MP4/WebM Siblings

Use this workflow to reproduce premium Fieldwork cinematic review artifacts
without committing generated media. It derives from the current
`examples/fieldwork-hero/demo.yml`, keeps the same story, labels, scene
composition, float-in motion, and ember ambient treatment, then renders native
video siblings with motion blur enabled.

## Command

```sh
npm run fieldwork:cinematic -- --out /private/tmp/demoframe-fieldwork-cinematic --no-download
```

Omit `--no-download` if the pinned browser has not been installed yet and the
machine is allowed to fetch it. The default output directory is
`dist/fieldwork-cinematic/`, which is ignored by git.

The runner builds the CLI, writes a generated config, renders with `--strict`
and `--encoder-profile modern`, and validates `report.json` for:

- no errors or warnings
- only the expected cinematic ambient notice
- `brief.mode: user-confirmed` and `brief.confirmed: true`
- MP4 and WebM outputs both present
- modern encoder profile and recorded encoder settings
- `motionBlur.requested: cinematic`
- per-output `motionBlur: cinematic` and `captureMode: blurredCapture`
- `854x480`, about `30fps`, detected duration, budget status, and no audio
- `loopsForever: null`, which is expected for native video containers because
  MP4/WebM do not carry the README-style infinite loop marker
- preview stills written for quick visual inspection

For a fast layout-only audit before the video render, generate the derived
config and run preview against it:

```sh
npm run fieldwork:cinematic -- --out /private/tmp/demoframe-fieldwork-cinematic --config-only
node dist/cli.js preview /private/tmp/demoframe-fieldwork-cinematic/configs/fieldwork-hero.cinematic.yml \
  -o /private/tmp/demoframe-fieldwork-cinematic/preview-check --no-download
```

## Frame Constraint

The README Fieldwork hero is a portrait phone-frame GIF:

```yaml
output: { format: gif, width: 480, fps: 15, budget: 5MB, displayWidth: 280, motionBlur: off }
frame: { type: phone, title: vps-fieldwork-smoke, subtitle: "fieldwork-smoke · VPS" }
```

Scaling that source to `output.width: 854` would produce a tall portrait video,
not an honest `854x480` cinematic sibling. This workflow therefore generates a
16:9 browser review frame under the output directory. It does not add a new
stage model and it does not change the committed Fieldwork README hero, which
remains GIF/off by default.

The final PR card is compacted for the shorter browser safe area: the branch is
collapsed into the subtitle, while the money-shot copy (`Merge pull request`
and `Awaiting human review`) stays visible.

## Output Layout

For `--out /private/tmp/demoframe-fieldwork-cinematic`, expect:

```text
/private/tmp/demoframe-fieldwork-cinematic/
  configs/
    fieldwork-hero.cinematic.yml
  fieldwork-hero.cinematic.mp4
  fieldwork-hero.cinematic.webm
  preview/
    final_readme_size.png
    ...
  report.json
  cinematic-report.json
```

Open `cinematic-report.json` first for the compact summary, then inspect
`report.json` if you need full render semantics. The generated config is stored
beside the artifacts so reviewers can audit the exact sibling settings:

```yaml
output:
  format: [mp4, webm]
  width: 854
  fps: 30
  budget: 25MB
  quality: standard
  motionBlur: cinematic
frame:
  type: browser
  width: 854
  height: 480
```

## Visual Acceptance

Review `preview/final_readme_size.png`, at least one scene still near the
steps-to-PR handoff, and one generated video. The artifact is acceptable when:

- the ask, work, and PR-ready result are readable at review size
- the ending still clearly lands on `Merge pull request` / `Awaiting human review`
- float-in choreography has visible blur in MP4/WebM
- typed text and status copy do not show distracting ghosting
- no clipping appears around the browser chrome, cards, CTA, or caption
- `report.json` has no unexpected warnings or notices

Keep `fieldwork-hero.cinematic.mp4` and `fieldwork-hero.cinematic.webm` out of
git. Regenerate them locally or in temporary storage when maintainers need a
fresh visual review pass.
