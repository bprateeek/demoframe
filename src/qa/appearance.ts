import type { LoadedConfig } from '../config/load.js';
import { PALETTE_KEYS, normalizeLogo, type DemoConfig } from '../config/schema.js';
import type { ValidatedContextManifest } from '../context/load.js';
import { PALETTES, resolveTheme } from '../templates/theme.js';
import { isPlaceholder } from './brief.js';

export interface AppearanceFinding {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface AppearanceDeltaItem {
  field: string;
  supplied: true;
  effective: boolean;
  delta: boolean;
  value?: unknown;
  stockValues?: unknown[];
  evidence?: string;
  noSource?: string;
  verified: boolean;
}

export interface AppearanceValidationResult {
  items: AppearanceDeltaItem[];
  errors: AppearanceFinding[];
  warnings: AppearanceFinding[];
  notices: AppearanceFinding[];
}

function finding(code: string, message: string, details?: Record<string, unknown>): AppearanceFinding {
  return details ? { code, message, details } : { code, message };
}

function hasPath(loaded: LoadedConfig, field: string): boolean {
  return loaded.provenance.suppliedPaths.includes(field);
}

function pushMissing(
  result: AppearanceValidationResult,
  config: DemoConfig,
  item: AppearanceFinding,
): void {
  if (config.brief?.mode === 'user-confirmed') {
    if (config.brief.screenshotPolicy === 'raw-intentional') result.warnings.push(item);
    else result.errors.push(item);
  } else {
    result.notices.push({ ...item, code: `${item.code}.inferred` });
  }
}

function effectiveItems(loaded: LoadedConfig): AppearanceDeltaItem[] {
  const config = loaded.config;
  const resolved = resolveTheme(config.theme);
  const items: AppearanceDeltaItem[] = [];
  const add = (field: string, value: unknown, stockValues: unknown[], effective = true) => {
    if (!hasPath(loaded, field)) return;
    items.push({
      field,
      supplied: true,
      effective,
      delta: effective && !stockValues.some((stock) => stock === value),
      value,
      stockValues,
      verified: false,
    });
  };

  add('theme.accent', resolved.accent, ['#e2603a']);
  if (config.theme.preset) add('theme.preset', config.theme.preset, [], true);
  if (config.theme.background) {
    add('theme.background', config.theme.background, [PALETTES.light.page, PALETTES.dark.page]);
  }
  for (const key of PALETTE_KEYS) {
    const field = `theme.palette.${key}`;
    const value = config.theme.palette?.[key];
    if (value !== undefined) add(field, value, [PALETTES.light[key], PALETTES.dark[key]]);
  }
  if (hasPath(loaded, 'theme.font')) {
    const value = config.theme.font;
    items.push({
      field: 'theme.font',
      supplied: true,
      effective: true,
      delta: value !== 'inter',
      value,
      stockValues: ['inter'],
      verified: false,
    });
  }
  const logo = normalizeLogo(config.theme.logo);
  if (logo && hasPath(loaded, 'theme.logo')) {
    items.push({ field: 'theme.logo', supplied: true, effective: true, delta: true, value: logo, stockValues: [], verified: false });
  }
  if (config.frame.type === 'phone' && config.frame.deviceColor) {
    add('frame.deviceColor', config.frame.deviceColor, ['#18243a']);
  }

  const artPaths = loaded.provenance.suppliedPaths.filter((path) => path.startsWith('artDirection.'));
  const artLeaves = artPaths.filter(
    (candidate) => !artPaths.some((other) => other !== candidate && (other.startsWith(`${candidate}.`) || other.startsWith(`${candidate}[`))),
  );
  for (const field of artLeaves) {
    items.push({ field, supplied: true, effective: false, delta: false, verified: false });
  }
  return items;
}

export function validateAppearanceDelta(
  loaded: LoadedConfig,
  context?: ValidatedContextManifest,
): AppearanceValidationResult {
  const result: AppearanceValidationResult = { items: effectiveItems(loaded), errors: [], warnings: [], notices: [] };
  const evidenceItems = loaded.config.brief?.appearanceEvidence ?? [];
  const records = new Map<string, (typeof evidenceItems)[number]>();
  for (const record of evidenceItems) {
    if (records.has(record.field)) {
      result.errors.push(finding('appearance.evidenceDuplicate', `appearance evidence for ${record.field} is duplicated`, { field: record.field }));
    }
    records.set(record.field, record);
  }

  for (const item of result.items) {
    const record = records.get(item.field);
    if (!item.effective) {
      if (record) {
        result.notices.push(
          finding('appearance.evidenceDeferred', `${item.field} evidence is recorded but excluded until the field affects pixels`, {
            field: item.field,
          }),
        );
      }
      continue;
    }
    if (!item.delta) {
      item.verified = true;
      if (record) {
        result.warnings.push(
          finding('appearance.evidenceUnused', `${item.field} matches a stock value, so its evidence record is unused`, {
            field: item.field,
          }),
        );
      }
      continue;
    }
    if (!record) {
      pushMissing(
        result,
        loaded.config,
        finding('appearance.evidenceMissing', `${item.field} changes rendered appearance but has no evidence or noSource reason`, {
          field: item.field,
          value: item.value,
        }),
      );
      continue;
    }
    if ('noSource' in record) {
      if (isPlaceholder(record.noSource)) {
        result.errors.push(
          finding('appearance.noSourcePlaceholder', `${item.field} noSource must be a real reason, not a placeholder`, {
            field: item.field,
          }),
        );
        continue;
      }
      item.noSource = record.noSource;
      item.verified = true;
      result.notices.push(
        finding('appearance.noSource', `${item.field} has no source evidence: ${record.noSource}`, {
          field: item.field,
          reason: record.noSource,
        }),
      );
      continue;
    }
    item.evidence = record.evidence;
    const entry = context?.entries.get(record.evidence);
    if (!entry) {
      result.errors.push(
        finding('appearance.evidenceUnknown', `${item.field} references missing context evidence "${record.evidence}"`, {
          field: item.field,
          evidence: record.evidence,
        }),
      );
      continue;
    }
    if (item.field === 'theme.logo' && (entry.kind !== 'asset' || entry.role !== 'logo')) {
      result.errors.push(
        finding('appearance.evidenceKind', 'theme.logo evidence must reference a context asset with role: logo', {
          field: item.field,
          evidence: record.evidence,
          kind: entry.kind,
        }),
      );
      continue;
    }
    if (item.field === 'theme.font' && (entry.kind !== 'asset' || entry.role !== 'font')) {
      result.errors.push(
        finding('appearance.evidenceKind', 'theme.font evidence must reference a context asset with role: font', {
          field: item.field,
          evidence: record.evidence,
          kind: entry.kind,
        }),
      );
      continue;
    }
    item.verified = true;
  }

  for (const [field] of records) {
    if (!result.items.some((item) => item.field === field)) {
      result.warnings.push(
        finding('appearance.evidenceUnused', `${field} is not a supplied appearance field`, { field }),
      );
    }
  }
  return result;
}
