#!/usr/bin/env node
// demoframe agent eval: packs the local demoframe, installs it into copies of the
// fixture repos, asks a headless Claude Code session to add a demo to each README,
// then grades the result with mechanical gates and an LLM-judge taste rubric.
//
// usage: node eval/run.mjs [--fixture cli-tool] [--skip-agent] [--skip-judge]
//                          [--model X] [--judge-model Y] [--max-turns 60] [--keep]
//                          [--into eval/results/<stamp>]
//
// --into resumes a prior run: re-run a single fixture (e.g.
//   node eval/run.mjs --fixture library --into eval/results/2026-07-05T15-22-35
// ) and its result is merged back into that run's scorecard, so fixtures that
// already passed are left untouched.
//
// Models are pinned (agent: claude-sonnet-5, judge: claude-opus-4-8) so the gate
// does not silently inherit the operator's Claude Code default; --model /
// --judge-model override, and the resolved models are written to the scorecard.
//
// Requires: claude CLI logged in, network access, chromium for demoframe
// (npx demoframe install-browser). Run from a normal terminal, not a sandbox.

import { spawnSync } from 'node:child_process';
import {
  cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
  existsSync, copyFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const evalDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(evalDir, '..');

const { values: opts } = parseArgs({
  options: {
    fixture: { type: 'string' },
    'agent-cmd': { type: 'string' },
    'skip-agent': { type: 'boolean', default: false },
    'skip-judge': { type: 'boolean', default: false },
    model: { type: 'string' },
    'judge-model': { type: 'string' },
    'max-turns': { type: 'string', default: '60' },
    keep: { type: 'boolean', default: false },
    into: { type: 'string' },
  },
});

const fixtureCatalog = JSON.parse(readFileSync(join(evalDir, 'fixtures', 'manifest.json'), 'utf8'));
const fixtureByName = new Map(fixtureCatalog.fixtures.map((fixture) => [fixture.name, fixture]));

function agentPrompt(name) {
  const fixture = fixtureByName.get(name);
  const base =
    "Add a demo animation to this repository's README. The demoframe npm package is " +
    'installed as a dev dependency; use it (CLI: npx demoframe) to inspect the repository, author ' +
    'demoframe-context.yml and a story-v2 config, render a polished artifact, keep the config/report, ' +
    'and embed the animation in README.md. Do not ask follow-up questions.';
  if (fixture?.contract === 'inferred') {
    return `${base}\n\nThis is the explicit inferred fixture. Pass --autonomous, record assumptions, and use only exact or formatted proof. ${fixture.interview.note}`;
  }
  const answers = fixture?.interview ?? {};
  return `${base}\n\nThe user already answered and confirmed the authoring interview. Record mode: user-confirmed and use these answers verbatim as constraints:\n${JSON.stringify(answers, null, 2)}\n${
    fixture?.heldOutExtraction
      ? 'This is a held-out extraction fixture: no prepared context manifest exists. Inspect repository sources and author it yourself.'
      : ''
  }`;
}

const AGENT_TIMEOUT_MS = 30 * 60 * 1000;
const JUDGE_TIMEOUT_MS = 5 * 60 * 1000;

// Pin the models so the gate never silently rides on whatever the operator's
// Claude Code default happens to be (e.g. Fable). The agent under test uses the
// realistic default a demoframe user would run; the judge uses the strongest
// model for consistent grading. Override per run with --model / --judge-model.
const DEFAULT_AGENT_MODEL = 'claude-sonnet-5';
const DEFAULT_JUDGE_MODEL = 'claude-opus-4-8';
const agentModel = opts.model ?? DEFAULT_AGENT_MODEL;
const judgeModel = opts['judge-model'] ?? DEFAULT_JUDGE_MODEL;

function run(cmd, args, cwd, timeout) {
  const res = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout,
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
  });
  return {
    ok: res.status === 0,
    code: res.status,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    timedOut: res.error?.code === 'ETIMEDOUT',
  };
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function findConfigs(dir) {
  return walk(dir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .filter((f) => /^(?:scenes|shots):|^\s+recipe:/m.test(readFileSync(f, 'utf8')))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function findReports(dir) {
  return walk(dir)
    .filter((f) => basename(f) === 'report.json')
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function findArtifacts(dir) {
  return walk(dir)
    .filter((f) => /\.(gif|webp|mp4|webm)$/i.test(f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

const GITHUB_README_BUDGET_BYTES = 5 * 1024 * 1024;

async function extractStills(artifact, outDir) {
  if (!/\.(gif|webp)$/i.test(artifact)) return [];
  const { default: sharp } = await import('sharp');
  const meta = await sharp(artifact).metadata();
  const pages = meta.pages ?? 1;
  const picks = [...new Set([Math.floor(pages * 0.2), Math.floor(pages * 0.55), Math.max(0, pages - 2)])];
  const stills = [];
  for (const page of picks) {
    const out = join(outDir, `extracted_${page}.png`);
    await sharp(artifact, { page }).png().toFile(out);
    stills.push(out);
  }
  return stills;
}

function extractJson(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  for (let end = text.length; end > start; end--) {
    try {
      return JSON.parse(text.slice(start, end));
    } catch {
      /* keep shrinking */
    }
  }
  return null;
}

function classifyCheck(output) {
  const blocking = output
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('x '));
  return { blocking, briefOnly: blocking.length > 0 && blocking.every((l) => l.includes('brief')) };
}

async function evalFixture(name, workRoot, tarball, resultsDir) {
  console.log(`\n=== fixture: ${name} ===`);
  const work = join(workRoot, name);
  cpSync(join(evalDir, 'fixtures', name), work, { recursive: true });
  const fixtureResults = join(resultsDir, name);
  // Clear any prior artifacts for this fixture so a resumed run (--into) never
  // mixes stale files (e.g. a previous run's judge.json) into fresh results.
  rmSync(fixtureResults, { recursive: true, force: true });
  mkdirSync(fixtureResults, { recursive: true });

  const record = { fixture: name, gates: {}, judge: null, agent: null };
  const fixture = fixtureByName.get(name);
  if (!fixture) throw new Error(`fixture ${name} is missing from fixtures/manifest.json`);
  record.contract = fixture.contract;
  record.heldOutExtraction = fixture.heldOutExtraction;
  record.relationships = fixtureCatalog.pairs.filter((pair) => pair.left === name || pair.right === name);

  console.log('installing demoframe tarball...');
  const install = run('npm', ['install', '--no-audit', '--no-fund', '--save-dev', tarball], work);
  record.gates.install = install.ok;
  if (!install.ok) {
    writeFileSync(join(fixtureResults, 'install.log'), install.stdout + install.stderr);
    console.log('install FAILED');
    return record;
  }

  if (opts['agent-cmd']) {
    console.log(`running agent command: ${opts['agent-cmd']}`);
    const agent = run('sh', ['-c', opts['agent-cmd']], work, AGENT_TIMEOUT_MS);
    writeFileSync(join(fixtureResults, 'agent.log'), agent.stdout + agent.stderr);
    record.agent = { ok: agent.ok, timedOut: agent.timedOut };
    if (!agent.ok) console.log(`agent command exited non-zero${agent.timedOut ? ' (timeout)' : ''}`);
  } else if (!opts['skip-agent']) {
    console.log(`running claude -p (up to ${opts['max-turns']} turns, this can take 10-20 min)...`);
    console.log(`  agent model: ${agentModel}`);
    const args = ['-p', agentPrompt(name), '--dangerously-skip-permissions', '--max-turns', opts['max-turns'], '--output-format', 'json', '--model', agentModel];
    const agent = run('claude', args, work, AGENT_TIMEOUT_MS);
    writeFileSync(join(fixtureResults, 'agent.json'), agent.stdout || agent.stderr);
    const parsed = extractJson(agent.stdout);
    record.agent = {
      ok: agent.ok,
      timedOut: agent.timedOut,
      model: agentModel,
      turns: parsed?.num_turns ?? null,
      costUsd: parsed?.total_cost_usd ?? null,
      resultTail: typeof parsed?.result === 'string' ? parsed.result.slice(-500) : null,
    };
    // Rate limits and auth failures surface as is_error with ~1 turn; the run
    // says nothing about demoframe, so mark it unusable instead of failing gates.
    if (parsed?.is_error) {
      record.agent.unavailable = true;
      console.log(`agent unavailable: ${String(parsed?.result ?? '').slice(0, 120)}`);
      record.pass = false;
      return record;
    }
    if (!agent.ok) console.log(`agent exited non-zero${agent.timedOut ? ' (timeout)' : ''}`);
  }

  const configs = findConfigs(work);
  record.gates.configFound = configs.length > 0;
  const config = configs[0];
  if (config) {
    copyFileSync(config, join(fixtureResults, 'demo.yml'));
    const checkArgs = ['demoframe', 'check', config, '--json'];
    if (fixture.contract === 'inferred') checkArgs.push('--autonomous');
    const check = run('npx', checkArgs, work, 5 * 60 * 1000);
    const checked = extractJson(check.stdout);
    record.gates.check = check.ok && checked?.schemaVersion === 1 && checked?.valid === true;
    record.gates.checkBlocking = (checked?.findings ?? [])
      .filter((finding) => finding.severity === 'error')
      .map((finding) => `${finding.code}: ${finding.message}`);
    record.checkSchemaVersion = checked?.schemaVersion ?? null;
    record.structuralSignature = checked?.structuralSignature ?? null;
    record.appearanceSignature = checked?.appearanceSignature ?? null;
    writeFileSync(join(fixtureResults, 'check.log'), check.stdout + check.stderr);
  } else {
    record.gates.check = false;
  }

  // Agents often clean up their render dir after copying the artifact out, so the
  // artifact/budget gates work from the files the repo actually keeps; report.json
  // and its preview stills are used when they survive, and stills are re-extracted
  // from the artifact when they do not.
  const readmePath = join(work, 'README.md');
  const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';
  const artifactFiles = findArtifacts(work);
  const embedded = artifactFiles.filter((f) => readme.includes(basename(f)));
  record.gates.artifact = artifactFiles.length > 0;
  record.gates.readmeEmbed = embedded.length > 0;
  const kept = embedded.length > 0 ? embedded : artifactFiles;
  for (const f of kept) copyFileSync(f, join(fixtureResults, basename(f)));

  const reports = findReports(work);
  let report = null;
  if (reports.length > 0) {
    report = JSON.parse(readFileSync(reports[0], 'utf8'));
    copyFileSync(reports[0], join(fixtureResults, 'report.json'));
  }
  record.gates.report = report !== null;
  const inputManifest = report?.inputManifest;
  record.gates.inputManifest = Boolean(
    inputManifest?.schemaVersion === 1 &&
      /^sha256:[a-f0-9]{64}$/.test(inputManifest?.sourceConfigHash ?? '') &&
      Array.isArray(inputManifest?.normalizedConfigHashes) &&
      inputManifest.normalizedConfigHashes.length > 0 &&
      Array.isArray(inputManifest?.fontHashes) &&
      inputManifest.fontHashes.length > 0 &&
      inputManifest?.packageVersion &&
      inputManifest?.chromiumRevision &&
      inputManifest?.encoderVersions,
  );
  const reportedOutputs = (report?.outputs ?? []).filter((o) => o.file && existsSync(o.file));
  if (reportedOutputs.length > 0) {
    record.gates.budget = reportedOutputs.every((o) => o.withinBudget !== false);
    record.budgetSource = 'report';
  } else {
    record.gates.budget = kept.length > 0 && kept.every((f) => statSync(f).size <= GITHUB_README_BUDGET_BYTES);
    record.budgetSource = 'proxy';
  }

  record.previews = (report?.previews ?? [])
    .map((p) => resolve(dirname(reports[0]), p))
    .filter((p) => existsSync(p));
  const previewDir = join(fixtureResults, 'preview');
  mkdirSync(previewDir, { recursive: true });
  for (const p of record.previews) copyFileSync(p, join(previewDir, basename(p)));
  if (record.previews.length === 0 && kept.length > 0) {
    try {
      record.previews = await extractStills(kept[0], previewDir);
    } catch (err) {
      console.log(`still extraction failed: ${err.message}`);
    }
  }

  record.mechanicalPass =
    record.gates.install &&
    record.gates.configFound &&
    record.gates.check &&
    record.gates.artifact &&
    record.gates.budget &&
    record.gates.readmeEmbed &&
    record.gates.report &&
    record.gates.inputManifest;

  if (!opts['skip-judge'] && (record.previews?.length ?? 0) > 0) {
    console.log('judging animation and preview stills...');
    const rubric = readFileSync(join(evalDir, 'judge-rubric.md'), 'utf8');
    const judgePrompt =
      `${rubric}\n\nThe repository under review is described by README.md in the working ` +
      `directory. Read the kept animation plus these preview stills and grade them. Use the artifact timing/report ` +
      `to assess pacing and loop/outro quality:\n` +
      [...kept, ...record.previews].map((p) => `- ${p}`).join('\n');
    console.log(`  judge model: ${judgeModel}`);
    const args = ['-p', judgePrompt, '--dangerously-skip-permissions', '--max-turns', '15', '--output-format', 'json', '--allowedTools', 'Read', '--model', judgeModel];
    record.judgeModel = judgeModel;
    record.judgeAttempts = 0;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const judge = run('claude', args, work, JUDGE_TIMEOUT_MS);
      writeFileSync(join(fixtureResults, `judge-attempt-${attempt}.json`), judge.stdout || judge.stderr);
      const outer = extractJson(judge.stdout);
      const parsed = typeof outer?.result === 'string' ? extractJson(outer.result) : null;
      record.judgeAttempts = attempt;
      if (parsed?.schemaVersion === 2 && typeof parsed?.overall === 'number') {
        record.judge = parsed;
        writeFileSync(join(fixtureResults, 'judge.json'), `${JSON.stringify(parsed, null, 2)}\n`);
        break;
      }
    }
    if (!record.judge) {
      record.needsHumanReview = true;
      console.log('judge output could not be parsed after retry; needs-human-review');
    }
  }

  record.pass =
    record.mechanicalPass &&
    (opts['skip-judge'] || (!record.needsHumanReview && record.judge?.verdict === 'pass'));
  console.log(`${name}: mechanical ${record.mechanicalPass ? 'PASS' : 'FAIL'}, overall ${record.pass ? 'PASS' : 'FAIL'}`);
  return record;
}

function scorecard(records, stamp) {
  const lines = [
    `# demoframe agent eval, ${stamp}`,
    '',
    ...(records.some((r) => r.agent?.unavailable)
      ? ['**INVALID RUN**: the agent was unavailable (rate limit or auth); do not treat as a graded result.', '']
      : []),
    `Agent model: ${agentModel} | Judge model: ${judgeModel}`,
    '',
    'Prompt: fixture-specific confirmed interview answers (one explicitly inferred fixture); see fixtures/manifest.json',
    '',
    '| fixture | install | config | check | artifact | budget | readme | report | manifest | diversity | judge | pass |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const mark = (v) => (v === undefined || v === null ? '-' : v ? 'yes' : 'NO');
  for (const r of records) {
    const judge = r.judge ? `${r.judge.overall}/5 (${r.judge.verdict})` : '-';
    lines.push(
      `| ${r.fixture} | ${mark(r.gates.install)} | ${mark(r.gates.configFound)} | ${mark(r.gates.check)} | ` +
        `${mark(r.gates.artifact)} | ${mark(r.gates.budget)} | ${mark(r.gates.readmeEmbed)} | ` +
        `${mark(r.gates.report)} | ${mark(r.gates.inputManifest)} | ${mark(r.gates.diversity)} | ${judge} | ${r.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  lines.push('');
  for (const r of records) {
    if (r.judge?.notes) lines.push(`- ${r.fixture}: ${r.judge.notes}`);
    if (r.needsHumanReview) lines.push(`- ${r.fixture}: needs-human-review (judge failed its JSON contract after retry)`);
    if (r.gates.checkBlocking?.length) lines.push(`- ${r.fixture} check blockers: ${r.gates.checkBlocking.join('; ')}`);
    if (r.agent?.costUsd != null) lines.push(`- ${r.fixture} agent: ${r.agent.turns} turns, $${r.agent.costUsd.toFixed(2)}`);
  }
  lines.push('');
  return lines.join('\n');
}

const FIXTURE_ORDER = fixtureCatalog.fixtures.map((fixture) => fixture.name);

// --into resumes a prior run: single-fixture (or partial) results are folded
// back into that run's directory and its scorecard is regenerated, so you never
// have to re-run fixtures that already passed.
const resuming = Boolean(opts.into);
const resultsDir = resuming ? resolve(opts.into) : join(evalDir, 'results', new Date().toISOString().replace(/[:]/g, '-').slice(0, 19));
const stamp = basename(resultsDir);
if (resuming && !existsSync(resultsDir)) {
  console.error(`--into target does not exist: ${resultsDir}`);
  process.exit(1);
}
mkdirSync(resultsDir, { recursive: true });
const workRoot = mkdtempSync(join(tmpdir(), 'demoframe-eval-'));

console.log('building demoframe...');
const build = run('npm', ['run', 'build'], repoRoot, 5 * 60 * 1000);
if (!build.ok) {
  console.error(build.stdout + build.stderr);
  process.exit(1);
}
console.log('packing demoframe...');
const pack = run('npm', ['pack', '--pack-destination', workRoot], repoRoot, 5 * 60 * 1000);
if (!pack.ok) {
  console.error(pack.stdout + pack.stderr);
  process.exit(1);
}
const tarball = join(workRoot, pack.stdout.trim().split('\n').at(-1));

const fixtures = opts.fixture ? [opts.fixture] : [...FIXTURE_ORDER];
const fresh = [];
for (const f of fixtures) fresh.push(await evalFixture(f, workRoot, tarball, resultsDir));

// When resuming, merge fresh records over the prior run's, keyed by fixture, so
// the folder ends up with one complete scorecard covering every fixture.
let records = fresh;
if (resuming) {
  const priorPath = join(resultsDir, 'results.json');
  const prior = existsSync(priorPath) ? JSON.parse(readFileSync(priorPath, 'utf8')) : [];
  const byFixture = new Map(prior.map((r) => [r.fixture, r]));
  for (const r of fresh) byFixture.set(r.fixture, r);
  records = [...byFixture.values()].sort(
    (a, b) => FIXTURE_ORDER.indexOf(a.fixture) - FIXTURE_ORDER.indexOf(b.fixture),
  );
}

const { compareDiversity } = await import('../dist/qa/diversity.js');
const recordsByFixture = new Map(records.map((record) => [record.fixture, record]));
const pairwise = fixtureCatalog.pairs.map((pair) => {
  const left = recordsByFixture.get(pair.left);
  const right = recordsByFixture.get(pair.right);
  if (!left?.structuralSignature || !right?.structuralSignature || !left?.appearanceSignature || !right?.appearanceSignature) {
    return { ...pair, pass: false, issues: ['missing structural or appearance signature'] };
  }
  return { ...pair, ...compareDiversity(left.structuralSignature, right.structuralSignature, left.appearanceSignature, right.appearanceSignature, pair.relationship) };
});
for (const record of records) {
  const related = pairwise.filter((pair) => pair.left === record.fixture || pair.right === record.fixture);
  if (related.length > 0) {
    record.gates.diversity = related.every((pair) => pair.pass);
    record.mechanicalPass = record.mechanicalPass && record.gates.diversity;
    record.pass = record.mechanicalPass && (opts['skip-judge'] || (!record.needsHumanReview && record.judge?.verdict === 'pass'));
  }
}

writeFileSync(join(resultsDir, 'results.json'), JSON.stringify(records, null, 2) + '\n');
writeFileSync(join(resultsDir, 'pairwise.json'), JSON.stringify(pairwise, null, 2) + '\n');
writeFileSync(join(resultsDir, 'scorecard.md'), scorecard(records, stamp));
console.log(`\nresults: ${resultsDir}`);
console.log(records.map((r) => `${r.fixture}: ${r.pass ? 'PASS' : 'FAIL'}`).join(', '));

if (!opts.keep) rmSync(workRoot, { recursive: true, force: true });
else console.log(`work dirs kept at ${workRoot}`);

process.exitCode = records.every((r) => r.pass) ? 0 : 1;
