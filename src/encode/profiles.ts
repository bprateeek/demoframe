import type { Output, OutputFormat } from '../config/schema.js';

export const ENCODER_PROFILES = ['legacy', 'modern'] as const;
export type EncoderProfile = (typeof ENCODER_PROFILES)[number];
export type EncoderSettings = Record<string, string | number | boolean | string[]>;

export interface EncodeOptions {
  profile: EncoderProfile;
  quality: Output['quality'];
}

export interface EncodeResult {
  encoder: string;
  profile: EncoderProfile;
  settings: EncoderSettings;
}

const QUALITY_RANK: Record<Output['quality'], number> = {
  draft: 0,
  standard: 1,
  high: 2,
};

export function parseEncoderProfile(value: string | undefined): EncoderProfile {
  if (!value) return 'modern';
  if ((ENCODER_PROFILES as readonly string[]).includes(value)) return value as EncoderProfile;
  throw new Error(`--encoder-profile must be one of: ${ENCODER_PROFILES.join(', ')}`);
}

export function mp4Crf(quality: Output['quality']): number {
  return [23, 20, 18][QUALITY_RANK[quality]];
}

export function webmCrf(quality: Output['quality']): number {
  return [34, 30, 26][QUALITY_RANK[quality]];
}

export function webpQuality(quality: Output['quality']): number {
  return [72, 82, 92][QUALITY_RANK[quality]];
}

export function gifQuality(quality: Output['quality']): number {
  return [74, 90, 96][QUALITY_RANK[quality]];
}

export function legacySettings(format: OutputFormat, width: number, fps: number): EncoderSettings {
  return {
    format,
    width,
    fps,
    scale: `scale=${width}:-2:flags=lanczos`,
  };
}
