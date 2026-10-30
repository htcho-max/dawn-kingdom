import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

test('tablet controls: tap, double tap, pan, pinch, box, groups, build confirm, long press', { timeout: 120_000 }, async () => {
  const g = await openGame({ viewport: { width: 1180, height: 820 }, touch: true });
  const { page, ev } = g;
  try {
    const cdp = await g.context.newCDPSession(page);
    const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
    const wait = (ms) => page.waitForTimeout(ms);
    const tap = async (x, y) => { await T('touchStart', [[x, y]]); await wait(40); await T('touchEnd', []); await wait(80); };
    const hold = async (x, y) => { await T('touchStart', [[x, y]]); await wait(600); await T('touchEnd', []); await wait(80); };
    const drag = async (from, to, holdFirst) => {
      await T('touchStart', [from]); if (holdFirst) await wait(550);
      for (let i = 1; i <= 8; i++) { await T('touchMove', [[from[0] + (to[0] - from[0]) * i / 8, from[1] + (to[1] - from[1]) * i / 8]]); await wait(16); }
      await T('touchEnd', []); await wait(80);
    };
    const find = (type) => ev((t) => { for (let y = 150; y < 650; y += 3) for (let x = 200; x < 1000; x += 3) if (__rts.pickAt(x, y) === t) return { x, y }; return null; }, type);
    const selected = () => ev(() => __rts.sel().map((o) => o.type));

    await page.tap('#go'); await wait(300);
    assert.ok(await ev(() => document.body.classList.contains('touch')), 'touch mode turns on automatically');
    assert.ok(await page.isVisible('#tbar'), 'touch toolbar visible');

    await ev(() => { const s = __rts.G.starts[0]; __rts.center(s.x, s.y); __rts.zoom(1.3); }); await wait(150);
    const v = await find('villager'); assert.ok(v, 'villager on screen');
    await tap(v.x, v.y);
    assert.deepEqual(await selected(), ['villager'], 'tap selects one unit');
    await tap(v.x, v.y);
    assert.equal((await selected()).length, 3, 'double tap selects all villagers on screen');

    await drag([600, 400], [480, 340], false);
    assert.equal((await selected()).length, 3, 'one-finger pan keeps the selection');

    await T('touchStart', [[500, 400], [700, 400]]);
    for (let i = 1; i <= 5; i++) { await T('touchMove', [[500 - i * 15, 400], [700 + i * 15, 400]]); await wait(16); }
    await T('touchEnd', []); await wait(50);

    await ev(() => { const s = __rts.G.starts[0]; __rts.center(s.x, s.y); __rts.zoom(1.0); __rts.select([]); }); await wait(100);
    await drag([420, 230], [900, 590], true);
    assert.deepEqual(await selected(), ['villager', 'villager', 'villager'], 'long press then drag box-selects');

    await page.tap('#t-clear');
    await page.tap('#t-box');
    await drag([420, 230], [900, 590], false);
    assert.equal((await selected()).length, 3, 'toolbar box mode selects with a plain drag');
    assert.ok(!(await ev(() => document.querySelector('#t-box').classList.contains('on'))), 'box mode is one-shot');

    const grp = '#tbar .tg[data-k="1"]';
    await page.dispatchEvent(grp, 'pointerdown'); await wait(650); await page.dispatchEvent(grp, 'pointerup'); await page.dispatchEvent(grp, 'click');
    assert.equal(await ev(() => __rts.G.groups[1].length), 3, 'long press assigns group 1');
    await page.tap('#t-clear'); assert.equal((await selected()).length, 0);
    await page.tap(grp); assert.equal((await selected()).length, 3, 'tap recalls group 1');

    // Building needs an explicit confirm on touch.
    const v2 = await find('villager'); await tap(v2.x, v2.y);
    await ev(() => { __rts.G.players[0].wood = 500; }); await wait(150);
    await ev(() => [...document.querySelectorAll('#cmds .cmd')].find((b) => b.textContent.includes('집')).click()); await wait(80);
    assert.ok(await ev(() => !document.querySelector('#confirm').hidden), 'confirm bar shown');
    assert.ok(await ev(() => document.querySelector('#cf-ok').disabled), 'confirm disabled before choosing a spot');
    const b0 = await ev(() => __rts.G.blds.filter((b) => b.owner === 0).length);
    const count = () => ev(() => __rts.G.blds.filter((b) => b.owner === 0).length);
    // Random maps may put a tree under a given spot, so try a few open-looking places.
    let built = false;
    for (const [x, y] of [[420, 520], [760, 520], [420, 300], [760, 300], [590, 560]]) {
      await tap(x, y);
      assert.equal(await count(), b0, 'tap alone does not build');
      await page.tap('#cf-ok'); await wait(80);
      if (await count() === b0 + 1) { built = true; break; }
    }
    assert.ok(built, 'confirm builds');
    assert.ok(await ev(() => document.querySelector('#confirm').hidden), 'confirm bar closes after building');

    // With villagers selected, tapping my town centre selects it instead of sending them there.
    await ev(() => { const s = __rts.G.starts[0]; __rts.center(s.x, s.y); __rts.zoom(1.3); __rts.select(__rts.G.units.filter((u) => u.owner === 0 && u.type === 'villager')); }); await wait(150);
    const tc = await find('tc'); assert.ok(tc, 'town centre on screen');
    await tap(tc.x, tc.y);
    assert.deepEqual(await selected(), ['tc'], 'tap on own building selects it');
    assert.ok(await page.isVisible('#desel'), 'deselect button shown');
    await page.tap('#desel');
    assert.equal((await selected()).length, 0, 'deselect button clears the selection');
    assert.ok(!(await page.isVisible('#desel')) || (await wait(300), !(await page.isVisible('#desel'))), 'deselect button hides');
    // Long press on my building with villagers selected gives them the order.
    await ev(() => __rts.select(__rts.G.units.filter((u) => u.owner === 0 && u.type === 'villager'))); await wait(80);
    await hold(tc.x, tc.y);
    assert.equal(await ev(() => __rts.sel()[0].type), 'villager', 'long press keeps the villagers selected');
    assert.ok(await ev(() => __rts.sel().every((u) => u.state !== 'idle' || u.tgt)), 'villagers received an order');

    // Long press: matchup hint on an enemy, attack-move on ground.
    await ev(() => {
      const R = __rts, s = R.G.starts[0], my = [];
      for (let i = 0; i < 4; i++) my.push(R.spawn('archer', 0, s.x + 3 + i * 0.5, s.y + 5));
      const e = R.spawn('spearman', 1, s.x + 6, s.y + 9); e.stance = 'hold'; e.state = 'idle';
      R.select(my); R.center(s.x + 6, s.y + 9); R.zoom(1.4);
    }); await wait(200);
    const sp = await find('spearman'); assert.ok(sp, 'enemy on screen');
    await hold(sp.x, sp.y);
    assert.match(await ev(() => { const h = document.querySelector('#hint'); return h.hidden ? '' : h.textContent; }), /궁수 → 창병/);
    await hold(sp.x - 150, sp.y + 60);
    assert.deepEqual([...new Set(await ev(() => __rts.sel().map((u) => u.state)))], ['amove'], 'long press on ground attack-moves');

    assert.deepEqual(g.errors, []);
  } finally { await g.close(); }
});

test('desktop browsers stay in mouse mode and do not edge-scroll by default', async () => {
  const g = await openGame();
  try {
    assert.ok(!(await g.ev(() => document.body.classList.contains('touch'))));
    assert.ok(!(await g.page.isVisible('#tbar')));
    await g.page.click('#go');
    await g.page.mouse.move(640, 400); await g.page.mouse.move(2, 400);
    const c0 = await g.ev(() => __rts.cam); await g.page.waitForTimeout(600);
    assert.deepEqual(await g.ev(() => __rts.cam), c0, 'mouse at the screen edge does not move the camera');
    await g.page.keyboard.down('ArrowRight'); await g.page.waitForTimeout(400); await g.page.keyboard.up('ArrowRight');
    assert.ok((await g.ev(() => __rts.cam)).x > c0.x, 'arrow keys move the camera');
  } finally { await g.close(); }
});
