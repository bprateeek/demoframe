import path from 'node:path';
import { frameViewport, normalizeLogo, type DemoConfig } from '../config/schema.js';
import { resolveTimeline, type Timeline } from '../render/timeline.js';
import { normalizeImageToDataUrl } from '../assets/normalize.js';
import { fontCss } from './fonts.js';
import { resolveTheme, themeCss } from './theme.js';
import { baseCss } from './base.js';
import { phoneCss, phoneHtml } from './frames/phone.js';
import { browserCss, browserHtml } from './frames/browser.js';
import { terminalCss, terminalHtml } from './frames/terminal.js';
import { desktopCss, desktopHtml } from './frames/desktop.js';
import { noneCss, noneHtml } from './frames/none.js';
import { typingCss, typingHtml } from './scenes/typing.js';
import { stepsCss, stepsHtml } from './scenes/steps.js';
import { statusCardCss, statusCardHtml } from './scenes/statusCard.js';
import { screenshotCss, screenshotHtml } from './scenes/screenshot.js';
import { terminalPlaybackCss, terminalPlaybackHtml } from './scenes/terminalPlayback.js';
import { codeCss, codeHtml } from './scenes/code.js';
import { chatCss, chatHtml } from './scenes/chat.js';
import { metricCardCss, metricCardHtml } from './scenes/metricCard.js';

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
  const resolvedTheme = resolveTheme(config.theme);

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
      case 'terminal-playback': {
        const framePrompt = config.frame.type === 'terminal' ? config.frame.prompt : '$';
        sceneParts.push(terminalPlaybackHtml(scene, index, frameType, framePrompt));
        break;
      }
      case 'code':
        sceneParts.push(await codeHtml(scene, index, resolvedTheme.mode));
        break;
      case 'chat':
        sceneParts.push(chatHtml(scene, index));
        break;
      case 'metric-card':
        sceneParts.push(metricCardHtml(scene, index));
        break;
      case 'hold':
        break;
    }
  }
  const logo = normalizeLogo(config.theme.logo);
  let headerLogoHtml = '';
  let cornerLogoHtml = '';
  if (logo) {
    const logoDataUrl = await normalizeImageToDataUrl(path.resolve(baseDir, logo.src), 256);
    const noHeaderSlot =
      config.frame.type === 'none' || (config.frame.type === 'phone' && !config.frame.title);
    const placement = noHeaderSlot ? 'corner' : logo.placement;
    if (placement === 'header') {
      headerLogoHtml = `<img class="df-logo-header" src="${logoDataUrl}" alt="">`;
    } else {
      cornerLogoHtml = `<div class="df-logo-corner"><img src="${logoDataUrl}" alt=""></div>`;
    }
  }

  const scenesHtml = `<div class="df-scenes" style="position:relative;flex:1;min-height:0;">${sceneParts.join('\n')}${cornerLogoHtml}</div>`;

  let frameHtml: string;
  switch (config.frame.type) {
    case 'phone':
      frameHtml = phoneHtml(config.frame, scenesHtml, headerLogoHtml);
      break;
    case 'browser':
      frameHtml = browserHtml(config.frame, scenesHtml, headerLogoHtml);
      break;
    case 'terminal':
      frameHtml = terminalHtml(config.frame, scenesHtml, headerLogoHtml);
      break;
    case 'desktop':
      frameHtml = desktopHtml(config.frame, scenesHtml, headerLogoHtml);
      break;
    case 'none':
      frameHtml = noneHtml(scenesHtml);
      break;
  }

  const css = [
    fontCss(config.theme.font, baseDir),
    themeCss(config.theme),
    baseCss,
    phoneCss,
    browserCss,
    terminalCss,
    desktopCss,
    noneCss,
    typingCss,
    stepsCss,
    statusCardCss,
    screenshotCss,
    terminalPlaybackCss,
    codeCss,
    chatCss,
    metricCardCss,
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

  return { html, viewport: frameViewport(config.frame), timeline };
}
