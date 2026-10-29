import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

test('AI develops an economy, ages up and attacks', { timeout: 240_000 }, async () => {
  const g = await openGame();
  try {
    const r = await g.ev(() => {
      __rts.start('normal');
      const G = __rts.G;
      const tc = G.blds.find((b) => b.owner === 0);
      tc.maxHp = tc.hp = 1e9; // keep the idle human alive so the AI keeps playing
      __rts.step(900);
      const P = G.players[1];
      return {
        age: P.age,
        vils: G.units.filter((u) => u.owner === 1 && u.type === 'villager').length,
        army: G.units.filter((u) => u.owner === 1 && u.type !== 'villager').length,
        waves: G.ais[1].waves,
      };
    });
    assert.ok(r.age >= 1, `AI reached Feudal age (age=${r.age})`);
    assert.ok(r.vils >= 12, `AI has a working economy (${r.vils} villagers)`);
    assert.ok(r.waves >= 1 || r.army >= 5, `AI built an army (army=${r.army}, waves=${r.waves})`);
    assert.deepEqual(g.errors, []);
  } finally { await g.close(); }
});
