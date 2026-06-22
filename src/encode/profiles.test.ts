import { describe, expect, it } from 'vitest';
import { gifQuality, mp4Crf, parseEncoderProfile, webmCrf, webpQuality } from './profiles.js';

describe('encoder profiles', () => {
  it('defaults to legacy and validates explicit values', () => {
    expect(parseEncoderProfile(undefined)).toBe('legacy');
    expect(parseEncoderProfile('legacy')).toBe('legacy');
    expect(parseEncoderProfile('modern')).toBe('modern');
    expect(() => parseEncoderProfile('cinematic')).toThrow(/legacy, modern/);
  });

  it('maps output quality to modern encoder settings', () => {
    expect([mp4Crf('draft'), mp4Crf('standard'), mp4Crf('high')]).toEqual([23, 20, 18]);
    expect([webmCrf('draft'), webmCrf('standard'), webmCrf('high')]).toEqual([34, 30, 26]);
    expect([webpQuality('draft'), webpQuality('standard'), webpQuality('high')]).toEqual([72, 82, 92]);
    expect([gifQuality('draft'), gifQuality('standard'), gifQuality('high')]).toEqual([74, 90, 96]);
  });
});
