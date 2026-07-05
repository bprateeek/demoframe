---
name: demoframe
description: Create polished demo GIFs/WebP/MP4s for READMEs and launch posts with the demoframe CLI. Use when asked to make a product demo, README hero animation, or an animated walkthrough of a CLI, app, or agent flow. Interviews for the story, reconstructs the flow as clean synthetic scenes, renders deterministically, then self-corrects from report.json and preview stills.
---

# Creating demos with demoframe

demoframe turns a YAML config into a designed, deterministic demo animation. You author the story; the tool owns the pixels. No screen recording, no uploads, no AI calls inside the tool.

## Visual reconstruction rule (the north star)

**Screenshots are references, not ingredients. Rebuild the flow as a simplified, polished, animated product story.**

- **Extraction:** when screenshots are provided, extract the intent, not the layout. Preserve the user journey, important labels, product names, and final outcome. Redraw the UI with fewer elements than the original screen.
- **Taste boundary (cute but not childish):** the reconstructed UI should feel friendly and lightly cartooned, but not childish. Prefer soft rounded cards, simple icons, clean spacing, and crisp readable text over mascots, stickers, heavy gradients, or decorative clutter.

A demo built from `type: screenshot` scenes is a last resort, never the goal. The synthetic scenes (`typing`, `steps`, `status-card`, `chat`, `code`, `metric-card`, `screen`) already animate with charm: a typed caret, staggered step reveals, a rising result card, chat bubble pops, counters, and product UI block reveals. That charm is the product; use it.

## Interview first (required before authoring)

Ask the user before writing any config:

1. **Narrative arc:** the ask, the work, the result.
2. **Climax / money shot:** which single moment to land and `hold` on.
3. **Destination:** readme, x-post, linkedin, or product-hunt.
4. **Brand:** accent color, frame type (phone/browser/terminal/desktop), light or dark.
5. **Product and repo names.**
6. **Copy to feature verbatim** (exact button labels, titles).
7. **Screenshot extraction:** what should be preserved, and what should be simplified or removed?

Write those answers into a top-level `brief:` block before authoring scenes.
Required fields are `audience`, `source`, `screenshotPolicy`, and `placement`;
recommended fields are `arc` and `climax`; optional fields include `brand`,
`product`, `repo`, and `verbatimCopy`. Set `mode: user-confirmed` only after
the user has answered the interview and confirmed the screen-to-scene mapping.
Missing, empty, placeholder, inferred, or otherwise unconfirmed brief fields
make `demoframe check`, `preview`, and `render` fail unless you explicitly pass
`--autonomous` (or MCP `autonomous: true`), which labels the output as inferred.
For reconstructed demos, `product`/`repo` and `verbatimCopy` are still optional
schema fields, but confirmed briefs warn when product identity or exact copy is
missing.

```yaml
brief:
  mode: user-confirmed
  audience: README visitors evaluating an agent workflow
  source: Screenshots of the mobile ask, VPS work screen, and GitHub PR result
  screenshotPolicy: reconstruct
  placement: github-readme
  arc: Ask for a helper, watch the workspace verify it, then land on the PR
  climax: The pull request is ready with passing checks
  brand: { accent: "#e2603a", frame: phone, mode: light }
  product: Fieldwork
  repo: fieldwork-smoke
  verbatimCopy: ["Merge pull request", "Ready for review"]
```

Then confirm the screen-to-scene mapping with the user before rendering. In autonomous or headless runs with no human, pass `--autonomous`, record assumptions with `--assumption` or `brief.assumptions`, and expect `report.json` to say `mode: inferred` and `confirmed: false`.

**Density rules:** one idea per scene, short labels, at most ~4 step items, generous whitespace, a single warm accent, 8 to 12s total, and a `hold` on the ending before the loop restarts.

## Repo reconnaissance and scene mapping

Before writing scenes, inspect the repo and source material for product truth:

