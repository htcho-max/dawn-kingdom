import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

test('every mission starts and runs', { timeout: 120_000 }, async () => {
  const g = await openGame();
  try {
    const ids = await g.ev(() => __rts.campaign());
    assert.equal(ids.length, 6);
    for (let i = 0; i < ids.length; i++) {
      const r = await g.ev((i) => { __rts.mission(i); const G = __rts.G; __rts.step(90); return { id: G.scn.id, over: G.over, mine: G.units.filter((u) => u.owner === 0).length }; }, i);
      assert.equal(r.id, ids[i]);
      assert.ok(!r.over, `${r.id} does not end in the first 90 seconds`);
      assert.ok(r.mine > 0);
    }
    assert.ok(await g.page.isVisible('#guide .goals'), 'mission goals are shown');
    assert.deepEqual(g.errors, []);
  } finally { await g.close(); }
});

test('mission 1 can be completed, unlocks mission 2 and survives save/load', { timeout: 120_000 }, async () => {
  const g = await openGame();
  try {
    await g.ev(() => localStorage.removeItem('dawn.campaign'));
    await g.page.click('[data-tab="camp"]');
    assert.equal(await g.page.locator('[data-mis]').count(), 1, 'only the first mission is open');
    await g.page.click('[data-mis="0"]');
    const r = await g.ev(() => {
      const R = __rts, G = R.G, s = G.starts[0], P = G.players[0];
      P.food = P.wood = P.gold = 3000;
      for (let i = 0; i < 7; i++) R.spawn('villager', 0, s.x + 2, s.y + 3);
      R.place('house', 0, (s.x | 0) - 6, (s.y | 0) + 4); R.place('house', 0, (s.x | 0) - 6, (s.y | 0) - 4); R.place('barracks', 0, (s.x | 0) + 4, (s.y | 0) + 5);
      for (let i = 0; i < 8; i++) R.spawn('militia', 0, s.x + 3, s.y + 3);
      R.step(2);
      const raid = (G.scn.raid || []).length;
      const code = R.ser(); R.loadCode(code); // mid-mission save keeps the mission
      const kept = __rts.G.scn && __rts.G.scn.id;
      const G2 = __rts.G;
      for (let i = 0; i < 30 && !G2.over; i++) { for (const u of G2.units) if (u.owner === 0 && u.type === 'militia' && u.state === 'idle') { const e = G2.units.find((x) => x.owner === 1 && G2.scn.raid.includes(x.id)); if (e) { u.state = 'attack'; u.tgt = e; u.path = []; } } R.step(10); }
      return { raid, kept, over: __rts.G.over, done: __rts.G.scn.done.length };
    });
    assert.ok(r.raid >= 5, 'raid arrives once the goals are met');
    assert.equal(r.kept, 'winter');
    assert.ok(r.over && r.done === 5, 'all goals done and mission over');
    await g.page.waitForSelector('#next', { timeout: 5000 });
    assert.match(await g.page.textContent('#overlay h1'), /임무 완료/);
    assert.deepEqual(await g.ev(() => JSON.parse(localStorage.getItem('dawn.campaign')).cleared), ['winter']);
    await g.page.click('#next');
    assert.equal(await g.ev(() => __rts.G.scn.id), 'feudal');
    assert.deepEqual(g.errors, []);
  } finally { await g.close(); }
});

test('raid mission: no town centre, losing all riders fails the mission', async () => {
  const g = await openGame();
  try {
    const r = await g.ev(() => {
      __rts.mission(3); const G = __rts.G;
      const n = G.units.filter((u) => u.owner === 0).length, tc = G.blds.some((b) => b.owner === 0);
      __rts.step(3);
      const alive = !G.over;
      for (const u of G.units) if (u.owner === 0) u.hp = -1, u.dead = true;
      __rts.step(2);
      return { n, tc, alive, over: G.over };
    });
    assert.equal(r.n, 14); assert.equal(r.tc, false);
    assert.ok(r.alive, 'no town centre is not a loss here');
    assert.ok(r.over, 'losing every rider ends the mission');
    await g.page.waitForSelector('#retry', { timeout: 5000 });
    assert.match(await g.page.textContent('#overlay .lede'), /습격대/);
  } finally { await g.close(); }
});
