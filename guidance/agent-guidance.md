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
