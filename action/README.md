# demoframe render action

Renders a [demoframe](https://github.com/bprateeek/demoframe) demo in CI. Linux runners are demoframe's determinism reference, so renders are pixel-stable across runs. Chromium and gifski auto-install on first render; the only requirement is Node 20+ on the runner.

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
- uses: bprateeek/demoframe/action@v0.4.0
  id: demo
  with:
    config: demo/demo.yml
    out: rendered
    version: 0.4.0          # demoframe npm version, defaults to latest
    # for: github-readme    # optional destination preset
- run: cat ${{ steps.demo.outputs.report }}
```

Outputs:

- `report`: path to `report.json` (sizes, budget verdicts, frame stats).
- `files`: JSON array of rendered media paths.

## Recipe: refresh README media on merge

Renders whenever the demo config changes on main and commits the result. The trigger `paths` exclude the rendered output, so the bot commit cannot retrigger the workflow.

```yaml
name: Refresh README demo
on:
  push:
    branches: [main]
    paths: ['demo/**']
permissions:
  contents: write
jobs:
  render:
    if: github.actor != 'github-actions[bot]'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: bprateeek/demoframe/action@v0.4.0
        with:
          config: demo/demo.yml
          out: /tmp/demo-out
      - run: cp /tmp/demo-out/demo.webp docs/assets/demo.webp
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add docs/assets/demo.webp
          git diff --cached --quiet && exit 0
          git commit -m "Refresh README demo"
          git push
```

## Recipe: attach renders to pull requests

```yaml
name: Demo preview
on: pull_request
jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: bprateeek/demoframe/action@v0.4.0
        id: demo
        with:
          config: demo/demo.yml
          out: rendered
      - uses: actions/upload-artifact@v4
        with:
          name: demo-render
          path: rendered
```

For an inline sticky comment with the report summary, feed `steps.demo.outputs.report` into a commenting action such as `marocchino/sticky-pull-request-comment`:

```yaml
      - id: summary
        run: |
          {
            echo 'body<<EOF'
            echo '### demoframe render'
            node -e 'const r=require("./rendered/report.json"); for (const o of r.outputs) console.log(`- ${o.file}: ${(o.sizeBytes/1024).toFixed(0)} KB`)'
            echo 'EOF'
          } >> "$GITHUB_OUTPUT"
      - uses: marocchino/sticky-pull-request-comment@v2
        with:
          message: ${{ steps.summary.outputs.body }}
```
