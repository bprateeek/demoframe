import { describe, expect, it } from 'vitest';
import { CODE_LANGS } from '../config/schema.js';
import { highlightCode, type CodeHighlightOptions } from './highlight.js';

const base: CodeHighlightOptions = { lang: 'typescript', mode: 'light', added: [], removed: [], lineNumbers: false };

const SAMPLES: Record<string, string> = {
  text: 'plain text\nsecond line',
  bash: 'echo "hi" | grep h',
  typescript: 'const x: number = 1;',
  javascript: 'function f(a) { return a + 1 }',
  tsx: 'const A = () => <div x={1} />;',
  jsx: 'const A = () => <div x={1} />;',
  json: '{"a": [1, true, null]}',
  yaml: 'a: 1\nb: [x, y]',
  python: 'def f(x):\n  return x + 1',
  go: 'func main() { fmt.Println(1) }',
  rust: 'fn main() { println!("{}", 1); }',
  html: '<div class="a">hi</div>',
  css: '.a { color: red; }',
  sql: 'SELECT id FROM users WHERE x = 1;',
  markdown: '# Title\n*em* [link](x)',
  diff: '+added\n-removed\n context',
};

describe('highlightCode', () => {
  it('highlights every supported lang under the JS regex engine', async () => {
    for (const lang of CODE_LANGS) {
      const out = await highlightCode(SAMPLES[lang], { ...base, lang });
      expect(out, lang).toContain('class="line"');
    }
  });

  it('is deterministic for the same input', async () => {
    const a = await highlightCode(SAMPLES.typescript, base);
    const b = await highlightCode(SAMPLES.typescript, base);
    expect(a).toBe(b);
  });

  it('marks added and removed lines with gutters', async () => {
    const out = await highlightCode('a\nb\nc', { ...base, added: [2], removed: [3] });
    expect(out).toContain('data-mark="added"');
    expect(out).toContain('data-mark="removed"');
    expect(out).toContain('data-gutter="+"');
    expect(out).toContain('data-gutter="-"');
  });

  it('emits line numbers as gutters when enabled', async () => {
    const out = await highlightCode('a\nb', { ...base, lineNumbers: true });
    expect(out).toContain('data-gutter="1"');
    expect(out).toContain('data-gutter="2"');
  });

  it('strips the theme background so the panel controls it', async () => {
    const out = await highlightCode(SAMPLES.typescript, base);
    expect(out).not.toContain('background-color');
  });

  it('escapes plain text and applies marks without shiki', async () => {
    const out = await highlightCode('<script>alert(1)</script>', { ...base, lang: 'text', added: [1] });
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
    expect(out).toContain('data-mark="added"');
  });

  it('renders dark mode with the github-dark theme', async () => {
    const out = await highlightCode(SAMPLES.typescript, { ...base, mode: 'dark' });
    expect(out).toContain('github-dark');
  });
});
