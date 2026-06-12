import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

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

let cached: string | null = null;

export function fontCss(): string {
  if (cached) return cached;
  cached = [
    fontFace('Inter', '@fontsource/inter', 'inter-latin-400-normal.woff2', 400),
    fontFace('Inter', '@fontsource/inter', 'inter-latin-500-normal.woff2', 500),
    fontFace('Inter', '@fontsource/inter', 'inter-latin-600-normal.woff2', 600),
    fontFace('Inter', '@fontsource/inter', 'inter-latin-700-normal.woff2', 700),
    fontFace('JetBrains Mono', '@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2', 400),
    fontFace('JetBrains Mono', '@fontsource/jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff2', 700),
  ].join('\n');
  return cached;
}
