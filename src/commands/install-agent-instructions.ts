import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { INTERVIEW_QUESTIONS } from '../qa/brief.js';

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
  const questions = INTERVIEW_QUESTIONS.map((question, index) => `${index + 1}. ${question}`).join('\n');
  return `${START}
## Demos (demoframe)
Screenshots are reference, not ingredients: reconstruct the flow as synthetic demoframe scenes (typing/steps/status-card/chat/screen), never paste screenshots into a frame.

Interview first before authoring any config:
${questions}

Record the answers in the top-level brief block, set \`brief.mode: user-confirmed\` only after the user has confirmed the story and screen-to-scene mapping, and fill audience/source/screenshotPolicy/placement/arc/climax. An inferred brief is not a bypass: \`demoframe check\`, \`demoframe preview\`, and \`demoframe render\` refuse unconfirmed briefs unless the run explicitly passes \`--autonomous\` (or MCP \`autonomous: true\`), which labels the output as \`mode: inferred\` and records assumptions.

\`demoframe check\`/\`render\` reject a frameless all-screenshot demo; \`--allow-raw-screenshots\` is only for an intentional raw demo such as a bug report or before/after proof. For \`brief.intent: abstract\`, screenshot scenes require \`brief.screenshotPolicy: raw-intentional\`, and rendered scenes need visible product payload from \`brief.product\`, \`brief.verbatimCopy\`, or a metric/callout value.
${END}`;
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
