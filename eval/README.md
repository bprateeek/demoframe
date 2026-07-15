# demoframe agent eval

Measures whether a cold AI agent can turn "use demoframe to add a demo to the README" into a polished artifact. This is the acceptance bar for the road to 1.0: the eval must pass consistently across fixtures before the schema freezes.

Not shipped in the npm package (`files` allowlist excludes `eval/`).

## What it does

For each fixture repo listed in `fixtures/manifest.json` (CLI, SDK, operations,
analytics, collaboration, and consumer UI):

1. Packs the local demoframe and installs the tarball as a dev dependency into a temp copy of the fixture.
2. Runs a headless Claude Code session (`claude -p`) with fixture-specific,
   already-confirmed interview answers. One fixture explicitly exercises the
   inferred contract. At least two are held-out extraction fixtures with no
   prepared context manifest; the agent must inspect the repo and author it.
3. Mechanical gates: install worked; config and report were retained;
   versioned `check --json` passes; the animation exists, is within budget, and
   is embedded; and `report.json.inputManifest` carries the required hashes and
   runtime versions. There is no config-cleanup waiver.
4. Taste gate: a second `claude -p` call grades the kept animation and stills
   against `judge-rubric.md`, including hook, pacing, hierarchy, camera,
   continuity, payoff, loop/outro, and distinctiveness. Invalid judge JSON is
   retried once and then becomes `needs-human-review`, which blocks release.
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

Exit code 0 means every fixture passed both gates. Relationship metadata for
`distinct-brand`, `same-brand`, and `sibling-product` comparisons lives beside
the fixture tasks in `fixtures/manifest.json`; deterministic pairwise signature
gates consume it in P6.

## Reading a scorecard

`pass` requires every mechanical gate plus a judge verdict of `pass`
(`overall >= 4` and `distinctiveness >= 4`). Judge notes and coded check
blockers are listed under the table; treat recurring notes as the backlog for
the next release.
