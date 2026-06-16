#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runCheck } from './commands/check.js';
import { ConfigError } from './config/load.js';
import { briefSummary, INTERVIEW_QUESTIONS } from './qa/brief.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const server = new McpServer({ name: 'demoframe', version });

function json(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

function failure(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

function jsonFailure(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }], isError: true };
}

server.registerTool(
  'get_schema',
  {
    description:
      'Return the JSON Schema for demoframe demo configs. The schema is pre-1.0 and changes between versions; always read it instead of relying on memorized field names.',
    inputSchema: {},
  },
  async () => {
    const file = fileURLToPath(new URL('../schema/demoframe.schema.json', import.meta.url));
    return { content: [{ type: 'text' as const, text: readFileSync(file, 'utf8') }] };
  },
);

server.registerTool(
  'validate_config',
  {
    description:
      'Validate a demo config (schema, referenced assets, privacy scan) without rendering. Returns structured errors (which block rendering, e.g. a frameless all-screenshot "pasted screenshots" demo) plus warnings to fix before rendering.',
    inputSchema: { config: z.string().describe('path to the demo config (.yml, .yaml, or .json)') },
  },
  async ({ config }) => {
    try {
      const { loaded, errors, warnings, notices } = await runCheck(config);
      const scenes = loaded.config.scenes;
      const summary = briefSummary(loaded.config);
      return json({
        valid: errors.length === 0,
        scenes: scenes.length,
        totalDurationS: scenes.reduce((sum, s) => sum + s.duration, 0),
        frame: loaded.config.frame.type,
        briefMode: summary.mode,
        confirmed: summary.confirmed,
        errors,
        warnings,
        notices,
      });
    } catch (err) {
      if (err instanceof ConfigError) {
        return json({ valid: false, message: err.message, errors: err.issues });
      }
      return failure((err as Error).message);
    }
  },
);

server.registerTool(
  'render_demo',
  {
    description:
      'Render a demo config to its configured outputs (gif/webp/mp4) plus preview stills and report.json. Validates first and refuses to render a frameless all-screenshot "pasted screenshots" demo: reconstruct the flow as synthetic scenes (typing/steps/status-card/chat/screen) and use screenshots only as reference. Downloads Chromium and gifski automatically on first use. Returns report.json with measured size, duration, loop and budget facts, layout findings, plus preview still paths for visual inspection.',
    inputSchema: {
      config: z.string().describe('path to the demo config'),
      out: z.string().optional().describe('output directory (default "dist")'),
      autonomous: z.boolean().optional().describe('allow an unconfirmed brief and label the render as inferred'),
      assumptions: z.array(z.string()).optional().describe('assumptions to record for an autonomous/inferred render'),
    },
  },
  async ({ config, out, autonomous, assumptions }) => {
    try {
      const checked = await runCheck(config, { allowInferred: autonomous });
      const summary = briefSummary(checked.loaded.config);
      const briefErrors = checked.errors.filter((finding) => finding.code.startsWith('brief.'));
      const otherErrors = checked.errors.filter((finding) => !finding.code.startsWith('brief.'));
      if (!autonomous && checked.briefGate) {
        return json({
          status: 'needs_input',
          questions: INTERVIEW_QUESTIONS,
          missingBriefFields: {
            required: summary.missingRequired,
            recommended: summary.missingRecommended,
          },
          brief: summary,
          otherErrors,
        });
      }
      if (otherErrors.length > 0 || briefErrors.length > 0) {
        return jsonFailure({
          status: 'error',
          errors: [...otherErrors, ...briefErrors],
          warnings: checked.warnings,
          notices: checked.notices,
        });
      }
    } catch (err) {
      if (err instanceof ConfigError) {
        return json({ valid: false, message: err.message, errors: err.issues });
      }
      return failure((err as Error).message);
    }

    const outDir = path.resolve(out ?? 'dist');
    const cli = fileURLToPath(new URL('./cli.js', import.meta.url));
    const argv = [cli, 'render', config, '-o', outDir];
    if (autonomous) argv.push('--autonomous');
    for (const assumption of assumptions ?? []) argv.push('--assumption', assumption);
    const result = await new Promise<{ code: number; output: string }>((resolve) => {
      const child = spawn(process.execPath, argv, {
        env: process.env,
      });
      let output = '';
      child.stdout.on('data', (d) => (output += d));
      child.stderr.on('data', (d) => (output += d));
      child.on('close', (code) => resolve({ code: code ?? 1, output }));
    });
    if (result.code !== 0) {
      return failure(`render failed (exit ${result.code}):\n${result.output.slice(-2000)}`);
    }
    const reportFile = path.join(outDir, 'report.json');
    if (!existsSync(reportFile)) {
      return failure(`render exited 0 but ${reportFile} is missing:\n${result.output.slice(-2000)}`);
    }
    return { content: [{ type: 'text' as const, text: readFileSync(reportFile, 'utf8') }] };
  },
);

server.registerTool(
  'get_report',
  {
    description:
      'Read report.json from a previous render. Verify withinBudget, loopsForever, durationS, and dimensions for every output.',
    inputSchema: {
      out: z.string().optional().describe('output directory the demo was rendered into (default "dist")'),
    },
  },
  async ({ out }) => {
    const reportFile = path.join(path.resolve(out ?? 'dist'), 'report.json');
    if (!existsSync(reportFile)) return failure(`no report at ${reportFile}; render first`);
    return { content: [{ type: 'text' as const, text: readFileSync(reportFile, 'utf8') }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
