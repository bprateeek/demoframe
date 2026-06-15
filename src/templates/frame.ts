import { TRANSPARENT_GUTTER, type Frame } from '../config/schema.js';

function deviceColor(frame: Frame): string {
  return frame.type === 'phone' ? (frame.deviceColor ?? '#18243a') : '#18243a';
}

function outsideBackgroundCss(frame: Frame): string {
  if (frame.outside === 'transparent') return 'body.df-outside-transparent { background: transparent; }';
  if (frame.outside === 'page') return '';
  return `body.df-frame-${frame.type} { background: ${frame.outside}; }`;
}

export function frameCss(frame: Frame): string {
  return `:root {
  --df-device: ${deviceColor(frame)};
  --df-transparent-gutter: ${TRANSPARENT_GUTTER}px;
  --df-transparent-gutter-total: ${TRANSPARENT_GUTTER * 2}px;
}
${outsideBackgroundCss(frame)}
body.df-frame-shadow-off .df-device-phone,
body.df-frame-shadow-off .df-device-browser,
body.df-frame-shadow-off .df-device-terminal,
body.df-frame-shadow-off .df-device-desktop {
  box-shadow: none;
}
body.df-outside-transparent .df-device-phone {
  width: calc(100vw - 32px - var(--df-transparent-gutter-total));
  height: calc(100vh - 32px - var(--df-transparent-gutter-total));
}
body.df-outside-transparent .df-device-browser,
body.df-outside-transparent .df-device-terminal,
body.df-outside-transparent .df-device-desktop {
  width: calc(100vw - 48px - var(--df-transparent-gutter-total));
  height: calc(100vh - 48px - var(--df-transparent-gutter-total));
}
body.df-outside-transparent.df-frame-none .df-none .df-safe {
  width: calc(100vw - var(--df-transparent-gutter-total));
  height: calc(100vh - var(--df-transparent-gutter-total));
  background: var(--df-screen);
}`;
}
