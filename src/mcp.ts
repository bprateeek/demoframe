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
import { listTemplates } from './commands/init.js';
import { ConfigError } from './config/load.js';
import { parsePresetNames } from './config/presets.js';
import {
  buildPreviewCliArgv,
  buildRenderCliArgv,
  collectPreviewFiles,
} from './mcpHelpers.js';
import { briefSummary, INTERVIEW_QUESTIONS } from './qa/brief.js';
import { checkJsonDocument, checkJsonFailure } from './commands/checkJson.js';

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

async function runCli(argv: string[]): Promise<{ code: number; output: string }> {
  return new Promise<{ code: number; output: string }>((resolve) => {
    const child = spawn(process.execPath, argv, {
      env: process.env,
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

function cliPath(): string {
  return fileURLToPath(new URL('./cli.js', import.meta.url));
}

const destinationPresetsInput = z
  .string()
  .optional()
  .describe('destination preset(s), comma-separated: github-readme, x-post, linkedin, or product-hunt');

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
      'Validate a demo config (schema, referenced assets, privacy scan) without rendering. Supports the same destination preset, autonomous, and raw-screenshot policy knobs as the CLI check flow.',
    inputSchema: {
      config: z.string().describe('path to the demo config (.yml, .yaml, or .json)'),
      for: destinationPresetsInput,
      strict: z.boolean().optional().describe('treat warnings as invalid, like demoframe check --strict'),
      autonomous: z.boolean().optional().describe('allow an unconfirmed/inferred brief and report it as a notice'),
      allowRawScreenshots: z
        .boolean()
        .optional()
        .describe('permit a frameless all-screenshot demo by demoting that error to a warning'),
    },
  },
  async (input) => {
    try {
      const result = await runCheck(input.config, {
        allowInferred: input.autonomous,
        allowRawScreenshots: input.allowRawScreenshots,
        forDestinations: parsePresetNames(input.for),
      });
      return json(
        checkJsonDocument(result, {
          strict: input.strict,
          destinations: parsePresetNames(input.for),
        }),
      );
    } catch (err) {
      return jsonFailure(checkJsonFailure(err, input.strict, parsePresetNames(input.for)));
    }
  },
);

server.registerTool(
  'list_templates',
  {
    description:
      'List bundled demoframe gallery templates with categories, supported frames, scene types, and descriptions.',
    inputSchema: {
      category: z.string().optional().describe('optional category filter, e.g. product, agent, mobile'),
    },
  },
  async ({ category }) => {
    const allTemplates = listTemplates();
    const templates = allTemplates.filter((template) => !category || template.category === category);
    return json({
      count: templates.length,
      categories: [...new Set(allTemplates.map((template) => template.category))].sort(),
      templates,
    });
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
      encoderProfile: z.enum(['legacy', 'modern']).optional().describe('encoder profile to use (default "modern")'),
      for: destinationPresetsInput,
      strict: z.boolean().optional().describe('treat check warnings and layout findings as render failures'),
      allowRawScreenshots: z
        .boolean()
        .optional()
        .describe('permit a frameless all-screenshot demo when the raw screenshots are intentional'),
      assetOut: z.string().optional().describe('copy the primary rendered asset to a file or directory'),
    },
  },
  async (input) => {
    try {
      const checked = await runCheck(input.config, {
        allowInferred: input.autonomous,
        allowRawScreenshots: input.allowRawScreenshots,
        forDestinations: parsePresetNames(input.for),
      });
      const summary = briefSummary(checked.loaded.config);
      const briefErrors = checked.errors.filter((finding) => finding.code.startsWith('brief.'));
      const otherErrors = checked.errors.filter((finding) => !finding.code.startsWith('brief.'));
      if (!input.autonomous && checked.briefGate) {
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
      if (input.strict && checked.warnings.length > 0) {
        return jsonFailure({
          status: 'error',
          strict: true,
          errors: [],
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

    const outDir = path.resolve(input.out ?? 'dist');
    const result = await runCli(
      buildRenderCliArgv(cliPath(), input.config, outDir, {
        destinationPresets: input.for,
        strict: input.strict,
        allowRawScreenshots: input.allowRawScreenshots,
        assetOut: input.assetOut,
        autonomous: input.autonomous,
        assumptions: input.assumptions,
        encoderProfile: input.encoderProfile,
      }),
    );
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
  'preview_demo',
  {
    description:
      'Render destination-aware preview stills without encoding final media. Mirrors demoframe preview, including --for destination presets and autonomous assumptions. Returns the written still paths for visual inspection.',
    inputSchema: {
      config: z.string().describe('path to the demo config'),
      out: z.string().optional().describe('preview output directory (default "dist/preview")'),
      for: destinationPresetsInput,
      autonomous: z.boolean().optional().describe('allow an unconfirmed brief and label the preview as inferred'),
      assumptions: z.array(z.string()).optional().describe('assumptions to record for an autonomous/inferred preview'),
      noDownload: z.boolean().optional().describe('fail if Chromium is missing instead of downloading it'),
    },
  },
  async (input) => {
    try {
      const checked = await runCheck(input.config, {
        allowInferred: input.autonomous,
        forDestinations: parsePresetNames(input.for),
      });
      const summary = briefSummary(checked.loaded.config);
      const briefErrors = checked.errors.filter((finding) => finding.code.startsWith('brief.'));
      const otherErrors = checked.errors.filter((finding) => !finding.code.startsWith('brief.'));
      if (!input.autonomous && checked.briefGate) {
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

    const outDir = path.resolve(input.out ?? 'dist/preview');
    const result = await runCli(
      buildPreviewCliArgv(cliPath(), input.config, outDir, {
        destinationPresets: input.for,
        noDownload: input.noDownload,
        autonomous: input.autonomous,
        assumptions: input.assumptions,
      }),
    );
    if (result.code !== 0) {
      return failure(`preview failed (exit ${result.code}):\n${result.output.slice(-2000)}`);
    }
    return json({
      status: 'ok',
      out: outDir,
      files: collectPreviewFiles(outDir),
      output: result.output,
    });
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
