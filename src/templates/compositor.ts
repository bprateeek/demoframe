import {
  captureViewport,
  isTransparentFrame,
  normalizeLogo,
  resolveSceneCinematic,
  type AvatarSpec,
  type ChatScene,
  type DemoConfig,
  type Frame,
  type Scene,
  type ShotObject,
} from '../config/schema.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeImageToDataUrl } from '../assets/normalize.js';
import { tintSvg } from '../assets/sanitizeSvg.js';
import { renderContext, type RenderContext } from '../render/context.js';
import { resolveShotGraph, type ResolvedShotGraph, type ResolvedShotObject } from '../render/shotGraph.js';
import { sceneClientData, type Timeline, type TimelineScene } from '../render/timeline.js';
import type { BuiltDocument } from './document.js';
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
import { runtimeJs } from './runtime.js';
import { escapeHtml } from './html.js';

const compositorCss = `
.df-compositor { position:absolute; inset:0; overflow:hidden; }
.df-compositor-camera, .df-shot-layer { position:absolute; inset:0; }
.df-shot-layer { opacity:0; transform-origin:center; overflow:hidden; }
.df-shot-object { position:absolute; opacity:0; transform-origin:center; z-index:2; }
.df-shot-object > .df-scene { position:absolute; inset:0; opacity:1; }
.df-shot-object .df-rail { padding:clamp(12px, 2.6vw, var(--df-s5)); }
.df-shot-slot-background { inset:0; z-index:0; }
.df-shot-slot-hero { inset:9% 13%; z-index:2; }
.df-shot-layer:has(.df-shot-slot-supporting) .df-shot-slot-hero { right:40%; }
.df-shot-slot-supporting { right:7%; top:var(--df-support-top); width:31%; height:var(--df-support-height); z-index:3; }
.df-shot-slot-foreground { left:16%; right:16%; bottom:5%; height:25%; z-index:4; }
body.df-frame-phone .df-shot-layer:has(.df-shot-slot-supporting) .df-shot-slot-hero { inset:5% 8% 52%; }
body.df-frame-phone .df-shot-slot-supporting { left:8%; right:8%; top:auto; bottom:4%; width:auto; height:44%; }
.df-shot-ambient { position:absolute; inset:-8%; opacity:0; pointer-events:none; z-index:1; background:
  radial-gradient(circle at 18% 24%, color-mix(in srgb, var(--df-accent) 18%, transparent), transparent 28%),
  radial-gradient(circle at 78% 70%, color-mix(in srgb, var(--df-success) 12%, transparent), transparent 32%); }
.df-shot-transition-mask { clip-path:inset(0 100% 0 0); }
.df-primitive { width:100%; height:100%; display:flex; min-width:0; min-height:0; color:var(--df-text); }
.df-kinetic { flex-direction:column; justify-content:center; gap:12px; text-align:left; }
.df-kinetic[data-align="center"] { text-align:center; align-items:center; }
.df-kinetic-eyebrow { color:var(--df-accent); font-size:clamp(11px,1.25vw,15px); font-weight:750; letter-spacing:.14em; text-transform:uppercase; }
.df-kinetic-copy { max-width:16ch; font-weight:780; letter-spacing:-.045em; line-height:.98; font-size:clamp(34px,6.2vw,78px); }
.df-kinetic[data-scale="headline"] .df-kinetic-copy { font-size:clamp(28px,4.6vw,58px); line-height:1.02; }
.df-kinetic-word { display:inline-block; margin-right:.22em; opacity:clamp(0,calc(var(--df-object-progress,0) * var(--df-word-count) - var(--df-word-index)),1); transform:translateY(calc((1 - clamp(0,calc(var(--df-object-progress,0) * var(--df-word-count) - var(--df-word-index)),1)) * 10px)); }
.df-lockup { align-items:center; justify-content:center; gap:clamp(14px,2.2vw,28px); }
.df-lockup[data-arrangement="mark-top"] { flex-direction:column; text-align:center; }
.df-lockup-mark { width:clamp(58px,8vw,104px); height:clamp(58px,8vw,104px); object-fit:contain; }
.df-lockup-copy { display:flex; flex-direction:column; gap:5px; }
.df-lockup-name { font-size:clamp(26px,4.2vw,54px); line-height:1; font-weight:780; letter-spacing:-.04em; }
.df-lockup-tagline { color:var(--df-muted); font-size:clamp(12px,1.7vw,20px); }
.df-product-surface { flex-direction:column; border:1px solid var(--df-border); border-radius:18px; background:var(--df-panel); box-shadow:0 18px 50px color-mix(in srgb,var(--df-text) 11%,transparent); overflow:hidden; }
.df-product-surface[data-device="phone"] { max-width:340px; margin:auto; border-radius:28px; }
.df-product-surface[data-state="success"] { border-color:color-mix(in srgb,var(--df-success) 45%,var(--df-border)); }
.df-product-surface[data-state="warn"] { border-color:color-mix(in srgb,var(--df-warn) 50%,var(--df-border)); }
.df-product-surface[data-state="error"] { border-color:color-mix(in srgb,var(--df-danger) 45%,var(--df-border)); }
.df-surface-bar { height:24px; border-bottom:1px solid var(--df-border); background:color-mix(in srgb,var(--df-panel) 82%,var(--df-background)); position:relative; }
.df-surface-bar:before { content:""; position:absolute; left:13px; top:9px; width:6px; height:6px; border-radius:50%; background:var(--df-border); box-shadow:11px 0 var(--df-border),22px 0 var(--df-border); }
.df-surface-head { padding:clamp(14px,2vw,22px); border-bottom:1px solid var(--df-border); }
.df-surface-title { font-size:clamp(18px,2.4vw,28px); font-weight:750; letter-spacing:-.025em; }
.df-surface-subtitle { color:var(--df-muted); margin-top:4px; font-size:clamp(11px,1.4vw,15px); }
.df-surface-rows { padding:8px clamp(14px,2vw,22px) 14px; display:flex; flex-direction:column; }
.df-surface-row { display:flex; align-items:center; justify-content:space-between; min-height:42px; gap:16px; border-bottom:1px solid color-mix(in srgb,var(--df-border) 70%,transparent); font-size:clamp(11px,1.45vw,15px); }
.df-surface-row { opacity:clamp(0,calc(var(--df-object-progress,0) * var(--df-row-count) - var(--df-row-index)),1); transform:translateY(calc((1 - clamp(0,calc(var(--df-object-progress,0) * var(--df-row-count) - var(--df-row-index)),1)) * 8px)); }
.df-surface-row:last-child { border:0; }
.df-surface-row-value { font-weight:700; }
.df-tone-success { color:var(--df-success); }.df-tone-warn { color:var(--df-warn); }.df-tone-error { color:var(--df-danger); }
.df-hero-metric { flex-direction:column; justify-content:center; gap:8px; }
.df-hero-metric[data-align="center"] { align-items:center; text-align:center; }
.df-hero-metric-value { font-size:clamp(58px,11vw,136px); line-height:.88; letter-spacing:-.065em; font-weight:800; font-variant-numeric:tabular-nums; }
.df-hero-metric[data-tone="success"] .df-hero-metric-value { color:var(--df-success); }
.df-hero-metric[data-tone="warn"] .df-hero-metric-value { color:var(--df-warn); }
.df-hero-metric-label { font-size:clamp(14px,2vw,24px); font-weight:700; }.df-hero-metric-detail { color:var(--df-muted); font-size:clamp(11px,1.4vw,15px); }
.df-chart-path { flex-direction:column; justify-content:center; gap:14px; border:1px solid var(--df-border); border-radius:16px; padding:clamp(14px,2.2vw,24px); background:var(--df-panel); }
.df-chart-path-title { font-weight:720; font-size:clamp(14px,1.9vw,21px); }.df-chart-path svg { width:100%; height:70%; overflow:visible; }
.df-chart-path-line { fill:none; stroke:var(--df-accent); stroke-width:3; stroke-linecap:round; stroke-linejoin:round; path-length:1; stroke-dasharray:1; stroke-dashoffset:calc(1 - var(--df-object-progress,0)); }
.df-chart-path[data-tone="success"] .df-chart-path-line { stroke:var(--df-success); }.df-chart-path[data-tone="warn"] .df-chart-path-line { stroke:var(--df-warn); }
.df-chart-path-labels { display:flex; justify-content:space-between; color:var(--df-muted); font-size:10px; }
.df-image-object { align-items:center; justify-content:center; overflow:hidden; }.df-image-object img { width:100%; height:100%; object-fit:var(--df-image-fit); transform:translate3d(calc(var(--df-parallax-x,0) * 1px),calc(var(--df-parallax-y,0) * 1px),0); }
.df-image-object[data-mask="rounded"] { border-radius:20px; }.df-image-object[data-mask="circle"] { border-radius:50%; aspect-ratio:1; }
`;

