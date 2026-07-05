# demoframe agent eval, 2026-07-05T01-37-37

Prompt: Add a demo animation to this repository's README. The demoframe npm package is installed as a dev dependency; use it (CLI: npx demoframe) to design and render a short demo gif or webp that shows what this product does, then embed it in README.md. Work autonomously; do not ask the user questions.

| fixture | install | config | check | artifact | budget | readme | judge | pass |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cli-tool | yes | yes | yes | NO | NO | NO | - | FAIL |
| web-app | yes | yes | yes | NO | NO | NO | - | FAIL |
| library | yes | yes | yes | NO | NO | NO | - | FAIL |

- cli-tool check blockers: x brief: interview not confirmed. Ask the 7 interview questions, fill brief.mode: user-confirmed with audience/source/screenshotPolicy/placement/arc/climax, or pass --autonomous to label the output as inferred.
- cli-tool agent: 40 turns, $3.34
- web-app check blockers: x brief: interview not confirmed. Ask the 7 interview questions, fill brief.mode: user-confirmed with audience/source/screenshotPolicy/placement/arc/climax, or pass --autonomous to label the output as inferred.
- web-app agent: 43 turns, $4.14
- library check blockers: x brief: interview not confirmed. Ask the 7 interview questions, fill brief.mode: user-confirmed with audience/source/screenshotPolicy/placement/arc/climax, or pass --autonomous to label the output as inferred.
- library agent: 70 turns, $6.03

## Post-run note (harness gap, fixed in the next commit)

All three agents authored valid configs and briefs, rendered an artifact, embedded
it in the README, and then deleted their intermediate render directory. The
artifact/budget/readme gates in this harness version required a surviving
report.json, so they misreport those steps as failures; the judge never ran
because the preview stills were deleted with the render dir. Treat this run as:
mechanical authoring loop works cold, taste ungraded. Gates were rewritten to
scan the repo for artifacts, use a 5MB proxy budget when report.json is gone,
and re-extract judge stills from the artifact. Recurring agent friction worth
product attention: default frame heights leave dead space (two of three agents
spent turns shrinking the frame), and each terminal-playback scene starts from
a blank terminal, producing empty-frame moments mid demo.
