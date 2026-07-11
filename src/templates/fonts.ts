import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Theme } from '../config/schema.js';
import type { RenderContext } from '../render/context.js';

const require = createRequire(import.meta.url);

function fontFace(family: string, pkg: string, file: string, weight: number): string {
  const pkgRoot = path.dirname(require.resolve(`${pkg}/package.json`));
  const data = readFileSync(path.join(pkgRoot, 'files', file)).toString('base64');
  return `@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  src: url(data:font/woff2;base64,${data}) format('woff2');
}`;
}

let builtinCache: string | null = null;

function builtinFontCss(): string {
  if (builtinCache) return builtinCache;
  builtinCache = [
    fontFace('Inter', '@fontsource/inter', 'inter-latin-400-normal.woff2', 400),
    fontFace('Inter', '@fontsource/inter', 'inter-latin-500-normal.woff2', 500),
    fontFace('Inter', '@fontsource/inter', 'inter-latin-600-normal.woff2', 600),
    fontFace('Inter', '@fontsource/inter', 'inter-latin-700-normal.woff2', 700),
    fontFace('JetBrains Mono', '@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2', 400),
    fontFace('JetBrains Mono', '@fontsource/jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff2', 700),
  ].join('\n');
  return builtinCache;
}

const customCache = new Map<string, string>();

function customFontFace(family: string, at: string, abs: string): string {
  let key: string;
  try {
    key = `${abs}:${statSync(abs).mtimeMs}:${family}`;
  } catch {
    throw new Error(`${at}: cannot read ${abs}`);
  }
  const hit = customCache.get(key);
  if (hit) return hit;
  const data = readFileSync(abs).toString('base64');
  const woff2 = /\.woff2$/i.test(abs);
  const face = `@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: 100 900;
  src: url(data:font/${woff2 ? 'woff2' : 'ttf'};base64,${data}) format('${woff2 ? 'woff2' : 'truetype'}');
}`;
  customCache.set(key, face);
  return face;
}

const SANS_INTER = "'Inter', -apple-system, 'Segoe UI', sans-serif";
const SANS_SYSTEM = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const MONO_BUILTIN = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";

export function fontStacks(font: Theme['font']): { sans: string; mono: string } {
  if (font === 'system') return { sans: SANS_SYSTEM, mono: MONO_BUILTIN };
  if (font === 'inter' || typeof font === 'string') return { sans: SANS_INTER, mono: MONO_BUILTIN };
  return {
    sans: font.sans ? `'DF Custom Sans', ${SANS_INTER}` : SANS_INTER,
    mono: font.mono ? `'DF Custom Mono', ${MONO_BUILTIN}` : MONO_BUILTIN,
  };
}

export function fontCss(font: Theme['font'], contextOrBaseDir: RenderContext | string): string {
  const parts = [builtinFontCss()];
  if (typeof font === 'object') {
    if (font.sans) {
      const file =
        typeof contextOrBaseDir === 'string'
          ? path.resolve(contextOrBaseDir, font.sans)
          : contextOrBaseDir.assets.require('theme.font.sans').file;
      parts.push(customFontFace('DF Custom Sans', 'theme.font.sans', file));
    }
    if (font.mono) {
      const file =
        typeof contextOrBaseDir === 'string'
          ? path.resolve(contextOrBaseDir, font.mono)
          : contextOrBaseDir.assets.require('theme.font.mono').file;
      parts.push(customFontFace('DF Custom Mono', 'theme.font.mono', file));
    }
  }
  return parts.join('\n');
}
