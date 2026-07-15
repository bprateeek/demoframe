import type { DemoConfig } from '../config/schema.js';
import { resolveTheme } from '../templates/theme.js';
import type { StructuralSignature } from './signature.js';

export type PairRelationship = 'distinct-brand' | 'same-brand' | 'sibling-product';

export interface AppearanceSignature {
  accent: string;
  mode: 'light' | 'dark';
  frame: string;
  font: string;
  background: string;
  logo: boolean;
}

export interface DiversityComparison {
  pass: boolean;
  relationship: PairRelationship;
  structuralDifferences: string[];
  appearance: { deltaE2000: number; categoryDifferences: string[]; required: boolean; pass: boolean };
  issues: string[];
}

export function appearanceSignature(config: DemoConfig): AppearanceSignature {
  const theme = resolveTheme(config.theme);
  const font = typeof config.theme.font === 'string' ? config.theme.font : 'custom';
  return { accent: theme.accent, mode: theme.mode, frame: config.frame.type, font, background: theme.palette.page, logo: Boolean(config.theme.logo) };
}

function hexRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255) as [number, number, number];
}

function rgbLab(hex: string): [number, number, number] {
  const linear = hexRgb(hex).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const x = (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047;
  const y = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const z = (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883;
  const f = (value: number) => value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (radiansValue: number) => (radiansValue * 180) / Math.PI;

/** CIEDE2000 color difference for the rendered accent colors. */
export function deltaE2000(leftHex: string, rightHex: string): number {
  const [l1, a1, b1] = rgbLab(leftHex), [l2, a2, b2] = rgbLab(rightHex);
  const c1 = Math.hypot(a1, b1), c2 = Math.hypot(a2, b2), cBar = (c1 + c2) / 2;
  const g = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));
  const ap1 = (1 + g) * a1, ap2 = (1 + g) * a2;
  const cp1 = Math.hypot(ap1, b1), cp2 = Math.hypot(ap2, b2);
  const hp = (a: number, b: number) => { const h = degrees(Math.atan2(b, a)); return h < 0 ? h + 360 : h; };
  const hp1 = hp(ap1, b1), hp2 = hp(ap2, b2);
  const dl = l2 - l1, dc = cp2 - cp1;
  const dhRaw = hp2 - hp1;
  const dh = cp1 * cp2 === 0 ? 0 : Math.abs(dhRaw) <= 180 ? dhRaw : dhRaw > 180 ? dhRaw - 360 : dhRaw + 360;
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin(radians(dh / 2));
  const lBar = (l1 + l2) / 2, cpBar = (cp1 + cp2) / 2;
  const hpBar = cp1 * cp2 === 0 ? hp1 + hp2 : Math.abs(hp1 - hp2) <= 180 ? (hp1 + hp2) / 2 : (hp1 + hp2 + 360) / 2 % 360;
  const t = 1 - 0.17 * Math.cos(radians(hpBar - 30)) + 0.24 * Math.cos(radians(2 * hpBar)) + 0.32 * Math.cos(radians(3 * hpBar + 6)) - 0.2 * Math.cos(radians(4 * hpBar - 63));
  const sl = 1 + 0.015 * (lBar - 50) ** 2 / Math.sqrt(20 + (lBar - 50) ** 2);
  const sc = 1 + 0.045 * cpBar, sh = 1 + 0.015 * cpBar * t;
  const deltaTheta = 30 * Math.exp(-(((hpBar - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(cpBar ** 7 / (cpBar ** 7 + 25 ** 7));
  const rt = -rc * Math.sin(radians(2 * deltaTheta));
  return Math.sqrt((dl / sl) ** 2 + (dc / sc) ** 2 + (dH / sh) ** 2 + rt * (dc / sc) * (dH / sh));
}

export function compareDiversity(
  left: StructuralSignature,
  right: StructuralSignature,
  leftAppearance: AppearanceSignature,
  rightAppearance: AppearanceSignature,
  relationship: PairRelationship,
): DiversityComparison {
  const dimensions = ['compositionFamily', 'motif', 'heroObject', 'motionPersonality', 'productSurfaceTreatment', 'supportingObjectArrangement'] as const;
  const structuralDifferences = dimensions.filter((dimension) => left[dimension] !== right[dimension]);
  const categoryDimensions = ['mode', 'frame', 'font', 'background', 'logo'] as const;
  const categoryDifferences = categoryDimensions.filter((dimension) => leftAppearance[dimension] !== rightAppearance[dimension]);
  const deltaE = deltaE2000(leftAppearance.accent, rightAppearance.accent);
  const appearanceRequired = relationship === 'distinct-brand';
  const appearancePass = !appearanceRequired || deltaE >= 10 || categoryDifferences.length >= 2;
  const structuralThreshold = relationship === 'distinct-brand' ? 1 : 2;
  const issues: string[] = [];
  if (structuralDifferences.length < structuralThreshold) issues.push(`needs ${structuralThreshold} structural differences; found ${structuralDifferences.length}`);
  if (!appearancePass) issues.push(`distinct-brand appearance needs deltaE2000 >= 10 or 2 category differences; got ${deltaE.toFixed(2)} and ${categoryDifferences.length}`);
  return {
    pass: issues.length === 0,
    relationship,
    structuralDifferences: [...structuralDifferences],
    appearance: { deltaE2000: deltaE, categoryDifferences: [...categoryDifferences], required: appearanceRequired, pass: appearancePass },
    issues,
  };
}
