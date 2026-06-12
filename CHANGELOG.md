# Changelog

demoframe is pre-1.0: the config schema may change between minor versions.
Breaking changes are always listed here.

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
