// こうえん（kouen.html・ためし）：小数シーソー＋等差数列すべり台 の 自由あそび。
const tapTab = (p, val) => p.evaluate(v => { const b = tabBtns.find(x => x.val === v); if(!b){ setMode(v); return; } handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm'); }, val);
async function openKouen(t, o){
  const p = await t.open(o);
  await tapTab(p, 'kouen');
  await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="kouen.html"]'); return f && f.contentWindow && f.contentWindow.kouen; }, null, { timeout: 6000 });
  const f = p.frames().find(x => x.url().includes('kouen.html'));
  await f.waitForTimeout(250);
  return { p, f };
}
const st = f => f.evaluate(() => kouen.state());

module.exports = {
  'ためし から ひらくと キャラが いて、ルールは −7': async t => {
    const { f } = await openKouen(t);
    const s = await st(f);
    t.eq(s.chars.length, 3, '初期キャラが 3人 いない ' + s.chars.length);
    t.eq(s.diff, -7);
    t.eq(s.balanced, false);
  },

  '小数シーソー：12.5＋12.5 と 25 で つりあう': async t => {
    const { f } = await openKouen(t);
    const id1 = await f.evaluate(() => kouen.summon(12.5));
    const id2 = await f.evaluate(() => kouen.summon(12.5));
    const id3 = await f.evaluate(() => kouen.summon(25));
    await f.evaluate(([a, b, c]) => { kouen.seat(a, 'L'); kouen.seat(b, 'L'); kouen.seat(c, 'R'); }, [id1, id2, id3]);
    await f.waitForTimeout(350);
    const s = await st(f);
    t.eq(s.left, 25, '左の 合計が 25 でない ' + s.left);
    t.eq(s.right, 25);
    t.eq(s.balanced, true, 'つりあって いない');
    // かたむき：3＋4 vs 7 でも つりあう（初期キャラ）
    const s0 = await f.evaluate(() => { const cs = kouen.state().chars.filter(c => !c.seat); return cs.map(c => [c.id, c.v]); });
    const c3 = s0.find(c => c[1] === 3), c4 = s0.find(c => c[1] === 4), c7 = s0.find(c => c[1] === 7);
    await f.evaluate(([a, b, c]) => { kouen.seat(a, 'L'); kouen.seat(b, 'L'); kouen.seat(c, 'R'); }, [c3[0], c4[0], c7[0]]);
    const s2 = await st(f);
    t.eq(s2.left, 32); t.eq(s2.right, 32); t.eq(s2.balanced, true, '3＋4 と 7 で つりあって いない');
  },

  '等差数列すべり台：100 が −7ずつ へり、数列が のこる': async t => {
    const { f } = await openKouen(t);
    const id = await f.evaluate(() => kouen.summon(100));
    await f.evaluate(i => kouen.ride(i), id);
    await f.waitForFunction(i => { const c = kouen.state().chars.find(x => x.id === i); return c && !c.riding && c.v === 93; }, id, { timeout: 4000 });
    let s = await st(f);
    t.eq(s.history, [100, 93], '数列が [100,93] でない ' + JSON.stringify(s.history));
    await f.evaluate(i => kouen.ride(i), id);
    await f.waitForFunction(i => { const c = kouen.state().chars.find(x => x.id === i); return c && !c.riding && c.v === 86; }, id, { timeout: 4000 });
    s = await st(f);
    t.eq(s.history, [100, 93, 86]);
    // ルールを かえると 小数にも へる
    await f.evaluate(() => kouen.setDiff(-2.5));
    const idd = await f.evaluate(() => kouen.summon(10));
    await f.evaluate(i => kouen.ride(i), idd);
    await f.waitForFunction(i => { const c = kouen.state().chars.find(x => x.id === i); return c && !c.riding && c.v === 7.5; }, idd, { timeout: 4000 });
    s = await st(f);
    t.eq(s.history, [10, 7.5], '小数ルールの 数列が ちがう ' + JSON.stringify(s.history));
  },

  'ドラッグで シーソーに 乗せられる': async t => {
    const { f } = await openKouen(t);
    await f.waitForTimeout(500);
    const s = await st(f);
    const c = s.chars[0];
    await f.evaluate(({ id, tx, ty }) => {
      const cs = kouen.state().chars, a = cs.find(x => x.id === id);
      const cvEl = document.getElementById('cv'), r = cvEl.getBoundingClientRect();
      const ev = (type, x, y) => cvEl.dispatchEvent(new PointerEvent(type, { pointerId: 31, bubbles: true, cancelable: true, isPrimary: true, clientX: r.left + x, clientY: r.top + y }));
      ev('pointerdown', a.x, a.y - 30);
      ev('pointermove', tx, ty);
      ev('pointerup', tx, ty);
    }, { id: c.id, tx: s.plankCx - s.plankHalf + 40, ty: s.plankY });
    await f.waitForTimeout(400);
    const s2 = await st(f);
    const seated = s2.chars.find(x => x.id === c.id);
    t.ok(seated.seat === 'L', 'ドラッグで 左に 乗らなかった seat=' + seated.seat);
  },
};
