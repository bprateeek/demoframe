import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import { buildDocument } from './document.js';

const baseDir = process.cwd();

describe('buildDocument overlay injection (v0.5)', () => {
  it('omits cursor and celebrate nodes when no scene opts in', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'phone' },
      scenes: [{ type: 'typing', duration: 3, text: 'hi' }],
    });
    const doc = await buildDocument(config, baseDir);
    expect(doc.html).not.toContain('class="df-cursor"');
    expect(doc.html).not.toContain('class="df-celebrate"');
  });

  it('injects overlay nodes and anchors when a scene uses tap or celebrate', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'phone' },
      scenes: [
        { type: 'status-card', duration: 3, title: 'Done', cta: { label: 'Merge' }, tap: true },
        { type: 'hold', duration: 1, celebrate: true },
      ],
    });
    const doc = await buildDocument(config, baseDir);
    expect(doc.html).toContain('class="df-cursor"');
    expect(doc.html).toContain('df-celebrate-ring');
    expect(doc.html).toContain('data-tap-target');
    expect(doc.html).toContain('data-celebrate-anchor');
  });

  it('renders chat monogram avatars without binary assets', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'phone' },
      scenes: [
        {
          type: 'chat',
          duration: 5,
          messages: [{ role: 'assistant', text: 'hi' }],
          avatars: { assistant: { initials: 'CC', color: '#e2603a' } },
        },
      ],
    });
    const doc = await buildDocument(config, baseDir);
    expect(doc.html).toContain('df-avatar-mono');
    expect(doc.html).toContain('>CC</span>');
  });
});
