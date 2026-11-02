// みずのコップ（cups.html・2台デモ）：同じ あいことば で つながり、液体を 受け渡せる。
// VM では BroadcastChannel（同じ ブラウザの 2ページ）で 検証する。実機の PeerJS 経路は 別。
async function openCup(t){
  const p = await t.open();
  const base = p.url().split('/').slice(0, 3).join('/');
  await p.goto(base + '/cups.html');
  await p.waitForFunction(() => window.cups, null, { timeout: 6000 });
  await p.waitForTimeout(200);
  return p;
}
// 2ページ目は 同じ コンテキストに 作る（BroadcastChannel が 届くように）
async function openCup2(p1){
  const base = p1.url().split('/').slice(0, 3).join('/');
  const p = await p1.context().newPage();
  await p.goto(base + '/cups.html');
  await p.waitForFunction(() => window.cups, null, { timeout: 6000 });
  await p.waitForTimeout(200);
  return p;
}
const st = p => p.evaluate(() => cups.state());

module.exports = {
  '2ページが つながり、量が 同期する': async t => {
    const p1 = await openCup(t), p2 = await openCup2(p1);
    await p1.evaluate(() => cups.connect('123'));
    await p2.evaluate(() => cups.connect('123'));
    await p1.waitForFunction(() => cups.state().partner !== null, null, { timeout: 5000 });
    await p2.waitForFunction(() => cups.state().partner !== null, null, { timeout: 5000 });
    await p1.evaluate(() => cups.setAmt(0.75));
    await p2.waitForFunction(() => Math.abs(cups.state().partner.amt - 0.75) < 0.01, null, { timeout: 4000 });
    const s2 = await st(p2);
    t.ok(Math.abs(s2.partner.amt - 0.75) < 0.01, 'あいての 量が 同期していない ' + s2.partner.amt);
  },

  'そそぐと 相手に うつり、合計が ほぼ 保たれる': async t => {
    const p1 = await openCup(t), p2 = await openCup2(p1);
    await p1.evaluate(() => { cups.connect('777'); cups.setAmt(0.8); });
    await p2.evaluate(() => { cups.connect('777'); cups.setAmt(0.2); });
    await p1.waitForFunction(() => cups.state().partner !== null, null, { timeout: 5000 });
    await p2.waitForFunction(() => cups.state().partner !== null, null, { timeout: 5000 });
    await p1.waitForTimeout(200);
    await p1.evaluate(() => cups.pour(true));
    await p1.waitForTimeout(1100);
    await p1.evaluate(() => cups.pour(false));
    await p1.waitForTimeout(300);
    const s1 = await st(p1), s2 = await st(p2);
    t.ok(s1.amt < 0.62, 'そそいだ側が 減っていない ' + s1.amt);
    t.ok(s2.amt > 0.38, '受けた側が 増えていない ' + s2.amt);
    t.ok(Math.abs((s1.amt + s2.amt) - 1.0) < 0.06, '合計が 保たれていない ' + (s1.amt + s2.amt));
    // 逆向きも
    await p2.evaluate(() => cups.pour(true));
    await p2.waitForTimeout(700);
    await p2.evaluate(() => cups.pour(false));
    await p2.waitForTimeout(300);
    const r1 = await st(p1), r2 = await st(p2);
    t.ok(r1.amt > s1.amt + 0.08, '逆向きで 戻ってこない ' + r1.amt + ' vs ' + s1.amt);
    t.ok(r2.amt < s2.amt - 0.08, '逆向きで 送り側が 減っていない');
  },

  '水面ドラッグで 量が 変わり、相手にも 伝わる': async t => {
    const p1 = await openCup(t), p2 = await openCup2(p1);
    await p1.evaluate(() => { cups.connect('555'); cups.setAmt(0.3); });
    await p2.evaluate(() => cups.connect('555'));
    await p2.waitForFunction(() => cups.state().partner !== null, null, { timeout: 5000 });
    const s = await st(p1);
    const curY = s.y0 - 0.3 * (s.y0 - s.y1), ty = s.y0 - 0.85 * (s.y0 - s.y1);
    await p1.evaluate(({ cx, curY, ty }) => {
      const cvEl = document.getElementById('cv'), r = cvEl.getBoundingClientRect();
      const ev = (type, x, y) => cvEl.dispatchEvent(new PointerEvent(type, { pointerId: 51, bubbles: true, cancelable: true, isPrimary: true, clientX: r.left + x, clientY: r.top + y }));
      ev('pointerdown', cx, curY);
      ev('pointermove', cx, ty);
      ev('pointerup', cx, ty);
    }, { cx: s.cx, curY, ty });
    await p1.waitForTimeout(250);
    const s1 = await st(p1);
    t.ok(Math.abs(s1.amt - 0.85) < 0.05, 'ドラッグで 量が 変わっていない ' + s1.amt);
    await p2.waitForFunction(() => Math.abs(cups.state().partner.amt - 0.85) < 0.05, null, { timeout: 4000 });
  },
};
