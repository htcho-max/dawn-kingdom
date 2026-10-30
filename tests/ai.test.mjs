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

test('AI only knows what it has seen, scouts, and attacks what it found', { timeout: 120_000 }, async () => {
  const g = await openGame();
  try {
    const r = await g.ev(() => {
      __rts.newGame({ np: 4, size: 96, diff: 'normal' });
      const G = __rts.G, tc = G.blds.find((b) => b.owner === 0); tc.maxHp = tc.hp = 1e9;
      __rts.step(1.5);
      const early = G.ais.slice(1).map((a) => Object.keys(a.kb || {}).length);
      const scouts = G.ais.slice(1).map((a) => !!a.scoutId);
      __rts.step(600);
      const later = G.ais.slice(1).map((a) => Object.keys(a.kb || {}).length);
      const foundTc = G.ais.slice(1).map((a, i) => G.blds.some((b) => b.type === 'tc' && b.owner !== i + 1 && a.kb[b.id]));
      const waves = G.ais.slice(1).reduce((s, a) => s + a.waves, 0);
      return { early, scouts, later, foundTc, waves };
    });
    assert.ok(r.early.every((n) => n === 0), 'no enemy buildings known at the start');
    assert.ok(r.scouts.every(Boolean), 'each AI sends out its scout');
    assert.ok(r.later.every((n) => n > 0), 'scouting finds enemy buildings');
    assert.ok(r.foundTc.filter(Boolean).length >= 2, 'most AIs found an enemy town centre');
    assert.ok(r.waves >= 2, 'AIs attack what they found');
    assert.deepEqual(g.errors, []);
  } finally { await g.close(); }
});