- Read the nearest README, app/package metadata, route names, existing examples, and any screenshots or fixtures that reveal the workflow vocabulary.
- Identify the audience, core action, primary object names, final success state, and exact copy that must survive reconstruction.
- Decide the destination and frame from the actual story surface, not just the screenshot aspect ratio.
- Flag privacy risks before authoring: emails, tokens, internal URLs, customer names, and production data need synthetic replacements.

Then write a compact mapping for every source signal before rendering:

```md
source signal -> intent -> scene -> preserve / simplify / remove / copy
Mobile ask screenshot -> user requests help -> typing -> preserve "Ship report" / simplify chrome / remove avatars / copy button label
CI log -> workspace verifies result -> terminal-playback -> preserve command + final pass line / simplify middle output / remove hostnames / copy "All checks passed"
GitHub PR page -> result is ready -> status-card -> preserve PR title + checks / simplify file list / remove timestamps / copy "Ready for review"
```

If a source signal cannot be mapped to a synthetic scene, either redesign the story or mark the screenshot as intentionally raw with `brief.screenshotPolicy: raw-intentional`.

## The loop

0. **Author the brief.** Capture the interview in `brief:` first, then write the scene config from it. `init` scaffolds a TODO stub; fill it and set `mode: user-confirmed` before rendering, unless this is an explicit `--autonomous` run.
1. **Scaffold or author.** `npx demoframe init --template <name>` writes a `demo.yml` from the gallery (`--list` shows the templates; `--frame phone|browser|terminal` picks the matching starter), or write the config from scratch. Get the authoritative schema with `npx demoframe schema` (JSON Schema on stdout); do not rely on memorized field names, the schema is pre-1.0 and changes between versions.
2. **Validate fast.** `npx demoframe check demo.yml` after every edit. Rendering for a specific destination? Use the same `--for github-readme|x-post|linkedin|product-hunt` flag on check, preview, and render so preset-adjusted width/fps/quality/format policy is validated early. Errors print with hints and block rendering; warnings cover privacy findings, screenshots likely to blow the size budget, and screenshot-dominant configs; notices cover explicit autonomous brief gates. `--for` also warns when its target does not overlap `brief.placement`. Missing referenced assets and unconfirmed briefs are hard errors. A frameless demo whose every content scene is a raw screenshot is a hard **error** (`check` exits non-zero, `render` refuses) so the "screenshots pasted in a frame" output cannot ship by default. Fix every warning you can before rendering; with `--strict` warnings fail too.
3. **Pre-render quality gate.** Before spending render time, self-check the draft against the reconstruction rule. **If the draft could be described as "screenshots inside a frame," reject it and rewrite it as synthetic scenes.** Exception: unless the user explicitly asked for an exact/raw screenshot demo (a bug report, before/after proof, a dashboard layout), in which case pass `--allow-raw-screenshots` to `check`/`render` to demote the error to a warning.
4. **Render one-shot.** `npx demoframe render demo.yml -o dist` validates, renders, encodes, and writes. Rendering for a specific destination? Add `--for github-readme|x-post|linkedin|product-hunt` to set format, width, fps, budget, and quality in one flag (it overrides the config's `output` values and prints what it changed):
   - the outputs (`demo.gif`, `demo.webp`, and/or `demo.mp4` per `output.format`)
   - `dist/preview/` stills: one per scene plus `final_readme_size.png`, GitHub dark/light composites, and `final_transparent_checkerboard.png` for transparent cutouts
   - `dist/report.json` with measured facts about every output, including transparency mode
   Chromium (~150MB, one-time) and gifski download automatically on first use; pass `--no-download` to fail instead.
5. **Verify from report.json.** Check `brief.mode: user-confirmed` and `brief.confirmed: true` for normal runs, plus `brief.requiredComplete` and `brief.recommendedComplete`; then every output: `withinBudget` true, `loopsForever` true, `durationS` close to the designed total, dimensions as expected. The `attempts` array shows the retry ladder; more than one attempt means the config is near the budget edge.
6. **Look at the stills.** Read the `dist/preview/` PNGs, or run `npx demoframe preview demo.yml --for <destination>` for a cheaper destination-matched pass before rendering. Check: text fully readable at README size, nothing clipped, the final frame tells the whole story on its own, dark composite looks intentional.
7. **Self-correct and re-render.** Over budget: shorten scenes, replace `crossfade`/`push`/`dip-to-color` with `cut`, avoid photographic screenshots, or switch to `webp`/`mp4`. Clipped or cramped text: shorten copy (limits are in the schema). Repeat until report and stills are clean.

## Authoring guidance

- Story arc that works: typing (the ask) then steps (the work) then status-card (the result) then `hold` 1 to 1.5s so the ending reads before the loop.
- Scene palette: `typing`, `steps`, `status-card`, `screenshot`, `terminal-playback` (typed command, streamed output, exit status), `code` (syntax-highlighted reveal, diff marks via `added`/`removed`), `chat` (conversation bubbles with typing indicator and optional avatars), `metric-card` (animated counters plus bar/line chart), `screen` (reconstructed product UI blocks), `hold`. Match scene to frame: terminal-playback + terminal, chat + phone, code/metric-card/screen + browser or none.
- Frame polish: `frame.outside: transparent` makes a true alpha cutout (best with `output.format: webp`), `frame.outside: "#hex"` gives an opaque matte fallback, `frame.shadow: false` makes a hard cutout, `frame.margin` adds transparent padding after trim, and phone frames accept `deviceColor` for the bezel. Transparent GIF is 1-bit and drops the soft shadow; transparent MP4/WebM is rejected by check/render.
- Scene-level frame overrides are for chrome copy only. Use `scenes[].frame.url/title/chrome` to hand off from a VPS work screen to a GitHub PR screen inside one browser demo, or phone title/subtitle/statusBarTime for mobile handoffs. Do not put global output controls (`outside`, `shadow`, `margin`, `deviceColor`) in scene overrides.
- **Delight primitives (opt-in, keep them rare and intentional):**
  - `tap: true` on a `typing`, `steps`, or `status-card` scene drops a soft touch cursor that glides to that scene's action and taps it near the scene's end (the send button, the one linked step, the CTA). `typing.tap` needs `send: true`; it is not available in a terminal frame.
  - `celebrate: true` plays a restrained success burst (a checkmark pop, a ring pulse, a few accent dots) anchored to the scene's CTA or result. Put it on the final scene or a trailing `hold` so the burst lands on the closing frame.
  - `chat.avatars: { assistant, user }` adds a per-role avatar to chat rows. Each is an image path or a `{ initials, color }` monogram (1 to 3 letters). App identity in the header still comes from `theme.logo`.
- Keep total duration 8 to 15s for README heroes; the hard cap is 60s.
- Prefer `webp` output for READMEs: same autoplay as GIF, much smaller, full color. Keep `gif` when the destination requires it. `webm` (VP9) beats `mp4` on size for destinations that accept it.
- Default `transition: cut`; one `crossfade`, `push`, or `dip-to-color` into the final scene is usually affordable. `push` (incoming slides in from the right; auto-falls back to crossfade when chrome differs) steps forward between peer scenes; `dip-to-color` dips through the theme background to reset the eye before a new section. All three cost GIF size, so keep them sparse.
- Never put real emails, tokens, internal URLs, or customer data in copy or screenshots. `check` warns; treat its privacy findings as blockers.
- **Screenshot fallback:** `screenshot` scenes are for when the screenshot itself is the subject (a bug report, a before/after proof, a dashboard layout), not for polished launch assets. Clean UI shots beat photos; photos explode GIF size.

## Reference

- Full agent contract: `node_modules/demoframe/docs/llms.txt`
- JSON Schema: `npx demoframe schema` (or `node_modules/demoframe/schema/demoframe.schema.json`)
- Environment report: `npx demoframe doctor`
- Live preview for humans: `npx demoframe serve demo.yml`
- Worked example using the delight primitives: `node_modules/demoframe/examples/mobile-flow/demo.yml`
- Screen reconstruction examples: `node_modules/demoframe/examples/screen-dashboard/demo.yml`, `screen-focus/demo.yml`, and `screen-scroll/demo.yml`
- Transparent cutout example: `node_modules/demoframe/examples/transparent-hero/demo.yml`
