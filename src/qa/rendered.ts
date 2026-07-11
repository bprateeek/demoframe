import sharp from 'sharp';
import type { DemoConfig, ProfileName } from '../config/schema.js';
import type { RenderSession } from '../render/browser.js';
import type { Timeline } from '../render/timeline.js';
import { requiredTextDwell } from './static.js';

export type RenderedQaCode = 'qa.text-collision' | 'qa.text-dwell' | 'qa.empty-frame' | 'qa.static-time' | 'qa.loop-continuity' | 'qa.clipping';

export interface RenderedQaFinding {
  code: RenderedQaCode;
  severity: 'warning';
  message: string;
  details: {
    profile: ProfileName;
    firstS: number;
    lastS: number;
    durationS: number;
    keys?: string[];
    measured: number;
    threshold: number;
    exemption?: string;
  };
}

interface TextBox {
  key: string;
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  inside: number;
  opacity: number;
  fontSize: number;
  transitionMasked: boolean;
}

interface DomSample {
  safe: { x: number; y: number; width: number; height: number };
  boxes: TextBox[];
  meaningfulCoverage: number;
}

const RATES: Record<ProfileName, number> = { 'readme-loop': 15, 'social-film': 15, 'product-tour': 12 };
const EMPTY: Record<ProfileName, { coverage: number; duration: number }> = {
  'readme-loop': { coverage: 0.07, duration: 0.4 },
  'social-film': { coverage: 0.06, duration: 0.65 },
  'product-tour': { coverage: 0.08, duration: 0.65 },
};
const STATIC_SECONDS: Record<ProfileName, number> = { 'readme-loop': 1.4, 'social-film': 2, 'product-tour': 2.5 };

function profileFor(config: DemoConfig): ProfileName {
  return config.profile ?? 'readme-loop';
}

function beatRoles(config: DemoConfig): Map<string, string> {
  const roles = new Map(config.brief?.story?.beats?.map((beat) => [beat.id, beat.role]) ?? []);
  const byName = new Map<string, string>();
  if ((config.shots?.length ?? 0) > 0) {
    for (const shot of config.shots ?? []) byName.set(shot.id, roles.get(shot.beatId) ?? '');
  } else {
    config.scenes.forEach((scene, index) => byName.set(String(index), roles.get(scene.beatId ?? '') ?? ''));
  }
  return byName;
}

async function domSample(session: RenderSession): Promise<DomSample> {
  return session.page.evaluate(() => {
    const safeEl = document.querySelector('.df-safe') ?? document.body;
    const sr = safeEl.getBoundingClientRect();
    const opacity = (element: Element) => {
      let value = 1;
      let current: Element | null = element;
      while (current) {
        value *= Number.parseFloat(getComputedStyle(current).opacity || '1');
        current = current.parentElement;
      }
      return value;
    };
    const boxes = Array.from(document.querySelectorAll('[data-qa-key]')).flatMap((element) => {
      if ((element.getAttribute('data-qa-key') ?? '').startsWith('shot-object-')) return [];
      if (element.querySelector('[data-qa-key]')) return [];
      const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (!text || element.getAttribute('aria-hidden') === 'true') return [];
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return [];
      const ix = Math.max(0, Math.min(rect.right, sr.right) - Math.max(rect.left, sr.left));
      const iy = Math.max(0, Math.min(rect.bottom, sr.bottom) - Math.max(rect.top, sr.top));
      const layer = element.closest('[data-shot-layer]')?.getAttribute('data-shot-layer') ??
        element.closest('[data-scene]')?.getAttribute('data-scene') ?? 'stage';
      const shotLayer = element.closest('[data-shot-layer]');
      const object = element.closest('[data-object-id]')?.getAttribute('data-object-id') ?? 'scene';
      return [{
        key: `${layer}:${object}:${element.getAttribute('data-qa-key')}`,
        text, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
        inside: (ix * iy) / (rect.width * rect.height), opacity: opacity(element),
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize || '0'),
        transitionMasked: Boolean(shotLayer && ((shotLayer as HTMLElement).style.clipPath || (shotLayer as HTMLElement).style.transform)),
      }];
    });
    const meaningful = Array.from(document.querySelectorAll('[data-primitive], .df-card-body, .df-screen-stack, .df-composer, .df-steps-list, .df-play, .df-codepanel, .df-chat, .df-metric-card')).flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const visible = opacity(element) >= 0.2 && rect.width > 0 && rect.height > 0;
      if (!visible) return [];
      const width = Math.max(0, Math.min(rect.right, sr.right) - Math.max(rect.left, sr.left));
      const height = Math.max(0, Math.min(rect.bottom, sr.bottom) - Math.max(rect.top, sr.top));
      return [width * height];
    });
    const meaningfulCoverage = Math.min(1, meaningful.reduce((sum, area) => sum + area, 0) / Math.max(1, sr.width * sr.height));
    return { safe: { x: sr.x, y: sr.y, width: sr.width, height: sr.height }, boxes, meaningfulCoverage };
  });
}

