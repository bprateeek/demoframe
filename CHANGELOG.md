# Changelog

demoframe is pre-1.0: the config schema may change between minor versions.
Breaking changes are always listed here.

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
