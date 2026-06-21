import { blockHtml } from '../blocks/index.js';
import { sceneShell } from '../base.js';
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
.df-frame-none .df-screen-rail {
  padding: clamp(24px, 5vw, 54px);
}
.df-frame-phone .df-screen-stack {
  gap: var(--df-s3);
}
`;

export function screenHtml(scene: ScreenScene, index: number): string {
  const blocks = scene.blocks.map((block, blockIndex) => blockHtml(block, blockIndex)).join('\n');
  return sceneShell(
    index,
    `    <div class="df-screen-stack">
      ${blocks}
    </div>`,
    'df-screen-rail',
  );
}
