import { escapeHtml } from '../html.js';
import { icons } from '../icons.js';
import type { Frame } from '../../config/schema.js';

export const phoneCss = `
.df-device-phone {
  width: calc(100vw - 32px);
  height: calc(100vh - 32px);
  background: var(--df-device);
  border-radius: 64px;
  padding: 7px;
  box-shadow: 0 24px 60px var(--df-shadow);
}
.df-phone-screen {
  width: 100%;
  height: 100%;
  background: var(--df-screen);
  border-radius: 57px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.df-statusbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 36px 6px;
}
.df-sb-time { font-size: 17px; font-weight: 700; letter-spacing: 0.2px; }
.df-sb-icons { display: flex; align-items: center; gap: 7px; }
.df-sb-icons .df-ic { height: 13px; width: auto; }
.df-sb-icons .df-ic svg { width: auto; height: 100%; }
.df-appbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 10px;
}
.df-appbar-empty { visibility: hidden; }
.df-circle-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--df-card);
  box-shadow: 0 2px 10px var(--df-shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--df-text);
}
.df-circle-btn svg { width: 22px; height: 22px; }
.df-appbar-title { text-align: center; min-width: 0; padding: 0 var(--df-s3); }
.df-appbar-title strong {
  display: block;
  font-size: var(--df-fs-lg);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.df-appbar-title span {
  display: block;
  margin-top: 2px;
  font-size: var(--df-fs-sm);
  color: var(--df-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;

export function phoneChromeHtml(
  frame: Extract<Frame, { type: 'phone' }>,
  layerId: number,
  headerLogoHtml = '',
  reserveAppBar = Boolean(frame.title),
): string {
  const rightSlot = headerLogoHtml
    ? `<div class="df-logo-slot">${headerLogoHtml}</div>`
    : `<div class="df-circle-btn">${icons.ellipsis}</div>`;
  const appbar = frame.title
    ? `<div class="df-appbar">
        <div class="df-circle-btn">${icons.chevronLeft}</div>
        <div class="df-appbar-title">
          <strong>${escapeHtml(frame.title)}</strong>
          ${frame.subtitle ? `<span>${escapeHtml(frame.subtitle)}</span>` : ''}
        </div>
        ${rightSlot}
      </div>`
    : reserveAppBar
      ? `<div class="df-appbar df-appbar-empty" aria-hidden="true">
        <div class="df-circle-btn">${icons.chevronLeft}</div>
        <div class="df-appbar-title"><strong>&nbsp;</strong></div>
        <div class="df-circle-btn">${icons.ellipsis}</div>
      </div>`
    : '';
  return `<div class="df-chrome-layer" data-chrome="${layerId}">
      <div class="df-statusbar">
        <span class="df-sb-time">${escapeHtml(frame.statusBarTime)}</span>
        <span class="df-sb-icons">
          <span class="df-ic" style="width:20px">${icons.signal}</span>
          <span class="df-ic" style="width:20px">${icons.wifi}</span>
          <span class="df-ic" style="width:27px">${icons.battery}</span>
        </span>
      </div>
      ${appbar}
  </div>`;
}

export function phoneShellHtml(chromeLayersHtml: string, scenesHtml: string): string {
  return `<div class="df-stage">
  <div class="df-device-phone">
    <div class="df-phone-screen">
      <div class="df-chrome-stack">${chromeLayersHtml}</div>
      <div class="df-safe">${scenesHtml}</div>
    </div>
  </div>
</div>`;
}

export function phoneHtml(
  frame: Extract<Frame, { type: 'phone' }>,
  scenesHtml: string,
  headerLogoHtml = '',
): string {
  return phoneShellHtml(phoneChromeHtml(frame, 0, headerLogoHtml), scenesHtml);
}
