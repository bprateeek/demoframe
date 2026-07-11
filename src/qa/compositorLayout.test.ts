import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import { chromiumInstalled } from '../env/browser.js';
import { openRenderSession } from '../render/browser.js';
import { buildDocument } from '../templates/document.js';
import { measureLayout } from './layout.js';

const objectMotion = { enter: { type: 'none' }, emphasize: { type: 'none' }, exit: { type: 'none' } } as const;

describe.skipIf(!chromiumInstalled() || process.env.SHOT_LAYOUT !== '1')('shot compositor layout matrix', () => {
  const cases = [
    {
      name: 'browser hero plus supporting evidence',
      frame: { type: 'browser', width: 960, height: 540 },
      objects: [
        { id: 'terminal', slot: 'hero', kind: 'scene', scene: { type: 'terminal-playback', duration: 3, command: 'shipcheck run', output: ['checking release', 'two blockers found'] }, ...objectMotion },
        { id: 'gate', slot: 'supporting', kind: 'scene', scene: { type: 'steps', duration: 3, header: { title: 'Release gate', detail: 'Two blockers need attention' }, items: [{ label: 'Full test suite', state: 'done' }, { label: 'Update changelog', state: 'active' }, { label: 'Smoke test installer', state: 'pending' }] }, ...objectMotion },
      ],
    },
    {
      name: 'phone vertical hero and support',
      frame: { type: 'phone', width: 480, height: 900 },
      objects: [
        { id: 'ask', slot: 'hero', kind: 'scene', scene: { type: 'typing', duration: 3, text: 'Prepare the release checklist and keep every blocker visible', send: true }, ...objectMotion },
        { id: 'result', slot: 'supporting', kind: 'scene', scene: { type: 'status-card', duration: 3, title: 'Release gate clear', checks: ['Tests passed', 'Installer verified'], cta: { label: 'Ship release', style: 'success' } }, ...objectMotion },
      ],
    },
    {
      name: 'frameless background and foreground proof',
      frame: { type: 'none', width: 960, height: 540 },
      objects: [
        { id: 'surface', slot: 'background', kind: 'scene', scene: { type: 'screen', duration: 3, blocks: [{ block: 'app-header', title: 'Pulseboard', subtitle: 'Service health' }, { block: 'progress', items: [{ label: 'API', value: 99 }, { label: 'Queue', value: 94 }] }] }, ...objectMotion },
        { id: 'proof', slot: 'foreground', kind: 'scene', scene: { type: 'metric-card', duration: 3, title: 'Recovery', metrics: [{ label: 'Queue latency', value: 112, suffix: ' ms' }] }, ...objectMotion },
      ],
    },
  ] as const;

  for (const fixture of cases) {
    it(fixture.name, { timeout: 60_000 }, async () => {
      const config = demoConfigSchema.parse({
        frame: fixture.frame,
        output: { quality: 'draft' },
        shots: [{ id: 'shot', beatId: 'build', duration: 3, objects: fixture.objects }],
      });
      const doc = await buildDocument(config, process.cwd());
      const session = await openRenderSession(doc, 'draft');
      try {
        await expect(measureLayout(session, doc.timeline)).resolves.toEqual([]);
      } finally {
        await session.close();
      }
    });
  }
});

describe.skipIf(!chromiumInstalled() || process.env.SHOT_LAYOUT !== '1')('primitive pairwise/extreme layout matrix', () => {
  const cases = [
    {
      name: 'browser display copy plus sanitized illustration',
      frame: { type: 'browser', width: 960, height: 540 },
      objects: [
        { id: 'copy', slot: 'hero', kind: 'kinetic-text', eyebrow: 'Pulseboard', text: 'See every important service recover in one clear view.', scale: 'headline', ...objectMotion },
        { id: 'map', slot: 'supporting', kind: 'image', src: 'examples/primitives/recovery.svg', alt: 'Service recovery diagram', fit: 'contain', mask: 'rounded', parallax: 0.04, ...objectMotion },
      ],
    },
    {
      name: 'phone product surface plus chart path',
      frame: { type: 'phone', width: 480, height: 900 },
      objects: [
        { id: 'surface', slot: 'hero', kind: 'product-surface', title: 'Pulseboard', subtitle: 'All critical services', device: 'phone', state: 'success', rows: [{ label: 'API gateway', value: 'Healthy', tone: 'success' }, { label: 'Background workers', value: '96 ms', tone: 'success' }, { label: 'Event delivery', value: 'Healthy', tone: 'success' }], ...objectMotion },
        { id: 'chart', slot: 'supporting', kind: 'chart-path', title: 'Queue latency', series: [418, 292, 174, 96], labels: ['3m', '2m', '1m', 'now'], tone: 'success', ...objectMotion },
      ],
    },
    {
      name: 'frameless extreme metric plus vertical lockup',
      frame: { type: 'none', width: 960, height: 540 },
      objects: [
        { id: 'metric', slot: 'hero', kind: 'hero-metric', label: 'Availability across every region', metric: { value: 99.99, suffix: '%', decimals: 2 }, detail: 'All services healthy', tone: 'success', ...objectMotion },
        { id: 'brand', slot: 'supporting', kind: 'logo-lockup', product: 'Pulseboard', src: 'examples/primitives/mark.svg', manifestRef: 'pulseboard-logo', tagline: 'Service health, without the noise.', arrangement: 'mark-top', ...objectMotion },
      ],
    },
  ] as const;

  for (const fixture of cases) {
    it(fixture.name, { timeout: 60_000 }, async () => {
      const config = demoConfigSchema.parse({
        frame: fixture.frame,
        output: { quality: 'draft' },
        shots: [{ id: 'primitive-shot', beatId: 'build', duration: 3, objects: fixture.objects }],
      });
      const doc = await buildDocument(config, process.cwd());
      const session = await openRenderSession(doc, 'draft');
      try {
        await expect(measureLayout(session, doc.timeline)).resolves.toEqual([]);
      } finally {
        await session.close();
      }
    });
  }
});
