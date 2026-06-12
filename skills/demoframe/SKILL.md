---
name: demoframe
description: Create polished demo GIFs/WebP/MP4s for READMEs and launch posts with the demoframe CLI. Use when asked to make a product demo, README hero animation, or an animated walkthrough of a CLI, app, or agent flow. Authors a YAML config, renders deterministically, then self-corrects from report.json and preview stills.
---

# Creating demos with demoframe

demoframe turns a YAML config into a designed, deterministic demo animation. You author the story; the tool owns the pixels. No screen recording, no uploads, no AI calls inside the tool.

## The loop

1. **Scaffold or author.** `npx demoframe init --frame phone|browser|terminal` writes a starter `demo.yml`, or write the config from scratch. Get the authoritative schema with `npx demoframe schema` (JSON Schema on stdout); do not rely on memorized field names, the schema is pre-1.0 and changes between versions.
2. **Validate fast.** `npx demoframe check demo.yml` after every edit. Errors print as `path: message` with hints. Warnings cover missing assets, privacy findings, and screenshots likely to blow the size budget. Fix every warning you can before rendering; with `--strict` warnings fail.
3. **Render one-shot.** `npx demoframe render demo.yml -o dist` validates, renders, encodes, and writes. Rendering for a specific destination? Add `--for github-readme|x-post|linkedin|product-hunt` to set format, width, fps, budget, and quality in one flag (it overrides the config's `output` values and prints what it changed):
   - the outputs (`demo.gif`, `demo.webp`, and/or `demo.mp4` per `output.format`)
   - `dist/preview/` stills: one per scene plus `final_readme_size.png` and GitHub dark/light composites
   - `dist/report.json` with measured facts about every output
   Chromium (~150MB, one-time) and gifski download automatically on first use; pass `--no-download` to fail instead.
4. **Verify from report.json.** Check every output: `withinBudget` true, `loopsForever` true, `durationS` close to the designed total, dimensions as expected. The `attempts` array shows the retry ladder; more than one attempt means the config is near the budget edge.
5. **Look at the stills.** Read the `dist/preview/` PNGs. Check: text fully readable at README size, nothing clipped, the final frame tells the whole story on its own, dark composite looks intentional.
6. **Self-correct and re-render.** Over budget: shorten scenes, replace `crossfade` with `cut`, avoid photographic screenshots, or switch to `webp`/`mp4`. Clipped or cramped text: shorten copy (limits are in the schema). Repeat until report and stills are clean.

## Authoring guidance

- Story arc that works: typing (the ask) then steps (the work) then status-card (the result) then `hold` 1 to 1.5s so the ending reads before the loop restarts.
- Scene palette: `typing`, `steps`, `status-card`, `screenshot`, `terminal-playback` (typed command, streamed output, exit status), `code` (syntax-highlighted reveal, diff marks via `added`/`removed`), `chat` (conversation bubbles with typing indicator), `metric-card` (animated counters plus bar/line chart), `hold`. Match scene to frame: terminal-playback + terminal, chat + phone, code/metric-card + browser.
- Keep total duration 8 to 15s for README heroes; the hard cap is 60s.
- Prefer `webp` output for READMEs: same autoplay as GIF, much smaller, full color. Keep `gif` when the destination requires it. `webm` (VP9) beats `mp4` on size for destinations that accept it.
- Default `transition: cut`; one crossfade into the final scene is usually affordable.
- Never put real emails, tokens, internal URLs, or customer data in copy or screenshots. `check` warns; treat its privacy findings as blockers.
- Screenshots: clean UI shots beat photos; photos explode GIF size.

## Reference

- Full agent contract: `node_modules/demoframe/docs/llms.txt`
- JSON Schema: `npx demoframe schema` (or `node_modules/demoframe/schema/demoframe.schema.json`)
- Environment report: `npx demoframe doctor`
- Live preview for humans: `npx demoframe serve demo.yml`