async function pixelSample(session: RenderSession, safe: DomSample['safe']): Promise<Buffer> {
  const clip = {
    x: Math.max(0, safe.x), y: Math.max(0, safe.y),
    width: Math.max(1, safe.width), height: Math.max(1, safe.height),
  };
  const png = await session.page.screenshot({ type: 'png', animations: 'disabled', clip });
  return (await sharp(png).resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer());
}

function contentCoverage(raw: Buffer): number {
  const corners = [0, 63 * 3, 63 * 64 * 3, (64 * 64 - 1) * 3];
  const bg = [0, 1, 2].map((channel) => corners.reduce((sum, offset) => sum + raw[offset + channel], 0) / corners.length);
  let changed = 0;
  for (let offset = 0; offset < raw.length; offset += 3) {
    const delta = Math.hypot(raw[offset] - bg[0], raw[offset + 1] - bg[1], raw[offset + 2] - bg[2]);
    if (delta > 18) changed++;
  }
  return changed / (64 * 64);
}

function changedFraction(a: Buffer, b: Buffer): number {
  let changed = 0;
  for (let offset = 0; offset < Math.min(a.length, b.length); offset += 3) {
    if (Math.hypot(a[offset] - b[offset], a[offset + 1] - b[offset + 1], a[offset + 2] - b[offset + 2]) > 7) changed++;
  }
  return changed / (64 * 64);
}

function qaBoxMovement(previous: DomSample, current: DomSample): number {
  const byKey = new Map(previous.boxes.map((box) => [box.key, box]));
  let maximum = 0;
  for (const box of current.boxes) {
    const before = byKey.get(box.key);
    if (!before) continue;
    const dx = (box.left + box.right - before.left - before.right) / 2;
    const dy = (box.top + box.bottom - before.top - before.bottom) / 2;
    maximum = Math.max(maximum, Math.hypot(dx, dy));
  }
  return maximum;
}

function meanDelta(a: Buffer, b: Buffer): number {
  let sum = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index++) sum += Math.abs(a[index] - b[index]);
  return sum / Math.min(a.length, b.length);
}

function hashBits(raw: Buffer): boolean[] {
  const gray = Array.from({ length: 64 * 64 }, (_, index) => {
    const offset = index * 3;
    return raw[offset] * 0.2126 + raw[offset + 1] * 0.7152 + raw[offset + 2] * 0.0722;
  });
  const mean = gray.reduce((sum, value) => sum + value, 0) / gray.length;
  return gray.map((value) => value >= mean);
}

function hamming(a: Buffer, b: Buffer): number {
  const ah = hashBits(a), bh = hashBits(b);
  return ah.reduce((sum, bit, index) => sum + Number(bit !== bh[index]), 0) / 64;
}

function finding(code: RenderedQaCode, profile: ProfileName, first: number, last: number, measured: number, threshold: number, keys?: string[]): RenderedQaFinding {
  const duration = Math.max(0, last - first);
  return {
    code,
    severity: 'warning',
    message: `${code} from ${first.toFixed(2)}s to ${last.toFixed(2)}s (${measured.toFixed(2)} measured; threshold ${threshold.toFixed(2)})`,
    details: { profile, firstS: first, lastS: last, durationS: duration, ...(keys ? { keys } : {}), measured, threshold },
  };
}

