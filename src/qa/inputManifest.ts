import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import type { LoadedConfig } from '../config/load.js';
import type { DemoConfig } from '../config/schema.js';
import type { EncoderProfile } from '../encode/profiles.js';
import { chromiumExecutablePath } from '../env/browser.js';
import { ffmpegPath } from '../env/doctor.js';
import { GIFSKI_VERSION, resolveGifski } from '../env/gifski.js';
import { createRenderContext } from '../render/context.js';
import type { ValidatedContextManifest } from '../context/load.js';
import { resolveShotGraph } from '../render/shotGraph.js';

const require = createRequire(import.meta.url);

export interface InputHashEntry {
  source: string;
  kind?: string;
  file: string;
  hash: string;
}

export interface InputManifest {
  schemaVersion: 1;
  sourceConfigHash: string;
  normalizedConfigHashes: Array<{ preset?: string; hash: string }>;
  contextManifestHash: string | null;
  assetHashes: InputHashEntry[];
  fontHashes: InputHashEntry[];
  packageVersion: string;
  chromiumRevision: string;
  encoderVersions: {
    ffmpeg: string | null;
    gifski: string;
    sharp: string;
    libwebp: string | null;
  };
  outputAffectingSettings: {
    encoderProfile: EncoderProfile;
    targets: Array<{
      preset?: string;
      output: DemoConfig['output'];
      frame: DemoConfig['frame'];
      theme: DemoConfig['theme'];
      cinematic?: DemoConfig['cinematic'];
      profile?: DemoConfig['profile'];
      authoringSource: 'legacy' | 'shots' | 'recipe';
      shotGraphHash: string;
    }>;
  };
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hash(value: string | Buffer): string {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function fileHash(file: string): string {
  return hash(readFileSync(file));
}

function executableVersion(file: string | null, args: string[]): string | null {
  if (!file) return null;
  const result = spawnSync(file, args, { encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  return `${result.stdout || result.stderr}`.trim().split(/\r?\n/)[0] || null;
}

function chromiumRevision(): string {
  try {
    const packageRoot = path.dirname(require.resolve('playwright-core/package.json'));
    const browsers = JSON.parse(readFileSync(path.join(packageRoot, 'browsers.json'), 'utf8'));
    const chromium = browsers.browsers?.find((entry: { name?: string }) => entry.name === 'chromium');
    if (chromium?.revision) return String(chromium.revision);
  } catch {
    // Fall through to the executable-path build id.
  }
  const executable = chromiumExecutablePath() ?? '';
  return executable.match(/chromium-(\d+)/)?.[1] ?? 'unknown';
}

function bundledFontFiles(): Array<{ source: string; file: string }> {
  const specs = [
    ['builtin.inter.400', '@fontsource/inter', 'inter-latin-400-normal.woff2'],
    ['builtin.inter.500', '@fontsource/inter', 'inter-latin-500-normal.woff2'],
    ['builtin.inter.600', '@fontsource/inter', 'inter-latin-600-normal.woff2'],
    ['builtin.inter.700', '@fontsource/inter', 'inter-latin-700-normal.woff2'],
    ['builtin.jetbrains-mono.400', '@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2'],
    ['builtin.jetbrains-mono.700', '@fontsource/jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff2'],
  ] as const;
  return specs.map(([source, pkg, file]) => ({
    source,
    file: path.join(path.dirname(require.resolve(`${pkg}/package.json`)), 'files', file),
  }));
}

export function createInputManifest(
  loaded: LoadedConfig,
  targets: Array<{ preset?: string; config: DemoConfig }>,
  encoderProfile: EncoderProfile,
  context?: ValidatedContextManifest,
): InputManifest {
  const registry = createRenderContext(loaded.config, loaded.baseDir, loaded.configPath).assets;
  const registered = registry.entries();
  const assetHashes = registered.map((entry) => ({
    source: entry.source,
    kind: entry.kind,
    file: path.relative(loaded.baseDir, entry.file),
    hash: fileHash(entry.file),
  }));
  const customFonts = registered
    .filter((entry) => entry.kind === 'font')
    .map((entry) => ({ source: entry.source, kind: 'font', file: path.relative(loaded.baseDir, entry.file), hash: fileHash(entry.file) }));
  const fontHashes = [
    ...bundledFontFiles().map((entry) => ({ source: entry.source, kind: 'font', file: entry.source, hash: fileHash(entry.file) })),
    ...customFonts,
  ];
  const packageVersion = (require('../../package.json') as { version: string }).version;
  const gifski = resolveGifski();
  return {
    schemaVersion: 1,
    sourceConfigHash: `sha256:${loaded.provenance.sourceHash}`,
    normalizedConfigHashes: targets.map((target) => ({
      ...(target.preset ? { preset: target.preset } : {}),
      hash: hash(stableStringify(target.config)),
    })),
    contextManifestHash: context?.hash || null,
    assetHashes,
    fontHashes,
    packageVersion,
    chromiumRevision: chromiumRevision(),
    encoderVersions: {
      ffmpeg: executableVersion(ffmpegPath(), ['-version']),
      gifski: executableVersion(gifski, ['--version']) ?? `gifski ${GIFSKI_VERSION} (pinned; unavailable)`,
      sharp: sharp.versions.sharp,
      libwebp: sharp.versions.webp ?? null,
    },
    outputAffectingSettings: {
      encoderProfile,
      targets: targets.map((target) => ({
        authoringSource: resolveShotGraph(target.config).source,
        shotGraphHash: resolveShotGraph(target.config).hash,
        ...(target.preset ? { preset: target.preset } : {}),
        output: target.config.output,
        frame: target.config.frame,
        theme: target.config.theme,
        ...(target.config.cinematic ? { cinematic: target.config.cinematic } : {}),
        ...(target.config.profile ? { profile: target.config.profile } : {}),
      })),
    },
  };
}
