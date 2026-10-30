import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
import { root } from './helpers.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
function serve(dir) {
  const srv = createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    try { const body = await readFile(join(dir, p.endsWith('/') ? p + 'index.html' : p)); res.writeHead(200, { 'content-type': TYPES[extname(p) || '.html'] || 'application/octet-stream' }); res.end(body); }
    catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

test('installable and playable offline once loaded', { timeout: 60_000 }, async () => {
  const srv = await serve(join(root, 'dist'));
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
    assert.equal(manifest.name, '새벽의 왕국');
    assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'), 'maskable icon');
    for (const i of manifest.icons) assert.equal((await page.request.get(url + i.src)).status(), 200, i.src);
    await page.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.ready.then(() => true), null, { timeout: 15_000 });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // now controlled by the service worker
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 });
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => window.__rts);
    await page.click('#go');
    assert.ok(await page.evaluate(() => { __rts.step(5); return __rts.G.units.length > 0; }), 'game runs offline');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); srv.close(); }
});
