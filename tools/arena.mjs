// Balance arena: equal-cost armies fight on open ground. Usage: node tools/arena.mjs [unitA,unitB,...]
// Prints wins and the average value left over for each pairing (needs `npm run build` first).
import { openGame } from '../tests/helpers.mjs';
const focus = (process.argv[2] || 'horsearcher,skirm,shield,camel,javelin').split(',');
const base = ['militia', 'spearman', 'archer', 'scout', 'knight', 'longbow'];
const g = await openGame();
const res = await g.ev(({ focus, base }) => {
  const cost = (t) => Object.values(__rts.ud[t].cost).reduce((a, b) => a + b, 0), out = {};
  for (const A of focus) for (const B of base.concat(focus)) {
    if (A === B || (focus.includes(B) && A > B)) continue;
    let wa = 0, wb = 0, va = 0, vb = 0;
    for (let rep = 0; rep < 4; rep++) {
      __rts.newGame({ size: 96, np: 2, layout: 'ring', mtype: 'desert', civs: [null, null] }); const G = __rts.G;
      for (const r of G.res) if (r.tx > 30 && r.tx < 66 && r.ty > 30 && r.ty < 66) { r.dead = true; for (let y = r.ty; y < r.ty + r.h; y++) for (let x = r.tx; x < r.tx + r.w; x++) { G.block[y * 96 + x] = null; G.place[y * 96 + x] = null; } }
      for (let i = 0; i < 96 * 96; i++) { const x = i % 96, y = (i / 96) | 0; if (x > 30 && x < 66 && y > 30 && y < 66 && G.block[i] && G.block[i].kind === 'water') { G.block[i] = null; G.place[i] = null; } }
      G.res = G.res.filter((r) => !r.dead); for (const P of G.players) P.age = 2;
      G.blds.forEach((b) => { b.cd = 1e9; }); G.units.forEach((u) => (u.dead = true)); G.units = [];
      const nA = Math.max(1, Math.round(1200 / cost(A))), nB = Math.max(1, Math.round(1200 / cost(B)));
      const ua = [], ub = [];
      for (let i = 0; i < nA; i++) ua.push(__rts.spawn(A, 0, 40 + (i % 5) * 0.8, 44 + Math.floor(i / 5) * 0.8));
      for (let i = 0; i < nB; i++) ub.push(__rts.spawn(B, 1, 52 + (i % 5) * 0.8, 44 + Math.floor(i / 5) * 0.8));
      ua.forEach((u) => __rts.amove(u, 56, 46)); ub.forEach((u) => __rts.amove(u, 38, 46));
      for (let k = 0; k < 120 && ua.some((u) => !u.dead) && ub.some((u) => !u.dead); k++) __rts.step(1);
      const ra = ua.filter((u) => !u.dead).reduce((s, u) => s + u.hp / u.maxHp, 0) * cost(A), rb = ub.filter((u) => !u.dead).reduce((s, u) => s + u.hp / u.maxHp, 0) * cost(B);
      if (ra > rb) wa++; else wb++; va += ra; vb += rb;
    }
    out[A + ' vs ' + B] = `${wa}:${wb}  남은 가치 ${Math.round(va / 4)} : ${Math.round(vb / 4)}`;
  }
  return out;
}, { focus, base });
for (const k in res) console.log(k.padEnd(26), res[k]);
await g.close();
