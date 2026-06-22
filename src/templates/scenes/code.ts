import { escapeHtml } from '../html.js';
import { icons } from '../icons.js';
import { highlightCode } from '../highlight.js';
import { centerHeroSceneClass, sceneShell } from '../base.js';
import type { CodeScene } from '../../config/schema.js';

export const codeCss = `
.df-code-center {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.df-codepanel {
  background: var(--df-card);
  border: 1px solid var(--df-border);
  border-radius: var(--df-radius);
  box-shadow: 0 6px 24px var(--df-shadow);
  overflow: hidden;
}
.df-codepanel-bar {
  display: flex;
  align-items: center;
  gap: var(--df-s2);
  padding: var(--df-s3) var(--df-s4);
  border-bottom: 1px solid var(--df-border);
  font-family: var(--df-font-mono);
  font-size: var(--df-fs-xs);
  color: var(--df-muted);
  background: ${'color-mix(in srgb, var(--df-text) 3%, var(--df-card))'};
}
.df-codepanel-bar svg { width: 14px; height: 14px; flex: 0 0 auto; }
.df-codepanel-body { padding: var(--df-s4); overflow: hidden; }
.df-codepanel-body pre { font-family: var(--df-font-mono); font-size: 14px; line-height: 1.65; }
.df-codepanel-body code { display: block; }
.df-codepanel-body .line {
  display: block;
  min-height: 1.65em;
  opacity: 0;
  margin: 0 calc(-1 * var(--df-s4));
  padding: 0 var(--df-s4);
}
.df-code-gutter .line::before {
  content: attr(data-gutter);
  display: inline-block;
  width: 2.6ch;
  margin-right: 1.2ch;
  text-align: right;
  color: var(--df-faint);
}
.df-codepanel-body .line[data-mark="added"] { background: var(--df-success-bg); }
.df-codepanel-body .line[data-mark="added"]::before { color: var(--df-success); font-weight: 700; }
.df-codepanel-body .line[data-mark="removed"] { background: rgba(248, 81, 73, 0.12); }
.df-codepanel-body .line[data-mark="removed"]::before { color: #f85149; font-weight: 700; }
.df-frame-terminal .df-codepanel { background: #161b22; border-color: #262d38; }
`;

export async function codeHtml(scene: CodeScene, index: number, mode: 'light' | 'dark'): Promise<string> {
  const highlighted = await highlightCode(scene.code, {
    lang: scene.lang,
    mode,
    added: scene.added,
    removed: scene.removed,
    lineNumbers: scene.lineNumbers,
  });
  const hasGutter = scene.lineNumbers || scene.added.length > 0 || scene.removed.length > 0;
  const bar = scene.title
    ? `<div class="df-codepanel-bar">${icons.code}<span>${escapeHtml(scene.title)}</span></div>`
    : '';
  return sceneShell(
    index,
    `    <div class="df-code-center">
      <div class="df-codepanel">
        ${bar}
        <div class="df-codepanel-body${hasGutter ? ' df-code-gutter' : ''}">${highlighted}</div>
      </div>
    </div>`,
    '',
    centerHeroSceneClass(scene, 'code'),
  );
}
