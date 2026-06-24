import { blockHtml } from '../blocks/index.js';
import { cinematicCompositionSceneClass, sceneShell } from '../base.js';
import type { ScreenScene } from '../../config/schema.js';

export const screenCss = `
.df-screen-rail {
  overflow: hidden;
}
.df-screen-stack {
  display: flex;
  flex-direction: column;
  gap: var(--df-s4);
  min-height: 100%;
  transform-origin: center center;
  will-change: transform;
}
.df-screen-layout-hero {
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: clamp(14px, 3vw, 24px);
}
.df-screen-layout-hero .df-screen-block {
  width: min(680px, 100%);
}
.df-screen-layout-hero .df-screen-app-header {
  justify-content: center;
}
.df-screen-layout-hero .df-screen-header-text {
  flex: 0 1 auto;
}
.df-screen-layout-hero .df-screen-title,
.df-screen-layout-hero .df-screen-subtitle {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}
.df-screen-layout-hero .df-screen-callout {
  width: min(560px, 100%);
  padding: clamp(22px, 4vw, 40px);
}
.df-screen-layout-hero .df-callout-value {
  font-size: clamp(38px, 8vw, 72px);
}
.df-screen-layout-split {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  align-content: center;
  align-items: start;
  gap: clamp(14px, 3vw, 24px);
}
.df-screen-layout-split .df-screen-app-header {
  grid-column: 1 / -1;
}
.df-screen-layout-split .df-screen-block {
  min-width: 0;
}
.df-screen-layout-split .df-screen-callout {
  width: 100%;
}
.df-frame-phone .df-screen-layout-split {
  display: flex;
}
@media (max-width: 640px) {
  .df-screen-layout-split {
    display: flex;
  }
}
.df-frame-none .df-screen-rail {
  padding: clamp(24px, 5vw, 54px);
}
.df-frame-phone .df-screen-stack {
  gap: var(--df-s3);
}
`;

export function screenHtml(scene: ScreenScene, index: number): string {
  const blocks = scene.blocks.map((block, blockIndex) => blockHtml(block, blockIndex)).join('\n');
  const compositionClass = scene.motion === 'reveal' ? cinematicCompositionSceneClass(scene, 'screen') : '';
  const layoutClass = `df-screen-layout-${scene.layout}`;
  return sceneShell(
    index,
    `    <div class="df-screen-stack ${layoutClass}">
      ${blocks}
    </div>`,
    'df-screen-rail',
    compositionClass,
  );
}
