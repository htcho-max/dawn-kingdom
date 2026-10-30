// Bundles src/ into single-file HTML builds.
//   dist/index.html    — full document (GitHub Pages, local play)
//   dist/artifact.html — body fragment for publishing as a Claude artifact
//   dist/sw.js, manifest.webmanifest, icons/ — install & offline support
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(root, 'src', p), 'utf8');

let html = src('index.html');

// Inline the stylesheet.
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${src('style.css')}</style>`);

// Concatenate the scripts (in the order listed) into one <script>.
html = html.replace(/<!-- build:js -->([\s\S]*?)<!-- \/build:js -->/, (_, block) => {
  const files = [...block.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  if (!files.length) throw new Error('no scripts found in build:js block');
  // Source files share one scope: they are plain scripts in development (global
  // lexical scope) and are wrapped in a single strict IIFE for the build.
  const code = files
    .map((f) => `// ===== ${f} =====\n${src(f).replace(/^'use strict';\n/, '')}`)
    .join('\n');
  return `<script>\n(()=>{\n'use strict';\n${code}})();\n</script>`;
});

const between = (s, tag) => {
  const m = s.match(new RegExp(`<!-- ${tag} -->\\n?([\\s\\S]*?)<!-- \\/${tag} -->`));
  if (!m) throw new Error(`marker ${tag} missing`);
  return m[1];
};
const artifact = between(html, 'artifact:head') + between(html, 'artifact:body');
const full = html.replace(/<!-- \/?artifact:(head|body) -->\n?/g, '');

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'index.html'), full);
writeFileSync(join(root, 'dist', 'artifact.html'), artifact);

// PWA files: manifest, icons, and a service worker stamped with this build's hash.
const version = createHash('sha256').update(full).digest('hex').slice(0, 12);
writeFileSync(join(root, 'dist', 'sw.js'), src('sw.js').replace('__VERSION__', version));
copyFileSync(join(root, 'src', 'manifest.webmanifest'), join(root, 'dist', 'manifest.webmanifest'));
mkdirSync(join(root, 'dist', 'icons'), { recursive: true });
for (const f of readdirSync(join(root, 'src', 'icons'))) copyFileSync(join(root, 'src', 'icons', f), join(root, 'dist', 'icons', f));
console.log(`built dist/index.html (${(full.length / 1024).toFixed(0)} KB), dist/artifact.html, PWA ${version}`);
