# Story-v2 profile and destination compatibility

This table is the reviewed P2-entry contract. It is intentionally separate from
output presets: destinations may change format/width/fps/budget, but never
rewrite an explicit story profile.

## Defaults when `brief.story.version: 2`

| Destination | Default profile |
| --- | --- |
| `github-readme` | `readme-loop` |
| `product-hunt` | `readme-loop` |
| `x-post` | `social-film` |
| `linkedin` | `social-film` |

`product-tour` is explicit only. `--for` supplies a default only when story v2
is present and `profile` is omitted. It never opts a legacy config into story-v2
rules.

If several `--for` destinations all resolve to the same default, that default
is used. A mixed set resolving to both `readme-loop` and `social-film` fails
with `profile.destination.ambiguous` and asks for an explicit profile.

## Explicit profile compatibility

| Explicit profile | github-readme | product-hunt | x-post | linkedin |
| --- | --- | --- | --- | --- |
| `readme-loop` | compatible | compatible | warning | warning |
| `social-film` | error | error | compatible | compatible |
| `product-tour` | error | error | warning | warning |

- Warning code: `profile.destination.suboptimal`. A short silent loop can still
  be posted socially, and a product tour can still be attached as social video,
  but the author must acknowledge that the profile is not the destination
  default.
- Error code: `profile.destination.incompatible`. README/Product Hunt budgets
  and loop expectations cannot safely accept a 15–45s social film or tour.
- An explicit profile is never rewritten, even when validation returns an
  error. Rendering stops until the config or destination is changed.
- Multiple explicit destinations are evaluated independently; the highest
  severity wins and every non-compatible pair is reported.

## Profile narrative rules

| Profile | Duration | Required narrative | Surface rule |
| --- | --- | --- | --- |
| `readme-loop` | 8–12s | exactly 3 semantic beats: hook, build, payoff; no outro beat; seamless restart | silent; persistent surface optional |
| `social-film` | 15–30s | hook first, one or more build beats, payoff, required outro/end slate | 16:9; brand lockup in hook or outro |
| `product-tour` | 20–45s | hook first, one or more build beats, payoff, optional outro | persistent product surface required; semantic focus and inline explanation are optional capabilities |

The shared beat state machine remains: `hook` exactly once and first; one or
more `build`; `payoff` exactly once; optional `outro` only after payoff; no
build/content beat after payoff. The `readme-loop` exception forbids an explicit
outro because the payoff tail must reconnect directly to the hook.
