# demoframe agent eval, 2026-07-05T15-22-35

Agent model: claude-sonnet-5 | Judge model: claude-opus-4-8

Prompt: Add a demo animation to this repository's README. The demoframe npm package is installed as a dev dependency; use it (CLI: npx demoframe) to design and render a short demo gif or webp that shows what this product does, then embed it in README.md. Work autonomously; do not ask the user questions.

| fixture | install | config | check | artifact | budget | readme | judge | pass |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cli-tool | yes | yes | yes | yes | yes | yes | 4/5 (pass) | PASS |
| web-app | yes | yes | yes | yes | yes | yes | 4/5 (pass) | PASS |
| library | yes | yes | yes | yes | yes | yes | 4/5 (pass) | PASS |

check `wv` = waived: the agent cleaned up its config, so check ran against the render + README embed instead.

- cli-tool: Clean, legible terminal playback showing shipcheck's real add/run/done/exit-code flow with no leaked placeholders; the biggest weakness is that the 'light' variant only swaps the page background while the terminal itself stays dark, so the light/dark treatment isn't truly distinct.
- cli-tool check blockers: x brief: interview not confirmed. Ask the 7 interview questions, fill brief.mode: user-confirmed with audience/source/screenshotPolicy/placement/arc/climax, or pass --autonomous to label the output as inferred.
- cli-tool agent: 31 turns, $0.77
- web-app: Strong, product-specific dashboard with real pulseboard copy (uptime 99.97%, 4 services, api/web/worker/postgres latencies, degraded state). Biggest weaknesses: the celebrate transition frame shows overlapping 'All services checked'/'Status' text and a stray floating check over the api card, and a lone blue check on the status row slightly breaks the otherwise green brand.
- web-app check blockers: x brief: interview not confirmed. Ask the 7 interview questions, fill brief.mode: user-confirmed with audience/source/screenshotPolicy/placement/arc/climax, or pass --autonomous to label the output as inferred.
- web-app agent: 46 turns, $1.35
- library: Content is highly specific to fuzzymatch (real API, copy, and 4ms/2KB claims) and text is crisply legible, but the composition leans on a default terminal chrome and the second still is nearly empty ('node sear'), while the mixed green/blue checkmarks give no single consistent accent color.
- library check blockers: x brief: interview not confirmed. Ask the 7 interview questions, fill brief.mode: user-confirmed with audience/source/screenshotPolicy/placement/arc/climax, or pass --autonomous to label the output as inferred.
- library agent: 46 turns, $1.52
