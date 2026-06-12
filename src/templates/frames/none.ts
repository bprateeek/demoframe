export const noneCss = `
body.df-frame-none { background: var(--df-screen); }
.df-none {
  padding: 0;
}
.df-none .df-safe {
  width: 100vw;
  height: 100vh;
  flex: none;
}
`;

export function noneHtml(scenesHtml: string): string {
  return `<div class="df-stage df-none">
  <div class="df-safe">${scenesHtml}</div>
</div>`;
}
