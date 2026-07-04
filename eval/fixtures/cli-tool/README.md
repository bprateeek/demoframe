# shipcheck

Pre-release checklists for your terminal. Add checks once, run them before every release, and block the ship when something is still open.

## Why

Release days collect loose ends: changelog not updated, migration not tested, docs stale. shipcheck keeps the list next to your code and turns it into a pass/fail gate you can wire into CI.

## Install

```sh
npm install -g shipcheck
```

## Usage

```sh
shipcheck add "run the full test suite"
shipcheck add "update CHANGELOG.md"
shipcheck add "smoke test the installer"
shipcheck list
```

```
[ ] #1 run the full test suite
[ ] #2 update CHANGELOG.md
[ ] #3 smoke test the installer
```

Check items off as you go:

```sh
shipcheck done 1
shipcheck run
```

```
shipcheck: 1/3 checks complete
  blocking: #2 update CHANGELOG.md
  blocking: #3 smoke test the installer
```

`shipcheck run` exits non-zero while checks are open, so it drops straight into a release script or CI job.

## Features

- Zero dependencies, single JSON file store (`.shipcheck.json`)
- Exit codes made for CI gates
- Checks live in the repo, reviewed like code

## License

MIT
