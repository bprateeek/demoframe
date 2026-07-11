import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
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
    hint: 'valid scene types: typing, steps, status-card, screenshot, terminal-playback, code, chat, metric-card, screen, hold',
  },
  { match: /^frame\.type/, hint: 'valid frame types: phone, browser, terminal, desktop, none' },
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
  provenance: ConfigProvenance;
}

export interface ConfigProvenance {
  suppliedPaths: string[];
  sourceHash: string;
}

function childPath(parent: string, key: string | number): string {
  if (typeof key === 'number') return `${parent}[${key}]`;
  return parent ? `${parent}.${key}` : key;
}

export function suppliedDotPaths(value: unknown): string[] {
  const supplied = new Set<string>();

  const walk = (current: unknown, at: string): boolean => {
    if (Array.isArray(current)) {
      let meaningful = false;
      current.forEach((child, index) => {
        if (walk(child, childPath(at, index))) meaningful = true;
      });
      if (meaningful && at) supplied.add(at);
      return meaningful;
    }
    if (current && typeof current === 'object') {
      let meaningful = false;
      for (const [key, child] of Object.entries(current)) {
        if (walk(child, childPath(at, key))) meaningful = true;
      }
      if (meaningful && at) supplied.add(at);
      return meaningful;
    }
    if (current === undefined) return false;
    if (at) supplied.add(at);
    return true;
  };

  walk(value, '');
  return [...supplied].sort();
}

export function wasSupplied(loaded: LoadedConfig, path: string): boolean {
  return loaded.provenance.suppliedPaths.includes(path);
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

  return {
    config: result.data,
    configPath,
    baseDir: path.dirname(configPath),
    provenance: {
      suppliedPaths: suppliedDotPaths(data),
      sourceHash: crypto.createHash('sha256').update(raw).digest('hex'),
    },
  };
}
