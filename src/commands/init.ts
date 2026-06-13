import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

export interface TemplateMeta {
  name: string;
  description: string;
  frames: string[];
  scenes: string[];
  demoframeVersion: string;
}

function templatesDir(): string {
  return fileURLToPath(new URL('../../templates', import.meta.url));
}

export function listTemplates(): TemplateMeta[] {
  const dir = templatesDir();
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => parseYaml(readFileSync(path.join(dir, entry.name, 'meta.yml'), 'utf8')) as TemplateMeta)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface InitOptions {
  frame?: string;
  template?: string;
  list?: boolean;
}

export async function runInit(dir: string, opts: InitOptions = {}): Promise<void> {
  if (opts.list) {
    for (const meta of listTemplates()) {
      console.log(`${meta.name}`);
      console.log(`    ${meta.description}`);
      console.log(`    frames: ${meta.frames.join(', ')} | scenes: ${meta.scenes.join(', ')}`);
    }
    console.log('\nusage: demoframe init --template <name>');
    return;
  }

  const name = opts.template ?? `starter-${opts.frame ?? 'phone'}`;
  const templateFile = path.join(templatesDir(), name, 'template.yml');
  if (!existsSync(templateFile)) {
    const available = listTemplates()
      .map((meta) => meta.name)
      .join(', ');
    throw new Error(`unknown template "${name}"; available: ${available}`);
  }

  const target = path.resolve(dir);
  const configFile = path.join(target, 'demo.yml');
  if (existsSync(configFile)) {
    throw new Error(`${configFile} already exists; refusing to overwrite`);
  }
  mkdirSync(path.join(target, 'assets'), { recursive: true });
  writeFileSync(configFile, readFileSync(templateFile));
  console.log(`created ${configFile} (${name} template) and assets/`);
  console.log('\nreconstruct first: screenshots are reference, not ingredients. Rebuild the flow as');
  console.log('synthetic scenes (typing/steps/status-card/chat); a frameless all-screenshot demo is');
  console.log('rejected by check/render. Pass --allow-raw-screenshots only for an intentional raw demo.');
  console.log('\ninterview before authoring:');
  console.log('  1. Narrative arc: the ask, the work, the result.');
  console.log('  2. Climax / money shot: which single moment to land and hold on.');
  console.log('  3. Destination: readme, x-post, linkedin, or product-hunt.');
  console.log('  4. Brand: accent color, frame type (phone/browser/terminal/desktop), light or dark.');
  console.log('  5. Product and repo names.');
  console.log('  6. Copy to feature verbatim (exact button labels, titles).');
  console.log('  7. Screenshot extraction: what to preserve, what to simplify or remove.');
  console.log('\nnext steps:');
  console.log('  1. edit demo.yml (any reference screenshots go in assets/, as assets/name.png)');
  console.log('  2. demoframe check demo.yml');
  console.log('  3. demoframe preview demo.yml');
  console.log('  4. demoframe render demo.yml');
}
