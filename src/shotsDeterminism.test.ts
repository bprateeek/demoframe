import crypto from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from './config/schema.js';
import { encodeWebp } from './encode/webp.js';
import { writeReportJson, type OutputReport } from './qa/report.js';
import { renderFrames } from './render/frames.js';
import { resolveShotGraph } from './render/shotGraph.js';
import { buildDocument } from './templates/document.js';

function hash(value: Buffer | string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function frameSetHash(dir: string): string {
  const digest = crypto.createHash('sha256');
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.png')).sort()) {
    digest.update(file);
    digest.update(readFileSync(path.join(dir, file)));
  }
  return digest.digest('hex');
}

describe.skipIf(process.env.SHOT_EXACT !== '1')('shot compositor determinism', () => {
  it('repeats frame, video, graph, and report hashes', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'none', width: 320, height: 320 },
      output: { format: 'webp', width: 240, fps: 5, quality: 'draft' },
      shots: [
        {
          id: 'hook', beatId: 'hook', duration: 0.5,
          objects: [{ id: 'message', slot: 'hero', kind: 'scene', scene: { type: 'status-card', duration: 0.5, title: 'Ready' }, carry: true }],
        },
        {
          id: 'payoff', beatId: 'payoff', duration: 0.5,
          transition: { type: 'shared-element', duration: 0.2 },
          objects: [{ id: 'proof', slot: 'supporting', kind: 'scene', scene: { type: 'metric-card', duration: 0.5, metrics: [{ label: 'Checks', value: 3 }] } }],
          camera: { target: 'message', move: 'pan', amount: 0.05 },
        },
      ],
    });

    const run = async () => {
      const root = mkdtempSync(path.join(os.tmpdir(), 'demoframe-shots-determinism-'));
      const doc = await buildDocument(config, process.cwd());
      const frames = await renderFrames(doc, 'draft', path.join(root, 'frames'));
      const video = path.join(root, 'demo.webp');
      await encodeWebp(frames, 240, video, { profile: 'modern', quality: 'draft' });
      const graph = resolveShotGraph(config);
      const framesHash = frameSetHash(frames.dir);
      const videoHash = hash(readFileSync(video));
      const output: OutputReport = {
        file: 'demo.webp', format: 'webp', transparent: false, transparencyMode: 'none',
        sizeBytes: readFileSync(video).length, width: 240, height: 240, durationS: 1,
        fps: 5, frameCount: 5, loopsForever: true, hasAudio: false,
      };
      const report = writeReportJson(root, [output], { shotGraph: graph, framesHash, videoHash });
      return { framesHash, videoHash, graphHash: graph.hash, reportHash: hash(readFileSync(report)) };
    };

    expect(await run()).toEqual(await run());
  }, 60_000);
});
