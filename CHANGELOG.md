# Changelog

demoframe is pre-1.0: the config schema may change between minor versions.
Breaking changes are always listed here.

## 0.11.0

Motion and transition grammar. A small, curated set of motion presets and
scene transitions, all tuned by eye rather than exposed as a full animation
API, so agents can add deliberate movement without a config explosion.

### Added

- Three `cinematic.motion` presets: `drift` (a slow ambient hold for a scene
  meant to linger), `settle` (a crisp overshoot that snaps back), and
  `dolly-in` (a hero push-in, eligible only on `status-card`, `metric-card`,
  `screen`, and `screenshot`). They join the existing `float-in` and `rise`.
- Two scene transitions: `push` (the incoming scene slides in from the right as
  the outgoing exits left; softly falls back to a crossfade when the chrome
  differs across the pair so the header never tears) and `dip-to-color` (dips
  through the resolved theme background color at the midpoint, a clean reset
  before a new section).
- Transition windows now feed motion blur and preview/layout-QA sampling, so
  the contact sheet and judge see the transition midpoint, and push/dip motion
  is blurred like existing choreography (text-mutating scenes stay sharp, as
  before).
- The `launch-hero` gallery template showcases the new grammar: a `dolly-in`
  hero, a `push` into the quickstart, and a `dip-to-color` into the proof.

### Changed

- Over-budget guidance now names `push` and `dip-to-color` alongside
  `crossfade` as fades that inflate GIF size.

## 0.10.0

Brief and interview governance. This release makes the authoring interview a
first-class config artifact so agents can validate the story they reconstructed,
not just the pixels they rendered.

### Added

- Top-level `brief:` metadata with required-by-check `audience`, `source`,
  `screenshotPolicy`, and `placement`; recommended `arc` and `climax`; and
  optional `brand`, `product`, `repo`, `verbatimCopy`, and `assumptions`.
- `brief.mode: user-confirmed | inferred`. `check`, `preview`, and `render`
  now refuse unconfirmed briefs unless `--autonomous` (or MCP
  `autonomous: true`) is explicit; inferred outputs are labeled in
  `report.json`.
- `--autonomous` on `check`/`preview`/`render`, repeatable `--assumption` on
  `preview`/`render`, and MCP `render_demo` `autonomous`/`assumptions`
  parameters.
- `demoframe install-agent-instructions`, also run by `init` by default, writes
  a sentinel-marked demoframe block into the nearest git-root `AGENTS.md`.
- Brief QA errors for missing, empty, placeholder, inferred, or otherwise
  unconfirmed fields, plus warnings for screenshot policy contradictions,
  brand/theme/frame mismatches, and `render --for` destination mismatches
  against `brief.placement`.
- `brief` summary metadata in `report.json`: `present`, `requiredComplete`,
  `recommendedComplete`, `missingRequired`, `missingRecommended`, `mode`,
  `confirmed`, and inferred `assumptions`.
- `demoframe init` now prepends a TODO `brief:` stub to scaffolded configs.

### Changed

- Bundled examples now include filled briefs and are covered by a strict-clean
  regression test. Gallery templates remain brief-free and receive the stub only
  when scaffolded by `init`.
- Destination names are shared between schema validation and render presets.
- `runCheck`/`runCheckLoaded` now return structured `errors`, `warnings`, and
  `notices` findings (`{ code, message, details? }`) plus `briefGate?` instead
  of string arrays. This is a pre-1.0 API break; callers should read
  `finding.message`.
- `render` writes managed outputs atomically through a staging directory and
  promotes them only after encode, preview, report, and strict layout checks
  pass.

## 0.8.0

Transparent embeds and frame polish. This release keeps opaque renders stable
while adding true alpha output for framed demos.

### Added

- `frame.outside`: `page` (default), `transparent` for alpha cutouts, or a hex
  color for a solid matte fallback.
- `frame.shadow`, `frame.margin`, and phone `frame.deviceColor` for cutout and
  bezel control.
- Transparent WebP output with 8-bit alpha, transparent GIF fallback with
  1-bit alpha, and policy errors for transparent MP4/WebM.
- Alpha trimming across full renders and preview stills, plus
  `preview/final_transparent_checkerboard.png`.
- Transparency metadata in `report.json`: `transparent` and
  `transparencyMode`.
- `examples/transparent-hero`.

### Changed

- Frame schemas are now strict, so typo fields and phone-only `deviceColor` on
  other frames are rejected instead of silently ignored.