function withResolvedCinematic(config: DemoConfig, scene: Scene): Scene {
  const cinematic = resolveSceneCinematic(config, scene);
  return cinematic && cinematic !== scene.cinematic ? ({ ...scene, cinematic } as Scene) : scene;
}

async function resolveAvatar(spec: AvatarSpec | undefined, assetFile?: string): Promise<ResolvedAvatar | undefined> {
  if (!spec) return undefined;
  if (typeof spec === 'string') {
    if (!assetFile) throw new Error('avatar asset was not registered');
    return { img: await normalizeImageToDataUrl(assetFile, 96) };
  }
  return { initials: spec.initials, color: spec.color };
}

async function resolveAvatars(
  scene: ChatScene,
  object: ResolvedShotObject,
  context: RenderContext,
): Promise<ResolvedAvatars | undefined> {
  if (!scene.avatars) return undefined;
  return {
    user: await resolveAvatar(
      scene.avatars.user,
      typeof scene.avatars.user === 'string'
        ? context.assets.require(`${object.assetPrefix}.avatars.user`).file
        : undefined,
    ),
    assistant: await resolveAvatar(
      scene.avatars.assistant,
      typeof scene.avatars.assistant === 'string'
        ? context.assets.require(`${object.assetPrefix}.avatars.assistant`).file
        : undefined,
    ),
  };
}

