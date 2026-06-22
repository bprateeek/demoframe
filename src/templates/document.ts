import path from 'node:path';
import {
  captureViewport,
  isTransparentFrame,
  normalizeLogo,
  resolveAmbient,
  type DemoConfig,
  type Frame,
  type ChatScene,
  type AvatarSpec,
} from '../config/schema.js';
import { resolveTimeline, type Timeline } from '../render/timeline.js';
import { sceneFrame } from '../render/chrome.js';
import { normalizeImageToDataUrl } from '../assets/normalize.js';
import { icons } from './icons.js';
import { fontCss } from './fonts.js';
import { resolveTheme, themeCss } from './theme.js';
import { frameCss } from './frame.js';
import { baseCss } from './base.js';
import { phoneChromeHtml, phoneCss, phoneShellHtml } from './frames/phone.js';
import { browserChromeHtml, browserCss, browserShellHtml } from './frames/browser.js';
import { terminalChromeHtml, terminalCss, terminalShellHtml } from './frames/terminal.js';
import { desktopChromeHtml, desktopCss, desktopShellHtml } from './frames/desktop.js';
import { noneCss, noneHtml } from './frames/none.js';
import { typingCss, typingHtml } from './scenes/typing.js';
import { stepsCss, stepsHtml } from './scenes/steps.js';
import { statusCardCss, statusCardHtml } from './scenes/statusCard.js';
import { screenshotCss, screenshotHtml } from './scenes/screenshot.js';
import { terminalPlaybackCss, terminalPlaybackHtml } from './scenes/terminalPlayback.js';
import { codeCss, codeHtml } from './scenes/code.js';
import { chatCss, chatHtml, type ResolvedAvatar, type ResolvedAvatars } from './scenes/chat.js';
import { metricCardCss, metricCardHtml } from './scenes/metricCard.js';
import { screenCss, screenHtml } from './scenes/screen.js';
import { blockCss } from './blocks/index.js';

export interface BuiltDocument {
  html: string;
  viewport: { width: number; height: number };
  timeline: Timeline;
  transparent: boolean;
  frameMargin: number;
}

async function resolveAvatar(
  spec: AvatarSpec | undefined,
  baseDir: string,
): Promise<ResolvedAvatar | undefined> {
  if (!spec) return undefined;
  if (typeof spec === 'string') {
    return { img: await normalizeImageToDataUrl(path.resolve(baseDir, spec), 96) };
  }
  return { initials: spec.initials, color: spec.color };
}

async function resolveChatAvatars(
  avatars: ChatScene['avatars'],
  baseDir: string,
): Promise<ResolvedAvatars | undefined> {
  if (!avatars) return undefined;
  return {
    user: await resolveAvatar(avatars.user, baseDir),
    assistant: await resolveAvatar(avatars.assistant, baseDir),
  };
}

function ambientHtml(config: DemoConfig): string {
  const ambient = resolveAmbient(config);
  if (!ambient) return '';
  return `<div class="df-ambient df-ambient-ember" data-ambient="${ambient.type}" data-ambient-scope="${ambient.scope}" aria-hidden="true">
  <span class="df-ember" style="--df-ember-left:10%;--df-ember-top:18%;--df-ember-size:190px;--df-ember-blur:28px;--df-ember-opacity:0.42"></span>
  <span class="df-ember" style="--df-ember-left:58%;--df-ember-top:6%;--df-ember-size:150px;--df-ember-blur:30px;--df-ember-opacity:0.20"></span>
  <span class="df-ember" style="--df-ember-left:70%;--df-ember-top:62%;--df-ember-size:220px;--df-ember-blur:34px;--df-ember-opacity:0.24"></span>
  <span class="df-ember" style="--df-ember-left:22%;--df-ember-top:72%;--df-ember-size:130px;--df-ember-blur:24px;--df-ember-opacity:0.18"></span>
</div>`;
}

