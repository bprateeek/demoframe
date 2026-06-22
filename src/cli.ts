#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { ConfigError } from './config/load.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const program = new Command();

program
  .name('demoframe')
  .description('Template-driven demo GIF/MP4 generator for READMEs and launch posts')
  .version(version);

function fail(err: unknown): never {
  if (err instanceof ConfigError) {
    console.error(`error: ${err.message}`);
    for (const issue of err.issues) console.error(`  - ${issue}`);
  } else {
    console.error(`error: ${(err as Error).message}`);
  }
  process.exit(1);
}

function collectAssumption(value: string, previous: string[]): string[] {
  return [...previous, value];
}

program
  .command('check')
  .description('validate a demo config (schema, assets, privacy scan) without rendering')
  .argument('<config>', 'path to demo config (.yml, .yaml, or .json)')
  .option('--strict', 'treat warnings as errors (for CI)', false)
  .option('--autonomous', 'allow an unconfirmed/inferred brief and report it as a notice', false)
  .option(
    '--allow-raw-screenshots',
    'permit a frameless all-screenshot demo (bug report, before/after); demotes that error to a warning',
    false,
  )
  .action(async (config: string, opts: { strict: boolean; autonomous: boolean; allowRawScreenshots: boolean }) => {
    try {
      const { runCheck } = await import('./commands/check.js');
      const result = await runCheck(config, {
        allowRawScreenshots: opts.allowRawScreenshots,
        allowInferred: opts.autonomous,
      });
      const scenes = result.loaded.config.scenes;
      const total = scenes.reduce((sum, s) => sum + s.duration, 0);
      console.log(
        `${result.errors.length > 0 ? 'fail' : 'ok'}: ${scenes.length} scene${scenes.length === 1 ? '' : 's'}, ${total.toFixed(1)}s ` +
          `at ${result.loaded.config.output.fps}fps (${result.loaded.config.frame.type} frame)`,
      );
      if (result.errors.length > 0) {
        console.log(`\n${result.errors.length} error${result.errors.length === 1 ? '' : 's'}:`);
        for (const e of result.errors) console.log(`  x ${e.message}`);
      }
      if (result.warnings.length > 0) {
        console.log(`\n${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}:`);
        for (const w of result.warnings) console.log(`  ! ${w.message}`);
      }
      if (result.notices.length > 0) {
        console.log(`\n${result.notices.length} notice${result.notices.length === 1 ? '' : 's'}:`);
        for (const n of result.notices) console.log(`  i ${n.message}`);
      }
      if (result.errors.length > 0 || (opts.strict && result.warnings.length > 0)) {
        process.exit(1);
      }
    } catch (err) {
      fail(err);
    }
  });

program
  .command('doctor')
  .description('report the rendering environment (chromium, ffmpeg, gifski)')
  .action(async () => {
    const { runDoctor } = await import('./env/doctor.js');
    const checks = runDoctor();
    for (const c of checks) {
      const mark = c.ok ? 'ok ' : c.required ? 'MISSING' : 'opt';
      console.log(`  [${mark}] ${c.name}: ${c.detail}`);
    }
    if (checks.some((c) => c.required && !c.ok)) process.exit(1);
  });

program
  .command('install-browser')
  .description('download the pinned Chromium build used for rendering (one-time)')
  .action(async () => {
    try {
      const { installBrowser } = await import('./env/install.js');
      await installBrowser();
    } catch (err) {
      fail(err);
    }
  });

program
  .command('schema')
  .description('print the JSON Schema for demo configs (for agents and editors)')
  .action(async () => {
    const { readFileSync } = await import('node:fs');
    const schemaFile = new URL('../schema/demoframe.schema.json', import.meta.url);
    process.stdout.write(readFileSync(schemaFile, 'utf8'));
  });

