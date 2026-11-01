// さくらんぼ の へや（sakuranbo.html・ためし）段階1：ひいて たす の あそび。
// index.html?mode=sakuranbo → タブの 下に iframe で かさなる（ストーリーと おなじ しくみ）。

const sleep = ms => new Promise(r => setTimeout(r, ms));
const tapTab = (p, val) => p.evaluate(v => { const b = tabBtns.find(x => x.val === v); if(!b){ setMode(v); return; } handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm'); }, val);
async function openSakura(t, o){
  const p = await t.open(o);
  await tapTab(p, 'sakuranbo');
  await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="sakuranbo.html"]'); return f && f.contentWindow && f.contentWindow.sakura; }, null, { timeout: 6000 });
  const f = p.frames().find(x => x.url().includes('sakuranbo.html'));
  await f.waitForTimeout(200);
  return { p, f };
}
const st = f => f.evaluate(() => sakura.state());

module.exports = {
  'ためし から ひらくと おまかせ もんだい（くり下がり）が 出る': async t => {
    const { f } = await openSakura(t);
    const s = await st(f);
    t.eq(s.step, 'ask');
    t.ok(s.a >= 11 && s.a <= 18, 'a が 11〜18 でない ' + s.a);
    t.ok(s.b > s.a - 10 && s.b <= 9, 'くり下がりに なっていない a=' + s.a + ' b=' + s.b);
    t.eq(s.rest, s.a - 10); t.eq(s.r, 10 - s.b); t.eq(s.ans, s.a - s.b);
    t.eq(s.chars.map(c => c.v), [s.a, s.b], 'はじめから a と b が いない');
    t.ok(s.frame && s.minus, 'はじめから 枠と − が ない');
    t.eq(s.eqAns, '？');
  },

  'わける→よそう→とる→くっつける で こたえに なり、木に 実が なる': async t => {
    const { f } = await openSakura(t);
    const s0 = await st(f);
    await f.evaluate(() => sakura.split());
    let s = await st(f);
    t.eq(s.step, 'predict');
    t.ok(s.frame, '引かれる数の 枠が 出ていない');
    t.ok(s.minus, '引く数との あいだの − が 出ていない');
    t.ok(s.write, '手書き パネルが 出ていない');
    t.ok(s.writeQ.includes('こたえは いくつ'), '手書きの もんが おかしい: ' + s.writeQ);
    t.eq(s.chars.map(c => c.role).sort().join(','), 'b,rest,ten');
    // 10 と 残りが 隣り合っている（あいだが あきすぎない）
    const ten = s.chars.find(c => c.role === 'ten'), rest = s.chars.find(c => c.role === 'rest');
    t.ok(rest.x - rest.w / 2 - (ten.x + ten.w / 2) <= 14, '10 と 残りの あいだが あきすぎ ' + JSON.stringify(s.chars));
    // まちがった こたえ → すすまない
    const wrong = s.ans === 9 ? 8 : s.ans + 1;
    t.eq(await f.evaluate(v => sakura.predict(v), wrong), false);
    t.eq((await st(f)).step, 'predict');
    // せいかいの こたえ → とる へ
    t.eq(await f.evaluate(v => sakura.predict(v), s.ans), true);
    t.eq((await st(f)).step, 'take');
    await f.evaluate(() => sakura.take());
    await f.waitForFunction(() => sakura.state().step === 'merge', null, { timeout: 4000 });
    s = await st(f);
    t.eq(s.minus, false, 'とった あとも − が 出ている');
    t.eq(s.chars.map(c => c.role).sort().join(','), 'r,rest');
    await f.evaluate(() => sakura.merge());
    await f.waitForFunction(() => sakura.state().step === 'done', null, { timeout: 5000 });
    s = await st(f);
    t.eq(s.eqAns, String(s.ans));
    t.eq(s.total, s0.total + 1);
    t.eq(s.tree, (s0.tree + 1) % 10);
    t.eq(s.chars.map(c => c.v), [s.ans]);
    // つぎの もんだい
    await f.evaluate(() => sakura.next());
    s = await st(f);
    t.eq(s.step, 'ask');
    t.ok(s.b > s.a - 10, 'つぎも くり下がりでない');
    // もどす：おなじ もんだいで はじめから
    const ab = [s.a, s.b];
    await f.evaluate(() => sakura.split());
    await f.evaluate(() => sakura.reset());
    s = await st(f);
    t.eq([s.a, s.b], ab); t.eq(s.step, 'ask'); t.ok(s.frame, 'もどしても 枠が ない');
  },

  'ほんものの ピンチ（ゆび 2ほん）でも わけられる': async t => {
    const { f } = await openSakura(t);
    await f.evaluate(() => {
      const cv = document.getElementById('cv'), r = cv.getBoundingClientRect();
      const mk = (type, id, dx) => {
        const e = new PointerEvent(type, { pointerId: id, bubbles: true, cancelable: true, isPrimary: id === 11,
          clientX: r.left + r.width * 0.40 + dx, clientY: r.top + r.height * 0.62 });
        cv.dispatchEvent(e);
      };
      mk('pointerdown', 11, -14); mk('pointerdown', 12, 14);
      mk('pointermove', 12, 130);
    });
    await f.waitForFunction(() => sakura.state().step === 'predict', null, { timeout: 3000 });
    t.ok((await st(f)).frame, 'ピンチで わけても 枠が 出ない');
  },

  'ほんものの ドラッグでも とる・くっつける が できる（当たり判定）': async t => {
    const { f } = await openSakura(t);
    await f.evaluate(() => sakura.split());
    await f.waitForTimeout(450);
    const s = await st(f);
    await f.evaluate(v => sakura.predict(v), s.ans);
    const dragTo = async (fromRole, toRole) => {
      await f.evaluate(({ fr, to }) => {
        const cs = sakura.state().chars;
        const a = cs.find(c => c.role === fr), b = cs.find(c => c.role === to);
        const cv = document.getElementById('cv'), r = cv.getBoundingClientRect();
        const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { pointerId: 21, bubbles: true, cancelable: true, isPrimary: true, clientX: r.left + x, clientY: r.top + y }));
        ev('pointerdown', a.x, a.y - 50);
        ev('pointermove', b.x, b.y - 50);
        ev('pointerup', b.x, b.y - 50);
      }, { fr: fromRole, to: toRole });
    };
    await dragTo('b', 'ten');
    await f.waitForFunction(() => sakura.state().step === 'merge', null, { timeout: 4000 });
    await dragTo('rest', 'r');
    await f.waitForFunction(() => sakura.state().step === 'done', null, { timeout: 5000 });
    t.eq((await st(f)).eqAns, String(s.ans));
  },

  'よそう パネルで ステージが 縮んでも キャラは 地面から ずれない': async t => {
    const { f } = await openSakura(t);
    await f.evaluate(() => sakura.split());
    await f.waitForTimeout(800);
    const s = await st(f);
    t.ok(s.chars.length >= 3, 'キャラが たりない ' + JSON.stringify(s.chars));
    for(const c of s.chars){
      t.ok(c.y > 0 && c.y <= s.stageH, 'キャラが 画面の 外に いる v=' + c.v + ' y=' + c.y + ' stageH=' + s.stageH);
      t.ok(Math.abs(c.y - s.gy) <= 2, 'キャラの 足もとが 地面と ずれている v=' + c.v + ' y=' + c.y + ' gy=' + s.gy);
    }
  },

  'こたえを ゆびで 書くと よみとって すすむ（手書き）': async t => {
    const { f } = await openSakura(t);
    await f.evaluate(() => sakura.split());
    await f.waitForTimeout(350);
    const s = await st(f);
    await f.evaluate(d => {
      const cvEl = document.getElementById('inkCv'), r = cvEl.getBoundingClientRect(), m = 0.2;
      const paths = Ink.BASE[d][0].map(stroke => stroke.map(([x, y]) =>
        [r.left + r.width * (m + (1 - 2 * m) * x), r.top + r.height * (m + (1 - 2 * m) * y)]));
      for(const path of paths){
        const ev = (type, x, y) => cvEl.dispatchEvent(new PointerEvent(type, { pointerId: 31, bubbles: true, cancelable: true, isPrimary: true, clientX: x, clientY: y }));
        ev('pointerdown', path[0][0], path[0][1]);
        for(let i = 1; i < path.length; i++) ev('pointermove', path[i][0], path[i][1]);
        ev('pointerup', path[path.length - 1][0], path[path.length - 1][1]);
      }
    }, s.ans);
    await f.waitForFunction(() => sakura.state().step === 'take', null, { timeout: 5000 });
    t.eq((await st(f)).lastInk, s.ans);
  },
};
