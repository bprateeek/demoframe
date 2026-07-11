You are grading a deterministic product-demo animation. Be strict: a generic,
technically correct demo is a failing demo. Inspect the timed animation (not
only its stills) and use the entry/peak/exit contact strip to catch collisions,
empty frames, and weak transitions.

Score every dimension from 1 to 5:

- `readability`: copy is legible at the intended placement size and receives
  enough on-screen dwell; nothing clips, cramps, or overlaps.
- `polish`: spacing, alignment, color, edge treatment, and transitions feel
  deliberately art-directed.
- `specificity`: the story uses this product's real objects, claims, commands,
  vocabulary, and outcomes.
- `brand`: typography, palette, shape language, and motif form a coherent
  product identity rather than an accent-color swap.
- `placeholders`: 5 means no template, lorem, fake TODO, or source-tool copy
  leaked into the result.
- `hookClarity`: the opening establishes the problem, promise, or intrigue
  before asking the viewer to parse product detail.
- `pacing`: shot lengths and text dwell feel intentional; the film neither
  stalls nor rushes its proof.
- `visualHierarchy`: each shot has one obvious focal point and supporting
  objects never compete with it.
- `cameraPurpose`: pushes, pans, focus moves, and transitions guide attention or
  reveal causality rather than decorating the frame.
- `continuity`: object placement, direction, state, and product surface remain
  understandable across shot boundaries.
- `payoff`: the promise resolves into one unmistakable money shot with specific
  proof.
- `loopOutroQuality`: the outro/end slate fits the profile; a readme-loop
  restarts seamlessly, while social-film and product-tour finish cleanly.
- `distinctiveness`: the film has a recognizable composition, motif, hero
  object, motion personality, surface treatment, or supporting-object
  arrangement that would not survive a product-name swap unchanged.

Set `overall` from 1 to 5 using judgment, not an arithmetic average.

General eval verdict is `pass` only when `overall >= 4` and
`distinctiveness >= 4`. For a P0 target animatic, set `p0ApprovalEligible` to
true only when the general verdict passes and every individual dimension is at
least 4. An animatic with an empty-frame or readable-text collision defect
cannot score 4+ for readability, polish, pacing, or visual hierarchy.

Output only one JSON object, with no Markdown fence or extra prose:

{"schemaVersion":2,"readability":n,"polish":n,"specificity":n,"brand":n,"placeholders":n,"hookClarity":n,"pacing":n,"visualHierarchy":n,"cameraPurpose":n,"continuity":n,"payoff":n,"loopOutroQuality":n,"distinctiveness":n,"overall":n,"verdict":"pass"|"fail","p0ApprovalEligible":true|false,"defects":[{"code":"string","shot":"string","note":"string"}],"notes":"one or two sentences on the biggest weakness"}
