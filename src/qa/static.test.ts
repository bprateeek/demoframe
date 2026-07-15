import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../config/load.js';
import { runCheckLoaded } from '../commands/check.js';
import * as browserModule from '../render/browser.js';
import { requiredTextDwell, staticQaFindings } from './static.js';

describe('browser-free static QA', () => {
  it('computes the locked weighted dwell estimate', () => {
    expect(requiredTextDwell('read this clearly')).toBeCloseTo(1.25);
    expect(requiredTextDwell('npm/run:test ships this clearly')).toBeGreaterThan(requiredTextDwell('read this now'));
  });

  it('ordinary check does not open a render session', async () => {
    const open = vi.spyOn(browserModule, 'openRenderSession');
    const loaded = loadConfig('examples/recipes/metric-proof.yml');
    await runCheckLoaded(loaded);
    expect(open).not.toHaveBeenCalled();
    expect(staticQaFindings(loaded.config)).toEqual([]);
    open.mockRestore();
  });
});
