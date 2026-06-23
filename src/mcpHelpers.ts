import { readdirSync } from 'node:fs';
import path from 'node:path';

export interface RenderCliOptions {
  destinationPresets?: string;
  strict?: boolean;
  allowRawScreenshots?: boolean;
  assetOut?: string;
  autonomous?: boolean;
  assumptions?: string[];
  encoderProfile?: string;
}

export interface PreviewCliOptions {
  destinationPresets?: string;
  noDownload?: boolean;
  autonomous?: boolean;
  assumptions?: string[];
}

function appendAutonomousFlags(argv: string[], opts: { autonomous?: boolean; assumptions?: string[] }): void {
  if (opts.autonomous) argv.push('--autonomous');
  for (const assumption of opts.assumptions ?? []) argv.push('--assumption', assumption);
}

export function buildRenderCliArgv(
  cli: string,
  config: string,
  outDir: string,
  opts: RenderCliOptions = {},
): string[] {
  const argv = [cli, 'render', config, '-o', outDir];
  if (opts.destinationPresets) argv.push('--for', opts.destinationPresets);
  if (opts.strict) argv.push('--strict');
  if (opts.allowRawScreenshots) argv.push('--allow-raw-screenshots');
  if (opts.assetOut) argv.push('--asset-out', opts.assetOut);
  if (opts.encoderProfile) argv.push('--encoder-profile', opts.encoderProfile);
  appendAutonomousFlags(argv, opts);
  return argv;
}

export function buildPreviewCliArgv(
  cli: string,
  config: string,
  outDir: string,
  opts: PreviewCliOptions = {},
): string[] {
  const argv = [cli, 'preview', config, '-o', outDir];
  if (opts.destinationPresets) argv.push('--for', opts.destinationPresets);
  if (opts.noDownload) argv.push('--no-download');
  appendAutonomousFlags(argv, opts);
  return argv;
}

export function collectPreviewFiles(outDir: string): string[] {
  return readdirSync(outDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(outDir, entry.name))
    .sort();
}
