// Shared Playwright setup. Tests run against dist/index.html by default;
// set DAWN_TARGET=src to test the unbundled source (src/index.html).
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const pageUrl = (target = process.env.DAWN_TARGET || 'dist') =>
  pathToFileURL(join(root, target === 'src' ? 'src/index.html' : 'dist/index.html')).href;

/** Opens the game and returns { page, ev, errors, close }. */
export async function openGame({ viewport = { width: 1280, height: 800 }, touch = false, target } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, hasTouch: touch });
  // Web fonts are cosmetic; block them so tests work offline.
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${e.message} @ ${(e.stack || '').split('\n')[1] || ''}`));
  await page.goto(pageUrl(target));
  await page.waitForFunction(() => window.__rts);
  return {
    browser, context, page, errors,
    ev: (fn, arg) => page.evaluate(fn, arg),
    close: () => browser.close(),
  };
}
