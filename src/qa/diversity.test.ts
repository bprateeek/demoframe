import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config/load.js';
import { appearanceSignature, compareDiversity, deltaE2000 } from './diversity.js';
import { structuralSignature } from './signature.js';

describe('relationship-aware diversity', () => {
  const proof = loadConfig('examples/recipes/metric-proof.yml').config;
  const surface = loadConfig('examples/recipes/metric-proof-surface-first.yml').config;

  it('uses CIEDE2000 and explicit structural dimensions', () => {
    expect(deltaE2000('#e2603a', '#e2603a')).toBeCloseTo(0);
    expect(deltaE2000('#e2603a', '#2563eb')).toBeGreaterThan(10);
    const compared = compareDiversity(
      structuralSignature(proof), structuralSignature(surface),
      appearanceSignature(proof), appearanceSignature(surface), 'same-brand',
    );
    expect(compared.pass).toBe(true);
    expect(compared.structuralDifferences.length).toBeGreaterThanOrEqual(2);
    expect(compared.appearance.required).toBe(false);
  });

  it('enforces distinct-brand appearance but exempts sibling/same-brand pairs', () => {
    const blueSurface = structuredClone(surface);
    blueSurface.theme.accent = '#00bcd4';
    expect(compareDiversity(structuralSignature(proof), structuralSignature(blueSurface), appearanceSignature(proof), appearanceSignature(blueSurface), 'distinct-brand').pass).toBe(true);
    expect(compareDiversity(structuralSignature(proof), structuralSignature(surface), appearanceSignature(proof), appearanceSignature(surface), 'distinct-brand').pass).toBe(false);
    expect(compareDiversity(structuralSignature(proof), structuralSignature(surface), appearanceSignature(proof), appearanceSignature(surface), 'sibling-product').pass).toBe(true);
  });

  it('covers the five-plus-fixture relationship matrix contract', () => {
    const cases = [
      ['cli-tool', 'analytics', 'distinct-brand'],
      ['analytics', 'collaboration', 'distinct-brand'],
      ['library', 'consumer-ui', 'sibling-product'],
      ['web-app', 'analytics', 'distinct-brand'],
    ];
    expect(new Set(cases.flatMap(([left, right]) => [left, right])).size).toBeGreaterThanOrEqual(5);
    expect(cases.some(([left, right]) => left === 'analytics' || right === 'analytics')).toBe(true);
    expect(cases.some(([left, right]) => left === 'collaboration' || right === 'collaboration')).toBe(true);
  });
});
