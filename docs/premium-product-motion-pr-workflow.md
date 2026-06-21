# Premium Product Motion PR Workflow

This workflow coordinates the premium product-motion roadmap as small PRs,
using one builder thread per implementation PR and a separate reviewer thread
once a PR URL exists.

## Guardrails

- Keep each PR scoped to one plan card in
  `docs/premium-product-motion-pr-plan.html`.
- Use `codex/` branch names.
- Prefer worktree threads so parallel PRs do not share an index.
- Do not start a dependent PR until its base has merged, unless it is
  intentionally stacked on a named branch.
- Do not merge unless GitHub reports required checks green, required approvals
  satisfied, no requested changes, and the PR is mergeable.
- Stop and ask for user input on visual approval gates, ambiguous conflicts,
  credentials failures, or branch-protection surprises.

## Queue Shape

### Wave 1: start now

These can be started from `main` with low conflict risk.

1. PR 0: stage/canvas landscape spike.
2. PR 1: mandatory motion wrapper shell and wrapper-aware layout QA.
3. PR 2: `output.motionBlur` schema/plumbing and capture-path branch.

### Wave 2: after Wave 1 settles

1. PR 3: motion preset registry and shared sampling.
2. PR 4: encoder profiles, reported settings, and video budgets.
3. PR 5: cinematic scene schema and runtime plumbing.

### Wave 3: visual product slice

1. PR 6: visible premium slice.
2. PR 7: Fieldwork A/B matrix and landscape proof.
3. PR 8: choreography-only motion blur.

### Wave 4: policy and workflow parity

1. PR 9: `brief.intent` gates and anti-screenshot strictness.
2. PR 10: agent workflow, preview presets, and MCP parity.
3. PR 11: generalized premium composition set.

## Coordinator Loop

For each active builder thread:

1. Read the builder status.
2. If blocked, ask the user or send a narrow unblock prompt.
3. If a PR URL exists and no reviewer exists, create a reviewer thread.
4. Read reviewer findings and GitHub review comments.
5. If findings or requested changes exist, send them to the builder thread.
6. If the builder pushes updates, ask the reviewer to re-review.
7. Poll GitHub for checks, approvals, unresolved comments, and mergeability.
8. Merge only when external state is clean.
9. Archive completed builder/reviewer threads and start the next eligible queue item.

## Builder Prompt Contract

```text
You are implementing PR {n}: {title} for demoframe.

Use branch codex/{slug}. Start from {base}.
Scope: {objective}
Files likely involved: {files}
Acceptance criteria: {done_when}
Verification commands: {commands}

Keep the PR focused. Do not implement later roadmap items.
When finished, run verification, commit, push, create a PR, and report:
- PR URL
- commit SHA
- verification results
- risks or follow-up work
```

## Reviewer Prompt Contract

```text
Review PR {url} for demoframe.

Use a code-review stance. Prioritize bugs, regressions, missing tests, and
roadmap scope creep. Ground findings in file/line references where possible.
Do not request broad refactors unrelated to this PR.

Return:
- blocking findings
- non-blocking findings
- test gaps
- approve/no-approve recommendation
```

## GitHub State Checks

Use `gh` when credentials are available:

```sh
gh pr view <url> --json number,url,headRefName,baseRefName,mergeable,reviewDecision,statusCheckRollup
gh pr checks <url>
gh pr merge <url> --squash --delete-branch
```

If the repository policy prefers merge commits or rebase merges, use that policy
instead of squash.