export async function measureRenderedQa(session: RenderSession, timeline: Timeline, config: DemoConfig): Promise<RenderedQaFinding[]> {
  const profile = profileFor(config);
  const rate = RATES[profile];
  const step = 1 / rate;
  const sampleCount = Math.max(2, Math.ceil(timeline.duration * rate));
  const roles = beatRoles(config);
  const dwell = new Map<string, { text: string; first: number; last: number; samples: number }>();
  const collisions = new Map<string, { keys: string[]; first: number; last: number; consecutive: number; maxConsecutive: number }>();
  const clipping = new Map<string, { first: number; last: number; outside: number }>();
  const raws: Buffer[] = [];
  const times: number[] = [];
  let emptyStart: number | undefined;
  const emptyWindows: Array<[number, number, number]> = [];
  let emptyMinimum = 1;
  let staticStart: number | undefined;
  const staticWindows: Array<[number, number]> = [];
  let previousDom: DomSample | undefined;

  for (let index = 0; index < sampleCount; index++) {
    const time = Math.min(timeline.duration - 0.001, (index + 0.5) * step);
    await session.seek(time * 1000);
    const dom = await domSample(session);
    const raw = await pixelSample(session, dom.safe);
    raws.push(raw); times.push(time);
    const readable = dom.boxes.filter((box) => box.opacity >= 0.55 && box.fontSize >= 10 && box.inside >= 0.7);
    for (const box of readable) {
      const entry = dwell.get(box.key) ?? { text: box.text, first: time, last: time, samples: 0 };
      entry.text = box.text; entry.last = time; entry.samples++;
      dwell.set(box.key, entry);
    }
    for (const box of dom.boxes.filter((item) => item.opacity >= 0.55 && item.inside > 0 && item.inside < 0.99 && !item.transitionMasked)) {
      const entry = clipping.get(box.key) ?? { first: time, last: time, outside: 0 };
      entry.last = time; entry.outside = Math.max(entry.outside, 1 - box.inside);
      clipping.set(box.key, entry);
    }
    const activePairs = new Set<string>();
    for (let left = 0; left < readable.length; left++) for (let right = left + 1; right < readable.length; right++) {
      const a = readable[left], b = readable[right];
      if (a.transitionMasked || b.transitionMasked) continue;
      const iw = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const ih = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const smaller = Math.min((a.right - a.left) * (a.bottom - a.top), (b.right - b.left) * (b.bottom - b.top));
      if (iw < 2 || ih < 2 || (iw * ih) / Math.max(1, smaller) < 0.03) continue;
      const key = [a.key, b.key].sort().join('\0'); activePairs.add(key);
      const entry = collisions.get(key) ?? { keys: [a.key, b.key], first: time, last: time, consecutive: 0, maxConsecutive: 0 };
      entry.last = time; entry.consecutive++; entry.maxConsecutive = Math.max(entry.maxConsecutive, entry.consecutive);
      collisions.set(key, entry);
    }
    for (const [key, entry] of collisions) if (!activePairs.has(key)) entry.consecutive = 0;

    const coverage = Math.max(contentCoverage(raw), dom.meaningfulCoverage);
    if (coverage < EMPTY[profile].coverage && time > 0.1 && time < timeline.duration - 0.1) {
      emptyStart ??= time;
      emptyMinimum = Math.min(emptyMinimum, coverage);
    } else if (emptyStart !== undefined) {
      emptyWindows.push([emptyStart, time - step, emptyMinimum]); emptyStart = undefined; emptyMinimum = 1;
    }

    const scene = timeline.scenes.find((item) => time >= item.start && time < item.end);
    const role = scene ? roles.get(scene.name ?? String(scene.index)) : '';
    const exemptStatic = role === 'payoff' || role === 'outro' || config.artDirection?.motionPersonality === 'calm';
    const isStatic = index > 0 && changedFraction(raws[index - 1], raw) < 0.005 &&
      (!previousDom || qaBoxMovement(previousDom, dom) < 0.5);
    if (isStatic && !exemptStatic) staticStart ??= times[index - 1];
    else if (staticStart !== undefined) { staticWindows.push([staticStart, time - step]); staticStart = undefined; }
    previousDom = dom;
  }
  if (emptyStart !== undefined) emptyWindows.push([emptyStart, times.at(-1)!, 0]);
  if (staticStart !== undefined) staticWindows.push([staticStart, times.at(-1)!]);

  const findings: RenderedQaFinding[] = [];
  for (const entry of collisions.values()) {
    if (entry.maxConsecutive >= 2) findings.push(finding('qa.text-collision', profile, entry.first, entry.last, entry.maxConsecutive / rate, 2 / rate, entry.keys));
  }
  for (const [key, entry] of dwell) {
    const actual = entry.samples / rate;
    const required = requiredTextDwell(entry.text);
    if (actual < required * 0.9) findings.push(finding('qa.text-dwell', profile, entry.first, entry.last, actual, required * 0.9, [key]));
  }
  for (const [key, entry] of clipping) findings.push(finding('qa.clipping', profile, entry.first, entry.last, entry.outside, 0.01, [key]));
  for (const [first, last, coverage] of emptyWindows) if (last - first > EMPTY[profile].duration) findings.push(finding('qa.empty-frame', profile, first, last, coverage, EMPTY[profile].coverage));
  for (const [first, last] of staticWindows) if (last - first > STATIC_SECONDS[profile] + 1e-6) findings.push(finding('qa.static-time', profile, first, last, last - first, STATIC_SECONDS[profile]));
  if (profile === 'readme-loop' && raws.length >= 2) {
    const distance = hamming(raws[0], raws.at(-1)!);
    const delta = meanDelta(raws[0], raws.at(-1)!);
    if (distance > 6 || delta > 5) findings.push(finding('qa.loop-continuity', profile, times[0], times.at(-1)!, Math.max(distance, delta), Math.max(6, 5)));
  }
  return findings;
}
