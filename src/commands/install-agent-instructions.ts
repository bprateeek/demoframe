import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GENERATED_AGENT_GUIDANCE } from '../generated/guidance.js';

const START = '<!-- demoframe:start -->';
const END = '<!-- demoframe:end -->';

export interface InstallAgentInstructionsResult {
  file: string;
  action: 'created' | 'updated';
}

function nearestGitRoot(startDir: string): string {
  let current = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(startDir);
    current = parent;
  }
}

function guidanceBlock(): string {
  return `${START}\n${GENERATED_AGENT_GUIDANCE}\n${END}`;
}

export function installAgentInstructions(dir = '.'): InstallAgentInstructionsResult {
  const root = nearestGitRoot(dir);
  const file = path.join(root, 'AGENTS.md');
  mkdirSync(path.dirname(file), { recursive: true });

  const block = guidanceBlock();
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
  const next = pattern.test(existing)
    ? existing.replace(pattern, block)
    : `${existing.trimEnd()}${existing.trim().length > 0 ? '\n\n' : ''}${block}\n`;

  writeFileSync(file, next.endsWith('\n') ? next : `${next}\n`);
  return { file, action: existing.length > 0 ? 'updated' : 'created' };
}
