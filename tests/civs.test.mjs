import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

test('civilization bonuses and unique units', async () => {
  const g = await openGame();
  try {
    const r = await g.ev(() => {
      const R = __rts; R.newGame({ np: 5, size: 96, civs: ['horse', 'bow', 'stone', 'trade', 'farm'] }); const G = R.G;
      const tcHp = G.players.map((_, o) => G.blds.find((b) => b.owner === o && b.type === 'tc').maxHp);
      const m = G.players.map((P) => ({ prng: P.m.prng, gw: P.m.gw, gg: P.m.gg, farm: P.m.farm }));
      for (const P of G.players) { P.age = 1; P.food = P.wood = P.gold = 5000; }
      const trained = {}, rejected = {};
      for (let o = 0; o < 5; o++) {
        const s = G.starts[o];
        const bar = R.place('barracks', o, (s.x | 0) + 4, (s.y | 0) + 4), st = R.place('stable', o, (s.x | 0) - 7, (s.y | 0) + 4);
        const uu = { 0: ['horsearcher', st], 1: ['skirm', bar], 2: ['shield', bar], 3: ['camel', st], 4: ['javelin', bar] }[o];
        R.queue(uu[1], uu[0]);
        rejected[o] = ['horsearcher', 'skirm', 'shield', 'camel', 'javelin'].filter((t) => t !== uu[0]).some((t) => R.queue(bar, t) || R.queue(st, t));
      }
      R.step(40);
      for (const u of G.units) if (u.type in { horsearcher: 1, skirm: 1, shield: 1, camel: 1, javelin: 1 }) trained[u.owner] = u.type + ':' + u.maxHp;
      const scout = G.units.filter((u) => u.type === 'scout').map((u) => u.owner + ':' + u.maxHp);
      return { tcHp, m, trained, rejected, scout, civs: G.players.map((P) => P.civ) };
    });
    assert.deepEqual(r.civs, ['horse', 'bow', 'stone', 'trade', 'farm']);
    assert.equal(r.tcHp[2], 1750, 'stone: building hp +25%');
    assert.equal(r.tcHp[0], 1400);
    assert.equal(r.m[1].prng, 1, 'bow: range +1');
    assert.ok(Math.abs(r.m[1].gw - 1.15) < 1e-9, 'bow: wood +15%');
    assert.ok(Math.abs(r.m[3].gg - 1.2) < 1e-9, 'trade: gold +20%');
    assert.equal(r.m[4].farm, 100, 'farm: farms +100');
    assert.deepEqual(r.trained, { 0: 'horsearcher:84', 1: 'skirm:30', 2: 'shield:60', 3: 'camel:95', 4: 'javelin:40' });
    assert.ok(Object.values(r.rejected).every((x) => !x), 'other civs\' unique units cannot be trained');
    assert.ok(r.scout.includes('0:96'), 'horse: cavalry hp +20% (starting scout)');
    // saved games keep the civilization
    const back = await g.ev(() => { const c = __rts.ser(); __rts.loadCode(c); return __rts.G.players.map((P) => P.civ + ':' + P.m.prng); });
    assert.deepEqual(back, ['horse:0', 'bow:1', 'stone:0', 'trade:0', 'farm:0']);
    assert.deepEqual(g.errors, []);
  } finally { await g.close(); }
});
