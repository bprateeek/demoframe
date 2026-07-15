import { z } from 'zod';

const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/, 'expected sha256:<64 lowercase hex characters>');
const sourcePath = z.string().min(1).max(500);
const selector = z.union([
  z.object({ lines: z.tuple([z.number().int().positive(), z.number().int().positive()]) }).strict(),
  z.object({ jsonPointer: z.string().startsWith('/') }).strict(),
]);
const source = z
  .object({
    path: sourcePath,
    selector,
    digest,
  })
  .strict();
const base = {
  id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/, 'expected a lowercase semantic id'),
};

const metricEntry = z
  .object({
    ...base,
    kind: z.literal('metric'),
    label: z.string().min(1).max(120),
    value: z.number().finite(),
    unit: z.string().max(24).optional(),
    formatter: z.enum(['number', 'compact', 'duration-ms', 'bytes']).default('number'),
    decimals: z.number().int().min(0).max(3).default(2),
    source,
  })
  .strict();

const claimEntry = z.object({ ...base, kind: z.literal('claim'), text: z.string().min(1).max(500), source }).strict();
const copyEntry = z.object({ ...base, kind: z.literal('copy'), text: z.string().min(1).max(500), source }).strict();
const commandEntry = z
  .object({
    ...base,
    kind: z.literal('command'),
    command: z.string().min(1).max(300),
    result: z.string().min(1).max(500).optional(),
    source,
  })
  .strict();
const routeEntry = z
  .object({
    ...base,
    kind: z.literal('route'),
    path: z.string().min(1).max(300),
    label: z.string().min(1).max(120),
    source,
  })
  .strict();
const assetEntry = z
  .object({
    ...base,
    kind: z.literal('asset'),
    path: sourcePath,
    role: z.enum(['logo', 'font', 'screenshot', 'illustration', 'avatar', 'icon']),
    license: z.string().min(1).max(160),
    privacyReviewed: z.literal(true),
    source: source.optional(),
  })
  .strict();
const vocabEntry = z
  .object({
    ...base,
    kind: z.literal('vocab'),
    text: z.string().min(1).max(240),
    rationale: z.string().min(1).max(300),
    source,
  })
  .strict();
const metaphorEntry = z
  .object({
    ...base,
    kind: z.literal('metaphor'),
    text: z.string().min(1).max(240),
    rationale: z.string().min(1).max(300),
    source,
  })
  .strict();

export const contextEntrySchema = z.discriminatedUnion('kind', [
  metricEntry,
  claimEntry,
  copyEntry,
  commandEntry,
  routeEntry,
  assetEntry,
  vocabEntry,
  metaphorEntry,
]);

export const contextManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    entries: z.array(contextEntrySchema).min(1).max(200),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    const ids = new Set<string>();
    manifest.entries.forEach((entry, index) => {
      if (ids.has(entry.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['entries', index, 'id'], message: `duplicate id "${entry.id}"` });
      }
      ids.add(entry.id);
    });
  });

export type ContextManifest = z.infer<typeof contextManifestSchema>;
export type ContextEntry = z.infer<typeof contextEntrySchema>;
export type MetricContextEntry = z.infer<typeof metricEntry>;
export type ContextSource = Exclude<ContextEntry['source'], undefined>;
