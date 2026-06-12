import { escapeHtml } from '../html.js';
import type { Frame } from '../../config/schema.js';

export const terminalCss = `
.df-device-terminal {
  width: calc(100vw - 48px);
  height: calc(100vh - 48px);
  background: #11151c;
  border-radius: var(--df-radius-lg);
  border: 1px solid #262d38;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.df-terminal-bar {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 96px 1fr 96px;
  align-items: center;
  padding: var(--df-s3) var(--df-s4);
  background: #1a2029;
  border-bottom: 1px solid #262d38;
}
.df-terminal-title {
  justify-self: center;
  font-family: var(--df-font-mono);
  font-size: var(--df-fs-xs);
  color: #8d96a3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.df-terminal-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  font-family: var(--df-font-mono);
  font-size: 15px;
  line-height: 1.65;
  color: #d6dde6;
}
.df-frame-terminal .df-rail { padding: var(--df-s4) var(--df-s5); }
`;

export function terminalHtml(
  frame: Extract<Frame, { type: 'terminal' }>,
  scenesHtml: string,
  headerLogoHtml = '',
): string {
  return `<div class="df-stage">
  <div class="df-device-terminal">
    <div class="df-terminal-bar">
      <div class="df-traffic"><i></i><i></i><i></i></div>
      <div class="df-terminal-title">${escapeHtml(frame.title ?? 'demo')}</div>
      <div class="df-logo-slot">${headerLogoHtml}</div>
    </div>
    <div class="df-terminal-content">
      <div class="df-safe">${scenesHtml}</div>
    </div>
  </div>
</div>`;
}
