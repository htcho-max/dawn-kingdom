// Renders the app icons (dev-only; needs Playwright). Output: src/icons/*.png
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
const draw = (size, safe) => `(() => {
  const c = document.createElement('canvas'); c.width = c.height = ${size};
  const x = c.getContext('2d'), S = ${size}, k = ${safe ? 0.72 : 0.9};
  // night-to-dawn sky
  const g = x.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, '#141a2a'); g.addColorStop(0.62, '#2b2f4a'); g.addColorStop(1, '#6b4a3a');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.translate(S / 2, S / 2); x.scale(k * S / 512, k * S / 512);
  // rising sun
  const sg = x.createRadialGradient(0, 70, 10, 0, 70, 210);
  sg.addColorStop(0, 'rgba(255,214,120,1)'); sg.addColorStop(0.45, 'rgba(240,170,70,.9)'); sg.addColorStop(1, 'rgba(240,170,70,0)');
  x.fillStyle = sg; x.beginPath(); x.arc(0, 70, 210, 0, 7); x.fill();
  x.fillStyle = '#f6c45c'; x.beginPath(); x.arc(0, 70, 112, Math.PI, 0); x.fill();
  // castle silhouette
  x.fillStyle = '#10141f';
  const tower = (cx, w, h) => { x.fillRect(cx - w / 2, 160 - h, w, h); for (let i = 0; i < 3; i++) x.fillRect(cx - w / 2 + i * (w / 2.5), 160 - h - 22, w / 5, 22); };
  tower(-150, 70, 190); tower(150, 70, 190); x.fillRect(-150, 40, 300, 120); tower(0, 110, 260);
  for (let i = -4; i <= 4; i++) x.fillRect(i * 32 - 10, 18, 20, 22);
  x.fillStyle = '#f6c45c'; x.beginPath(); x.moveTo(-26, 160); x.lineTo(-26, 110); x.arc(0, 110, 26, Math.PI, 0); x.lineTo(26, 160); x.fill();
  // banner
  x.fillStyle = '#10141f'; x.fillRect(-3, -150, 6, 50); x.fillStyle = '#3f7fe0'; x.beginPath(); x.moveTo(3, -150); x.lineTo(60, -135); x.lineTo(3, -120); x.fill();
  // ground
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#10141f'; x.fillRect(0, S / 2 + k * S / 512 * 160, S, S);
  return c.toDataURL('image/png').split(',')[1];
})()`;

const b = await chromium.launch(); const p = await b.newPage();
for (const [name, size, safe] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['maskable-512.png', 512, true], ['apple-touch-icon.png', 180, false]]) {
  writeFileSync(join(out, name), Buffer.from(await p.evaluate(draw(size, safe)), 'base64'));
  console.log('wrote', name);
}
await b.close();
