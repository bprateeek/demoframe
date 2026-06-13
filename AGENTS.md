# demoframe for agents

demoframe turns a small YAML config into a designed, deterministic demo
animation (GIF/WebP/MP4). You author the story; the tool owns the pixels. No
screen recording, no uploads, no AI calls inside the tool. This file is the
portable, agent-agnostic brief; Claude Code also gets `skills/demoframe/SKILL.md`,
and `docs/llms.txt` has the full contract.

## The one rule: reconstruct, don't paste

**Screenshots are references, not ingredients. Rebuild the flow as a simplified,
polished, animated product story.**

- Extract the intent, not the layout. Preserve the user journey, important
  labels, product names, and the final outcome. Redraw the UI with fewer
  elements than the original screen.
- The synthetic scenes (`typing`, `steps`, `status-card`, `chat`, `code`,
  `metric-card`) already animate with charm: a typed caret, staggered step
  reveals, a rising result card, chat bubble pops, counters. That charm is the
  product; use it.
- A demo built from `type: screenshot` scenes is a last resort, never the goal.

This is enforced, not just advised: a frameless demo whose every content scene
is a raw screenshot ("screenshots pasted in a frame") makes `demoframe check`
and `demoframe render` **fail**. Pass `--allow-raw-screenshots` only when a raw
demo is genuinely the subject (a bug report, a before/after proof, a dashboard
layout).

## Interview first (required before authoring)

Ask the user before writing any config:

1. Narrative arc: the ask, the work, the result.
2. Climax / money shot: which single moment to land and `hold` on.
3. Destination: readme, x-post, linkedin, or product-hunt.
4. Brand: accent color, frame type (phone/browser/terminal/desktop), light or dark.
5. Product and repo names.
6. Copy to feature verbatim (exact button labels, titles).
7. Screenshot extraction: what to preserve, and what to simplify or remove.

Then confirm the screen-to-scene mapping before rendering. In an autonomous run
with no human, infer the mapping, state your assumptions, and proceed (don't
block).

Density rules: one idea per scene, short labels, at most ~4 step items, generous
whitespace, a single warm accent, 8 to 12s total, and a `hold` on the ending
before the loop restarts.

## The loop

1. **Scaffold or author.** `npx demoframe init --template <name>` writes a
   `demo.yml` (`--list` shows templates). Get the authoritative schema with
   `npx demoframe schema` (JSON Schema on stdout); the schema is pre-1.0, so
   read it instead of relying on memorized field names.
2. **Validate.** `npx demoframe check demo.yml` after every edit. It prints
   errors (which block rendering, including missing assets) and warnings (privacy
   findings, oversized screenshots, screenshot-dominant configs). Fix them all;
   `--strict` makes warnings fail too.
3. **Render.** `npx demoframe render demo.yml -o dist` validates, renders,
   encodes, writes `dist/preview/` stills and `dist/report.json`. Add
   `--for github-readme|x-post|linkedin|product-hunt` to set
   format/width/fps/budget in one flag.
4. **Verify from report.json.** `withinBudget` true, `loopsForever` true,
   `durationS` close to the designed total, dimensions as expected.
5. **Look at the stills.** Read the `dist/preview/` PNGs: text readable at
   README size, nothing clipped, the final frame tells the whole story.

## Drop this into your own repo's AGENTS.md

When demoframe is a dependency, your agent reads *your* repo's `AGENTS.md`, not
the copy in `node_modules`. Paste this so it gets the rule:

```md
## Demos (demoframe)
Screenshots are reference, not ingredients: reconstruct the flow as synthetic
demoframe scenes (typing/steps/status-card/chat/screen), never paste screenshots into a
frame. Interview first (narrative arc, climax, destination, brand, names, exact
copy, what to keep vs simplify). `demoframe check`/`render` reject a frameless
all-screenshot demo; `--allow-raw-screenshots` is only for an intentional raw
demo. See node_modules/demoframe/AGENTS.md and docs/llms.txt.
```
