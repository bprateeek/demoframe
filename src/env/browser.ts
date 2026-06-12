import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);

export function chromiumExecutablePath(): string | null {
  try {
    return chromium.executablePath();
  } catch {
    return null;
  }
}

export function chromiumInstalled(): boolean {
  const exe = chromiumExecutablePath();
  return exe !== null && existsSync(exe);
}

export function playwrightCliPath(): string {
  try {
    return require.resolve('playwright-core/cli.js');
  } catch {
    return path.join(path.dirname(require.resolve('playwright-core')), 'cli.js');
  }
}

export const BROWSER_HINT =
  'Chromium is not installed yet. Run "demoframe install-browser" (one-time, ~150MB download).';
