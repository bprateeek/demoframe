import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = process.env.PORT || 4180;

const services = [
  { name: 'api', url: 'https://api.example.com/health', latencyMs: 42, status: 'up' },
  { name: 'web', url: 'https://example.com', latencyMs: 88, status: 'up' },
  { name: 'worker', url: 'https://jobs.example.com/health', latencyMs: 130, status: 'degraded' },
  { name: 'postgres', url: 'tcp://db.internal:5432', latencyMs: 3, status: 'up' },
];

function snapshot() {
  return services.map((s) => ({
    ...s,
    latencyMs: Math.max(1, Math.round(s.latencyMs * (0.8 + Math.random() * 0.4))),
    checkedAt: new Date().toISOString(),
  }));
}

const server = createServer((req, res) => {
  if (req.url === '/api/status') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ services: snapshot(), uptimePct: 99.97 }));
    return;
  }
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(resolve('public/index.html')));
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`pulseboard listening on http://localhost:${PORT}`);
});
