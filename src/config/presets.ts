import { budgetToBytes, type DemoConfig, type OutputFormat } from './schema.js';
import { ConfigError } from './load.js';
import { DESTINATION_NAMES, type DestinationName } from './destinations.js';

export interface DestinationPreset {
  format: OutputFormat;
  width: number;
  fps: number;
  budget: string;
  quality: 'draft' | 'standard' | 'high';
}

// Grounded in platform behavior as of June 2026: GitHub's camo proxy blocks
// images over 5MB and autoplays only image formats; X transcodes every upload
// to H.264; LinkedIn renders GIFs static but autoplays native video; Product
// Hunt galleries animate GIFs on hover and reject heavy files.
export const PRESETS = {
  'github-readme': { format: 'webp', width: 640, fps: 15, budget: '4MB', quality: 'standard' },
  'x-post': { format: 'mp4', width: 1080, fps: 30, budget: '15MB', quality: 'high' },
  linkedin: { format: 'mp4', width: 1080, fps: 24, budget: '10MB', quality: 'high' },
  'product-hunt': { format: 'gif', width: 1200, fps: 12, budget: '3MB', quality: 'standard' },
} as const satisfies Record<DestinationName, DestinationPreset>;

export type PresetName = keyof typeof PRESETS;

export const PRESET_NAMES = [...DESTINATION_NAMES];

export interface AppliedPreset {
  config: DemoConfig;
  changes: string[];
}

const describeFormat = (format: DemoConfig['output']['format']): string =>
  Array.isArray(format) ? format.join('+') : format;

export function applyPreset(config: DemoConfig, name: string): AppliedPreset {
  const preset = (PRESETS as Record<string, DestinationPreset>)[name];
  if (!preset) {
    throw new ConfigError(`unknown preset "${name}"; valid values: ${PRESET_NAMES.join(', ')}`);
  }
  const changes: string[] = [];
  const output = { ...config.output };
  if (describeFormat(output.format) !== preset.format) {
    changes.push(`output.format: ${describeFormat(output.format)} -> ${preset.format}`);
    output.format = preset.format;
  }
  if (output.width !== preset.width) {
    changes.push(`output.width: ${output.width} -> ${preset.width}`);
    output.width = preset.width;
  }
  if (output.fps !== preset.fps) {
    changes.push(`output.fps: ${output.fps} -> ${preset.fps}`);
    output.fps = preset.fps;
  }
  if (budgetToBytes(output.budget) !== budgetToBytes(preset.budget)) {
    changes.push(`output.budget: ${output.budget} -> ${preset.budget}`);
    output.budget = preset.budget;
  }
  if (output.quality !== preset.quality) {
    changes.push(`output.quality: ${output.quality} -> ${preset.quality}`);
    output.quality = preset.quality;
  }
  return { config: { ...config, output }, changes };
}
