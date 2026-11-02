// はんぶん 自由あそび の ×10／÷10 ゾーン。
const tapTab = (p, val) => p.evaluate(v => { const b = tabBtns.find(x => x.val === v); if(!b || v === 'hanbun'){ if(taskOn) setTaskOn(false); setMode(v); return; } handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm'); }, val);
async function openFree(t, chars){
  const p = await t.open(chars ? { storage: { nb_hanbun: JSON.stringify({ n: 5, chars }) } } : undefined);
  await tapTab(p, 'hanbun');
  await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="hanbun.html"]'); return f && f.contentWindow && f.contentWindow.hanbun; }, null, { timeout: 6000 });
  const f = p.frames().find(x => x.url().includes('hanbun.html'));
  await f.waitForTimeout(450);
  return { p, f };
}

module.exports = {
  '自由あそびで ×10・÷10 ゾーンが 見えている': async t => {
    const { f } = await openFree(t, [5]);
    const z = await f.evaluate(() => hanbun.zones10());
    t.eq(z, [true, true], 'ゾーンが 出ていない ' + JSON.stringify(z));
  },

  '×10・÷10 の 計算と、できない ケース': async t => {
    const { f } = await openFree(t, [7]);
    let r = await f.evaluate(() => { const a = hanbun.scale10(0, true); return [a, hanbun.chars()]; });
    t.eq(r, [true, [70]], '7 ×10 が できない ' + JSON.stringify(r));
    r = await f.evaluate(() => { const a = hanbun.scale10(0, false); return [a, hanbun.chars()]; });
    t.eq(r, [true, [7]]);
    r = await f.evaluate(() => { hanbun.add(12.5); const i = hanbun.chars().indexOf(12.5); const a = hanbun.scale10(i, false); return [a, hanbun.chars()]; });
    t.ok(r[0] === true && r[1].includes(1.25), '12.5 ÷10 = 1.25 に ならない ' + JSON.stringify(r));
    r = await f.evaluate(() => { const i = hanbun.chars().indexOf(1.25); const a = hanbun.scale10(i, true); return [a, hanbun.chars()]; });
    t.eq(r[0], true, '1.25 ×10 = 12.5 が できない');
    // 25 を ÷10 して 2.5、その ÷10 で 0.25 を確認
    r = await f.evaluate(() => { hanbun.add(25); let i = hanbun.chars().indexOf(25); const a = hanbun.scale10(i, false); i = hanbun.chars().indexOf(2.5); const b = hanbun.scale10(i, false); i = hanbun.chars().indexOf(0.25); const c = hanbun.scale10(i, false); return [a, b, c, hanbun.chars()]; });
    t.eq([r[0], r[1]], [true, true], '25→2.5→0.25 が できない ' + JSON.stringify(r));
    t.eq(r[2], false, '0.25 ÷10（0.025）は できない はず');
    t.ok(r[3].includes(0.25), '0.25 が 消えてしまった');
    // ×10 で 100 を 超える ものは できない
    r = await f.evaluate(() => { const i = hanbun.chars().indexOf(12.5); return [hanbun.scale10(i, true), hanbun.chars().includes(12.5)]; });
    t.eq(r, [false, true], '12.5 ×10（125）は できない はず');
  },

  'ドラッグして ×10 ゾーンに 落とすと 10倍に なる': async t => {
    const { f } = await openFree(t, [8]);
    await f.evaluate(() => {
      const a = hanbun.at(0);
      const zr = document.getElementById('zmul10').getBoundingClientRect();
      const sr = document.getElementById('stage').getBoundingClientRect();
      const zx = zr.left - sr.left + zr.width / 2, zy = zr.top - sr.top + zr.height / 2;
      const cvEl = document.getElementById('c'), r = cvEl.getBoundingClientRect();
      const ev = (type, x, y) => cvEl.dispatchEvent(new PointerEvent(type, { pointerId: 41, bubbles: true, cancelable: true, isPrimary: true, clientX: r.left + x, clientY: r.top + y }));
      ev('pointerdown', a.x, a.y);
      ev('pointermove', zx, zy);
      ev('pointerup', zx, zy);
    });
    await f.waitForTimeout(350);
    const vs = await f.evaluate(() => hanbun.chars());
    t.eq(vs, [80], '×10 ゾーンに 落としたのに 80 に なっていない ' + JSON.stringify(vs));
  },
};
