import { spawn } from 'node:child_process';

export function run(command: string, args: string[]): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve({ stderr });
      else reject(new Error(`${command} exited with code ${code}\n${stderr.slice(-2000)}`));
    });
  });
}
