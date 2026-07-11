import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturesRoot = path.join(root, 'eval', 'fixtures');
const manifest = JSON.parse(readFileSync(path.join(fixturesRoot, 'manifest.json'), 'utf8')) as {
  schemaVersion: number;
  fixtures: Array<{ name: string; genre: string; contract: string; heldOutExtraction: boolean }>;
  pairs: Array<{ left: string; right: string; relationship: string }>;
};

describe('offline eval fixture contracts', () => {
  it('covers five required genres with two held-out extraction fixtures', () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.fixtures.length).toBeGreaterThanOrEqual(5);
    expect(manifest.fixtures.map((fixture) => fixture.genre)).toEqual(
      expect.arrayContaining(['cli', 'sdk', 'analytics', 'collaboration', 'consumer-ui']),
    );
    expect(manifest.fixtures.filter((fixture) => fixture.heldOutExtraction)).toHaveLength(2);
    expect(manifest.fixtures.filter((fixture) => fixture.contract === 'inferred')).toHaveLength(1);
  });

  it.each(manifest.fixtures)('$name has a committed expected brand signature', (fixture) => {
    const expectedFile = path.join(fixturesRoot, fixture.name, 'expected-brand.json');
    expect(existsSync(expectedFile)).toBe(true);
    const expected = JSON.parse(readFileSync(expectedFile, 'utf8'));

    expect(expected.schemaVersion).toBe(1);
    expect(expected.product).toBeTruthy();
    expect(expected.appearance).toEqual(
      expect.objectContaining({ mode: expect.any(String), primary: expect.stringMatching(/^#[a-f0-9]{6}$/i) }),
    );
    expect(expected.structure).toEqual(
      expect.objectContaining({
        compositionFamily: expect.any(String),
        motif: expect.any(String),
        heroObject: expect.any(String),
        motionPersonality: expect.any(String),
        productSurfaceTreatment: expect.any(String),
        supportingObjectArrangement: expect.any(String),
      }),
    );
    expect(expected.requiredVocabulary.length).toBeGreaterThan(0);
    if (fixture.heldOutExtraction) {
      expect(existsSync(path.join(fixturesRoot, fixture.name, 'demoframe-context.yml'))).toBe(false);
    }
  });

  it('carries explicit relationship metadata for every eval pair', () => {
    const names = new Set(manifest.fixtures.map((fixture) => fixture.name));
    expect(manifest.pairs.length).toBeGreaterThan(0);
    for (const pair of manifest.pairs) {
      expect(names.has(pair.left)).toBe(true);
      expect(names.has(pair.right)).toBe(true);
      expect(['distinct-brand', 'same-brand', 'sibling-product']).toContain(pair.relationship);
    }
  });
});
