// ×10／÷10 ドロップアイコン（けいさん画面の アイコン列に追加）。
module.exports = {
  '×10・÷10 アイコンが あり、列が 画面内に おさまる': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      setMode('+');
      const a = getTargetRect('div10'), b = getTargetRect('mul10'), m = getTargetRect('mirror'), h = getTargetRect('home');
      return { a, b, m, h, sw };
    });
    t.ok(r.a && r.b, '×10／÷10 の アイコンが ない');
    t.ok(r.h.x < r.a.x && r.a.x < r.b.x && r.b.x < r.m.x, '並び順が おかしい（減る側が左・増える側が右）');
    t.ok(r.m.x + r.m.w <= r.sw, 'アイコン列が 画面からはみ出している ' + (r.m.x + r.m.w) + ' > ' + r.sw);
  },

  '×10・÷10 で 計算でき、できない ときは 受け付けない': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      setMode('+');
      const out = {};
      spawnBlock(7); scaleBlock(blocks[0], 'mul10'); out.a = blocks.map(b => b.num);
      scaleBlock(blocks[0], 'div10'); out.b = blocks.map(b => b.num);
      out.c = canScale('mul10', 200);          // 2000 は 上限 1000 を 超える
      out.d = canScale('div10', 1.25);         // 0.125 は 0.01 きざみに ならない
      out.e = canScale('div10', 2.5);          // 0.25 は OK
      out.f = scaledNum('mul10', 12.5);        // 125
      out.g = scaledNum('div10', 12.5);        // 1.25
      return out;
    });
    t.eq(r.a, [70]); t.eq(r.b, [7]);
    t.eq(r.c, false); t.eq(r.d, false); t.eq(r.e, true);
    t.eq(r.f, 125); t.eq(r.g, 1.25);
  },

  'ドラッグして ×10 に 落とすと 10倍に なる': async t => {
    const p = await t.open();
    await p.evaluate(() => { setMode('+'); spawnBlock(8); });
    await p.waitForTimeout(350);
    await p.evaluate(() => {
      const b = blocks[0], tg = getTargetRect('mul10');
      const cx = b.cx, cy = b.cy;
      handleStart(cx, cy, 'd1');
      handleMove(tg.x + tg.w / 2, tg.y + tg.h / 2, 'd1');
      handleEnd(tg.x + tg.w / 2, tg.y + tg.h / 2, 'd1');
    });
    await p.waitForTimeout(300);
    const nums = await p.evaluate(() => blocks.map(b => b.num));
    t.eq(nums, [80], '×10 に 落としたのに 80 に なっていない ' + JSON.stringify(nums));
  },
};