program
  .command('render')
  .description('render frames and encode the final GIF/MP4 with a QA report')
  .argument('<config>', 'path to demo config')
  .option('-o, --out <dir>', 'output directory', 'dist')
  .option('--keep-frames', 'keep the intermediate PNG frames', false)
  .option('--no-download', 'fail if Chromium or gifski is missing instead of downloading it')
  .option('--no-stills', 'skip writing per-scene preview stills next to the output')
  .option(
    '--allow-raw-screenshots',
    'permit a frameless all-screenshot demo (bug report, before/after) instead of aborting',
    false,
  )
  .option(
    '--for <destination>',
    'destination preset(s), comma-separated: github-readme, x-post, linkedin, or product-hunt',
  )
  .option('--asset-out <path>', 'copy the primary rendered asset to a file or directory')
  .option('--strict', 'treat check warnings and layout findings as render failures', false)
  .option('--encoder-profile <profile>', 'encoder profile: legacy or modern', 'legacy')
  .option('--autonomous', 'allow an unconfirmed brief and label the report as inferred', false)
  .option('--assumption <text>', 'record an assumption for an autonomous/inferred render', collectAssumption, [] as string[])
  .action(async (config: string, opts: { out: string; keepFrames: boolean; download: boolean; stills: boolean; for?: string; assetOut?: string; strict: boolean; encoderProfile: string; allowRawScreenshots: boolean; autonomous: boolean; assumption: string[] }) => {
    try {
      const { runRender } = await import('./commands/render.js');
      await runRender(config, { ...opts, assumptions: opts.assumption });
    } catch (err) {
      fail(err);
    }
  });

program
  .command('preview')
  .description('render key stills per scene, plus README-size and dark/light composites')
  .argument('<config>', 'path to demo config')
  .option('-o, --out <dir>', 'output directory', 'dist/preview')
  .option('--no-download', 'fail if Chromium is missing instead of downloading it')
  .option('--autonomous', 'allow an unconfirmed brief and label the preview run as inferred', false)
  .option('--assumption <text>', 'record an assumption for an autonomous/inferred preview', collectAssumption, [] as string[])
  .action(async (config: string, opts: { out: string; download: boolean; autonomous: boolean; assumption: string[] }) => {
    try {
      const { runPreview } = await import('./commands/preview.js');
      await runPreview(config, { ...opts, assumptions: opts.assumption });
    } catch (err) {
      fail(err);
    }
  });

program
  .command('init')
  .description('scaffold a demo config from a gallery template')
  .argument('[dir]', 'target directory', '.')
  .option('-f, --frame <type>', 'starter frame type: phone, browser, or terminal')
  .option('-t, --template <name>', 'gallery template name (see --list)')
  .option('-c, --category <name>', 'category default template name (see --list)')
  .option('--list', 'list available gallery templates')
  .option('--no-agent-instructions', 'skip writing demoframe guidance into the nearest AGENTS.md')
  .action(async (dir: string, opts: { frame?: string; template?: string; category?: string; list?: boolean; agentInstructions: boolean }) => {
    try {
      const { runInit } = await import('./commands/init.js');
      await runInit(dir, opts);
    } catch (err) {
      fail(err);
    }
  });

program
  .command('install-agent-instructions')
  .description('write the demoframe agent guidance block into the nearest git-root AGENTS.md')
  .argument('[dir]', 'target directory', '.')
  .action(async (dir: string) => {
    try {
      const { installAgentInstructions } = await import('./commands/install-agent-instructions.js');
      const result = installAgentInstructions(dir);
      console.log(`${result.action} ${result.file}`);
    } catch (err) {
      fail(err);
    }
  });

program
  .command('serve')
  .description('preview the demo live in a browser with a time scrubber and hot reload')
  .argument('<config>', 'path to demo config')
  .option('-p, --port <port>', 'port to listen on', '4848')
  .action(async (config: string, opts: { port: string }) => {
    try {
      const { runServe } = await import('./commands/serve.js');
      await runServe(config, parseInt(opts.port, 10));
    } catch (err) {
      fail(err);
    }
  });

program.parseAsync().catch(fail);