- `render --for` now aggregates preset-adjusted check errors before rendering,
  so a preset cannot accidentally convert a transparent WebP config into MP4.
- The README snippet now points at `--asset-out` when that copied path covers
  the embeddable GIF/WebP.

## 0.6.0

Makes reconstruct-first portable to any agent, not just Claude Code. The CLI
itself now carries the guidance and enforces the one case that always means
"screenshots pasted in a frame", so a non-Claude agent (or a human) handed the
package can no longer take the paste-job path of least resistance. No config
schema changes; every 0.5.0 config still parses.

### Changed

- `demoframe check` and `demoframe render` now **error** (exit non-zero / refuse
  to render) on a frameless demo whose every content scene is a raw screenshot,
  instead of only warning. Pass `--allow-raw-screenshots` (on either command) to
  demote it to a warning for an intentional raw demo (bug report, before/after
  proof). The softer "screenshots are >50% of a framed/mixed demo" case stays a
  warning. `--strict` still additionally fails on warnings.
- `runCheck` now returns `{ loaded, errors, warnings }` (was `{ loaded,
  warnings }`); the MCP `validate_config` tool reports `valid` from `errors` and
  includes them.
- `demoframe init` stdout now leads with the reconstruct-first rule and the
  required interview questions instead of "screenshots go in assets/".

### Added

- `AGENTS.md` (shipped to npm) carries the reconstruct-first brief and interview
  for any agent, with a snippet to paste into a consuming repo's own `AGENTS.md`.
  `README.md` now also ships in the package.
- `examples/expense-report`: a non-developer reconstruction (messy receipts to a
  submitted expense report) showcasing `tap`, `chat.avatars`, and `celebrate`,
  with golden coverage.

## 0.5.0

The reconstruct-first release: the authoring skill now interviews for the
story and rebuilds flows from synthetic scenes (screenshots are reference,
not output), plus three opt-in delight primitives. All config-facing changes
are additive; every 0.4.0 config parses and renders identically.

### Added

- `tap: true` on `typing`, `steps`, and `status-card` scenes: a soft touch
  cursor glides to the scene's action and taps it near the end (the send
  button, the one linked step, the CTA). `typing.tap` needs `send: true` and
  is rejected in a terminal frame; `steps.tap` needs exactly one linked item;
  `status-card.tap` needs a cta.
- `celebrate: true` on any scene: a restrained, deterministic success burst
  (checkmark pop, ring pulse, six accent dots) anchored to the scene's
  CTA/result, then a clean settle. Designed for the final scene or a trailing
  `hold`; `check` warns if it fires earlier.
- `chat.avatars: { user?, assistant? }`: per-role avatars, each an image path
  or a `{ initials, color? }` monogram. Header app identity still comes from
  `theme.logo`.
- `examples/mobile-flow`: a reconstructed mobile PR flow showcasing all three
  primitives, with golden coverage.

### Changed

- `demoframe check` adds a screenshot-dominant warning (when screenshot scenes
  exceed half the runtime, counting holds that extend a screenshot) and a
  celebrate-placement warning. The skill (`skills/demoframe/SKILL.md`) leads
  with a visual reconstruction rule, a required interview, and a pre-render
  quality gate; `screenshot` scenes are documented as a fallback.
- A `hold` with `transition: crossfade` no longer fades its own held frame
  back in (it shared a render scene with the previous frame).

## 0.4.0

The make-it-yours release: custom frames and viewports, deep theming, a
template gallery, and a GitHub Action. All config-facing changes are
additive; every 0.3.0 config parses and renders identically.

### Added

- `desktop` frame: macOS-style app window with title bar and optional
  subtitle toolbar (default canvas 1024x640).
- `none` frame: frameless rendering, scenes fill the canvas edge-to-edge on
  the screen background (default canvas 960x640).
- `width`/`height` (320-1920) on every frame to customize the canvas size
  and aspect ratio.
- `theme.preset`: `github-dark`, `paper`, `midnight`, `candy`. Presets
  pre-fill accent, mode, and palette; explicit theme keys silently win.
- `theme.palette`: partial override of the 11 named color slots (hex or
  rgb()/rgba() values); `palette.page` wins over the `background` shorthand.
- `theme.font` object form `{ sans?, mono? }` embedding local .woff2/.ttf
  files; one file per family serves all weights.
