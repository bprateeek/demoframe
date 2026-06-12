import { escapeHtml } from '../html.js';
import type { ScreenshotScene } from '../../config/schema.js';

export const screenshotCss = `
.df-shot-body { display: flex; flex-direction: column; min-height: 0; }
.df-shot-wrap {
  flex: 1;
  min-height: 0;
  border-radius: var(--df-radius);
  overflow: hidden;
  border: 1px solid var(--df-border);
  background: var(--df-card);
  box-shadow: 0 6px 24px var(--df-shadow);
}
.df-shot-wrap img { width: 100%; height: 100%; display: block; transform-origin: center center; }
.df-shot-contain img { object-fit: contain; }
.df-shot-cover img { object-fit: cover; }
.df-shot-caption {
  flex: 0 0 auto;
  margin-top: var(--df-s4);
  text-align: center;
  color: var(--df-muted);
  font-size: var(--df-fs-base);
}
`;

export function screenshotHtml(
  scene: ScreenshotScene,
  index: number,
  dataUrl: string,
): string {
  const caption = scene.caption
    ? `<div class="df-shot-caption">${escapeHtml(scene.caption)}</div>`
    : '';
  return `<div class="df-scene" data-scene="${index}">
  <div class="df-rail">
    <div class="df-slot-body df-shot-body">
      <div class="df-shot-wrap df-shot-${scene.fit}">
        <img src="${dataUrl}" alt="">
      </div>
      ${caption}
    </div>
  </div>
</div>`;
}
