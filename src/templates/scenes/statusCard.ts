import { escapeHtml } from '../html.js';
import { icons } from '../icons.js';
import type { StatusCardScene } from '../../config/schema.js';

export const statusCardCss = `
.df-card-body { padding-top: var(--df-s4); }
.df-card-repo {
  display: flex;
  align-items: center;
  gap: var(--df-s3);
  color: var(--df-muted);
  font-size: var(--df-fs-base);
  font-weight: 600;
  margin-bottom: var(--df-s4);
}
.df-card-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px dashed var(--df-border);
}
.df-card-title {
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 800;
  letter-spacing: -0.4px;
  line-height: 1.18;
  margin-bottom: var(--df-s4);
}
.df-branch-row { display: flex; align-items: center; gap: var(--df-s3); margin-bottom: var(--df-s5); }
.df-branch-chip {
  font-family: var(--df-font-mono);
  font-size: var(--df-fs-sm);
  line-height: 1.5;
  background: ${'color-mix(in srgb, var(--df-info) 9%, var(--df-card))'};
  border: 1px solid ${'color-mix(in srgb, var(--df-info) 22%, var(--df-border))'};
  color: var(--df-info);
  border-radius: var(--df-radius-sm);
  padding: var(--df-s2) var(--df-s3);
  min-width: 0;
  overflow-wrap: anywhere;
}
.df-branch-chip:first-child { flex: 0 0 auto; }
.df-branch-arrow { width: 20px; height: 20px; color: var(--df-muted); flex: 0 0 auto; }
.df-card-section {
  margin: 0 calc(-1 * var(--df-s5));
  padding: var(--df-s4) var(--df-s5);
  background: ${'color-mix(in srgb, var(--df-text) 4%, var(--df-screen))'};
  border-top: 1px solid var(--df-border);
  border-bottom: 1px solid var(--df-border);
  font-size: var(--df-fs-xl);
  font-weight: 800;
}
.df-check-row {
  display: flex;
  align-items: center;
  gap: var(--df-s4);
  padding: var(--df-s4) 0;
  border-bottom: 1px solid var(--df-border);
  font-size: var(--df-fs-lg);
  font-weight: 700;
  opacity: 0;
}
.df-check-bubble {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.df-check-bubble svg { width: 16px; height: 16px; }
.df-check-bubble-0 { background: var(--df-success); }
.df-check-bubble-1 { background: var(--df-info); }
.df-check-bubble-2 { background: var(--df-accent); }
.df-check-bubble-3 { background: var(--df-muted); }
.df-cta {
  margin-top: var(--df-s5);
  border-radius: var(--df-radius-sm);
  padding: var(--df-s4) var(--df-s5);
  font-size: var(--df-fs-lg);
  font-weight: 700;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  min-width: min(55%, 360px);
  opacity: 0;
  box-shadow: 0 4px 14px var(--df-shadow);
}
.df-cta-success { background: #22a04b; }
.df-cta-primary { background: var(--df-accent); }
.df-cta-neutral { background: var(--df-muted); }
.df-card-caption { margin-top: var(--df-s3); color: var(--df-muted); font-size: var(--df-fs-base); opacity: 0; }
.df-card-subtitle { color: var(--df-muted); font-size: var(--df-fs-base); margin-bottom: var(--df-s4); }
.df-frame-terminal .df-card-title { font-size: 22px; font-family: var(--df-font-mono); }
.df-frame-terminal .df-card-section { background: #1a2029; border-color: #262d38; font-size: 16px; }
`;

export function statusCardHtml(scene: StatusCardScene, index: number): string {
  const repo = scene.subtitle
    ? `<div class="df-card-repo"><span class="df-card-avatar"></span>${escapeHtml(scene.subtitle)}</div>`
    : '';
  const branch = scene.branch
    ? `<div class="df-branch-row">
        <span class="df-branch-chip">${escapeHtml(scene.branch.into)}</span>
        <span class="df-branch-arrow">${icons.arrowLeft}</span>
        <span class="df-branch-chip">${escapeHtml(scene.branch.from)}</span>
      </div>`
    : '';
  const checks = scene.checks
    .map(
      (label, k) => `<div class="df-check-row" data-check="${k}">
        <span class="df-check-bubble df-check-bubble-${k}">${icons.check}</span>${escapeHtml(label)}
      </div>`,
    )
    .join('\n');
  const cta = scene.cta
    ? `<div class="df-cta df-cta-${scene.cta.style}" data-qa-key="cta"${scene.tap ? ' data-tap-target' : ''} data-celebrate-anchor>${escapeHtml(scene.cta.label)}</div>`
    : '';
  const caption = scene.caption
    ? `<div class="df-card-caption" data-qa-key="caption">${escapeHtml(scene.caption)}</div>`
    : '';
  return `<div class="df-scene" data-scene="${index}">
  <div class="df-rail">
    <div class="df-slot-body df-card-body">
      ${repo}
      <h1 class="df-card-title">${escapeHtml(scene.title)}</h1>
      ${branch}
      ${scene.checks.length || scene.cta ? '<div class="df-card-section">Status</div>' : ''}
      ${checks}
      ${cta}
      ${caption}
    </div>
  </div>
</div>`;
}
