import { spawnSync } from 'node:child_process';
import { chmodSync, createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import os from 'node:os';
import path from 'node:path';

export const GIFSKI_VERSION = '1.34.0';
// DEMOFRAME_GIFSKI_URL lets locked-down CI point at a mirror; the pinned
// checksum is enforced either way.
const GIFSKI_URL =
  process.env.DEMOFRAME_GIFSKI_URL ??
  `https://github.com/ImageOptim/gifski/releases/download/${GIFSKI_VERSION}/gifski-${GIFSKI_VERSION}.tar.xz`;
const GIFSKI_SHA256 = 'b9b6591aa163123d737353d9c8581efdf3234d28eeaa45329b31da905cd5a996';

export function demoframeCacheDir(): string {
  if (process.env.DEMOFRAME_CACHE_DIR) return process.env.DEMOFRAME_CACHE_DIR;
  const home = os.homedir();
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Caches', 'demoframe');
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'), 'demoframe');
  }
  return path.join(process.env.XDG_CACHE_HOME ?? path.join(home, '.cache'), 'demoframe');
}

function cachedBinaryPath(): string {
  const exe = process.platform === 'win32' ? 'gifski.exe' : 'gifski';
  return path.join(demoframeCacheDir(), `gifski-${GIFSKI_VERSION}`, exe);
}

function runs(bin: string): boolean {
  const probe = spawnSync(bin, ['--version'], { encoding: 'utf8' });
  return !probe.error && probe.status === 0;
}

function gifskiOnPath(): string | null {
  if (!runs('gifski')) return null;
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['gifski'], {
    encoding: 'utf8',
  });
  return which.stdout?.trim().split('\n')[0] || 'gifski';
}

export function resolveGifski(): string | null {
  const onPath = gifskiOnPath();
  if (onPath) return onPath;
  const cached = cachedBinaryPath();
  return existsSync(cached) && runs(cached) ? cached : null;
}

async function sha256(file: string): Promise<string> {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

export async function installGifskiFromArchive(archive: string, work: string): Promise<string> {
  const member =
    process.platform === 'darwin'
      ? 'mac/gifski'
      : process.platform === 'win32'
        ? 'win/gifski.exe'
        : 'linux/gifski';
  const digest = await sha256(archive);
  if (digest !== GIFSKI_SHA256) throw new Error(`checksum mismatch (got ${digest})`);
  const tar = spawnSync('tar', ['-xJf', archive, '-C', work, member], { encoding: 'utf8' });
  if (tar.error || tar.status !== 0) {
    throw new Error(`tar extract failed: ${tar.stderr?.trim() || tar.error?.message}`);
  }
  const extracted = path.join(work, member);
  if (process.platform !== 'win32') chmodSync(extracted, 0o755);
  if (!runs(extracted)) throw new Error('downloaded binary failed to run on this platform');
  const target = cachedBinaryPath();
  renameSync(extracted, target);
  return target;
}

export async function ensureGifski(download: boolean): Promise<string | null> {
  const existing = resolveGifski();
  if (existing || !download) return existing;

  const work = path.join(path.dirname(cachedBinaryPath()), 'tmp');
  try {
    console.log(`gifski not found; downloading pinned build ${GIFSKI_VERSION} for best GIF quality...`);
    mkdirSync(work, { recursive: true });
    const archive = path.join(work, 'gifski.tar.xz');
    const res = await fetch(GIFSKI_URL);
    if (!res.ok || !res.body) throw new Error(`download failed: HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body as WebReadableStream), createWriteStream(archive));
    const target = await installGifskiFromArchive(archive, work);
    console.log(`gifski ${GIFSKI_VERSION} installed to ${target}`);
    return target;
  } catch (err) {
    console.log(
      `  warning: could not set up gifski (${(err as Error).message}); using ffmpeg for GIF encoding`,
    );
    return null;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
