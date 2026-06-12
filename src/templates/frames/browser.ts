import { escapeHtml } from '../html.js';
import type { Frame } from '../../config/schema.js';

export const browserCss = `
.df-device-browser {
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
.df-browser-bar {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 96px 1fr 96px;
  align-items: center;
  padding: var(--df-s3) var(--df-s4);
  border-bottom: 1px solid var(--df-border);
}
.df-traffic { display: flex; gap: 8px; }
.df-traffic i { width: 13px; height: 13px; border-radius: 50%; }
.df-traffic i:nth-child(1) { background: #f25f57; }
.df-traffic i:nth-child(2) { background: #fbbe2e; }
.df-traffic i:nth-child(3) { background: #2bc740; }
.df-urlbar {
  justify-self: center;
  max-width: 420px;
  width: 100%;
  background: var(--df-screen);
  border: 1px solid var(--df-border);
  border-radius: 999px;
  padding: 7px var(--df-s4);
  font-size: var(--df-fs-sm);
  color: var(--df-muted);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.df-browser-content {
  flex: 1;
  min-height: 0;
  background: var(--df-screen);
  display: flex;
  flex-direction: column;
}
`;

export function browserHtml(frame: Extract<Frame, { type: 'browser' }>, scenesHtml: string): string {
  const label = frame.url ?? frame.title ?? 'localhost:3000';
  return `<div class="df-stage">
  <div class="df-device-browser">
    <div class="df-browser-bar">
      <div class="df-traffic"><i></i><i></i><i></i></div>
      <div class="df-urlbar">${escapeHtml(label)}</div>
      <div></div>
    </div>
    <div class="df-browser-content">
      <div class="df-safe">${scenesHtml}</div>
    </div>
  </div>
</div>`;
}
