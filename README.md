# demoframe

Template-driven demo GIF/WebP/MP4 generator for READMEs and launch posts.

Write a small YAML scene file, render it in a device frame, and get a polished
looping GIF, animated WebP, or MP4 without screen recording.

[![npm](https://img.shields.io/npm/v/demoframe)](https://www.npmjs.com/package/demoframe)
[![license](https://img.shields.io/github/license/bprateeek/demoframe)](./LICENSE)

<p align="center">
  <img src="https://raw.githubusercontent.com/bprateeek/demoframe/main/docs/assets/hero.gif" alt="demoframe phone demo" width="280">
</p>

The hero above is demoframe's own output:
[`examples/fieldwork-hero/demo.yml`](https://github.com/bprateeek/demoframe/blob/main/examples/fieldwork-hero/demo.yml),
439KB, 480px, 15fps, loops forever.

## For coding agents

demoframe is designed to be written by coding agents.

Point your agent at a screenshot of your product and ask it to create a demo
config. demoframe validates the YAML, renders the frames, encodes the GIF/MP4,
and writes a machine-readable QA report.

Useful surfaces for agents:

- `demoframe schema` prints the JSON Schema for configs; `docs/llms.txt` explains the full contract
- `npx demoframe-mcp` is an MCP server exposing `get_schema`, `validate_config`, `render_demo`, and `get_report`
- `skills/demoframe/SKILL.md` (shipped in the package) teaches Claude Code the full authoring loop
- `demoframe check` catches privacy, asset, and config issues before rendering
- `report.json` and the preview stills written by every render close the feedback loop

## Install

```sh
npm install -g demoframe
```

That's it. The first render downloads a pinned Chromium build (~150MB, one-time)
and a pinned [gifski](https://gif.ski) build for best GIF quality; ffmpeg ships
with the package. Pass `--no-download` to fail instead of downloading, and run
`demoframe install-browser` / `demoframe doctor` to set up or inspect the
environment explicitly.

## Quick start

```sh
demoframe init my-demo --frame phone
cd my-demo
demoframe render demo.yml     # validate -> frames -> GIF/WebP/MP4 + stills + report.json
```

Or start from the template gallery: `demoframe init --list` shows curated
configs (CLI release, code walkthrough, assistant chat, launch metrics, and
the three starters); `demoframe init my-demo --template cli-release` copies
one. Community templates are welcome as PRs adding a `templates/<name>/`
directory with `template.yml` and `meta.yml`.

One `render` does the whole pipeline: validation and privacy scan, frame
rendering, encoding with the size-budget retry ladder, per-scene preview
stills in `dist/preview/`, and a machine-readable `dist/report.json`.

For faster iteration while authoring:

```sh
demoframe check demo.yml      # validate config, assets, privacy scan (<1s)
demoframe preview demo.yml    # key stills only, no encode
demoframe serve demo.yml      # live preview with a time scrubber
```

## Use it for

- README hero GIFs
- launch post demos
- mobile app walkthroughs
- PR/status flow demos
- agent-generated product demos

## Config example

<details>
<summary>View YAML scene file</summary>

```yaml
title: Fieldwork mobile to pull request demo
output: { format: gif, width: 480, fps: 15, budget: 5MB, displayWidth: 280 }
theme: { accent: "#e2603a", mode: light, font: inter }
frame: { type: phone, title: vps-fieldwork-smoke, subtitle: "fieldwork-smoke · VPS" }
scenes:
  - type: typing
    duration: 3.8
    text: "Add a tiny release-notes helper with a basic test"
    send: true
  - type: steps
    duration: 3.6
    header: { title: Workspace ready, detail: "VPS connected." }
    items:
      - { label: Verification passed, detail: "+3 -0", state: done }
      - { label: Opening pull request, state: active }
  - type: status-card
    duration: 3.0
    transition: crossfade
    title: Add release notes helper
    checks: [Checks passed, Ready for review]
    cta: { label: Merge pull request, style: success }
  - type: hold
    duration: 1.4
```

**Frames**: `phone`, `browser`, `terminal`, `desktop` (macOS-style app
window), and `none` (frameless, scenes fill the canvas). Every frame accepts
`width`/`height` (320-1920) to change the canvas size and aspect.

**Scenes**: `typing` (animated typing with caret), `steps` (progress rows with
done/active/pending states), `status-card` (PR-style result screen with checks
and a CTA), `screenshot` (your image with optional pan/zoom),
`terminal-playback` (typed command, spinner, streamed output, exit status),
`code` (syntax-highlighted reveal with optional diff marks), `chat`
(conversation bubbles with a typing indicator), `metric-card` (animated
counters with a bar/line chart), `hold` (freeze the previous scene). One
example config per scene type ships under `examples/`.

**Transitions**: `cut` (default) and `crossfade`. Crossfades inflate GIF
palettes; prefer cuts when size matters.

**Theme**: accent color, light/dark mode, bundled Inter + JetBrains Mono
fonts (pixel-stable across machines), optional background override. v0.4 adds
`preset` (`github-dark`, `paper`, `midnight`, `candy`; explicit keys win),
full `palette` control over the 11 named color slots, custom font files
(`font: { sans: brand.woff2, mono: brand-mono.ttf }`, embedded at render),
and a rendered `logo` (`header` places it in the frame's title bar, `corner`
overlays a badge over the scenes).

</details>

JSON configs are accepted too. Validate anything against
`schema/demoframe.schema.json`.

## Render in CI

A composite GitHub Action ships in this repo. Linux runners are the
determinism reference, so CI renders are pixel-stable:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
- uses: bprateeek/demoframe/action@v0.4.0
  with:
    config: demo/demo.yml
```

[`action/README.md`](./action/README.md) has copy-paste recipes for
refreshing README media on merge and attaching renders to pull requests; this
repo's own hero GIF refreshes that way.

## Why use this?

Hand-crafting README demos means fighting screen recorders, fonts, GIF
palettes, and file size limits every single time. demoframe replaces that
with a deterministic pipeline: config in, designed-looking pixels out, same
result on every machine with the pinned renderer.

No AI calls, no uploads: everything renders locally. The config format is
designed so your coding agent can write it for you (see `docs/llms.txt` and
`schema/demoframe.schema.json`).

## Output formats and size budget

`output.format` takes `gif`, `webp`, `mp4`, `webm`, or a list like
`[webp, mp4]`. Animated WebP is the recommended README format: it autoplays
on GitHub like a GIF at a fraction of the size with full color. Keep `gif`
for destinations that require it; `webm` (VP9) beats `mp4` on size where
it's accepted.

Rendering for a specific destination? `render --for github-readme | x-post |
linkedin | product-hunt` sets format, width, fps, budget, and quality in one
flag, overriding the config's `output` values and printing what it changed.

GIF and WebP outputs default to a 5MB budget (GitHub renders README GIFs
poorly past that). If an encode exceeds the budget, demoframe automatically
retries down a ladder (15fps to 12fps, then 480px to 400px) and reports what
it did. Every render ends with a QA report (dimensions, duration, fps, frame
count, size, loop marker, audio absence), printed and written to
`report.json`.

## Privacy

`check` warns when config text or asset filenames contain things that look
like emails, credentials, URLs, or private hosts, since they would be baked
into a published asset. Screenshots are normalized with EXIF/GPS metadata
stripped. Use `--strict` in CI to fail on warnings. Still: review your own
screenshots before publishing.

## Determinism

Rendering is deterministic within a pinned renderer environment: all
animation is a pure function of the timeline (no free-running animations),
fonts are bundled, and the Chromium version is pinned by the lockfile. Don't
expect byte-identical output across different machines or Chromium builds;
golden tests compare with a small pixel threshold.

## License

MIT. Bundled fonts are OFL; ffmpeg-static is GPL (invoked as a separate
process). See THIRD_PARTY_LICENSES.md.
