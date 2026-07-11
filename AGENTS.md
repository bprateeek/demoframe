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
layout). For `brief.intent: abstract`, any screenshot scene must be explicitly
raw-intentional via `brief.screenshotPolicy: raw-intentional`; abstract demos
do not get to paste screenshots either. Abstract demos also need visible
product payload: show `brief.product`, `brief.verbatimCopy`, or a
metric/callout value in a rendered scene; `theme.logo` alone is not enough.

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
`intent`, `product`, `repo`, and `verbatimCopy`. Set `mode: user-confirmed` only after
the user has answered the interview and confirmed the scene mapping. A missing,
empty, TODO-filled, inferred, or otherwise unconfirmed brief makes
`demoframe check`, `preview`, and `render` fail unless the run explicitly passes
`--autonomous` (or MCP `autonomous: true`), which labels the output as inferred.
Confirmed reconstruction briefs that omit both `product` and `repo`, or omit
`verbatimCopy`, stay valid but warn because agents need product names and exact
UI copy to reconstruct rather than genericize the demo.

```yaml
brief:
  mode: user-confirmed
  intent: product
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
with no human, pass `--autonomous`, record assumptions with `--assumption` or
`brief.assumptions`, and expect `report.json` to say `mode: inferred` and
`confirmed: false`.

## Reconnaissance before scenes

Before authoring YAML, inspect the repo like a product designer with a terminal:

- Read the nearest app README, package/app metadata, route names, and any
  screenshots or example configs that reveal product vocabulary.
- Identify the audience, core workflow, primary object names, success state,
  and exact UI copy worth preserving.
- Decide the frame and destination from the actual surface being demonstrated,
  not from the screenshot dimensions alone.
- Note privacy risks before writing scenes: emails, customer names, internal
  URLs, API tokens, or production data should be replaced with synthetic copy.

Record the result as a short scene-mapping note before rendering. Use this
format for each source signal:

```md
source signal -> intent -> scene -> preserve / simplify / remove / copy
Mobile ask screenshot -> user requests help -> typing -> preserve "Ship report" / simplify chrome / remove avatars / copy button label
CI log -> workspace verifies result -> terminal-playback -> preserve command + final pass line / simplify middle output / remove hostnames / copy "All checks passed"
GitHub PR page -> result is ready -> status-card -> preserve PR title + checks / simplify file list / remove timestamps / copy "Ready for review"
```

Only start scenes after the mapping proves every screenshot is being
reconstructed, simplified, or intentionally marked raw.

Density rules: one idea per scene, short labels, at most ~4 step items, generous
whitespace, a single warm accent, 8 to 12s total, and a `hold` on the ending
before the loop restarts.

## The loop

1. **Scaffold or author.** `npx demoframe init --template <name>` writes a
   `demo.yml` with a TODO `brief:` stub (`--list` shows templates). Get the authoritative schema with
   `npx demoframe schema` (JSON Schema on stdout); the schema is pre-1.0, so
   read it instead of relying on memorized field names. For a polished
   marketing-grade result start from `premium-hero` or `product-dashboard`:
   they demonstrate the premium path (full-bleed `frame: none` staging,
   `cinematic:` composition/motion/ambient, claim-then-proof scenes). Their
   product "Relay"/"Lumen" is fictional; replace every REPLACE-marked value
   with this repository's real product, copy, and numbers before rendering.
2. **Validate.** `npx demoframe check demo.yml` after every edit. Rendering for
   a specific destination? Pass the same `--for github-readme|x-post|linkedin|product-hunt`
   to `check`, `preview`, and `render` so preset width/fps/quality/format policy
   is validated before visual QA. It prints
   errors (which block rendering, including missing assets and an unconfirmed
   brief), warnings (privacy findings, oversized screenshots,
   screenshot-dominant configs), and notices (explicit autonomous brief gates).
   `render --for` warns when it does not overlap `brief.placement`. Fix them all;
   `--strict` makes warnings fail too.
3. **Render.** `npx demoframe render demo.yml -o dist` validates, renders,
   encodes, writes `dist/preview/` stills and `dist/report.json`. Add
   `--for github-readme|x-post|linkedin|product-hunt` to set
   format/width/fps/budget in one flag.
4. **Verify from report.json.** `brief.mode` is `user-confirmed` and
   `brief.confirmed` true for normal runs, `brief.requiredComplete` true,
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
- Terminal demos behave like one session: consecutive `terminal-playback`
  scenes keep earlier commands and output on screen as scrollback (set
  `session: fresh` on a scene to clear it), a session taller than the frame
  pins to the bottom like a real terminal, and when `frame.height` is unset
  the frame auto-fits the session. Do not hand-tune `frame.height` to remove
  dead space; leave it unset. Avoid a `terminal-playback` scene inside a
  browser or desktop frame for a single command; it renders as a small
  floating panel in a mostly empty viewport. Use a terminal frame demo, or
  skip the "start the server" beat and open on the product screen.
- For launch or hero moments use the `hero-object` screen block
  (`kind: logo-chip | glow-card | code-chip`) with `layout: hero` on a
  `frame: none` stage plus `cinematic:` composition/motion/ambient; the
  bundled `launch-hero` template shows the pattern. Badges accept a semantic
  tone (`badge: { text: Degraded, tone: warn }`, tones `neutral | success |
  warn | error`); never mark degraded or failing states with the plain
  accent badge.

## Drop this into your own repo's AGENTS.md

When demoframe is a dependency, your agent reads *your* repo's `AGENTS.md`, not
the copy in `node_modules`. Paste this so it gets the rule:

```md
## Demos (demoframe)
Screenshots are reference, not ingredients: reconstruct the flow as synthetic
demoframe scenes (typing/steps/status-card/chat/screen), never paste screenshots into a
frame. For `brief.intent: abstract`, screenshot scenes require
`brief.screenshotPolicy: raw-intentional`, and visible product payload from
`brief.product`, `brief.verbatimCopy`, or a metric/callout value. Interview first (narrative arc,
climax, destination, brand, names, exact copy, what to keep vs simplify), then make a scene mapping:
`source signal -> intent -> scene -> preserve / simplify / remove / copy`. Record the interview in the top-level `brief:` block.
Set `brief.mode: user-confirmed` only after confirmation; otherwise check,
preview, and render fail unless `--autonomous` is explicit, in which case the
output is labeled inferred and assumptions should be recorded. `demoframe check`/`render` reject a frameless all-screenshot demo;
`--allow-raw-screenshots` is only for an intentional raw demo. See
node_modules/demoframe/AGENTS.md and docs/llms.txt.
```

<!-- demoframe:guidance-v2:start -->
## Demos (demoframe)

Screenshots are reference, not ingredients: reconstruct the flow as synthetic
demoframe scenes (`typing`, `steps`, `status-card`, `chat`, `screen`), never
paste screenshots into a frame.

Interview before authoring:

1. Narrative arc: the ask, the work, the result.
2. Climax / money shot: which single moment to land and hold on.
3. Destination: readme, x-post, linkedin, or product-hunt.
4. Brand: accent color, frame type, light or dark.
5. Product and repo names.
6. Copy to feature verbatim (exact labels and titles).
7. Screenshot extraction: preserve, simplify, remove, and exact copy.

Record the answers in `brief`, set `brief.mode: user-confirmed` only after the
user confirms the story and source-to-scene mapping, and fill
audience/source/screenshotPolicy/placement/arc/climax. `--autonomous` allows an
inferred brief only; it never downgrades errors on a user-confirmed brief.

New configs use story v2. Set `brief.story.version: 2`, choose an explicit
`profile` (`readme-loop`, `social-film`, or `product-tour`), and bind:

- `promise` to durable copy that is visibly rendered;
- `proof` to typed ids in `demoframe-context.yml` (`exact`, deterministic
  `formatted`, or user-confirmed-only `paraphrase` with exact display copy);
- ordered beats (`hook`, one or more `build`, one `payoff`, optional `outro`)
  to scenes/shots through `beatId`; recipe mode generates its beat skeleton.

Run `demoframe context init` to scaffold the versioned typed context manifest.
Every source digest covers selected lines or a JSON pointer, so unrelated file
edits do not stale the entry. Keep sources inside the repo; assets need license
and privacy acknowledgement. Use `demoframe check --json` for the stable coded
machine contract.

Legacy scene authoring remains supported: a config with no `brief.story` and no
`profile` stays on legacy behavior and receives no story-v2 narrative errors,
including when `--for` is supplied. Do not add partial story-v2 fields to a
legacy config unless you intend to migrate it.

Choose exactly one authoring source: `scenes`, `shots`, or
`brief.story.recipe`, never more than one. Use
legacy `scenes` for a single full-canvas object per beat. Use direct `shots`
only when the story needs two or more coordinated objects, carry-over, or an
attention-guiding camera move. Every shot needs `id`, `beatId`, `duration`, and
named objects in semantic slots (`hero`, `supporting`, `background`,
`foreground`). Shot objects may embed existing scenes with `kind: scene`, or
use the small semantic registry: `kinetic-text`, `logo-lockup`,
`product-surface`, `hero-metric`, `chart-path`, and local `image`. Use a
manifest-backed `logo-lockup` for visible identity; a bare `theme.logo` is only
a watermark. Local SVG images are sanitized, but still require licensed,
privacy-reviewed source art. Keep the same durable-copy and proof rules.
Object enter/emphasize/exit, camera target,
carry, ambient timing, and transitions must explain state or causality—not add
motion for its own sake. `report.json` records the resolved shot graph and hash.
Do not add cursor objects, orbit/sonar decoration, floating perspective cards,
or a character unless that character materially improves comprehension. If the
user supplies an Excalidraw/SVG character, include it as an `image` object and
keep it subordinate to the product flow.

Use a recipe when its reliable narrative skeleton matches the story:
`code-to-result`, `problem-to-solution`, `workflow-transformation`,
`metric-proof`, `ui-focus-tour`, or `architecture-flow`. Set
`recipeVersion: 1` and choose an explicit recipe-specific variant from the
schema; never invent a string. Recipe mode needs deterministic display copy on
the first proof item. Variants intentionally change composition, motif, hero,
motion, product-surface treatment, or supporting arrangement while preserving
the recipe's beat sequence. There is no random selection and no layout derived
from mutable copy hashes. Inspect `report.json.shotGraph.recipe` to verify the
materialized choice.

Treat `check` and rendered QA as separate gates. Plain `check` never launches a
browser; use its estimated dwell and `--json` structural/appearance signatures
while authoring. `preview` and `render` sample the entire timeline for text
collision, actual dwell, empty/static time, clipping, and loop continuity.
Rendered findings are warnings during their first release, but `render
--strict` blocks atomic promotion. Fix the underlying composition or pacing;
never remove `data-qa-key` coverage or add movement solely to silence a gate.
Eval compares signatures according to pair relationships: distinct brands also
need real appearance distance, while same-brand and sibling-product pairs are
judged on film structure.

Do repo reconnaissance before scenes: inspect the nearest README/app
metadata/routes/examples, identify
product vocabulary, success state, exact copy, and privacy risks, then write:

```md
source signal -> intent -> scene -> preserve / simplify / remove / copy
```

`check`/`render` reject a frameless all-screenshot demo. Use
`--allow-raw-screenshots` only when raw pixels are the subject.
<!-- demoframe:guidance-v2:end -->
