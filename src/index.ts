export {
  demoConfigSchema,
  budgetToBytes,
  outputFormats,
  normalizeTermLines,
  TEXT_LIMITS,
  CODE_LANGS,
  FRAME_VIEWPORTS,
  frameViewport,
  resolveFrameCapture,
  normalizeLogo,
  hasCinematicFields,
  resolveSceneCinematic,
  sceneSupportsCinematicDefault,
  CINEMATIC_COMPOSITION_NAMES,
  SCREEN_LAYOUT_NAMES,
  PALETTE_KEYS,
  THEME_PRESET_NAMES,
  PROFILE_NAMES,
} from './config/schema.js';
export type {
  DemoConfig,
  Scene,
  Frame,
  Theme,
  Output,
  OutputFormat,
  MotionBlur,
  SceneCinematic,
  ConfigCinematic,
  CinematicCompositionName,
  ScreenLayoutName,
  FrameCaptureMode,
  FrameCapturePlan,
  TerminalPlaybackScene,
  CodeScene,
  ChatScene,
  MetricCardScene,
  DesktopFrame,
  ThemePalette,
  ThemePresetName,
  CodeLang,
  ProfileName,
  StoryV2,
  StoryBeat,
  StoryProof,
  ArtDirection,
} from './config/schema.js';
export { contextManifestSchema, contextEntrySchema } from './context/schema.js';
export type { ContextManifest, ContextEntry, MetricContextEntry, ContextSource } from './context/schema.js';
export {
  validateContextManifest,
  selectedSourceContent,
  sha256Digest,
  findRepoRoot,
} from './context/load.js';
export type { ContextFinding, ValidatedContextManifest } from './context/load.js';
export { runContextInit } from './commands/contextInit.js';
export { loadConfig, ConfigError, suppliedDotPaths, wasSupplied } from './config/load.js';
export type { LoadedConfig, ConfigProvenance } from './config/load.js';
export { PRESETS, PRESET_NAMES, applyPreset } from './config/presets.js';
export type { DestinationPreset, PresetName } from './config/presets.js';
export { resolveProfile, DESTINATION_PROFILE_DEFAULTS } from './config/profiles.js';
export type { ProfileResolution, ProfileFinding } from './config/profiles.js';
export { scanForPrivateData } from './config/privacy.js';
export { resolveTimeline } from './render/timeline.js';
export type { Timeline, TimelineScene } from './render/timeline.js';
export { previewSampleTimes, motionPeakTimes, timelineMotionWindows } from './render/sampling.js';
export type { TimelineMotionWindow } from './render/sampling.js';
export {
  MOTION_EASING_NAMES,
  MOTION_PRESET_NAMES,
  MOTION_PRESET_REGISTRY,
  motionPreset,
  isMotionSceneEligible,
} from './templates/motion/presets.js';
export type {
  MotionEasingName,
  MotionPreset,
  MotionPresetName,
  MotionSceneType,
  MotionWindowName,
  MotionWindowPreset,
} from './templates/motion/presets.js';
export { PALETTES, THEME_PRESETS, resolveTheme } from './templates/theme.js';
export type { ResolvedTheme, ThemePreset } from './templates/theme.js';
export { buildDocument } from './templates/document.js';
export type { BuiltDocument } from './templates/document.js';
export { renderFrames } from './render/frames.js';
export type { RenderedFrames } from './render/frames.js';
export { openRenderSession } from './render/browser.js';
export { AssetPathRegistry, createRenderContext, renderContext } from './render/context.js';
export type { AssetKind, AssetPathEntry, RenderContext } from './render/context.js';
export { encodeGif } from './encode/gif.js';
export { encodeMp4 } from './encode/mp4.js';
export { encodeWebp } from './encode/webp.js';
export { encodeWebm } from './encode/webm.js';
export { ENCODER_PROFILES, parseEncoderProfile } from './encode/profiles.js';
export type { EncoderProfile, EncoderSettings, EncodeOptions, EncodeResult } from './encode/profiles.js';
export { parseGif } from './qa/gifInfo.js';
export { inspectGif, inspectMp4, inspectWebm, inspectWebp } from './qa/report.js';
export type { OutputReport, ReportEncoding } from './qa/report.js';
export { createInputManifest, stableStringify } from './qa/inputManifest.js';
export type { InputManifest, InputHashEntry } from './qa/inputManifest.js';
export { validateStoryV2, formatContextMetric } from './qa/story.js';
export type { StoryValidationResult, StoryFinding, ProofBindingReport } from './qa/story.js';
export { validateAppearanceDelta } from './qa/appearance.js';
export type { AppearanceValidationResult, AppearanceDeltaItem, AppearanceFinding } from './qa/appearance.js';
export { nfc, nfcContains, identityTokenSubsequence } from './qa/textMatch.js';
export { runCheck } from './commands/check.js';
export type { CheckFinding, CheckResult, CheckOptions } from './commands/check.js';
export { checkJsonDocument, checkJsonFailure, CHECK_JSON_SCHEMA_VERSION } from './commands/checkJson.js';
export type { CheckJsonDocument, CheckJsonFinding, CheckFindingSeverity } from './commands/checkJson.js';
export { runRender } from './commands/render.js';
export { writePreviewStills } from './commands/preview.js';
export { installAgentInstructions } from './commands/install-agent-instructions.js';
export { ensureChromium, installBrowser } from './env/install.js';
export { ensureGifski, resolveGifski, demoframeCacheDir } from './env/gifski.js';
