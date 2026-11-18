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
await page.goto(`http://localhost:${port}/page.html?scene=${scene}&w=${W}&h=${H}&dbg=${process.env.DBG||''}&aa=${process.env.AA??4}${process.env.VOFF!==undefined?'&voff='+process.env.VOFF:''}${process.env.NOHUD?'&nohud=1':''}`);
await page.waitForFunction('window.ready === true', null, { timeout: 120000 });

const toBuf = (d) => Buffer.from(d.split(',')[1], 'base64');
const t0 = Date.now();
if (mode === 'qa') {
  // node render.mjs <scene> qa <out_dir> [step]  -> out_dir/qa.json + a still of every flagged moment
  fs.mkdirSync(outArg, { recursive: true });
  const step = +(a || 0.5); const { TOTAL } = await page.evaluate(() => window.qaInfo());
  const rep = []; let bad = 0;
  for (let t = 0; t <= TOTAL + 1e-6; t += step) { const r = await page.evaluate(([t]) => window.qaProbe(t), [t]); if (r.issues.length) { rep.push(r); bad++; } }
  // group consecutive flags into ranges and grab one still per range
  const ranges = []; for (const r of rep) { const k = r.issues.map(i => i.type).sort().join('+'); const L = ranges[ranges.length - 1];
    if (L && L.key === k && r.t - L.to <= step * 1.5) L.to = r.t; else ranges.push({ key: k, from: r.t, to: r.t, sample: r }); }
  for (const R of ranges) { const tm = (R.from + R.to) / 2; const d = await page.evaluate(([t]) => window.renderFrame(t, 0.85), [tm]); R.still = `qa_${tm.toFixed(2)}.jpg`; fs.writeFileSync(path.join(outArg, R.still), toBuf(d)); }
  fs.writeFileSync(path.join(outArg, 'qa.json'), JSON.stringify({ scene, TOTAL, step, flagged_samples: bad, ranges }, null, 1));
  console.log(`QA ${scene}: ${ranges.length} problem range(s)`); for (const R of ranges) console.log(`  ${R.from.toFixed(1)}-${R.to.toFixed(1)}s  ${R.key}  ${JSON.stringify(R.sample.issues[0])}  -> ${R.still}`);
} else if (mode === 'stills') {
  fs.mkdirSync(outArg, { recursive: true });
  for (const ts of a.split(',')) {
    const t = +ts;
    // warm up stateful sims by stepping to t
    const d = await page.evaluate(([t, q]) => window.renderFrame(t, q), [t, +(process.env.Q || 0.88)]);
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
