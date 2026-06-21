import { escapeHtml } from '../html.js';
import { icons } from '../icons.js';
import { sceneShell } from '../base.js';
import type { StepsScene } from '../../config/schema.js';

export const stepsCss = `
.df-steps-list { padding-top: var(--df-s6); }
.df-steps-header { display: flex; align-items: flex-start; gap: var(--df-s3); margin-bottom: var(--df-s5); }
.df-steps-header-icon { width: 26px; height: 26px; color: var(--df-text); flex: 0 0 auto; margin-top: 1px; }
.df-steps-header strong { display: block; font-size: var(--df-fs-lg); font-weight: 700; }
.df-steps-header p { margin-top: var(--df-s2); font-size: var(--df-fs-base); color: var(--df-text); }
.df-step {
  display: flex;
  align-items: flex-start;
  gap: var(--df-s3);
  margin-bottom: var(--df-s5);
  opacity: 0;
  transform: translateY(10px);
}
.df-step-icon { width: 24px; height: 24px; flex: 0 0 auto; margin-top: 1px; }
.df-step-icon-done { color: var(--df-success); }
.df-step-icon-done .df-step-badge {
  width: 100%; height: 100%; border-radius: 50%;
  background: var(--df-success-bg);
  display: flex; align-items: center; justify-content: center;
}
.df-step-icon-done svg { width: 15px; height: 15px; }
.df-step-dot-ring {
  width: 100%; height: 100%; border-radius: 50%;
  border: 2px solid var(--df-accent);
  display: flex; align-items: center; justify-content: center;
  opacity: 0.9;
}
.df-step-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--df-accent); }
.df-step-pending-ring { width: 100%; height: 100%; border-radius: 50%; border: 2px solid var(--df-border); }
.df-step-text { min-width: 0; }
.df-step-text strong { display: block; font-size: var(--df-fs-lg); font-weight: 700; }
.df-step-text span { display: block; margin-top: var(--df-s1); font-size: var(--df-fs-base); color: var(--df-muted); }
.df-step-text .df-step-link { color: var(--df-info); text-decoration: underline; }
.df-frame-terminal .df-steps-list { padding-top: var(--df-s2); }
.df-frame-terminal .df-step { margin-bottom: var(--df-s3); }
.df-frame-terminal .df-step-text strong { font-size: 15px; font-family: var(--df-font-mono); }
.df-frame-terminal .df-step-text span { font-size: 13px; font-family: var(--df-font-mono); }
`;

function stepIcon(state: string): string {
  if (state === 'done') {
    return `<div class="df-step-icon df-step-icon-done"><div class="df-step-badge">${icons.check}</div></div>`;
  }
  if (state === 'active') {
    return `<div class="df-step-icon"><div class="df-step-dot-ring"><div class="df-step-dot"></div></div></div>`;
  }
  return `<div class="df-step-icon"><div class="df-step-pending-ring"></div></div>`;
}

export function stepsHtml(scene: StepsScene, index: number): string {
  const header = scene.header
    ? `<div class="df-steps-header">
        <div class="df-steps-header-icon">${icons.checkCircleOutline}</div>
        <div>
          <strong>${escapeHtml(scene.header.title)}</strong>
          ${scene.header.detail ? `<p>${escapeHtml(scene.header.detail)}</p>` : ''}
        </div>
      </div>`
    : '';
  const tapIdx = scene.tap ? scene.items.findIndex((it) => it.link) : -1;
  let celebrateIdx = -1;
  scene.items.forEach((it, k) => {
    if (it.link) celebrateIdx = k;
  });
  const items = scene.items
    .map((item, k) => {
      const tapAttr = k === tapIdx ? ' data-tap-target' : '';
      const anchorAttr = k === celebrateIdx ? ' data-celebrate-anchor' : '';
      return `<div class="df-step" data-step="${k}" data-qa-key="step-${k}"${tapAttr}${anchorAttr}>
        ${stepIcon(item.state)}
        <div class="df-step-text">
          <strong>${escapeHtml(item.label)}</strong>
          ${item.detail ? `<span class="${item.link ? 'df-step-link' : ''}">${escapeHtml(item.detail)}</span>` : ''}
        </div>
      </div>`;
    })
    .join('\n');
  return sceneShell(
    index,
    `    <div class="df-slot-body df-steps-list">
      ${header}
      ${items}
    </div>`,
  );
}
