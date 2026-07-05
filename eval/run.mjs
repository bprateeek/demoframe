#!/usr/bin/env node
// demoframe agent eval: packs the local demoframe, installs it into copies of the
// fixture repos, asks a headless Claude Code session to add a demo to each README,
// then grades the result with mechanical gates and an LLM-judge taste rubric.
//
// usage: node eval/run.mjs [--fixture cli-tool] [--skip-agent] [--skip-judge]
//                          [--model X] [--judge-model Y] [--max-turns 60] [--keep]
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
  },
});

const AGENT_PROMPT =
  "Add a demo animation to this repository's README. The demoframe npm package is " +
  'installed as a dev dependency; use it (CLI: npx demoframe) to design and render a ' +
  'short demo gif or webp that shows what this product does, then embed it in README.md. ' +
  'Work autonomously; do not ask the user questions.';

const AGENT_TIMEOUT_MS = 30 * 60 * 1000;
const JUDGE_TIMEOUT_MS = 5 * 60 * 1000;

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
    .filter((f) => /^scenes:/m.test(readFileSync(f, 'utf8')))
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
  mkdirSync(fixtureResults, { recursive: true });

  const record = { fixture: name, gates: {}, judge: null, agent: null };

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
    const args = ['-p', AGENT_PROMPT, '--dangerously-skip-permissions', '--max-turns', opts['max-turns'], '--output-format', 'json'];
    if (opts.model) args.push('--model', opts.model);
    const agent = run('claude', args, work, AGENT_TIMEOUT_MS);
    writeFileSync(join(fixtureResults, 'agent.json'), agent.stdout || agent.stderr);
    const parsed = extractJson(agent.stdout);
    record.agent = {
      ok: agent.ok,
      timedOut: agent.timedOut,
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
    const check = run('npx', ['demoframe', 'check', config], work, 5 * 60 * 1000);
    const { blocking, briefOnly } = classifyCheck(check.stdout + check.stderr);
    record.gates.check = check.ok || briefOnly;
    record.gates.checkBlocking = blocking;
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
    record.gates.readmeEmbed;

  if (!opts['skip-judge'] && (record.previews?.length ?? 0) > 0) {
    console.log('judging preview stills...');
    const rubric = readFileSync(join(evalDir, 'judge-rubric.md'), 'utf8');
    const judgePrompt =
      `${rubric}\n\nThe repository under review is described by README.md in the working ` +
      `directory. Read these preview stills and grade them:\n` +
      record.previews.map((p) => `- ${p}`).join('\n');
    const args = ['-p', judgePrompt, '--dangerously-skip-permissions', '--max-turns', '15', '--output-format', 'json', '--allowedTools', 'Read'];
    if (opts['judge-model']) args.push('--model', opts['judge-model']);
    const judge = run('claude', args, work, JUDGE_TIMEOUT_MS);
    writeFileSync(join(fixtureResults, 'judge.json'), judge.stdout || judge.stderr);
    const outer = extractJson(judge.stdout);
    record.judge = typeof outer?.result === 'string' ? extractJson(outer.result) : null;
    if (!record.judge) console.log('judge output could not be parsed');
  }

  record.pass = record.mechanicalPass && (opts['skip-judge'] || record.judge?.verdict === 'pass');
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
    `Prompt: ${AGENT_PROMPT}`,
    '',
    '| fixture | install | config | check | artifact | budget | readme | judge | pass |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const mark = (v) => (v === undefined || v === null ? '-' : v ? 'yes' : 'NO');
  for (const r of records) {
    const judge = r.judge ? `${r.judge.overall}/5 (${r.judge.verdict})` : '-';
    lines.push(
      `| ${r.fixture} | ${mark(r.gates.install)} | ${mark(r.gates.configFound)} | ${mark(r.gates.check)} | ` +
        `${mark(r.gates.artifact)} | ${mark(r.gates.budget)} | ${mark(r.gates.readmeEmbed)} | ${judge} | ${r.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  lines.push('');
  for (const r of records) {
    if (r.judge?.notes) lines.push(`- ${r.fixture}: ${r.judge.notes}`);
    if (r.gates.checkBlocking?.length) lines.push(`- ${r.fixture} check blockers: ${r.gates.checkBlocking.join('; ')}`);
    if (r.agent?.costUsd != null) lines.push(`- ${r.fixture} agent: ${r.agent.turns} turns, $${r.agent.costUsd.toFixed(2)}`);
  }
  lines.push('');
  return lines.join('\n');
}

const stamp = new Date().toISOString().replace(/[:]/g, '-').slice(0, 19);
const resultsDir = join(evalDir, 'results', stamp);
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

const fixtures = opts.fixture ? [opts.fixture] : ['cli-tool', 'web-app', 'library'];
const records = [];
for (const f of fixtures) records.push(await evalFixture(f, workRoot, tarball, resultsDir));

writeFileSync(join(resultsDir, 'results.json'), JSON.stringify(records, null, 2) + '\n');
writeFileSync(join(resultsDir, 'scorecard.md'), scorecard(records, stamp));
console.log(`\nresults: ${resultsDir}`);
console.log(records.map((r) => `${r.fixture}: ${r.pass ? 'PASS' : 'FAIL'}`).join(', '));

if (!opts.keep) rmSync(workRoot, { recursive: true, force: true });
else console.log(`work dirs kept at ${workRoot}`);

process.exitCode = records.every((r) => r.pass) ? 0 : 1;
