export {
  demoConfigSchema,
  budgetToBytes,
  outputFormats,
  normalizeTermLines,
  TEXT_LIMITS,
  CODE_LANGS,
  FRAME_VIEWPORTS,
} from './config/schema.js';
export type {
  DemoConfig,
  Scene,
  Frame,
  Theme,
  Output,
  OutputFormat,
  TerminalPlaybackScene,
  CodeScene,
  ChatScene,
  MetricCardScene,
  CodeLang,
} from './config/schema.js';
export { loadConfig, ConfigError } from './config/load.js';
export { PRESETS, PRESET_NAMES, applyPreset } from './config/presets.js';
export type { DestinationPreset, PresetName } from './config/presets.js';
export { scanForPrivateData } from './config/privacy.js';
export { resolveTimeline } from './render/timeline.js';
export type { Timeline, TimelineScene } from './render/timeline.js';
export { buildDocument } from './templates/document.js';
export type { BuiltDocument } from './templates/document.js';
export { renderFrames } from './render/frames.js';
export type { RenderedFrames } from './render/frames.js';
export { openRenderSession } from './render/browser.js';
export { encodeGif } from './encode/gif.js';
export { encodeMp4 } from './encode/mp4.js';
export { encodeWebp } from './encode/webp.js';
export { encodeWebm } from './encode/webm.js';
export { parseGif } from './qa/gifInfo.js';
export { inspectGif, inspectMp4, inspectWebm, inspectWebp } from './qa/report.js';
export type { OutputReport } from './qa/report.js';
export { runCheck } from './commands/check.js';
export { runRender } from './commands/render.js';
export { writePreviewStills } from './commands/preview.js';
export { ensureChromium, installBrowser } from './env/install.js';
export { ensureGifski, resolveGifski, demoframeCacheDir } from './env/gifski.js';
