import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ZodError } from 'zod';
import { demoConfigSchema, type DemoConfig } from './schema.js';

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly issues: string[] = [],
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

const HINTS: Array<{ match: RegExp; hint: string }> = [
  {
    match: /scenes\[\d+\]\.type/,
    hint: 'valid scene types: typing, steps, status-card, screenshot, hold',
  },
  { match: /^frame\.type/, hint: 'valid frame types: phone, browser, terminal' },
  { match: /duration/, hint: 'durations are seconds per scene, e.g. duration: 3.8' },
  { match: /accent|background/, hint: 'colors are hex strings, e.g. "#e2603a"' },
  { match: /budget/, hint: 'budget accepts "5MB", "800KB", or a byte count' },
];

function formatIssue(issue: ZodError['issues'][number]): string {
  const where = issue.path.length
    ? issue.path.map((p, i) => (typeof p === 'number' ? `[${p}]` : i === 0 ? `${p}` : `.${p}`)).join('')
    : '(root)';
  let line = `${where}: ${issue.message}`;
  const hint = HINTS.find((h) => h.match.test(where))?.hint;
  if (hint) line += `\n    hint: ${hint}`;
  return line;
}

export interface LoadedConfig {
  config: DemoConfig;
  configPath: string;
  baseDir: string;
}

export function loadConfig(file: string): LoadedConfig {
  const configPath = path.resolve(file);
  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch {
    throw new ConfigError(`cannot read config file: ${configPath}`);
  }

  let data: unknown;
  try {
    data = configPath.endsWith('.json') ? JSON.parse(raw) : parseYaml(raw);
  } catch (err) {
    throw new ConfigError(
      `failed to parse ${path.basename(configPath)}: ${(err as Error).message}`,
    );
  }

  const result = demoConfigSchema.safeParse(data);
  if (!result.success) {
    throw new ConfigError(
      `invalid config: ${path.basename(configPath)}`,
      result.error.issues.map(formatIssue),
    );
  }

  return { config: result.data, configPath, baseDir: path.dirname(configPath) };
}
