import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

for (const target of ['dist', 'src']) {
  test(`${target}: setup screen loads and a game starts`, async () => {
    const g = await openGame({ target });
    try {
      assert.ok(await g.page.isVisible('#go'), 'start button visible');
      await g.page.click('#go');
      const s = await g.ev(() => {
        const G = __rts.G;
        __rts.step(20);
        return { mine: G.units.filter((u) => u.owner === 0).length, tcs: G.blds.filter((b) => b.type === 'tc').length, np: G.np };
      });
      assert.ok(s.mine >= 3, 'player has villagers');
      assert.equal(s.tcs, s.np, 'one town centre per tribe');
      await g.page.waitForTimeout(300); // let a few frames render
      assert.deepEqual(g.errors, []);
    } finally { await g.close(); }
  });
}
