import { escapeHtml } from '../html.js';
import { icons } from '../icons.js';
import { cinematicCompositionSceneClass, sceneShell } from '../base.js';
import { normalizeTermLines, type TerminalPlaybackScene } from '../../config/schema.js';

export const terminalPlaybackCss = `
.df-play { font-family: var(--df-font-mono); font-size: 15px; line-height: 1.7; }
.df-play-line { opacity: 0; white-space: pre-wrap; word-break: break-word; }
.df-play-line-dim { color: var(--df-muted); }
.df-play-line-success { color: var(--df-success); }
.df-play-line-error { color: #f85149; }
.df-play-line-warn { color: #d29922; }
.df-play-status { display: flex; align-items: center; min-height: 1.7em; }
.df-play-spin { display: none; align-items: center; gap: var(--df-s2); color: var(--df-muted); }
.df-play-spin-glyph { color: var(--df-accent); }
.df-play-exit { opacity: 0; display: inline-flex; align-items: center; gap: var(--df-s2); font-weight: 700; }
.df-play-exit svg { width: 15px; height: 15px; flex: 0 0 auto; }
.df-play-exit-success { color: var(--df-success); }
.df-play-exit-error { color: #f85149; }
.df-play-next { opacity: 0; }
.df-play-shown { opacity: 1; }
.df-play-hist-exit { display: inline-flex; align-items: center; gap: var(--df-s2); font-weight: 700; }
.df-play-hist-exit svg { width: 15px; height: 15px; flex: 0 0 auto; }
.df-play-center {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.df-play-panel {
  background: var(--df-screen);
  border: 1px solid var(--df-border);
  border-radius: var(--df-radius);
  padding: var(--df-s4) var(--df-s5);
  color: var(--df-text);
  box-shadow: 0 10px 30px var(--df-shadow);
}
`;

function historyHtml(history: TerminalPlaybackScene[], framePrompt: string): string {
  return history
    .map((scene) => {
      const prompt = escapeHtml(scene.prompt ?? framePrompt);
      const lines = normalizeTermLines(scene.output)
        .map(
          (line) =>
            `<div class="df-play-line df-play-line-${line.style} df-play-shown">${escapeHtml(line.text)}</div>`,
        )
        .join('\n');
      const exit = scene.exit
        ? `<div class="df-play-status df-play-shown"><span class="df-play-hist-exit df-play-exit-${scene.exit.status}">${
            scene.exit.status === 'success' ? icons.check : icons.cross
          }${scene.exit.label ? `<span>${escapeHtml(scene.exit.label)}</span>` : ''}</span></div>`
        : '';
      return `<div class="df-term-line"><span class="df-term-prompt">${prompt}</span><span>${escapeHtml(scene.command)}</span></div>
      ${lines}
      ${exit}`;
    })
    .join('\n');
}

export function terminalPlaybackHtml(
  scene: TerminalPlaybackScene,
  index: number,
  frameType: string,
  framePrompt: string,
  history: TerminalPlaybackScene[] = [],
): string {
  const compositionClass = cinematicCompositionSceneClass(scene, 'terminal-playback');
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
    ? `<span class="df-play-exit df-play-exit-${scene.exit.status}" data-celebrate-anchor="right">${
        scene.exit.status === 'success' ? icons.check : icons.cross
      }${scene.exit.label ? `<span>${escapeHtml(scene.exit.label)}</span>` : ''}</span>`
    : '';
  const body = `${historyHtml(history, framePrompt)}
      <div class="df-term-line df-play-cmd"><span class="df-term-prompt">${prompt}</span><span class="df-play-typed"></span><span class="df-term-caret df-play-caret"></span></div>
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
