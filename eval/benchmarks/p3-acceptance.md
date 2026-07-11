# P3 shot-compositor acceptance

P3 rebuilds the approved Shipcheck CLI animatic through direct `shots:` while
keeping legacy `scenes:` on the existing renderer. The acceptance example is
[`examples/shots-compositor/demo.yml`](../../examples/shots-compositor/demo.yml).

## Storyboard match

| Approved target moment | Shot reconstruction |
| --- | --- |
| Direct terminal hook | `hook` presents the durable promise in the hero slot. |
| Terminal and gate coexist | `blocked` pairs a terminal hero with a supporting gate. |
| Blocker clears without replacing the workspace | `clear` carries the same object IDs through a shared-element transition and changes their semantic state. |
| Clean 3/3 payoff | `payoff` removes supporting detail, centers the proof, and holds before restart. |

The reconstruction uses no cursor object, raw screenshot, perspective float,
orbit, or sonar decoration.

## Verification record

- `demoframe check --strict examples/shots-compositor/demo.yml`: valid; the
  only informational notice records that no appearance source was requested.
- `npm run test:shots`: 15 tests passed, covering graph resolution, story
  binding, deterministic frame/video/report output, and browser/phone/frameless
  compositor layout.
- Acceptance render: 720x405 WebP, 730 KB, 15 fps, 11.4 seconds, 159 encoded frames,
  infinite loop, no audio, within the README budget.
- Resolved graph SHA-256:
  `6b2a86c9d31943d3ee44c86908fe21d833e7bebf521c980e881b99c8bdceb2d3`.
- The ordinary suite passes 302 tests and skips the opt-in exact/layout jobs;
  its only failures are the three already-recorded intentional legacy golden
  updates (`fieldwork-hero`, `mobile-flow`, and `expense-report`).
- Threshold-zero legacy verification remains installed as the Linux golden
  workflow. Capturing the canonical Linux baseline is a branch/PR CI action,
  not a local macOS claim.

P3 therefore satisfies the approved storyboard, additive-schema, independent
renderer-path, determinism, and layout gates. P4 may proceed under the fixed
capability-gap memo.
