import { escapeHtml } from '../html.js';
import type { Frame } from '../../config/schema.js';

export const desktopCss = `
.df-device-desktop {
  width: calc(100vw - 48px);
  height: calc(100vh - 48px);
  background: var(--df-card);
  border-radius: var(--df-radius-lg);
  border: 1px solid var(--df-border);
  box-shadow: 0 24px 60px var(--df-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.df-desktop-bar {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 96px 1fr 96px;
  align-items: center;
  padding: var(--df-s3) var(--df-s4);
  border-bottom: 1px solid var(--df-border);
}
.df-desktop-title {
  justify-self: center;
  font-size: var(--df-fs-sm);
  font-weight: 600;
  color: var(--df-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.df-desktop-toolbar {
  flex: 0 0 auto;
  padding: var(--df-s2) var(--df-s4);
  font-size: var(--df-fs-xs);
  color: var(--df-faint);
  border-bottom: 1px solid var(--df-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.df-desktop-content {
  flex: 1;
  min-height: 0;
  background: var(--df-screen);
  display: flex;
  flex-direction: column;
}
`;

export function desktopHtml(
  frame: Extract<Frame, { type: 'desktop' }>,
  scenesHtml: string,
  headerLogoHtml = '',
): string {
  const toolbar = frame.subtitle
    ? `<div class="df-desktop-toolbar">${escapeHtml(frame.subtitle)}</div>`
    : '';
  return `<div class="df-stage">
  <div class="df-device-desktop">
    <div class="df-desktop-bar">
      <div class="df-traffic"><i></i><i></i><i></i></div>
      <div class="df-desktop-title">${escapeHtml(frame.title ?? 'My App')}</div>
      <div class="df-logo-slot">${headerLogoHtml}</div>
    </div>
    ${toolbar}
    <div class="df-desktop-content">
      <div class="df-safe">${scenesHtml}</div>
    </div>
  </div>
</div>`;
}
