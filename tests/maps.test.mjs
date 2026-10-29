import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

test('every map type generates with all town centres reachable', { timeout: 180_000 }, async () => {
  const g = await openGame();
  try {
    for (const mtype of ['grass', 'forest', 'river', 'desert', 'lake', 'islands']) {
      for (const [size, np, layout] of [[64, 4, 'ring'], [128, 8, 'scatter']]) {
        const r = await g.ev((o) => {
          __rts.newGame(o);
          const G = __rts.G, tcs = G.blds.filter((b) => b.type === 'tc');
          const u = __rts.spawn('scout', 0, 0, 0);
          let ok = 0, tot = 0;
          for (const a of tcs) for (const c of tcs) {
            if (a === c) continue;
            tot++; u.x = (a.tx - 1) * 32 + 16; u.y = (a.ty + 1) * 32 + 16;
            if (__rts.pathOk(u, c)) ok++;
          }
          u.dead = true;
          return { tcs: tcs.length, ok, tot };
        }, { mtype, size, np, layout, diff: 'normal', teamList: Array.from({ length: np }, () => 'solo') });
        assert.equal(r.tcs, np, `${mtype} ${size}/${np}: town centres`);
        assert.equal(r.ok, r.tot, `${mtype} ${size}/${np}: paths between bases`);
      }
    }
    assert.deepEqual(g.errors, []);
  } finally { await g.close(); }
});
