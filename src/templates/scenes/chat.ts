import { escapeHtml } from '../html.js';
import type { ChatScene } from '../../config/schema.js';

export const chatCss = `
.df-chat {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: var(--df-s3);
  padding-bottom: var(--df-s2);
}
.df-msg { display: none; flex-direction: column; }
.df-msg-user { align-items: flex-end; }
.df-msg-assistant { align-items: flex-start; }
.df-bubble {
  max-width: 78%;
  padding: var(--df-s3) var(--df-s4);
  border-radius: var(--df-radius-lg);
  font-size: var(--df-fs-lg);
  line-height: 1.45;
  word-break: break-word;
  opacity: 0;
}
.df-msg-user .df-bubble {
  background: var(--df-accent);
  color: #fff;
  border-bottom-right-radius: var(--df-radius-sm);
}
.df-msg-assistant .df-bubble {
  background: var(--df-card);
  border: 1px solid var(--df-border);
  border-bottom-left-radius: var(--df-radius-sm);
  box-shadow: 0 2px 10px var(--df-shadow);
}
.df-chat-typing {
  display: none;
  align-items: center;
  gap: 5px;
  background: var(--df-card);
  border: 1px solid var(--df-border);
  border-radius: var(--df-radius-lg);
  border-bottom-left-radius: var(--df-radius-sm);
  padding: var(--df-s3) var(--df-s4);
}
.df-chat-typing i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--df-muted);
}
.df-msg-av { flex-direction: row; align-items: flex-end; gap: var(--df-s2); }
.df-msg-av.df-msg-user { flex-direction: row-reverse; }
.df-msg-content { display: flex; flex-direction: column; gap: var(--df-s3); min-width: 0; max-width: 82%; }
.df-msg-av.df-msg-assistant .df-msg-content { align-items: flex-start; }
.df-msg-av.df-msg-user .df-msg-content { align-items: flex-end; }
.df-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex: 0 0 auto;
  overflow: hidden;
  background: var(--df-card);
  border: 1px solid var(--df-border);
}
.df-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.df-avatar-mono {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: var(--df-accent);
}
`;

export interface ResolvedAvatar {
  img?: string;
  initials?: string;
  color?: string;
}
export type ResolvedAvatars = { user?: ResolvedAvatar; assistant?: ResolvedAvatar };

function avatarHtml(av: ResolvedAvatar): string {
  if (av.img) return `<span class="df-avatar"><img src="${av.img}" alt=""></span>`;
  const style = av.color ? ` style="background:${av.color}"` : '';
  return `<span class="df-avatar df-avatar-mono"${style}>${escapeHtml(av.initials ?? '')}</span>`;
}

export function chatHtml(scene: ChatScene, index: number, avatars?: ResolvedAvatars): string {
  const messages = scene.messages
    .map((message, k) => {
      const typing =
        message.role === 'assistant' && scene.typingIndicator
          ? '<div class="df-chat-typing"><i></i><i></i><i></i></div>'
          : '';
      const av = avatars ? avatars[message.role] : undefined;
      if (av) {
        return `<div class="df-msg df-msg-av df-msg-${message.role}" data-msg="${k}">
        ${avatarHtml(av)}
        <div class="df-msg-content">
          ${typing}
          <div class="df-bubble">${escapeHtml(message.text)}</div>
        </div>
      </div>`;
      }
      return `<div class="df-msg df-msg-${message.role}" data-msg="${k}">
        ${typing}
        <div class="df-bubble">${escapeHtml(message.text)}</div>
      </div>`;
    })
    .join('\n');
  return `<div class="df-scene" data-scene="${index}">
  <div class="df-rail">
    <div class="df-slot-body df-chat">
      ${messages}
    </div>
  </div>
</div>`;
}
