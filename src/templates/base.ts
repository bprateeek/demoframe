export const baseCss = `
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; }
body {
  background: var(--df-page);
  font-family: var(--df-font-sans);
  color: var(--df-text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow: hidden;
}
svg { display: block; width: 100%; height: 100%; }
.df-stage {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.df-safe {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.df-ambient {
  position: absolute;
  inset: -8%;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: 0.48;
  transform: translate3d(0, 0, 0);
}
.df-ambient-ember {
  background:
    radial-gradient(circle at 16% 18%, color-mix(in srgb, var(--df-accent) 20%, transparent), transparent 26%),
    radial-gradient(circle at 82% 76%, color-mix(in srgb, var(--df-accent) 16%, transparent), transparent 30%);
}
.df-ember {
  position: absolute;
  width: var(--df-ember-size);
  height: var(--df-ember-size);
  left: var(--df-ember-left);
  top: var(--df-ember-top);
  border-radius: 999px;
  background: radial-gradient(circle, color-mix(in srgb, var(--df-accent) 34%, transparent), transparent 66%);
  filter: blur(var(--df-ember-blur));
  opacity: var(--df-ember-opacity);
  transform: translate3d(0, 0, 0) scale(var(--df-ember-scale, 1));
}
.df-ember:nth-child(2) {
  background: radial-gradient(circle, color-mix(in srgb, var(--df-success) 18%, transparent), transparent 68%);
}
.df-ember:nth-child(3) {
  background: radial-gradient(circle, color-mix(in srgb, var(--df-info) 16%, transparent), transparent 70%);
}
.df-ember:nth-child(4) {
  background: radial-gradient(circle, color-mix(in srgb, var(--df-accent) 22%, transparent), transparent 70%);
}
.df-scene {
  position: absolute;
  inset: 0;
  opacity: 0;
  display: flex;
  flex-direction: column;
}
.df-scene-motion {
  --df-scene-motion-x: 0px;
  --df-scene-motion-y: 0px;
  --df-scene-motion-scale: 1;
  --df-scene-motion-opacity: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  opacity: var(--df-scene-motion-opacity);
  transform: translate3d(var(--df-scene-motion-x), var(--df-scene-motion-y), 0) scale(var(--df-scene-motion-scale));
  transform-origin: center center;
}
.df-rail-motion {
  --df-rail-motion-x: 0px;
  --df-rail-motion-y: 0px;
  --df-rail-motion-scale: 1;
  --df-rail-motion-opacity: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  opacity: var(--df-rail-motion-opacity);
  transform: translate3d(var(--df-rail-motion-x), var(--df-rail-motion-y), 0) scale(var(--df-rail-motion-scale));
  transform-origin: center center;
}
.df-rail {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: var(--df-s5);
}
.df-composition-center-hero-typing .df-rail-motion {
  --df-rail-motion-y: -8px;
  --df-rail-motion-scale: 1.08;
}
.df-composition-center-hero-typing .df-rail {
  justify-content: center;
}
.df-composition-center-hero-typing .df-slot-footer {
  margin-top: 0;
}
.df-frame-terminal .df-composition-center-hero-typing .df-rail-motion {
  --df-rail-motion-y: 0px;
  --df-rail-motion-scale: 1.04;
}
.df-composition-center-hero-steps .df-rail-motion {
  --df-rail-motion-scale: 1.08;
}
.df-composition-center-hero-steps .df-rail {
  justify-content: center;
}
.df-composition-center-hero-steps .df-slot-body {
  flex: 0 1 auto;
}
.df-composition-center-hero-steps .df-steps-list {
  padding-top: 0;
  padding-left: var(--df-s5);
  padding-right: var(--df-s5);
  align-self: center;
  width: min(760px, 100%);
}
.df-composition-center-hero-status-card .df-rail-motion {
  --df-rail-motion-scale: 1.06;
}
.df-composition-center-hero-status-card .df-rail {
  justify-content: center;
}
.df-composition-center-hero-status-card .df-slot-body {
  flex: 0 1 auto;
}
.df-composition-center-hero-status-card .df-card-body {
  align-self: center;
  width: min(760px, 100%);
}
.df-composition-center-hero-chat .df-rail-motion {
  --df-rail-motion-y: -6px;
  --df-rail-motion-scale: 1.06;
}
.df-composition-center-hero-chat .df-chat {
  justify-content: center;
}
.df-composition-center-hero-code .df-rail-motion {
  --df-rail-motion-scale: 1.05;
}
.df-composition-center-hero-code .df-codepanel {
  align-self: center;
  width: min(760px, 100%);
}
.df-composition-center-hero-terminal-playback .df-rail-motion {
  --df-rail-motion-scale: 1.05;
}
.df-composition-center-hero-terminal-playback .df-play-panel {
  align-self: center;
  width: min(760px, 100%);
}
.df-composition-center-hero-metric-card .df-rail-motion {
  --df-rail-motion-scale: 1.12;
}
.df-composition-center-hero-metric-card .df-metric-panel {
  align-self: center;
  width: min(680px, 100%);
}
.df-composition-center-hero-screen .df-rail-motion {
  --df-rail-motion-scale: 1.06;
}
.df-composition-center-hero-screen .df-screen-stack {
  justify-content: center;
}
.df-composition-floating-stage .df-rail-motion {
  --df-rail-motion-y: -4px;
  --df-rail-motion-scale: 1.02;
}
.df-composition-floating-stage .df-rail {
  justify-content: center;
  padding: clamp(28px, 5.4vw, 64px);
}
.df-composition-floating-stage-typing .df-slot-footer {
  align-self: center;
  width: min(720px, 100%);
  margin-top: 0;
}
.df-composition-floating-stage-steps .df-slot-body,
.df-composition-floating-stage-status-card .df-card-body,
.df-composition-floating-stage-chat .df-chat {
  align-self: center;
  flex: 0 1 auto;
  width: min(760px, 100%);
  border: 1px solid var(--df-border);
  border-radius: var(--df-radius);
  background: color-mix(in srgb, var(--df-card) 92%, transparent);
  box-shadow: 0 24px 70px var(--df-shadow);
}
.df-composition-floating-stage-steps .df-slot-body {
  padding: var(--df-s5);
}
.df-composition-floating-stage-status-card .df-card-body {
  padding: var(--df-s5);
}
.df-composition-floating-stage-chat .df-chat {
  justify-content: center;
  padding: var(--df-s4);
}
.df-composition-floating-stage-code .df-codepanel,
.df-composition-floating-stage-terminal-playback .df-play-panel,
.df-composition-floating-stage-metric-card .df-metric-panel {
  align-self: center;
  width: min(760px, 100%);
  box-shadow: 0 24px 70px var(--df-shadow);
}
.df-composition-floating-stage-screen .df-screen-stack {
  align-self: center;
  justify-content: center;
  width: min(820px, 100%);
  min-height: auto;
}
.df-composition-macro-card .df-rail-motion {
  --df-rail-motion-scale: 1.08;
}
.df-composition-macro-card .df-rail {
  justify-content: center;
  padding: clamp(22px, 4.8vw, 56px);
}
.df-composition-macro-card-typing .df-slot-footer {
  align-self: center;
  width: min(640px, 100%);
  margin-top: 0;
}
.df-composition-macro-card-steps .df-slot-body,
.df-composition-macro-card-status-card .df-card-body,
.df-composition-macro-card-chat .df-chat {
  align-self: center;
  flex: 0 1 auto;
  width: min(640px, 100%);
  border: 1px solid var(--df-border);
  border-radius: var(--df-radius);
  background: var(--df-card);
  box-shadow: 0 28px 80px var(--df-shadow);
}
.df-composition-macro-card-steps .df-slot-body,
.df-composition-macro-card-status-card .df-card-body,
.df-composition-macro-card-chat .df-chat {
  padding: var(--df-s5);
}
.df-composition-macro-card-status-card .df-card-title {
  font-size: clamp(30px, 5vw, 44px);
}
.df-composition-macro-card-status-card .df-cta {
  min-width: min(70%, 420px);
}
.df-composition-macro-card-code .df-codepanel,
.df-composition-macro-card-terminal-playback .df-play-panel,
.df-composition-macro-card-metric-card .df-metric-panel {
  align-self: center;
  width: min(640px, 100%);
  box-shadow: 0 28px 80px var(--df-shadow);
}
.df-composition-macro-card-metric-card .df-metric-value {
  font-size: clamp(30px, 5vw, 46px);
}
.df-composition-macro-card-screen .df-screen-stack {
  align-self: center;
  justify-content: center;
  width: min(660px, 100%);
  min-height: auto;
}
.df-composition-path-journey .df-rail-motion {
  --df-rail-motion-y: -2px;
  --df-rail-motion-scale: 1.03;
}
.df-composition-path-journey .df-rail {
  justify-content: center;
  padding: clamp(24px, 5vw, 58px);
}
.df-composition-path-journey-typing .df-slot-footer {
  align-self: center;
  width: min(700px, 100%);
  margin-top: 0;
}
.df-composition-path-journey-steps .df-steps-list {
  align-self: center;
  flex: 0 1 auto;
  width: min(780px, 100%);
  position: relative;
  padding: var(--df-s5) var(--df-s5) var(--df-s4) calc(var(--df-s6) + 20px);
  border: 1px solid var(--df-border);
  border-radius: var(--df-radius);
  background: color-mix(in srgb, var(--df-card) 94%, transparent);
  box-shadow: 0 20px 58px var(--df-shadow);
}
.df-composition-path-journey-steps .df-steps-list::before {
  content: "";
  position: absolute;
  left: calc(var(--df-s5) + 11px);
  top: calc(var(--df-s5) + 34px);
  bottom: var(--df-s4);
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--df-accent), color-mix(in srgb, var(--df-info) 65%, var(--df-accent)));
  opacity: 0.46;
}
.df-composition-path-journey-steps .df-steps-header,
.df-composition-path-journey-steps .df-step {
  position: relative;
  z-index: 1;
}
.df-composition-path-journey-status-card .df-card-body,
.df-composition-path-journey-chat .df-chat {
  align-self: center;
  flex: 0 1 auto;
  width: min(720px, 100%);
}
.df-composition-path-journey-code .df-codepanel,
.df-composition-path-journey-terminal-playback .df-play-panel,
.df-composition-path-journey-metric-card .df-metric-panel {
  align-self: center;
  width: min(720px, 100%);
}
.df-composition-path-journey-screen .df-screen-stack {
  align-self: center;
  justify-content: center;
  width: min(800px, 100%);
  min-height: auto;
  position: relative;
  padding-left: 26px;
}
.df-composition-path-journey-screen .df-screen-stack::before {
  content: "";
  position: absolute;
  left: 5px;
  top: 42px;
  bottom: 42px;
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--df-accent), color-mix(in srgb, var(--df-info) 65%, var(--df-accent)));
  opacity: 0.42;
}
.df-composition-path-journey-screen .df-screen-block {
  position: relative;
  z-index: 1;
}
.df-composition-path-journey-screen .df-screen-block::before {
  content: "";
  position: absolute;
  left: -26px;
  top: calc(50% - 5px);
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--df-accent);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--df-accent) 14%, transparent);
}
.df-chrome-stack {
  position: relative;
  flex: 0 0 auto;
}
.df-chrome-layer {
  opacity: 0;
}
.df-chrome-layer:first-child {
  position: relative;
}
.df-chrome-layer:not(:first-child) {
  position: absolute;
  inset: 0;
}
.df-logo-slot {
  justify-self: end;
  display: flex;
  align-items: center;
}
.df-logo-header { height: 20px; width: auto; display: block; }
.df-logo-corner {
  position: absolute;
  right: var(--df-s4);
  bottom: var(--df-s4);
  height: 28px;
  opacity: 0;
  z-index: 1;
}
.df-logo-corner img { height: 100%; width: auto; display: block; opacity: 0.85; }
.df-slot-header { flex: 0 0 auto; }
.df-slot-body { flex: 1 1 auto; min-height: 0; }
.df-slot-footer { flex: 0 0 auto; margin-top: auto; }
.df-cursor {
  position: absolute;
  left: 0;
  top: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: 2.5px solid rgba(28, 32, 40, 0.55);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
  pointer-events: none;
  opacity: 0;
  display: none;
  z-index: 5;
}
.df-cursor-ripple {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 2px solid rgba(28, 32, 40, 0.5);
  opacity: 0;
}
.df-celebrate {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  opacity: 0;
  display: none;
  z-index: 5;
}
.df-celebrate-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2.5px solid var(--df-accent);
}
.df-celebrate-check {
  position: absolute;
  left: 0;
  top: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--df-success);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.df-celebrate-check svg { width: 18px; height: 18px; }
.df-celebrate-dot {
  position: absolute;
  left: 0;
  top: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--df-accent);
}
`;

export function cinematicCompositionSceneClass(
  scene: { cinematic?: { composition?: string } },
  sceneType: string,
): string {
  const composition = scene.cinematic?.composition;
  if (
    composition !== 'center-hero' &&
    composition !== 'floating-stage' &&
    composition !== 'macro-card' &&
    composition !== 'path-journey'
  ) {
    return '';
  }
  return `df-composition-${composition} df-composition-${composition}-${sceneType}`;
}

export function centerHeroSceneClass(
  scene: { cinematic?: { composition?: string } },
  sceneType: string,
): string {
  return cinematicCompositionSceneClass(scene, sceneType);
}

export function sceneShell(index: number, railContents: string, railClass = '', sceneClass = ''): string {
  const sceneClasses = ['df-scene', sceneClass].filter(Boolean).join(' ');
  const railClasses = ['df-rail', railClass].filter(Boolean).join(' ');
  return `<div class="${sceneClasses}" data-scene="${index}">
  <div class="df-scene-motion">
    <div class="df-rail-motion">
      <div class="${railClasses}">
${railContents}
      </div>
    </div>
  </div>
</div>`;
}
