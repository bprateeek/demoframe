import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { demoConfigSchema } from './schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'schema');
mkdirSync(outDir, { recursive: true });

const jsonSchema = zodToJsonSchema(demoConfigSchema, {
  name: 'DemoframeConfig',
  $refStrategy: 'none',
});

const outPath = path.join(outDir, 'demoframe.schema.json');
writeFileSync(outPath, `${JSON.stringify(jsonSchema, null, 2)}\n`);
console.log(`wrote ${path.relative(root, outPath)}`);
