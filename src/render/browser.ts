import { chromium, type Browser, type Page } from 'playwright-core';
import { BROWSER_HINT, chromiumInstalled } from '../env/browser.js';
import { SCALE_BY_QUALITY, type Output } from '../config/schema.js';
import type { BuiltDocument } from '../templates/document.js';

export interface RenderSession {
  page: Page;
  scale: number;
  seek(tMs: number): Promise<void>;
  screenshot(filePath?: string): Promise<Buffer>;
  close(): Promise<void>;
}

export async function openRenderSession(
  doc: BuiltDocument,
  quality: Output['quality'],
): Promise<RenderSession> {
  if (!chromiumInstalled()) throw new Error(BROWSER_HINT);
  const scale = SCALE_BY_QUALITY[quality];
  const baseArgs = ['--force-color-profile=srgb', '--hide-scrollbars', '--disable-lcd-text'];
  let browser: Browser;
  try {
    browser = await chromium.launch({ headless: true, args: baseArgs });
  } catch {
    // Sandboxed environments (containers, seatbelt) can block Chromium's
    // multi-process startup; single-process rendering is pixel-identical.
    browser = await chromium.launch({
      headless: true,
      args: [...baseArgs, '--single-process', '--no-zygote'],
    });
  }
  const context = await browser.newContext({
    viewport: doc.viewport,
    deviceScaleFactor: scale,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.setContent(doc.html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  return {
    page,
    scale,
    async seek(tMs: number) {
      await page.evaluate((t) => (window as unknown as { __seek(t: number): void }).__seek(t), tMs);
    },
    async screenshot(filePath?: string) {
      return page.screenshot({
        path: filePath,
        type: 'png',
        animations: 'disabled',
        omitBackground: doc.transparent,
      });
    },
    async close() {
      await browser.close();
    },
  };
}
