import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

test('castle units, trade carts and save-code round trip', { timeout: 120_000 }, async () => {
  const g = await openGame();
  try {
    await g.page.click('#go');
    const siege = await g.ev(() => {
      const R = __rts, G = R.G, P = G.players[0];
      P.food = P.wood = P.gold = 9000; P.age = 2;
      const s = G.starts[0];
      for (let i = 0; i < 4; i++) R.place('house', 0, (s.x | 0) - 8 + i * 2, (s.y | 0) + 7);
      const c = R.place('castle', 0, (s.x | 0) + 5, (s.y | 0) - 2);
      R.queue(c, 'longbow'); R.queue(c, 'trebuchet'); R.step(50);
      const tb = G.units.find((u) => u.type === 'trebuchet');
      const mid = G.opt.size / 2, d = Math.hypot(mid - s.x, mid - s.y) || 1;
      const eb = R.place('house', 1, Math.round(s.x + (mid - s.x) / d * 14), Math.round(s.y + (mid - s.y) / d * 14));
      tb.x = eb.tx * 32 - 6 * 32; tb.y = eb.ty * 32 - 5 * 32; tb.state = 'attack'; tb.tgt = eb; R.step(25);
      return { longbows: G.units.filter((u) => u.type === 'longbow').length, treb: !!tb, houseDead: !!eb.dead };
    });
    assert.equal(siege.longbows, 1);
    assert.ok(siege.treb, 'trebuchet trained');
    assert.ok(siege.houseDead, 'trebuchet destroys a house');

    const trade = await g.ev(() => {
      const R = __rts, G = R.G, P = G.players[0];
      const s = G.starts[0];
      // Second market ~20 tiles from the base, towards the map centre (always on the map).
      const c = G.opt.size / 2, d = Math.hypot(c - s.x, c - s.y) || 1;
      const m1 = R.place('market', 0, (s.x | 0) + 4, (s.y | 0) - 6);
      const m2 = R.place('market', 0, Math.round(s.x + (c - s.x) / d * 20), Math.round(s.y + (c - s.y) / d * 20));
      R.queue(m1, 'cart'); R.step(30);
      const carts = G.units.filter((u) => u.type === 'cart' && u.owner === 0);
      carts.forEach((u) => R.trade(u, m2));
      const g0 = P.gold; R.step(120);
      return { carts: carts.length, gained: P.gold - g0 };
    });
    assert.equal(trade.carts, 1);
    assert.ok(trade.gained > 0, `trade earns gold (+${trade.gained})`);

    const rt = await g.ev(() => {
      const R = __rts, code = R.ser(), n = R.G.units.length, t = R.G.t;
      R.step(5); R.loadCode(code);
      return { n, n2: R.G.units.length, dt: Math.abs(R.G.t - t) };
    });
    assert.equal(rt.n2, rt.n, 'units restored');
    assert.ok(rt.dt < 0.1, 'clock restored');
    assert.deepEqual(g.errors, []);
  } finally { await g.close(); }
});

test('setup screen refuses a game where everyone is on one team', async () => {
  const g = await openGame();
  try {
    await g.page.selectOption('[data-team="0"]', '0');
    await g.page.selectOption('[data-team="1"]', '0');
    assert.ok(await g.page.$eval('#go', (e) => e.disabled));
    assert.match(await g.page.$eval('#team-warn', (e) => e.textContent), /두 편/);
  } finally { await g.close(); }
});
