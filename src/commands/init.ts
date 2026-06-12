import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const TEMPLATES: Record<string, string> = {
  phone: `title: My product demo
output: { format: gif, width: 480, fps: 15, budget: 5MB, displayWidth: 280 }
theme: { accent: "#e2603a", mode: light, font: inter }
frame: { type: phone, title: my-app, subtitle: "workspace · cloud" }
scenes:
  - type: typing
    duration: 3.6
    text: "Describe the task you want done"
    send: true
  - type: steps
    duration: 3.4
    header: { title: Workspace ready, detail: "Connected. Ready to work." }
    items:
      - { label: First step done, detail: "Something useful happened", state: done }
      - { label: Working on the next step, state: active }
  - type: status-card
    duration: 3.4
    transition: crossfade
    title: Result ready for review
    checks: [Checks passed, Ready for review]
    cta: { label: Approve, style: success }
    caption: Awaiting human review
  - type: hold
    duration: 1.4
`,
  browser: `title: My product demo
output: { format: gif, width: 720, fps: 15, budget: 5MB, displayWidth: 600 }
theme: { accent: "#2563eb", mode: light, font: inter }
frame: { type: browser, url: app.example.com/dashboard }
scenes:
  - type: steps
    duration: 3.5
    header: { title: Deploy started, detail: "Building and shipping your app." }
    items:
      - { label: Build passed, detail: "42s", state: done }
      - { label: Deploying to production, state: active }
  - type: status-card
    duration: 3.5
    transition: crossfade
    title: Deployed to production
    checks: [Build passed, Smoke tests green]
    cta: { label: View deployment, style: primary }
  - type: hold
    duration: 1.2
`,
  terminal: `title: My CLI demo
output: { format: gif, width: 640, fps: 15, budget: 5MB, displayWidth: 560 }
theme: { accent: "#3fb950", mode: dark, font: inter }
frame: { type: terminal, title: "demo — zsh", prompt: "$" }
scenes:
  - type: typing
    duration: 2.8
    text: "mytool deploy --prod"
  - type: steps
    duration: 3.2
    items:
      - { label: Build passed, detail: "42 modules in 1.8s", state: done }
      - { label: Uploading artifacts, state: active }
  - type: status-card
    duration: 3.0
    transition: crossfade
    title: Deployed in 12s
    checks: [All checks green]
  - type: hold
    duration: 1.0
`,
};

export async function runInit(dir: string, frame: string): Promise<void> {
  const template = TEMPLATES[frame];
  if (!template) {
    throw new Error(`unknown frame type "${frame}"; valid: ${Object.keys(TEMPLATES).join(', ')}`);
  }
  const target = path.resolve(dir);
  const configFile = path.join(target, 'demo.yml');
  if (existsSync(configFile)) {
    throw new Error(`${configFile} already exists; refusing to overwrite`);
  }
  mkdirSync(path.join(target, 'assets'), { recursive: true });
  writeFileSync(configFile, template);
  console.log(`created ${configFile} (${frame} frame) and assets/`);
  console.log('\nnext steps:');
  console.log('  1. edit demo.yml (screenshots go in assets/, referenced as assets/name.png)');
  console.log('  2. demoframe check demo.yml');
  console.log('  3. demoframe preview demo.yml');
  console.log('  4. demoframe render demo.yml');
}
