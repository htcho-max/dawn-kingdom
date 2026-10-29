import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openGame, root } from './helpers.mjs';

// Save codes exported from older releases must keep loading.
for (const v of ['v5', 'v6', 'v8']) {
  test(`loads a save code from ${v}`, async () => {
    const code = readFileSync(join(root, 'tests/fixtures', `save-${v}.txt`), 'utf8');
    const g = await openGame();
    try {
      const r = await g.ev((c) => {
        __rts.loadCode(c);
        const G = __rts.G, t0 = G.t;
        __rts.step(30);
        return { np: G.np, advanced: G.t - t0, units: G.units.length };
      }, code);
      assert.ok(r.np >= 2);
      assert.ok(r.units > 0);
      assert.ok(r.advanced > 29, 'simulation keeps running after load');
      assert.deepEqual(g.errors, []);
    } finally { await g.close(); }
  });
}
