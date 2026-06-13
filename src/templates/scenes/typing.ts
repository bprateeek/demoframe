import { escapeHtml } from '../html.js';
import { icons } from '../icons.js';
import type { TypingScene } from '../../config/schema.js';

export const typingCss = `
.df-composer {
  background: var(--df-card);
  border-radius: 28px;
  box-shadow: 0 6px 24px var(--df-shadow);
  padding: var(--df-s4) var(--df-s4) var(--df-s3);
}
.df-composer-top { display: flex; align-items: flex-start; gap: var(--df-s3); }
.df-composer-text {
  flex: 1;
  min-height: 58px;
  font-size: var(--df-fs-lg);
  line-height: 1.45;
  padding-top: 2px;
  word-break: break-word;
}
.df-placeholder { color: var(--df-faint); }
.df-caret {
  display: inline-block;
  width: 2.5px;
  height: 1.15em;
  background: var(--df-accent);
  border-radius: 1px;
  vertical-align: text-bottom;
  margin-left: 1px;
}
.df-send {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--df-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.35;
}
.df-send svg { width: 24px; height: 24px; }
.df-send.df-armed { opacity: 1; }
.df-send.df-pressed { transform: scale(0.92); }
.df-composer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--df-s3);
  color: var(--df-text);
}
.df-composer-code {
  display: flex;
  align-items: center;
  gap: var(--df-s2);
  font-size: var(--df-fs-base);
  font-weight: 600;
}
.df-composer-code svg { width: 22px; height: 22px; }
.df-composer-icons { display: flex; align-items: center; gap: var(--df-s4); color: var(--df-text); }
.df-composer-icons svg { width: 22px; height: 22px; }
.df-term-line { white-space: pre-wrap; word-break: break-word; }
.df-term-prompt { color: #59c2ff; font-weight: 700; margin-right: 10px; }
.df-term-caret {
  display: inline-block;
  width: 9px;
  height: 1.1em;
  background: #d6dde6;
  vertical-align: text-bottom;
  margin-left: 2px;
}
`;

export function typingHtml(scene: TypingScene, index: number, frameType: string, prompt = '$'): string {
  if (frameType === 'terminal') {
    return `<div class="df-scene" data-scene="${index}">
  <div class="df-rail">
    <div class="df-slot-header df-term-line"><span class="df-term-prompt">${escapeHtml(prompt)}</span><span class="df-typed"></span><span class="df-term-caret df-caret-blink"></span></div>
  </div>
</div>`;
  }
  return `<div class="df-scene" data-scene="${index}">
  <div class="df-rail">
    <div class="df-slot-footer df-composer">
      <div class="df-composer-top">
        <div class="df-composer-text"><span class="df-typed"></span><span class="df-caret df-caret-blink"></span>${
          scene.placeholder ? `<span class="df-placeholder">${escapeHtml(scene.placeholder)}</span>` : ''
        }</div>
        <div class="df-send"${scene.tap ? ' data-tap-target' : ''}>${icons.arrowUp}</div>
      </div>
      <div class="df-composer-bar">
        <span class="df-composer-code">${icons.code} Code</span>
        <span class="df-composer-icons">${icons.paperclip}${icons.mic}</span>
      </div>
    </div>
  </div>
</div>`;
}
