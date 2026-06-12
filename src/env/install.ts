import { spawn } from 'node:child_process';
import { chromiumInstalled, playwrightCliPath } from './browser.js';

export async function installBrowser(): Promise<void> {
  if (chromiumInstalled()) {
    console.log('Chromium is already installed.');
    return;
  }
  console.log('Downloading Chromium (pinned to the bundled Playwright version)...');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [playwrightCliPath(), 'install', 'chromium'], {
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`playwright install exited with code ${code}`));
    });
  });
  console.log('Chromium installed.');
}
