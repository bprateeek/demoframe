import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromiumExecutablePath, chromiumInstalled } from './browser.js';
import { resolveGifski } from './gifski.js';

const require = createRequire(import.meta.url);

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
  required: boolean;
}

export function ffmpegPath(): string | null {
  try {
    const p = require('ffmpeg-static') as string | null;
    return p && existsSync(p) ? p : null;
  } catch {
    return null;
  }
}

export function runDoctor(): DoctorCheck[] {
  const checks: DoctorCheck[] = [];

  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  checks.push({
    name: 'node',
    ok: nodeMajor >= 20,
    detail: `v${process.versions.node}${nodeMajor >= 20 ? '' : ' (need >= 20)'}`,
    required: true,
  });

  const chromiumOk = chromiumInstalled();
  checks.push({
    name: 'chromium',
    ok: chromiumOk,
    detail: chromiumOk
      ? chromiumExecutablePath()!
      : 'not installed; run "demoframe install-browser"',
    required: true,
  });

  const ffmpeg = ffmpegPath();
  checks.push({
    name: 'ffmpeg',
    ok: ffmpeg !== null,
    detail: ffmpeg ?? 'ffmpeg-static binary missing; try reinstalling demoframe',
    required: true,
  });

  const gifski = resolveGifski();
  checks.push({
    name: 'gifski',
    ok: gifski !== null,
    detail:
      gifski ??
      'optional; downloaded automatically on first GIF render, or install it yourself (brew install gifski). Falls back to ffmpeg.',
    required: false,
  });

  return checks;
}
