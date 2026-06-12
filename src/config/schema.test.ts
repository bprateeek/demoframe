import { describe, expect, it } from 'vitest';
import { budgetToBytes, demoConfigSchema } from './schema.js';

const minimal = {
  frame: { type: 'phone' },
  scenes: [{ type: 'typing', duration: 3, text: 'hello' }],
};

describe('demoConfigSchema', () => {
  it('applies defaults', () => {
    const config = demoConfigSchema.parse(minimal);
    expect(config.output.format).toBe('gif');
    expect(config.output.width).toBe(480);
    expect(config.output.fps).toBe(15);
    expect(config.theme.mode).toBe('light');
    expect(config.scenes[0].transition).toBe('cut');
  });

  it('rejects a hold scene in first position', () => {
    const result = demoConfigSchema.safeParse({
      ...minimal,
      scenes: [{ type: 'hold', duration: 2 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects demos over 60 seconds', () => {
    const result = demoConfigSchema.safeParse({
      ...minimal,
      scenes: Array.from({ length: 4 }, () => ({ type: 'typing', duration: 20, text: 'x' })),
    });
    expect(result.success).toBe(false);
  });

  it('enforces scene text limits', () => {
    const result = demoConfigSchema.safeParse({
      ...minimal,
      scenes: [{ type: 'typing', duration: 3, text: 'x'.repeat(500) }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown frame types', () => {
    const result = demoConfigSchema.safeParse({ ...minimal, frame: { type: 'tablet' } });
    expect(result.success).toBe(false);
  });
});

describe('budgetToBytes', () => {
  it('parses MB, KB, and raw bytes', () => {
    expect(budgetToBytes('5MB')).toBe(5 * 1024 * 1024);
    expect(budgetToBytes('800KB')).toBe(800 * 1024);
    expect(budgetToBytes(1234)).toBe(1234);
    expect(budgetToBytes('1.5MB')).toBe(Math.round(1.5 * 1024 * 1024));
  });
});
