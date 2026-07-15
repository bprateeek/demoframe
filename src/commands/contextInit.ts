import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { stringify } from 'yaml';
import { findRepoRoot, sha256Digest } from '../context/load.js';

export function runContextInit(dir = '.'): string {
  const targetDir = path.resolve(dir);
  const repoRoot = findRepoRoot(targetDir);
  const file = path.join(targetDir, 'demoframe-context.yml');
  if (existsSync(file)) throw new Error(`${file} already exists; refusing to overwrite`);
  mkdirSync(targetDir, { recursive: true });
  const readme = path.join(repoRoot, 'README.md');
  let line = 'TODO: add a repository-backed copy entry';
  let lineNumber = 1;
  if (existsSync(readme)) {
    const lines = readFileSync(readme, 'utf8').split(/\r?\n/);
    const found = lines.findIndex((item) => item.trim().length > 0);
    if (found >= 0) {
      line = lines[found];
      lineNumber = found + 1;
    }
  }
  const relativeReadme = path.relative(repoRoot, readme) || 'README.md';
  const manifest = {
    schemaVersion: 1,
    entries: [
      {
        id: 'product-title',
        kind: 'copy',
        text: line,
        source: {
          path: relativeReadme,
          selector: { lines: [lineNumber, lineNumber] },
          digest: sha256Digest(line),
        },
      },
    ],
  };
  writeFileSync(file, stringify(manifest));
  console.log(`created ${file}`);
  console.log('add typed metric/claim/command/route/asset/vocab/metaphor entries, then reference their ids from brief.story.proof.');
  return file;
}
