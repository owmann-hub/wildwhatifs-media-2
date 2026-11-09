// usage: node render.mjs <scene> <mode:stills|video> <args...>
// stills: node render.mjs heat stills out_dir t1,t2,t3
// video:  node render.mjs heat video out.mp4 start end [fps]
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const root = path.dirname(new URL(import.meta.url).pathname);
const [scene, mode, outArg, a, b, fpsArg] = process.argv.slice(2);
const W = +process.env.W || 1080, H = +process.env.H || 1920;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/page.html?scene=${scene}&w=${W}&h=${H}&dbg=${process.env.DBG||''}`);
await page.waitForFunction('window.ready === true', null, { timeout: 120000 });

const toBuf = (d) => Buffer.from(d.split(',')[1], 'base64');
const t0 = Date.now();
if (mode === 'stills') {
  fs.mkdirSync(outArg, { recursive: true });
  for (const ts of a.split(',')) {
    const t = +ts;
    // warm up stateful sims by stepping to t
    const d = await page.evaluate(([t]) => window.renderFrame(t, 0.88), [t]);
    fs.writeFileSync(path.join(outArg, `${scene}_${t.toFixed(2).padStart(6,'0')}.jpg`), toBuf(d));
  }
} else {
  const start = +a, end = +b, fps = +(fpsArg || 30);
  const n = Math.round((end - start) * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `scale=1080:1920:flags=lanczos`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), outArg], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < n; i++) {
    const t = start + i / fps;
    const d = await page.evaluate(([t]) => window.renderFrame(t, 0.92), [t]);
    if (!ff.stdin.write(toBuf(d))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`${scene} frame ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await browser.close();
server.close();
