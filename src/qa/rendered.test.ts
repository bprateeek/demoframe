import { existsSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import { chromiumInstalled } from '../env/browser.js';
import { openRenderSession } from '../render/browser.js';
import type { Timeline } from '../render/timeline.js';
import type { BuiltDocument } from '../templates/document.js';
import { measureRenderedQa } from './rendered.js';
import { runRender } from '../commands/render.js';

const config = demoConfigSchema.parse({
  frame: { type: 'none', width: 320, height: 320 },
  output: { quality: 'draft', fps: 15 },
  scenes: [{ type: 'typing', duration: 2, text: 'seed' }],
});
const timeline: Timeline = {
  duration: 2, fps: 15, frameCount: 30, fade: 0.45,
  scenes: [{ index: 0, type: 'screen', start: 0, end: 2, duration: 2, renderIndex: 0, chromeLayer: 0, transition: 'cut', data: {} }],
};

function document(body: string, seek = ''): BuiltDocument {
  return {
    viewport: { width: 320, height: 320 }, timeline, transparent: false, frameMargin: 0,
    html: `<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:320px;height:320px}.df-safe{position:relative;width:320px;height:320px;background:#fafafa;overflow:hidden}.key{position:absolute;font:20px Arial;color:#111}</style><div class="df-safe">${body}</div><script>window.__seek=(t)=>{${seek}}</script>`,
  };
}

describe.skipIf(!chromiumInstalled() || process.env.RENDERED_QA !== '1')('rendered motion QA seeded defects', () => {
  it('detects a persistent readable collision', { timeout: 60_000 }, async () => {
    const doc = document('<div class="key" data-qa-key="a" style="left:80px;top:120px">First line</div><div class="key" data-qa-key="b" style="left:82px;top:121px">Second line</div>');
    const session = await openRenderSession(doc, 'draft');
    try {
      expect((await measureRenderedQa(session, timeline, config)).map((item) => item.code)).toContain('qa.text-collision');
    } finally { await session.close(); }
  });

  it('detects a two-second empty/static interval', { timeout: 60_000 }, async () => {
    const session = await openRenderSession(document(''), 'draft');
    try {
      const codes = (await measureRenderedQa(session, timeline, config)).map((item) => item.code);
      expect(codes).toContain('qa.empty-frame');
      expect(codes).toContain('qa.static-time');
    } finally { await session.close(); }
  });

  it('detects sub-dwell durable text and clipping', { timeout: 60_000 }, async () => {
    const doc = document(
      '<div id="short" class="key" data-qa-key="short" style="left:-12px;top:120px">A durable sentence that deserves enough reading time</div>',
      "document.getElementById('short').style.opacity=t<250?'1':'0'",
    );
    const session = await openRenderSession(doc, 'draft');
    try {
      const codes = (await measureRenderedQa(session, timeline, config)).map((item) => item.code);
      expect(codes).toContain('qa.text-dwell');
      expect(codes).toContain('qa.clipping');
    } finally { await session.close(); }
  });

  it('blocks atomic output promotion under strict', { timeout: 120_000 }, async () => {
    const out = mkdtempSync(path.join(os.tmpdir(), 'demoframe-qa-atomic-'));
    await expect(runRender('test/fixtures/qa-collision.yml', {
      out, keepFrames: false, download: false, stills: false, strict: true,
    })).rejects.toThrow(/render failed under --strict/);
    expect(existsSync(path.join(out, 'qa-collision.webp'))).toBe(false);
    expect(existsSync(path.join(out, 'report.json'))).toBe(false);
  });
});
