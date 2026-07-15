import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config/load.js';
import { runContextInit } from '../commands/contextInit.js';
import { sha256Digest, validateContextManifest } from './load.js';

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'demoframe-context-'));
  mkdirSync(path.join(root, '.git'));
  writeFileSync(path.join(root, 'README.md'), '# Product\nPush to preview: 2.1 s\nUnrelated line\n');
  writeFileSync(
    path.join(root, 'demo.yml'),
    'context: { manifest: demoframe-context.yml }\nframe: { type: phone }\nscenes:\n  - { type: typing, duration: 2, text: hi }\n',
  );
  return root;
}

function writeManifest(root: string, entries: unknown[]) {
  writeFileSync(path.join(root, 'demoframe-context.yml'), stringify({ schemaVersion: 1, entries }));
}

describe('typed context manifest', () => {
  it('hashes selected content so unrelated file edits do not stale an entry', () => {
    const root = fixture();
    const selected = 'Push to preview: 2.1 s';
    writeManifest(root, [
      {
        id: 'hero-metric',
        kind: 'metric',
        label: 'Push to preview',
        value: 2.1,
        unit: 's',
        source: { path: 'README.md', selector: { lines: [2, 2] }, digest: sha256Digest(selected) },
      },
    ]);
    let validated = validateContextManifest(loadConfig(path.join(root, 'demo.yml')))!;
    expect(validated.errors).toEqual([]);

    writeFileSync(path.join(root, 'README.md'), '# Product\nPush to preview: 2.1 s\nChanged elsewhere\n');
    validated = validateContextManifest(loadConfig(path.join(root, 'demo.yml')))!;
    expect(validated.errors).toEqual([]);

    writeFileSync(path.join(root, 'README.md'), '# Product\nPush to preview: 2.4 s\nChanged elsewhere\n');
    validated = validateContextManifest(loadConfig(path.join(root, 'demo.yml')))!;
    expect(validated.errors.map((finding) => finding.code)).toContain('context.staleDigest');
  });

  it('rejects traversal, secret text, and assets without license/privacy acknowledgement', () => {
    const root = fixture();
    writeManifest(root, [
      {
        id: 'outside-copy',
        kind: 'copy',
        text: 'outside',
        source: {
          path: '../outside.md',
          selector: { lines: [1, 1] },
          digest: `sha256:${'0'.repeat(64)}`,
        },
      },
      {
        id: 'secret-copy',
        kind: 'copy',
        text: 'sk-ABCDEFGHIJKLMNOPQRSTUVWX123456',
        source: {
          path: 'README.md',
          selector: { lines: [1, 1] },
          digest: sha256Digest('# Product'),
        },
      },
    ]);
    let validated = validateContextManifest(loadConfig(path.join(root, 'demo.yml')))!;
    expect(validated.errors.map((finding) => finding.code)).toContain('context.pathTraversal');
    expect(validated.errors.map((finding) => finding.code)).toContain('context.secret');

    writeManifest(root, [{ id: 'brand-logo', kind: 'asset', path: 'logo.png', role: 'logo' }]);
    validated = validateContextManifest(loadConfig(path.join(root, 'demo.yml')))!;
    expect(validated.errors.map((finding) => finding.code)).toContain('context.invalid');
  });

  it('selects and hashes JSON pointer values deterministically', () => {
    const root = fixture();
    writeFileSync(path.join(root, 'product.json'), JSON.stringify({ claims: { status: 'Ready to share' } }));
    writeManifest(root, [
      {
        id: 'status-copy',
        kind: 'copy',
        text: 'Ready to share',
        source: {
          path: 'product.json',
          selector: { jsonPointer: '/claims/status' },
          digest: sha256Digest('Ready to share'),
        },
      },
    ]);
    const validated = validateContextManifest(loadConfig(path.join(root, 'demo.yml')))!;
    expect(validated.errors).toEqual([]);
  });

  it('context init writes a valid repository-backed starter entry', () => {
    const root = fixture();
    const nested = path.join(root, 'demo');
    mkdirSync(nested);
    const file = runContextInit(nested);
    const text = readFileSync(file, 'utf8');

    expect(text).toContain('schemaVersion: 1');
    expect(text).toContain('id: product-title');
    expect(text).toContain('path: README.md');
    expect(text).toContain(sha256Digest('# Product'));
  });
});
