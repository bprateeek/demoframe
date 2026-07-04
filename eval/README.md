# demoframe agent eval

Measures whether a cold AI agent can turn "use demoframe to add a demo to the README" into a polished artifact. This is the acceptance bar for the road to 1.0: the eval must pass consistently across fixtures before the schema freezes.

Not shipped in the npm package (`files` allowlist excludes `eval/`).

## What it does

For each fixture repo (`cli-tool`, `web-app`, `library`):

1. Packs the local demoframe and installs the tarball as a dev dependency into a temp copy of the fixture.
2. Runs a headless Claude Code session (`claude -p`) with a fixed prompt asking it to add a demo animation to the README.
3. Mechanical gates: install worked, a scene config exists, `demoframe check` passes (an unconfirmed-brief blocker alone is tolerated, since autonomous renders are labeled inferred), the artifact rendered within budget, and the README embeds it.
4. Taste gate: a second `claude -p` call grades the preview stills against `judge-rubric.md` (readability, polish, specificity, brand, placeholder leakage) and returns a verdict.
5. Writes `results/<timestamp>/results.json` and `scorecard.md`, plus per-fixture artifacts (config, report, stills, animation, transcripts) for eyeballing.

Only `scorecard.md` and `results.json` are committed; the heavy per-fixture artifacts are gitignored.

## Running

Prerequisites: `claude` CLI logged in, network access, Chromium available to demoframe (`npx demoframe install-browser`, one time). Run from a normal terminal; the agent and judge need API access, so this will not work inside a network-restricted sandbox.

```sh
node eval/run.mjs                 # full run, all fixtures
node eval/run.mjs --fixture cli-tool
node eval/run.mjs --skip-agent    # plumbing smoke: gates against an untouched fixture
node eval/run.mjs --skip-judge    # mechanical gates only
node eval/run.mjs --model claude-sonnet-5 --judge-model claude-opus-4-8
node eval/run.mjs --keep          # keep the temp work dirs for inspection
```

Exit code 0 means every fixture passed both gates.

## Reading a scorecard

`pass` requires every mechanical gate plus a judge verdict of `pass` (overall >= 4, readability >= 4, placeholders >= 4). Judge notes and check blockers are listed under the table; treat recurring notes as the backlog for the next PR.
