import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { installAgentInstructions } from './install-agent-instructions.js';
import { runContextInit } from './contextInit.js';

export interface TemplateMeta {
  name: string;
  description: string;
  category: string;
  frames: string[];
  scenes: string[];
  demoframeVersion: string;
}

const CATEGORY_DEFAULTS: Record<string, string> = {
  agent: 'assistant-chat',
  'developer-tool': 'starter-terminal',
  marketing: 'launch-metrics',
  mobile: 'starter-phone',
  product: 'product-dashboard',
  'web-app': 'starter-browser',
};

const BRIEF_STUB = `profile: readme-loop
context: { manifest: demoframe-context.yml }
brief:
  # mode: user-confirmed   # set after interviewing; use --autonomous only for inferred/headless runs
  # intent: product         # product | abstract | hybrid
  audience: "TODO: who is this for"
  source: "TODO: screenshots / app under demo"
  # screenshotPolicy: reconstruct   # reconstruct | simplify | raw-intentional
  # placement: github-readme        # github-readme | x-post | linkedin | product-hunt
  # recommended: arc, climax        # optional: brand, product, repo, verbatimCopy
  appearanceEvidence:
    - { field: theme.accent, noSource: "TODO: cite a context id instead when brand source exists" }
  story:
    version: 2
    promise: "TODO: the durable promise shown on screen"
    proof:
      - { evidence: product-title, mode: exact }
    beats:
      - { id: hook, role: hook }
      - { id: build, role: build }
      - { id: payoff, role: payoff }
`;

function templateWithBeatIds(template: string): string {
  const contentTypes = [...template.matchAll(/^  - type: ([^\s#]+)/gm)]
    .map((match) => match[1])
    .filter((type) => type !== 'hold');
  let contentIndex = 0;
  return template.replace(/^  - type: ([^\s#]+).*$/gm, (line, type: string) => {
    if (type === 'hold') return line;
    const beatId =
      contentTypes.length === 1
        ? 'payoff'
        : contentIndex === 0
          ? 'hook'
          : contentIndex === contentTypes.length - 1
            ? 'payoff'
            : 'build';
    contentIndex += 1;
    return `${line}\n    beatId: ${beatId}`;
  });
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
  category?: string;
  list?: boolean;
  agentInstructions?: boolean;
}

export async function runInit(dir: string, opts: InitOptions = {}): Promise<void> {
  const templates = listTemplates();
  if (opts.list) {
    const byCategory = new Map<string, TemplateMeta[]>();
    for (const meta of templates) {
      const group = byCategory.get(meta.category) ?? [];
      group.push(meta);
      byCategory.set(meta.category, group);
    }
    for (const category of [...byCategory.keys()].sort()) {
      console.log(`${category}:`);
      for (const meta of byCategory.get(category) ?? []) {
        console.log(`  ${meta.name}`);
        console.log(`      ${meta.description}`);
        console.log(`      frames: ${meta.frames.join(', ')} | scenes: ${meta.scenes.join(', ')}`);
      }
    }
    console.log('\nusage: demoframe init --template <name> | --category <name>');
    return;
  }

  const categories = [...new Set(templates.map((meta) => meta.category))].sort();
  const byName = new Map(templates.map((meta) => [meta.name, meta]));
  if (opts.category && !categories.includes(opts.category)) {
    throw new Error(`unknown category "${opts.category}"; available: ${categories.join(', ')}`);
  }

  const name = opts.template
    ? opts.template
    : opts.category
      ? CATEGORY_DEFAULTS[opts.category] ?? templates.find((meta) => meta.category === opts.category)?.name
      : `starter-${opts.frame ?? 'phone'}`;
  if (!name) {
    throw new Error(`no template found for category "${opts.category}"`);
  }
  const selectedMeta = byName.get(name);
  if (opts.template && opts.category && selectedMeta && selectedMeta.category !== opts.category) {
    throw new Error(
      `template "${opts.template}" is in category "${selectedMeta.category}", not "${opts.category}"`,
    );
  }
  const templateFile = path.join(templatesDir(), name, 'template.yml');
  if (!existsSync(templateFile)) {
    const available = templates.map((meta) => meta.name).join(', ');
    throw new Error(`unknown template "${name}"; available: ${available}`);
  }

  const target = path.resolve(dir);
  const configFile = path.join(target, 'demo.yml');
  if (existsSync(configFile)) {
    throw new Error(`${configFile} already exists; refusing to overwrite`);
  }
  mkdirSync(path.join(target, 'assets'), { recursive: true });
  const template = readFileSync(templateFile, 'utf8');
  writeFileSync(configFile, `${BRIEF_STUB}\n${templateWithBeatIds(template)}`);
  const contextFile = path.join(target, 'demoframe-context.yml');
  if (!existsSync(contextFile)) runContextInit(target);
  console.log(`created ${configFile} (${name} template), demoframe-context.yml, and assets/`);
  if (opts.agentInstructions !== false) {
    const installed = installAgentInstructions(target);
    console.log(`${installed.action} ${installed.file}`);
  }
  console.log('\nreconstruct first: screenshots are reference, not ingredients. Rebuild the flow as');
  console.log('synthetic scenes (typing/steps/status-card/chat/screen); a frameless all-screenshot demo is');
  console.log('rejected by check/render. Pass --allow-raw-screenshots only for an intentional raw demo.');
  console.log('Asset paths resolve relative to the demo.yml file; screen blocks use built-in icons/avatars.');
  console.log('For product/category mapping guidance, see docs/categories/ in the package.');
  console.log('\ninterview before authoring:');
  console.log('  ask the 7 interview questions, confirm the scene mapping, then set brief.mode: user-confirmed.');
  console.log('  fill the brief: block with audience/source/screenshotPolicy/placement, then arc and climax.');
  console.log('  bind brief.story promise/proof/beats to visible copy, context ids, and scene beatId fields.');
  console.log('  use --autonomous only for explicit inferred/headless runs; record assumptions when you do.');
  console.log('  use brand/product/repo/verbatimCopy to capture exact names, labels, and style constraints.');
  console.log('  record screenshot extraction choices in source and screenshotPolicy before writing scenes.');
  console.log('\nnext steps:');
  console.log('  1. fill brief: in demo.yml (any reference screenshots go in assets/, as assets/name.png)');
  console.log('  2. demoframe check demo.yml');
  console.log('  3. demoframe preview demo.yml');
  console.log('  4. demoframe render demo.yml');
}
