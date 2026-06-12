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

program
  .command('check')
  .description('validate a demo config (schema, assets, privacy scan) without rendering')
  .argument('<config>', 'path to demo config (.yml, .yaml, or .json)')
  .option('--strict', 'treat warnings as errors (for CI)', false)
  .action(async (config: string, opts: { strict: boolean }) => {
    try {
      const { runCheck } = await import('./commands/check.js');
      const result = await runCheck(config);
      const scenes = result.loaded.config.scenes;
      const total = scenes.reduce((sum, s) => sum + s.duration, 0);
      console.log(
        `ok: ${scenes.length} scene${scenes.length === 1 ? '' : 's'}, ${total.toFixed(1)}s ` +
          `at ${result.loaded.config.output.fps}fps (${result.loaded.config.frame.type} frame)`,
      );
      if (result.warnings.length > 0) {
        console.log(`\n${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}:`);
        for (const w of result.warnings) console.log(`  ! ${w}`);
        if (opts.strict) process.exit(1);
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
  .command('render')
  .description('render frames and encode the final GIF/MP4 with a QA report')
  .argument('<config>', 'path to demo config')
  .option('-o, --out <dir>', 'output directory', 'dist')
  .option('--keep-frames', 'keep the intermediate PNG frames', false)
  .action(async (config: string, opts: { out: string; keepFrames: boolean }) => {
    try {
      const { runRender } = await import('./commands/render.js');
      await runRender(config, opts);
    } catch (err) {
      fail(err);
    }
  });

program
  .command('preview')
  .description('render key stills per scene, plus README-size and dark/light composites')
  .argument('<config>', 'path to demo config')
  .option('-o, --out <dir>', 'output directory', 'dist/preview')
  .action(async (config: string, opts: { out: string }) => {
    try {
      const { runPreview } = await import('./commands/preview.js');
      await runPreview(config, opts);
    } catch (err) {
      fail(err);
    }
  });

program
  .command('init')
  .description('scaffold a starter demo config and assets folder')
  .argument('[dir]', 'target directory', '.')
  .option('-f, --frame <type>', 'frame type: phone, browser, or terminal', 'phone')
  .action(async (dir: string, opts: { frame: string }) => {
    try {
      const { runInit } = await import('./commands/init.js');
      await runInit(dir, opts.frame);
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
