import crypto from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { LoadedConfig } from '../config/load.js';
import { scanForPrivateData } from '../config/privacy.js';
import { contextManifestSchema, type ContextEntry, type ContextManifest, type ContextSource } from './schema.js';

export interface ContextFinding {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidatedContextManifest {
  file: string;
  repoRoot: string;
  hash: string;
  manifest?: ContextManifest;
  entries: Map<string, ContextEntry>;
  errors: ContextFinding[];
  warnings: ContextFinding[];
}

function finding(code: string, message: string, details?: Record<string, unknown>): ContextFinding {
  return details ? { code, message, details } : { code, message };
}

export function sha256Digest(value: string | Buffer): string {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

export function findRepoRoot(start: string): string {
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(start);
    current = parent;
  }
}

function insideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function pointerValue(value: unknown, pointer: string): unknown {
  return pointer
    .slice(1)
    .split('/')
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>((current, token) => {
      if (Array.isArray(current)) return current[Number(token)];
      if (current && typeof current === 'object') return (current as Record<string, unknown>)[token];
      return undefined;
    }, value);
}

export function selectedSourceContent(file: string, source: ContextSource): string {
  const raw = readFileSync(file, 'utf8');
  if ('lines' in source.selector) {
    const [start, end] = source.selector.lines;
    const lines = raw.split(/\r?\n/);
    if (end < start) throw new Error(`line range ${start}-${end} is reversed`);
    if (end > lines.length) throw new Error(`line range ${start}-${end} exceeds ${lines.length} lines`);
    return lines.slice(start - 1, end).join('\n');
  }
  const parsed = file.endsWith('.json') ? JSON.parse(raw) : parseYaml(raw);
  const selected = pointerValue(parsed, source.selector.jsonPointer);
  if (selected === undefined) throw new Error(`jsonPointer ${source.selector.jsonPointer} did not resolve`);
  return typeof selected === 'string' ? selected : JSON.stringify(selected);
}

function validateSource(
  entry: ContextEntry,
  source: ContextSource,
  repoRoot: string,
  errors: ContextFinding[],
): void {
  const declared = path.resolve(repoRoot, source.path);
  if (!insideRoot(repoRoot, declared)) {
    errors.push(finding('context.pathTraversal', `${entry.id}: source path escapes the repository root`, { id: entry.id, path: source.path }));
    return;
  }
  if (!existsSync(declared)) {
    errors.push(finding('context.sourceMissing', `${entry.id}: source file does not exist: ${source.path}`, { id: entry.id, path: source.path }));
    return;
  }
  const real = realpathSync(declared);
  if (!insideRoot(realpathSync(repoRoot), real)) {
    errors.push(finding('context.pathTraversal', `${entry.id}: source symlink escapes the repository root`, { id: entry.id, path: source.path }));
    return;
  }
  try {
    const selected = selectedSourceContent(real, source);
    const actual = sha256Digest(selected);
    if (actual !== source.digest) {
      errors.push(
        finding('context.staleDigest', `${entry.id}: selected source content has changed; refresh its digest`, {
          id: entry.id,
          path: source.path,
          expected: source.digest,
          actual,
        }),
      );
    }
    const normalized = selected.normalize('NFKC').toLocaleLowerCase('en-US');
    const needles: string[] = [];
    switch (entry.kind) {
      case 'metric':
        needles.push(String(entry.value));
        break;
      case 'claim':
      case 'copy':
      case 'vocab':
      case 'metaphor':
        needles.push(entry.text);
        break;
      case 'command':
        needles.push(entry.command);
        if (entry.result) needles.push(entry.result);
        break;
      case 'route':
        needles.push(entry.path, entry.label);
        break;
      case 'asset':
        break;
    }
    const missing = needles.filter(
      (needle) => !normalized.includes(needle.normalize('NFKC').toLocaleLowerCase('en-US')),
    );
    if (missing.length > 0) {
      errors.push(
        finding('context.sourceMismatch', `${entry.id}: typed value is not present in the selected source content`, {
          id: entry.id,
          path: source.path,
          missing,
        }),
      );
    }
  } catch (error) {
    errors.push(finding('context.selector', `${entry.id}: ${(error as Error).message}`, { id: entry.id, path: source.path }));
  }
}

export function validateContextManifest(loaded: LoadedConfig): ValidatedContextManifest | undefined {
  if (!loaded.config.context) return undefined;
  const repoRoot = findRepoRoot(loaded.baseDir);
  const file = path.resolve(loaded.baseDir, loaded.config.context.manifest);
  const result: ValidatedContextManifest = {
    file,
    repoRoot,
    hash: '',
    entries: new Map(),
    errors: [],
    warnings: [],
  };
  if (!insideRoot(repoRoot, file)) {
    result.errors.push(finding('context.pathTraversal', 'context manifest path escapes the repository root', { file }));
    return result;
  }
  if (!existsSync(file)) {
    result.errors.push(finding('context.missing', `context manifest not found: ${file}`, { file }));
    return result;
  }
  const raw = readFileSync(file, 'utf8');
  result.hash = sha256Digest(raw);
  let data: unknown;
  try {
    data = file.endsWith('.json') ? JSON.parse(raw) : parseYaml(raw);
  } catch (error) {
    result.errors.push(finding('context.parse', `failed to parse ${path.basename(file)}: ${(error as Error).message}`));
    return result;
  }
  const parsed = contextManifestSchema.safeParse(data);
  if (!parsed.success) {
    result.errors.push(
      finding('context.invalid', `invalid context manifest: ${path.basename(file)}`, {
        issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      }),
    );
    return result;
  }
  result.manifest = parsed.data;
  for (const entry of parsed.data.entries) {
    result.entries.set(entry.id, entry);
    for (const privacy of scanForPrivateData(entry, `entries.${entry.id}`)) {
      if (privacy.kind === 'URL') continue;
      result.errors.push(
        finding('context.secret', `${privacy.path}: contains what looks like a ${privacy.kind}`, {
          id: entry.id,
          kind: privacy.kind,
        }),
      );
    }
    if (entry.source) validateSource(entry, entry.source, repoRoot, result.errors);
    if (entry.kind === 'asset') {
      const declared = path.resolve(repoRoot, entry.path);
      if (!insideRoot(repoRoot, declared)) {
        result.errors.push(finding('context.pathTraversal', `${entry.id}: asset path escapes the repository root`, { id: entry.id, path: entry.path }));
      } else if (!existsSync(declared)) {
        result.errors.push(finding('context.assetMissing', `${entry.id}: asset file does not exist: ${entry.path}`, { id: entry.id, path: entry.path }));
      } else if (!insideRoot(realpathSync(repoRoot), realpathSync(declared))) {
        result.errors.push(finding('context.pathTraversal', `${entry.id}: asset symlink escapes the repository root`, { id: entry.id, path: entry.path }));
      }
    }
  }
  return result;
}
