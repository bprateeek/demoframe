import { createHighlighterCore, type HighlighterCore, type ShikiTransformer } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import shellscript from '@shikijs/langs/shellscript';
import typescript from '@shikijs/langs/typescript';
import javascript from '@shikijs/langs/javascript';
import tsx from '@shikijs/langs/tsx';
import jsx from '@shikijs/langs/jsx';
import json from '@shikijs/langs/json';
import yaml from '@shikijs/langs/yaml';
import python from '@shikijs/langs/python';
import go from '@shikijs/langs/go';
import rust from '@shikijs/langs/rust';
import html from '@shikijs/langs/html';
import css from '@shikijs/langs/css';
import sql from '@shikijs/langs/sql';
import markdown from '@shikijs/langs/markdown';
import diff from '@shikijs/langs/diff';
import githubLight from '@shikijs/themes/github-light';
import githubDark from '@shikijs/themes/github-dark';
import { escapeHtml } from './html.js';
import type { CodeLang } from '../config/schema.js';

let instance: Promise<HighlighterCore> | undefined;

function highlighter(): Promise<HighlighterCore> {
  instance ??= createHighlighterCore({
    themes: [githubLight, githubDark],
    langs: [
      shellscript,
      typescript,
      javascript,
      tsx,
      jsx,
      json,
      yaml,
      python,
      go,
      rust,
      html,
      css,
      sql,
      markdown,
      diff,
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return instance;
}

export interface CodeHighlightOptions {
  lang: CodeLang;
  mode: 'light' | 'dark';
  added: number[];
  removed: number[];
  lineNumbers: boolean;
}

function lineMeta(
  line: number,
  opts: CodeHighlightOptions,
): { gutter: string; mark?: 'added' | 'removed' } {
  const mark = opts.added.includes(line) ? 'added' : opts.removed.includes(line) ? 'removed' : undefined;
  const gutter = mark ? (mark === 'added' ? '+' : '-') : opts.lineNumbers ? String(line) : '';
  return { gutter, mark };
}

function plainHtml(code: string, opts: CodeHighlightOptions): string {
  const lines = code.split('\n').map((text, i) => {
    const { gutter, mark } = lineMeta(i + 1, opts);
    const attrs = [
      'class="line"',
      gutter ? `data-gutter="${escapeHtml(gutter)}"` : '',
      mark ? `data-mark="${mark}"` : '',
    ]
      .filter(Boolean)
      .join(' ');
    return `<span ${attrs}><span>${escapeHtml(text)}</span></span>`;
  });
  return `<pre class="shiki"><code>${lines.join('')}</code></pre>`;
}

export async function highlightCode(code: string, opts: CodeHighlightOptions): Promise<string> {
  if (opts.lang === 'text') return plainHtml(code, opts);
  const hl = await highlighter();
  const transformer: ShikiTransformer = {
    pre(node) {
      node.properties.style = String(node.properties.style ?? '').replace(/background-color:[^;]*;?/g, '');
    },
    // Lines are display:block in CSS, so the newline text nodes between line
    // spans would render as extra blank lines inside the pre
    code(node) {
      node.children = node.children.filter((child) => !(child.type === 'text' && child.value === '\n'));
    },
    line(node, line) {
      const { gutter, mark } = lineMeta(line, opts);
      if (gutter) node.properties['data-gutter'] = gutter;
      if (mark) node.properties['data-mark'] = mark;
    },
  };
  return hl.codeToHtml(code, {
    lang: opts.lang === 'bash' ? 'shellscript' : opts.lang,
    theme: opts.mode === 'dark' ? 'github-dark' : 'github-light',
    transformers: [transformer],
  });
}