- `theme.logo` object form `{ src, placement: header|corner }`.
- Template gallery under `templates/` (three starters plus cli-release,
  code-walkthrough, assistant-chat, launch-metrics); `demoframe init
  --template <name>` and `init --list`. `init --frame <type>` now resolves
  to the matching starter template.
- GitHub Action (`bprateeek/demoframe/action`) rendering demos in CI, with
  README-refresh and PR-preview recipes; this repo's hero GIF refreshes on
  merge via the action.
- Examples `desktop-app` and `frameless` with golden coverage, including the
  corner logo badge.

### Changed

- `theme.logo` now actually renders; it was accepted and validated but never
  drawn before 0.4.0. String form places it in the frame header (corner
  fallback for frame `none` and phones without a title bar).
- Library API: `Theme['accent']` and `Theme['mode']` are optional at parse
  time; defaults apply during rendering via the new exported `resolveTheme`.
  CLI behavior is unchanged.

## 0.3.0

The tell-any-story release: four new scene types, destination presets, and
WebM output. No breaking schema changes; everything in 0.2.0 configs renders
identically.

### Added

- `terminal-playback` scene: typed command, optional spinner while "running",
  streamed output lines with per-line styles (normal/dim/success/error/warn),
  exit status indicator, and a fresh prompt for the loop. Native in the
  terminal frame; renders as a mini terminal panel in phone/browser frames.
- `code` scene: syntax-highlighted code reveal via a bundled, version-pinned
  shiki (github-light/dark theme follows `theme.mode`, pure-JS regex engine,
  16 languages). Diff mode via `added`/`removed` line marks with +/- gutters
  and tinted backgrounds; optional line numbers; `reveal: lines|fade|none`.
- `chat` scene: user/assistant conversation bubbles with a typing indicator
  before assistant replies. `check` warns when it is used in a terminal frame.
- `metric-card` scene: animated counters (deterministic thousands formatting)
  with an optional bar or line chart and axis labels.
- Destination presets: `render --for github-readme|x-post|linkedin|product-hunt`
  sets output format, width, fps, budget, and quality in one flag. Presets
  override the config's `output` values; every override is printed and the
  preset name is recorded in report.json.
- WebM (VP9) output: `output.format: webm`, encoded with the bundled ffmpeg
  at constant quality (CRF 32). Like mp4 it encodes once and skips the
  GIF/WebP budget retry ladder.
- Privacy scan: new tuned patterns for home-directory paths and
  secret-looking assignments with literal values (env-var references and
  placeholders pass quietly). Existing configs may surface new warnings.
- One example config per new scene type under `examples/`, each covered by
  Linux-pinned golden tests.

## 0.2.0

The seamless-loop release: an agent (or you) goes from nothing to a finished
demo in one command.

### Breaking

- `output.format: both` is removed. Use a list instead: `format: [gif, mp4]`.
- `attempts` entries in report.json now include a `format` field.

### Added

- Zero-setup rendering: `render` and `preview` download the pinned Chromium
  build automatically on first use, and `render` downloads a pinned,
  checksum-verified gifski 1.34.0 build for best GIF quality (ffmpeg remains
  the offline fallback). `--no-download` fails fast instead.
  `DEMOFRAME_CACHE_DIR` and `DEMOFRAME_GIFSKI_URL` override the cache
  location and download mirror for locked-down CI.
- `render` is now the full pipeline: validation and privacy scan, frame
  rendering, encoding, per-scene preview stills in `<out>/preview/`
  (`--no-stills` to skip), and `report.json` with a `previews` list.
- Animated WebP output: `output.format: webp`, encoded via sharp/libwebp
  with inter-frame deltas (the example demo encodes 61% smaller than its
  GIF), measured in report.json, and subject to the same size budget and
  retry ladder as GIF. Recommended over GIF for READMEs.
- `output.format` accepts a list to produce several formats in one render,
  e.g. `[webp, mp4]`.
- `demoframe schema` prints the config JSON Schema for agents and editors.
- MCP server: `demoframe-mcp` (stdio) with `get_schema`, `validate_config`,
  `render_demo`, and `get_report` tools.
- Claude Code skill teaching the full authoring loop, shipped in the package
  at `skills/demoframe/SKILL.md`.

## 0.1.1

Initial public release: YAML config to GIF/MP4 with phone/browser/terminal
frames, typing/steps/status-card/screenshot/hold scenes, privacy scanning,
size-budget retry ladder, golden tests pinned to Linux CI.
