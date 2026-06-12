import { createServer, type ServerResponse } from 'node:http';
import { watch } from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config/load.js';
import { buildDocument } from '../templates/document.js';
import { escapeHtml } from '../templates/html.js';

const INDEX_HTML = (title: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>demoframe: ${escapeHtml(title)}</title>
<style>
  body { margin: 0; background: #14181f; color: #d6dde6; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; height: 100vh; }
  #wrap { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  iframe { flex: none; border: 0; transform-origin: center center; }
  .bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: #1b212b; }
  .bar input[type=range] { flex: 1; }
  .bar button { background: #2b3442; color: #d6dde6; border: 0; border-radius: 6px; padding: 6px 14px; cursor: pointer; }
  .bar .t { font-variant-numeric: tabular-nums; min-width: 90px; text-align: right; }
</style>
</head>
<body>
<div id="wrap"><iframe id="demo" src="/demo.html"></iframe></div>
<div class="bar">
  <button id="play">pause</button>
  <input id="scrub" type="range" min="0" max="1000" value="0" step="1">
  <span class="t" id="time">0.0s</span>
</div>
<script>
  let duration = 1;
  let playing = true;
  let t = 0;
  let last = performance.now();
  const iframe = document.getElementById('demo');
  const scrub = document.getElementById('scrub');
  const time = document.getElementById('time');
  const play = document.getElementById('play');

  const wrap = document.getElementById('wrap');
  let viewport = { width: 480, height: 1040 };

  function fit() {
    iframe.style.width = viewport.width + 'px';
    iframe.style.height = viewport.height + 'px';
    const pad = 24;
    const scale = Math.min(
      (wrap.clientWidth - pad) / viewport.width,
      (wrap.clientHeight - pad) / viewport.height,
      1,
    );
    iframe.style.transform = 'scale(' + scale + ')';
    iframe.style.margin = (-(viewport.height * (1 - scale)) / 2) + 'px ' + (-(viewport.width * (1 - scale)) / 2) + 'px';
  }
  window.addEventListener('resize', fit);

  async function loadMeta() {
    const meta = await (await fetch('/meta.json')).json();
    duration = meta.duration;
    viewport = meta.viewport;
    fit();
  }
  loadMeta();

  function seek(ms) {
    try { iframe.contentWindow.__seek(ms); } catch (e) {}
    scrub.value = String(Math.round((ms / (duration * 1000)) * 1000));
    time.textContent = (ms / 1000).toFixed(1) + 's';
  }
  function tick(now) {
    if (playing) {
      t = (t + (now - last)) % (duration * 1000);
      seek(t);
    }
    last = now;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  scrub.addEventListener('input', () => {
    playing = false;
    play.textContent = 'play';
    t = (Number(scrub.value) / 1000) * duration * 1000;
    seek(t);
  });
  play.addEventListener('click', () => {
    playing = !playing;
    play.textContent = playing ? 'pause' : 'play';
  });

  const events = new EventSource('/events');
  events.onmessage = async () => {
    await loadMeta();
    iframe.src = '/demo.html?' + Date.now();
  };
</script>
</body>
</html>`;

export async function runServe(configFile: string, port: number): Promise<void> {
  const configPath = path.resolve(configFile);
  const baseDir = path.dirname(configPath);
  const clients = new Set<ServerResponse>();

  const server = createServer(async (req, res) => {
    const url = (req.url ?? '/').split('?')[0];
    try {
      if (url === '/') {
        const { config } = loadConfig(configPath);
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(INDEX_HTML(config.title ?? path.basename(configPath)));
      } else if (url === '/demo.html') {
        const { config } = loadConfig(configPath);
        const doc = await buildDocument(config, baseDir);
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(doc.html);
      } else if (url === '/meta.json') {
        const { config } = loadConfig(configPath);
        const doc = await buildDocument(config, baseDir);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ duration: doc.timeline.duration, viewport: doc.viewport }));
      } else if (url === '/events') {
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        });
        res.write('\n');
        clients.add(res);
        req.on('close', () => clients.delete(res));
      } else {
        res.writeHead(404);
        res.end('not found');
      }
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String((err as Error).message));
    }
  });

  let pending: NodeJS.Timeout | null = null;
  const notify = () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      for (const client of clients) client.write('data: reload\n\n');
    }, 150);
  };
  watch(baseDir, { recursive: true }, notify);

  server.listen(port, '127.0.0.1', () => {
    console.log(`demoframe serve: http://localhost:${port} (watching ${baseDir})`);
    console.log('edit the config or assets; the preview reloads automatically. Ctrl+C to stop.');
  });
}