export async function buildDocument(
  config: DemoConfig,
  baseDir: string,
  fpsOverride?: number,
): Promise<BuiltDocument> {
  const timeline = resolveTimeline(config, fpsOverride);
  const frameType = config.frame.type;
  const resolvedTheme = resolveTheme(config.theme);
  const framesByScene = config.scenes.map((_, index) => sceneFrame(config, index));

  const sceneParts: string[] = [];
  for (const [index, scene] of config.scenes.entries()) {
    const mergedFrame = framesByScene[index];
    switch (scene.type) {
      case 'typing': {
        const prompt = mergedFrame.type === 'terminal' ? mergedFrame.prompt : '$';
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
        const framePrompt = mergedFrame.type === 'terminal' ? mergedFrame.prompt : '$';
        sceneParts.push(terminalPlaybackHtml(scene, index, frameType, framePrompt));
        break;
      }
      case 'code':
        sceneParts.push(await codeHtml(scene, index, resolvedTheme.mode));
        break;
      case 'chat': {
        const avatars = await resolveChatAvatars(scene.avatars, baseDir);
        sceneParts.push(chatHtml(scene, index, avatars));
        break;
      }
      case 'metric-card':
        sceneParts.push(metricCardHtml(scene, index));
        break;
      case 'screen':
        sceneParts.push(screenHtml(scene, index));
        break;
      case 'hold':
        break;
    }
  }
  const logo = normalizeLogo(config.theme.logo);
  let logoDataUrl = '';
  if (logo) {
    logoDataUrl = await normalizeImageToDataUrl(path.resolve(baseDir, logo.src), 256);
  }

  const chromeLayerFrames: Frame[] = [];
  for (const ts of timeline.scenes) {
    if (!chromeLayerFrames[ts.chromeLayer]) chromeLayerFrames[ts.chromeLayer] = framesByScene[ts.renderIndex];
  }
  const phoneReservesAppBar =
    config.frame.type === 'phone' && chromeLayerFrames.some((frame) => frame.type === 'phone' && Boolean(frame.title));
  const desktopReservesToolbar =
    config.frame.type === 'desktop' &&
    chromeLayerFrames.some((frame) => frame.type === 'desktop' && Boolean(frame.subtitle));
  const hasHeaderLogoSlot = (frame: Frame): boolean => {
    if (!logoDataUrl) return false;
    if (frame.type === 'none') return false;
    if (frame.type === 'phone') return Boolean(frame.title);
    return true;
  };
  const headerLogoHtml = (frame: Frame): string =>
    hasHeaderLogoSlot(frame) ? `<img class="df-logo-header" src="${logoDataUrl}" alt="">` : '';
  const cornerLogoHtml = logoDataUrl
    ? chromeLayerFrames
        .map((frame, layerId) =>
          hasHeaderLogoSlot(frame)
            ? ''
            : `<div class="df-logo-corner" data-chrome="${layerId}"><img src="${logoDataUrl}" alt=""></div>`,
        )
        .join('')
    : '';

  const needsOverlay = timeline.scenes.some((s) => s.data.tap || s.data.celebrate);
  const overlayHtml = needsOverlay
    ? `<div class="df-cursor"><div class="df-cursor-ripple"></div></div>` +
      `<div class="df-celebrate"><div class="df-celebrate-ring"></div>` +
      [0, 1, 2, 3, 4, 5].map((k) => `<span class="df-celebrate-dot" data-dot="${k}"></span>`).join('') +
      `<div class="df-celebrate-check">${icons.check}</div></div>`
    : '';

  const scenesHtml = `${ambientHtml(config)}<div class="df-scenes" style="position:relative;z-index:1;flex:1;min-height:0;">${sceneParts.join('\n')}${cornerLogoHtml}${overlayHtml}</div>`;

  let frameHtml: string;
  switch (config.frame.type) {
    case 'phone':
      frameHtml = phoneShellHtml(
        chromeLayerFrames
          .map((frame, layerId) =>
            phoneChromeHtml(
              frame as Extract<Frame, { type: 'phone' }>,
              layerId,
              headerLogoHtml(frame),
              phoneReservesAppBar,
            ),
          )
          .join('\n'),
        scenesHtml,
      );
      break;
    case 'browser':
      frameHtml = browserShellHtml(
        chromeLayerFrames
          .map((frame, layerId) =>
            browserChromeHtml(frame as Extract<Frame, { type: 'browser' }>, layerId, headerLogoHtml(frame)),
          )
          .join('\n'),
        scenesHtml,
      );
      break;
    case 'terminal':
      frameHtml = terminalShellHtml(
        chromeLayerFrames
          .map((frame, layerId) =>
            terminalChromeHtml(frame as Extract<Frame, { type: 'terminal' }>, layerId, headerLogoHtml(frame)),
          )
          .join('\n'),
        scenesHtml,
      );
      break;
    case 'desktop':
      frameHtml = desktopShellHtml(
        chromeLayerFrames
          .map((frame, layerId) =>
            desktopChromeHtml(
              frame as Extract<Frame, { type: 'desktop' }>,
              layerId,
              headerLogoHtml(frame),
              desktopReservesToolbar,
            ),
          )
          .join('\n'),
        scenesHtml,
      );
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
    frameCss(config.frame),
    typingCss,
    stepsCss,
    statusCardCss,
    screenshotCss,
    terminalPlaybackCss,
    codeCss,
    chatCss,
    metricCardCss,
    screenCss,
    blockCss,
  ].join('\n');

  const { runtimeJs } = await import('./runtime.js');
  const bodyClasses = [
    `df-frame-${frameType}`,
    isTransparentFrame(config.frame) ? 'df-outside-transparent' : '',
    config.frame.shadow ? '' : 'df-frame-shadow-off',
  ]
    .filter(Boolean)
    .join(' ');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${css}</style>
</head>
<body class="${bodyClasses}">
${frameHtml}
<script>${runtimeJs(JSON.stringify(timeline))}</script>
</body>
</html>`;

  return {
    html,
    viewport: captureViewport(config.frame),
    timeline,
    transparent: isTransparentFrame(config.frame),
    frameMargin: config.frame.margin ?? 0,
  };
}