async function objectSceneHtml(
  config: DemoConfig,
  object: ResolvedShotObject,
  context: RenderContext,
  themeMode: 'light' | 'dark',
): Promise<string> {
  if (object.kind !== 'scene' || !object.scene) throw new Error('scene renderer received a primitive object');
  const scene = withResolvedCinematic(config, object.scene);
  const index = object.sceneIndex;
  switch (scene.type) {
    case 'typing':
      return typingHtml(scene, index, config.frame.type, config.frame.type === 'terminal' ? config.frame.prompt : '$');
    case 'steps':
      return stepsHtml(scene, index);
    case 'status-card':
      return statusCardHtml(scene, index);
    case 'screenshot':
      return screenshotHtml(scene, index, await normalizeImageToDataUrl(context.assets.require(`${object.assetPrefix}.src`).file));
    case 'terminal-playback':
      return terminalPlaybackHtml(
        scene,
        index,
        config.frame.type,
        config.frame.type === 'terminal' ? config.frame.prompt : '$',
        [],
      );
    case 'code':
      return codeHtml(scene, index, themeMode);
    case 'chat':
      return chatHtml(scene, index, await resolveAvatars(scene, object, context));
    case 'metric-card':
      return metricCardHtml(scene, index);
    case 'screen':
      return screenHtml(scene, index);
    case 'hold':
      throw new Error('hold cannot be rendered as a shot object');
  }
}

async function localAssetDataUrl(file: string, tint?: string): Promise<string> {
  if (path.extname(file).toLowerCase() !== '.svg') return normalizeImageToDataUrl(file, 1024);
  const safe = tintSvg(await readFile(file, 'utf8'), tint);
  return `data:image/svg+xml;base64,${Buffer.from(safe).toString('base64')}`;
}

