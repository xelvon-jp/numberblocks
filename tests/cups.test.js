// みずのコップ（cups.html・2台デモ）v2：自動接続、和は一定、分数/ml、口まで来たら傾きで流れる。
// VM では BroadcastChannel（同じブラウザの2ページ）で検証。実機の PeerJS 経路は別。
async function openCup(t){
  const p = await t.open();
  const base = p.url().split('/').slice(0, 3).join('/');
  await p.goto(base + '/cups.html');
  await p.waitForFunction(() => window.cups, null, { timeout: 6000 });
  await p.waitForTimeout(200);
  return p;
}
async function openCup2(p1){
  const base = p1.url().split('/').slice(0, 3).join('/');
  const p = await p1.context().newPage();
  await p.goto(base + '/cups.html');
  await p.waitForFunction(() => window.cups, null, { timeout: 6000 });
  await p.waitForTimeout(200);
  return p;
}
const st = p => p.evaluate(() => cups.state());
const evt = (p, beta, gamma, n) => p.evaluate(({ beta, gamma, n }) => { for(let i = 0; i < n; i++) window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { gamma, beta, alpha: 0 })); }, { beta, gamma, n });
// 立てた姿勢：まっすぐ = beta 90 / gamma 0。右へ φ° 倒す = beta 90+φ / gamma 90（ジンバル領域）
const upright = (p, n) => evt(p, 90, 0, n);
const rollRight = (p, deg, n) => evt(p, 90 + deg, 90, n);
module.exports = {
  '自動で つながり、量を 決めると 相手は 残りになる': async t => {
    const p1 = await openCup(t), p2 = await openCup2(p1);
    await p2.waitForFunction(() => cups.state().partnerSeen === true, null, { timeout: 6000 });
    await p1.evaluate(() => cups.setTicks(9));          // 3/4 にする
    await p2.waitForFunction(() => cups.state().ticks === 3, null, { timeout: 5000 });
    const a = await st(p1), b = await st(p2);
    t.eq(a.ticks + b.ticks, 12, '分数モードの 和が 12 に なっていない');
    t.eq(a.ticks, 9, '自分が 9（3/4）になっていない');
    // ml に 切り替えると 合計 40 目盛り（200ml）、割合は 保たれる
    await p1.evaluate(() => cups.setMode('ml'));
    await p2.waitForFunction(() => cups.state().mode === 'ml', null, { timeout: 5000 });
    const a2 = await st(p1), b2 = await st(p2);
    t.eq(a2.total, 40, 'ml の 合計が 40 目盛りでない');
    t.eq(a2.ticks + b2.ticks, 40, 'ml の 和が 一定でない');
    t.eq(a2.ticks, 30, '3/4 が 150ml（30目盛り）に なっていない: ' + a2.ticks);
  },

  'メニューで 量を 選べる': async t => {
    const p1 = await openCup(t), p2 = await openCup2(p1);
    await p2.waitForFunction(() => cups.state().partnerSeen === true, null, { timeout: 6000 });
    await p1.click('#amtBtn');
    await p1.waitForTimeout(150);
    const hasFrac = await p1.evaluate(() => [...document.querySelectorAll('#menuGrid .mbtn')].some(b => b.innerHTML.includes('frac')));
    t.ok(hasFrac, 'メニューに 上下スタイルの 分数が ない');
    // 12目盛り（満杯）の ボタンを 押す → 相手は 0
    await p1.evaluate(() => { const bs = [...document.querySelectorAll('#menuGrid .mbtn')]; bs[bs.length - 1].click(); });
    await p2.waitForFunction(() => cups.state().ticks === 0, null, { timeout: 5000 });
    t.eq((await st(p1)).ticks, 12, '満杯に できていない');
  },

  '立てた姿勢で 水面が 安定し、口に 届くまでは 流れない／届いたら 流れる': async t => {
    const p1 = await openCup(t), p2 = await openCup2(p1);
    await p2.waitForFunction(() => cups.state().partnerSeen === true, null, { timeout: 6000 });
    await p1.evaluate(() => { cups.setTicks(6); cups.tilt(true); });
    await p2.waitForFunction(() => cups.state().ticks === 6, null, { timeout: 5000 });
    // 立てたまま 手ぶれ程度に 揺らしても ロールは 小さく、水面は 安定
    for(let i = 0; i < 6; i++) await evt(p1, 88 + (i % 3) * 2, -3 + (i % 2) * 5, 2);
    await p1.waitForTimeout(300);
    let s = await st(p1);
    t.ok(Math.abs(s.roll) < 7, '立てた姿勢で ロールが 暴れている: ' + s.roll);
    t.eq(s.ticks, 6, '立てただけで 減ってしまった');
    // 半分で 14° 倒しても 口に 届かず 流れない
    await rollRight(p1, 14, 10);
    await p1.waitForTimeout(1000);
    s = await st(p1);
    t.ok(s.roll > 9 && s.roll < 19, '14°の ロールが 取れていない: ' + s.roll);
    t.eq(s.spilling, 0, '口に 届いていないのに 流れている');
    t.eq(s.ticks, 6, '浅い 傾きで 減ってしまった');
    // たっぷり（11目盛り）なら 同じ 傾きで 口に 届いて 流れる
    await p1.evaluate(() => cups.setTicks(11));
    await p2.waitForFunction(() => cups.state().ticks === 1, null, { timeout: 5000 });
    await p1.waitForFunction(() => cups.state().spilling === 1, null, { timeout: 4000 });
    await p1.waitForFunction(() => cups.state().ticks <= 10, null, { timeout: 6000 });
    const a = await st(p1), b = await st(p2);
    t.eq(a.ticks + b.ticks, 12, '流れたあとも 和が 一定でない');
    t.ok(b.ticks >= 2, '相手に 流れが 届いていない: ' + b.ticks);
    // まっすぐに 戻すと 止まる
    await upright(p1, 10);
    await p1.waitForFunction(() => cups.state().spilling === 0, null, { timeout: 3000 });
    const c1 = (await st(p1)).ticks;
    await p1.waitForTimeout(600);
    t.eq((await st(p1)).ticks, c1, '戻しても 流れが 止まっていない');
  },

  'iOS式の符号でも 立てて傾ければ 流れる': async t => {
    const p1 = await openCup(t), p2 = await openCup2(p1);
    await p2.waitForFunction(() => cups.state().partnerSeen === true, null, { timeout: 6000 });
    // iOS は beta の符号が逆：立てた姿勢 = beta -90。その姿勢で ON にして基準を取る
    await evt(p1, -90, 0, 8);
    await p1.evaluate(() => { cups.setTicks(11); cups.tilt(true); });
    await p2.waitForFunction(() => cups.state().ticks === 1, null, { timeout: 5000 });
    await evt(p1, -104, -90, 10);   // iOS式に 右へ 14°
    const s = await st(p1);
    t.ok(s.roll > 9 && s.roll < 19, 'iOS式で ロールが 取れていない: ' + s.roll);
    await p1.waitForFunction(() => cups.state().spilling === 1, null, { timeout: 4000 });
    await p1.waitForFunction(() => cups.state().ticks <= 10, null, { timeout: 6000 });
    const a = await st(p1), b = await st(p2);
    t.eq(a.ticks + b.ticks, 12, 'iOS式でも 和が 一定でない');
    t.ok(b.ticks >= 2, 'iOS式で 相手に 届いていない: ' + b.ticks);
  },

  '水面は アナログに 動く（値は 目盛りのまま）': async t => {
    const p1 = await openCup(t);
    await p1.evaluate(() => cups.setTicks(0));
    await p1.waitForTimeout(160);
    const mid = (await st(p1)).disp;
    t.ok(mid > 0.4 && mid < 5.6, '水面が パッと 切り替わっている（途中経過がない）: ' + mid);
    await p1.waitForFunction(() => cups.state().disp === 0, null, { timeout: 4000 });
    t.eq((await st(p1)).ticks, 0, '値そのものは 目盛り（0）に なっていない');
  },

  'そそぐボタンでも ゆっくり 1目盛りずつ うつる': async t => {
    const p1 = await openCup(t), p2 = await openCup2(p1);
    await p2.waitForFunction(() => cups.state().partnerSeen === true, null, { timeout: 6000 });
    await p1.evaluate(() => { cups.setTicks(6); cups.pour(true); });
    await p1.waitForTimeout(2400);
    await p1.evaluate(() => cups.pour(false));
    const a = await st(p1), b = await st(p2);
    t.ok(a.ticks <= 4 && a.ticks >= 2, '2.4秒で 2〜4目盛りの 想定が 実際 ' + (6 - a.ticks));
    t.eq(a.ticks + b.ticks, 12, 'ボタン注ぎでも 和が 一定でない');
  },
};
