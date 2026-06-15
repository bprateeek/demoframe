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

Record the interview in a top-level `brief:` block before the scenes. Required
fields are `audience`, `source`, `screenshotPolicy`, and `placement`;
recommended fields are `arc` and `climax`; optional fields include `brand`,
`product`, `repo`, and `verbatimCopy`. A missing, empty, or TODO-filled brief is
a `demoframe check` warning and becomes an error under `--strict`.

```yaml
brief:
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

Then confirm the screen-to-scene mapping before rendering. In an autonomous run
with no human, infer the mapping, state your assumptions, and proceed (don't
block).

Density rules: one idea per scene, short labels, at most ~4 step items, generous
whitespace, a single warm accent, 8 to 12s total, and a `hold` on the ending
before the loop restarts.

## The loop

1. **Scaffold or author.** `npx demoframe init --template <name>` writes a
   `demo.yml` with a TODO `brief:` stub (`--list` shows templates). Get the authoritative schema with
   `npx demoframe schema` (JSON Schema on stdout); the schema is pre-1.0, so
   read it instead of relying on memorized field names.
2. **Validate.** `npx demoframe check demo.yml` after every edit. It prints
   errors (which block rendering, including missing assets) and warnings (privacy
   findings, oversized screenshots, screenshot-dominant configs, brief gaps).
   `render --for` warns when it does not overlap `brief.placement`. Fix them all;
   `--strict` makes warnings fail too.
3. **Render.** `npx demoframe render demo.yml -o dist` validates, renders,
   encodes, writes `dist/preview/` stills and `dist/report.json`. Add
   `--for github-readme|x-post|linkedin|product-hunt` to set
   format/width/fps/budget in one flag.
4. **Verify from report.json.** `brief.requiredComplete` true,
   `brief.recommendedComplete` true, `withinBudget` true, `loopsForever` true,
   `durationS` close to the designed total, dimensions as expected. For
   transparent output, check `transparent` and `transparencyMode`.
5. **Look at the stills.** Read the `dist/preview/` PNGs: text readable at
   README size, nothing clipped, the final frame tells the whole story. For
   `frame.outside: transparent`, inspect `final_transparent_checkerboard.png`.

## Transparent embeds and frame polish

- `frame.outside: transparent` creates a true alpha cutout; use WebP for clean
  edges. Transparent GIF is a 1-bit fallback and drops the soft shadow.
  Transparent MP4/WebM is rejected by policy; use `frame.outside: '<hex>'` for a
  solid matte fallback.
- `frame.shadow: false` makes a hard cutout, `frame.margin` adds transparent
  padding after trim, and phone frames accept `deviceColor`.
- Scene frame overrides are chrome-only: change browser `url`/`title`/`chrome`,
  phone `title`/`subtitle`/`statusBarTime`, terminal `title`/`prompt`, or
  desktop `title`/`subtitle`. Use this for handoffs like "VPS work screen" to
  "GitHub PR screen"; do not put `outside`, `shadow`, `margin`, or
  `deviceColor` on scenes.

## Drop this into your own repo's AGENTS.md

When demoframe is a dependency, your agent reads *your* repo's `AGENTS.md`, not
the copy in `node_modules`. Paste this so it gets the rule:

```md
## Demos (demoframe)
Screenshots are reference, not ingredients: reconstruct the flow as synthetic
demoframe scenes (typing/steps/status-card/chat/screen), never paste screenshots into a
frame. Interview first (narrative arc, climax, destination, brand, names, exact
copy, what to keep vs simplify) and record it in the top-level `brief:` block.
`demoframe check` warns on a missing/unfilled brief and `--strict` fails.
`demoframe check`/`render` reject a frameless all-screenshot demo;
`--allow-raw-screenshots` is only for an intentional raw demo. See
node_modules/demoframe/AGENTS.md and docs/llms.txt.
```
