import { escapeHtml } from '../html.js';
import { icons } from '../icons.js';
import { centerHeroSceneClass, sceneShell } from '../base.js';
import { normalizeTermLines, type TerminalPlaybackScene } from '../../config/schema.js';

export const terminalPlaybackCss = `
.df-play { font-family: var(--df-font-mono); font-size: 15px; line-height: 1.7; }
.df-play-line { opacity: 0; white-space: pre-wrap; word-break: break-word; }
.df-play-line-dim { color: #8d96a3; }
.df-play-line-success { color: #3fb950; }
.df-play-line-error { color: #f85149; }
.df-play-line-warn { color: #d29922; }
.df-play-status { display: flex; align-items: center; min-height: 1.7em; }
.df-play-spin { display: none; align-items: center; gap: var(--df-s2); color: #8d96a3; }
.df-play-spin-glyph { color: var(--df-accent); }
.df-play-exit { opacity: 0; display: inline-flex; align-items: center; gap: var(--df-s2); font-weight: 700; }
.df-play-exit svg { width: 15px; height: 15px; flex: 0 0 auto; }
.df-play-exit-success { color: #3fb950; }
.df-play-exit-error { color: #f85149; }
.df-play-next { opacity: 0; }
.df-play-center {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.df-play-panel {
  background: #11151c;
  border: 1px solid #262d38;
  border-radius: var(--df-radius);
  padding: var(--df-s4) var(--df-s5);
  color: #d6dde6;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
`;

export function terminalPlaybackHtml(
  scene: TerminalPlaybackScene,
  index: number,
  frameType: string,
  framePrompt: string,
): string {
  const compositionClass = centerHeroSceneClass(scene, 'terminal-playback');
  const prompt = escapeHtml(scene.prompt ?? framePrompt);
  const lines = normalizeTermLines(scene.output)
    .map(
      (line, k) =>
        `<div class="df-play-line df-play-line-${line.style}" data-line="${k}">${escapeHtml(line.text)}</div>`,
    )
    .join('\n');
  const spinner = scene.spinner
    ? `<span class="df-play-spin"><span class="df-play-spin-glyph">⠋</span><span>${escapeHtml(scene.spinner)}</span></span>`
    : '';
  const exit = scene.exit
    ? `<span class="df-play-exit df-play-exit-${scene.exit.status}">${
        scene.exit.status === 'success' ? icons.check : icons.cross
      }${scene.exit.label ? `<span>${escapeHtml(scene.exit.label)}</span>` : ''}</span>`
    : '';
  const body = `<div class="df-term-line df-play-cmd"><span class="df-term-prompt">${prompt}</span><span class="df-play-typed"></span><span class="df-term-caret df-play-caret"></span></div>
      ${lines}
      ${spinner || exit ? `<div class="df-play-status">${spinner}${exit}</div>` : ''}
      <div class="df-term-line df-play-next"><span class="df-term-prompt">${prompt}</span><span class="df-term-caret"></span></div>`;
  if (frameType === 'terminal') {
    return sceneShell(
      index,
      `    <div class="df-slot-header df-play">
      ${body}
    </div>`,
      '',
      compositionClass,
    );
  }
  return sceneShell(
    index,
    `    <div class="df-play-center">
      <div class="df-play df-play-panel">
        ${body}
      </div>
    </div>`,
    '',
    compositionClass,
  );
}
