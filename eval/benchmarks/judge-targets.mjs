#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const benchmarksDir = path.dirname(fileURLToPath(import.meta.url));
const evalDir = path.resolve(benchmarksDir, '..');
const repoRoot = path.resolve(evalDir, '..');
const rubric = readFileSync(path.join(evalDir, 'judge-rubric.md'), 'utf8');
const scoreFile = path.join(benchmarksDir, 'target-scores.json');
const model = process.env.DEMOFRAME_JUDGE_MODEL || 'claude-opus-4-8';
const names = ['readme-loop-cli', 'social-film-dashboard', 'product-tour-ui'];

function extractJson(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  for (let end = text.length; end > start; end -= 1) {
    try {
      return JSON.parse(text.slice(start, end));
    } catch {
      // Keep trimming transport prose until the JSON object parses.
    }
  }
  return null;
}

function judgePrompt(benchmark) {
  const dir = path.join(benchmarksDir, benchmark.id);
  const target = path.join(dir, benchmark.target);
  const targetStrip = path.join(benchmarksDir, 'artifacts', benchmark.id, 'contact-target.png');
  const pairwiseStrip = path.join(benchmarksDir, 'artifacts', benchmark.id, 'contact-pairwise.png');
  const missing = [target, targetStrip, pairwiseStrip].filter((file) => !existsSync(file));
  if (missing.length > 0) {
    throw new Error(`missing benchmark artifacts: ${missing.join(', ')}; run render-contact-strips.mjs first`);
  }
  return `${rubric}

Grade the ${benchmark.profile} target for ${benchmark.subject}. The HTML is the
deterministic timed approval artifact: read its ANIMATIC timeline, shot source,
and motion logic to assess duration, pacing, camera purpose, continuity, and
loop/outro behavior. Use both PNG strips for visual entry/peak/exit and
baseline-to-target evidence.

- timed target: ${target}
- target entry/peak/exit strip: ${targetStrip}
- baseline-to-target peak strip: ${pairwiseStrip}
- benchmark manifest: ${path.join(dir, 'benchmark.json')}

Do not reward the target merely for improving on the baseline. Apply the stated
4/5 P0 gate independently.`;
}

function runJudge(benchmark) {
  const prompt = judgePrompt(benchmark);
  let last = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = spawnSync(
      'claude',
      [
        '-p',
        prompt,
        '--dangerously-skip-permissions',
        '--max-turns',
        '15',
        '--output-format',
        'json',
        '--allowedTools',
        'Read',
        '--model',
        model,
      ],
      { cwd: repoRoot, encoding: 'utf8', timeout: 5 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 },
    );
    const outer = extractJson(result.stdout || result.stderr || '');
    const judged = typeof outer?.result === 'string' ? extractJson(outer.result) : null;
    last = {
      attempt,
      exitCode: result.status,
      timedOut: result.error?.code === 'ETIMEDOUT',
      judge: judged,
      transportError: result.status === 0 ? null : (result.stderr || result.stdout || '').slice(-1200),
    };
    if (judged?.schemaVersion === 2 && typeof judged?.overall === 'number') return last;
  }
  return last;
}

function main() {
  const scorecard = JSON.parse(readFileSync(scoreFile, 'utf8'));
  let needsHumanReview = false;
  for (const name of names) {
    const benchmark = JSON.parse(readFileSync(path.join(benchmarksDir, name, 'benchmark.json'), 'utf8'));
    console.log(`judging ${name} with ${model}`);
    const result = runJudge(benchmark);
    const record = scorecard.benchmarks.find((item) => item.id === name);
    record.judgeModel = model;
    record.judge = result?.judge ?? null;
    record.attempts = result?.attempt ?? 0;
    record.transportError = result?.transportError ?? null;
    record.needsHumanReview = !result?.judge;
    if (!result?.judge) needsHumanReview = true;
  }
  scorecard.status = needsHumanReview
    ? 'needs-human-review'
    : scorecard.benchmarks.every((item) => item.judge?.p0ApprovalEligible)
      ? 'judge-passed-user-approval-pending'
      : 'judge-failed-revision-required';
  scorecard.generatedBy = { script: 'eval/benchmarks/judge-targets.mjs', model };
  writeFileSync(scoreFile, `${JSON.stringify(scorecard, null, 2)}\n`);
  if (needsHumanReview || scorecard.status === 'judge-failed-revision-required') process.exitCode = 1;
}

main();
