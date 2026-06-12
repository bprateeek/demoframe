import path from 'node:path';
import { FRAME_VIEWPORTS, type DemoConfig } from '../config/schema.js';
import { resolveTimeline, type Timeline } from '../render/timeline.js';
import { normalizeImageToDataUrl } from '../assets/normalize.js';
import { fontCss } from './fonts.js';
import { themeCss } from './theme.js';
import { baseCss } from './base.js';
import { phoneCss, phoneHtml } from './frames/phone.js';
import { browserCss, browserHtml } from './frames/browser.js';
import { terminalCss, terminalHtml } from './frames/terminal.js';
import { typingCss, typingHtml } from './scenes/typing.js';
import { stepsCss, stepsHtml } from './scenes/steps.js';
import { statusCardCss, statusCardHtml } from './scenes/statusCard.js';
import { screenshotCss, screenshotHtml } from './scenes/screenshot.js';

export interface BuiltDocument {
  html: string;
  viewport: { width: number; height: number };
  timeline: Timeline;
}

export async function buildDocument(
  config: DemoConfig,
  baseDir: string,
  fpsOverride?: number,
): Promise<BuiltDocument> {
  const timeline = resolveTimeline(config, fpsOverride);
  const frameType = config.frame.type;

  const sceneParts: string[] = [];
  for (const [index, scene] of config.scenes.entries()) {
    switch (scene.type) {
      case 'typing': {
        const prompt = frameType === 'terminal' ? config.frame.prompt : '$';
        sceneParts.push(typingHtml(scene, index, frameType, prompt));
        break;
      }
      case 'steps':
        sceneParts.push(stepsHtml(scene, index));
        break;
      case 'status-card':
        sceneParts.push(statusCardHtml(scene, index));
        break;
      case 'screenshot': {
        const dataUrl = await normalizeImageToDataUrl(path.resolve(baseDir, scene.src));
        sceneParts.push(screenshotHtml(scene, index, dataUrl));
        break;
      }
      case 'hold':
        break;
    }
  }
  const scenesHtml = `<div class="df-scenes" style="position:relative;flex:1;min-height:0;">${sceneParts.join('\n')}</div>`;

  let frameHtml: string;
  switch (config.frame.type) {
    case 'phone':
      frameHtml = phoneHtml(config.frame, scenesHtml);
      break;
    case 'browser':
      frameHtml = browserHtml(config.frame, scenesHtml);
      break;
    case 'terminal':
      frameHtml = terminalHtml(config.frame, scenesHtml);
      break;
  }

  const css = [
    fontCss(),
    themeCss(config.theme),
    baseCss,
    phoneCss,
    browserCss,
    terminalCss,
    typingCss,
    stepsCss,
    statusCardCss,
    screenshotCss,
  ].join('\n');

  const { runtimeJs } = await import('./runtime.js');
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${css}</style>
</head>
<body class="df-frame-${frameType}">
${frameHtml}
<script>${runtimeJs(JSON.stringify(timeline))}</script>
</body>
</html>`;

  return { html, viewport: { ...FRAME_VIEWPORTS[frameType] }, timeline };
}