function metricText(metric: Extract<ShotObject, { kind: 'hero-metric' }>['metric']): string {
  const fixed = Math.abs(metric.value).toFixed(metric.decimals);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${metric.prefix ?? ''}${metric.value < 0 ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}${metric.suffix ?? ''}`;
}

function chartPoints(series: number[]): string {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = Math.max(1e-9, max - min);
  return series.map((value, index) => {
    const x = series.length === 1 ? 0 : (index / (series.length - 1)) * 100;
    const y = 92 - ((value - min) / span) * 78;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

async function objectPrimitiveHtml(object: ResolvedShotObject, context: RenderContext): Promise<string> {
  const primitive = object.primitive;
  if (!primitive) throw new Error('primitive renderer received a scene object');
  switch (primitive.kind) {
    case 'kinetic-text': {
      const words = primitive.text.trim().split(/\s+/);
      return `<div class="df-primitive df-kinetic" data-primitive="kinetic-text" data-align="${primitive.align}" data-scale="${primitive.scale}">` +
        `${primitive.eyebrow ? `<div class="df-kinetic-eyebrow" data-qa-key="kinetic-eyebrow">${escapeHtml(primitive.eyebrow)}</div>` : ''}` +
        `<div class="df-kinetic-copy" data-qa-key="kinetic-copy" style="--df-word-count:${words.length}">${words.map((word, index) => `<span class="df-kinetic-word" style="--df-word-index:${index}">${escapeHtml(word)}</span>`).join('')}</div></div>`;
    }
    case 'logo-lockup': {
      const dataUrl = await localAssetDataUrl(context.assets.require(`${object.assetPrefix}.src`).file);
      return `<div class="df-primitive df-lockup" data-primitive="logo-lockup" data-arrangement="${primitive.arrangement}" data-manifest-ref="${escapeHtml(primitive.manifestRef)}">` +
        `<img class="df-lockup-mark" src="${dataUrl}" alt=""><div class="df-lockup-copy"><div class="df-lockup-name" data-qa-key="logo-product">${escapeHtml(primitive.product)}</div>` +
        `${primitive.tagline ? `<div class="df-lockup-tagline" data-qa-key="logo-tagline">${escapeHtml(primitive.tagline)}</div>` : ''}</div></div>`;
    }
    case 'product-surface':
      return `<div class="df-primitive df-product-surface" data-primitive="product-surface" data-device="${primitive.device}" data-state="${primitive.state}">` +
        `${primitive.device === 'panel' ? '' : '<div class="df-surface-bar"></div>'}<div class="df-surface-head"><div class="df-surface-title" data-qa-key="surface-title">${escapeHtml(primitive.title)}</div>` +
        `${primitive.subtitle ? `<div class="df-surface-subtitle">${escapeHtml(primitive.subtitle)}</div>` : ''}</div><div class="df-surface-rows">` +
        primitive.rows.map((row, index) => `<div class="df-surface-row" data-qa-key="surface-row-${index}" style="--df-row-index:${index};--df-row-count:${primitive.rows.length}"><span>${escapeHtml(row.label)}</span>${row.value ? `<span class="df-surface-row-value df-tone-${row.tone}">${escapeHtml(row.value)}</span>` : ''}</div>`).join('') + '</div></div>';
    case 'hero-metric':
      return `<div class="df-primitive df-hero-metric" data-primitive="hero-metric" data-tone="${primitive.tone}" data-align="${primitive.slot === 'hero' ? 'center' : 'left'}"><div class="df-hero-metric-value" data-qa-key="hero-metric" data-primitive-counter data-value="${primitive.metric.value}" data-prefix="${escapeHtml(primitive.metric.prefix ?? '')}" data-suffix="${escapeHtml(primitive.metric.suffix ?? '')}" data-decimals="${primitive.metric.decimals}">${escapeHtml(metricText(primitive.metric))}</div><div class="df-hero-metric-label" data-qa-key="hero-metric-label">${escapeHtml(primitive.label)}</div>${primitive.detail ? `<div class="df-hero-metric-detail">${escapeHtml(primitive.detail)}</div>` : ''}</div>`;
    case 'chart-path':
      return `<div class="df-primitive df-chart-path" data-primitive="chart-path" data-tone="${primitive.tone}">${primitive.title ? `<div class="df-chart-path-title" data-qa-key="chart-title">${escapeHtml(primitive.title)}</div>` : ''}<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline class="df-chart-path-line" pathLength="1" points="${chartPoints(primitive.series)}" /></svg>${primitive.labels ? `<div class="df-chart-path-labels">${primitive.labels.map((label) => `<span>${escapeHtml(label)}</span>`).join('')}</div>` : ''}</div>`;
    case 'image': {
      const dataUrl = await localAssetDataUrl(context.assets.require(`${object.assetPrefix}.src`).file, primitive.tint);
      return `<div class="df-primitive df-image-object" data-primitive="image" data-mask="${primitive.mask}" data-parallax="${primitive.parallax}"><img src="${dataUrl}" alt="${escapeHtml(primitive.alt)}" style="--df-image-fit:${primitive.fit}" data-qa-key="image-object"></div>`;
    }
  }
}

async function shotObjectHtml(
  config: DemoConfig,
  object: ResolvedShotObject,
  context: RenderContext,
  themeMode: 'light' | 'dark',
): Promise<string> {
  return object.kind === 'scene'
    ? objectSceneHtml(config, object, context, themeMode)
    : objectPrimitiveHtml(object, context);
}

function timelineForGraph(graph: ResolvedShotGraph): Timeline {
  const scenes: TimelineScene[] = graph.shots.map((shot) => ({
    index: shot.index,
    type: 'screen',
    name: shot.id,
    start: shot.start,
    end: shot.end,
    duration: shot.duration,
    renderIndex: shot.index,
    chromeLayer: 0,
    transition: 'cut',
    data: {},
  }));
  return {
    duration: graph.duration,
    fps: graph.fps,
    frameCount: graph.frameCount,
    fade: 0.45,
    scenes,
  };
}

function runtimePayload(graph: ResolvedShotGraph, timeline: Timeline): string {
  const scenes = graph.shots.flatMap((shot) =>
    shot.objects.filter((object) => object.kind === 'scene' && object.scene).map((object) => ({
      index: object.sceneIndex,
      type: object.scene!.type,
      start: shot.start,
      end: shot.end,
      duration: shot.duration,
      renderIndex: object.sceneIndex,
      chromeLayer: 0,
      transition: 'cut',
      data: sceneClientData(object.scene!, object.scene!.type === 'terminal-playback'),
    })),
  );
  return JSON.stringify({ ...timeline, scenes, shotGraph: graph });
}

function frameShell(config: DemoConfig, content: string, logoDataUrl: string): string {
  const logo = logoDataUrl ? `<img class="df-logo-header" src="${logoDataUrl}" alt="">` : '';
  switch (config.frame.type) {
    case 'phone':
      return phoneShellHtml(phoneChromeHtml(config.frame, 0, config.frame.title ? logo : '', Boolean(config.frame.title)), content);
    case 'browser':
      return browserShellHtml(browserChromeHtml(config.frame, 0, logo), content);
    case 'terminal':
      return terminalShellHtml(terminalChromeHtml(config.frame, 0, logo), content);
    case 'desktop':
      return desktopShellHtml(desktopChromeHtml(config.frame, 0, logo, Boolean(config.frame.subtitle)), content);
    case 'none':
      return noneHtml(content);
  }
}

export async function buildCompositorDocument(
  config: DemoConfig,
  contextOrBaseDir: RenderContext | string,
  fpsOverride?: number,
): Promise<BuiltDocument> {
  const context = renderContext(config, contextOrBaseDir);
  const graph = resolveShotGraph(config, fpsOverride);
  if (graph.renderPath !== 'compositor') throw new Error('compositor document requires shots or recipe authoring');
  const timeline = timelineForGraph(graph);
  const theme = resolveTheme(config.theme);
  const layers: string[] = [];
  for (const shot of graph.shots) {
    let supportingIndex = 0;
    const supportingCount = shot.objects.filter((object) => object.slot === 'supporting').length;
    const objects: string[] = [];
    for (const object of shot.objects) {
      const order = object.slot === 'supporting' ? supportingIndex++ : 0;
      const supportHeight = supportingCount > 0 ? Math.max(22, 74 / supportingCount) : 0;
      const supportTop = 12 + order * (supportHeight + 4);
      objects.push(
        `<div class="df-shot-object df-shot-slot-${object.slot}" data-shot-object="${escapeHtml(object.key)}" ` +
          `data-object-id="${escapeHtml(object.id)}" data-qa-key="shot-object-${escapeHtml(object.id)}" style="--df-slot-order:${order};` +
          `--df-support-top:${supportTop}%;--df-support-height:${supportHeight}%">` +
          `${await shotObjectHtml(config, object, context, theme.mode)}</div>`,
      );
    }
    layers.push(
      `<section class="df-shot-layer" data-shot-layer="${escapeHtml(shot.id)}">` +
        `<div class="df-shot-ambient" data-shot-ambient="${escapeHtml(shot.id)}"></div>${objects.join('')}</section>`,
    );
  }

  const logo = normalizeLogo(config.theme.logo);
  const logoDataUrl = logo
    ? await normalizeImageToDataUrl(context.assets.require('theme.logo').file, 256)
    : '';
  const compositor = `<div class="df-scenes" style="position:relative;z-index:1;flex:1;min-height:0;">` +
    `<div class="df-compositor"><div class="df-compositor-camera">${layers.join('')}</div></div></div>`;
  const css = [
    fontCss(config.theme.font, context), themeCss(config.theme), baseCss, phoneCss, browserCss, terminalCss,
    desktopCss, noneCss, frameCss(config.frame), typingCss, stepsCss, statusCardCss, screenshotCss,
    terminalPlaybackCss, codeCss, chatCss, metricCardCss, screenCss, blockCss, compositorCss,
  ].join('\n');
  const bodyClasses = [
    `df-frame-${config.frame.type}`,
    isTransparentFrame(config.frame) ? 'df-outside-transparent' : '',
    config.frame.shadow ? '' : 'df-frame-shadow-off',
  ].filter(Boolean).join(' ');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head>` +
    `<body class="${bodyClasses}">${frameShell(config, compositor, logoDataUrl)}` +
    `<script>${runtimeJs(runtimePayload(graph, timeline), true)}</script></body></html>`;
  return {
    html,
    viewport: captureViewport(config.frame),
    timeline,
    transparent: isTransparentFrame(config.frame),
    frameMargin: config.frame.margin ?? 0,
  };
}
