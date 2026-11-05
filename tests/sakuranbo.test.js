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

  'わける→とる→くっつける で こたえに なり、木に 実が なる（よそうは 止めない）': async t => {
    const { f } = await openSakura(t);
    const s0 = await st(f);
    await f.evaluate(() => sakura.split());
    let s = await st(f);
    t.eq(s.step, 'take', 'わけたら そのまま 取る ステップでない');
    t.eq(s.predAns, null);
    t.ok(s.frame, '引かれる数の 枠が 出ていない');
    t.ok(s.minus, '引く数との あいだの − が 出ていない');
    t.eq(s.chars.map(c => c.role).sort().join(','), 'b,rest,ten');
    // 10 と 残りが 隣り合っている（あいだが あきすぎない）
    const ten = s.chars.find(c => c.role === 'ten'), rest = s.chars.find(c => c.role === 'rest');
    t.ok(rest.x - rest.w / 2 - (ten.x + ten.w / 2) <= 14, '10 と 残りの あいだが あきすぎ ' + JSON.stringify(s.chars));
    // ならび全体が 画面の まんなか 付近に あり、矢印が 出ている
    await f.waitForTimeout(500);
    const sc = await st(f);
    const pcs = sc.chars.filter(c => c.role === 'ten' || c.role === 'rest');
    const bch = sc.chars.find(c => c.role === 'b');
    const cl = Math.min(...pcs.map(c => c.x - c.w / 2)) - 12, cr = Math.max(bch.x + bch.w / 2, ...pcs.map(c => c.x + c.w / 2));
    t.ok(Math.abs((cl + cr) / 2 - sc.stageW / 2) <= 30, 'ならびが 中央に ない center=' + Math.round((cl + cr) / 2) + ' W=' + sc.stageW);
    t.ok(sc.arrow, '取る ステップで 矢印が 出ていない');
    // よそうを 書いても すすみは 止まらない（まちがい→書き直し できる）
    const wrong = s.ans === 9 ? 8 : s.ans + 1;
    await f.evaluate(v => sakura.predict(v), wrong);
    s = await st(f);
    t.eq(s.predAns, wrong); t.eq(s.step, 'take');
    await f.evaluate(v => sakura.predict(v), s.ans);
    t.eq((await st(f)).predAns, s.ans);
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
    t.eq(s.predAns, null, 'つぎの もんだいで よそうが 残っている');
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
    await f.waitForFunction(() => sakura.state().step === 'take', null, { timeout: 3000 });
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

  'こたえは いつでも ゆびで 書ける（小さな ます・止めない）': async t => {
    const { f } = await openSakura(t);
    const s = await st(f);
    const wh = await f.evaluate(() => { const r = document.getElementById('inkCv').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    t.ok(wh[0] >= 84 && wh[0] <= 110 && wh[1] >= 84 && wh[1] <= 110, '回答ますの 大きさが 想定外 ' + wh.join('x'));
    await f.evaluate(d => {
      const cvEl = document.getElementById('inkCv'), r = cvEl.getBoundingClientRect(), m = 0.18;
      const paths = Ink.BASE[d][0].map(stroke => stroke.map(([x, y]) =>
        [r.left + r.width * (m + (1 - 2 * m) * x), r.top + r.height * (m + (1 - 2 * m) * y)]));
      for(const path of paths){
        const ev = (type, x, y) => cvEl.dispatchEvent(new PointerEvent(type, { pointerId: 31, bubbles: true, cancelable: true, isPrimary: true, clientX: x, clientY: y }));
        ev('pointerdown', path[0][0], path[0][1]);
        for(let i = 1; i < path.length; i++) ev('pointermove', path[i][0], path[i][1]);
        ev('pointerup', path[path.length - 1][0], path[path.length - 1][1]);
      }
    }, s.ans);
    await f.waitForFunction(() => sakura.state().predAns !== null, null, { timeout: 5000 });
    const s2 = await st(f);
    t.eq(s2.predAns, s.ans);
    t.eq(s2.step, 'ask', '書いても すすみは 止まらない はずが 止まった');
    t.eq(s2.lastInk, s.ans);
  },

  'すきなかず：52−27 は 十の位→分ける→とる→合わせる で 25（手書き2枠）': async t => {
    const { f } = await openSakura(t);
    t.eq(await f.evaluate(() => sakura.free(52, 27)), true);
    let s = await st(f);
    t.eq(s.mode, 'free'); t.eq(s.step, 'tens');
    t.eq(s.bT, 20); t.eq(s.bO, 7); t.eq(s.ans, 25); t.eq(s.rest, 22); t.eq(s.r, 3);
    t.eq(s.chars.map(c => c.role), ['a', 'bT', 'b']);
    const two = await f.evaluate(() => document.getElementById('eq').classList.contains('two'));
    t.ok(two, 'こたえが 2桁なのに 手書きが 2枠に なっていない');
    await f.evaluate(() => sakura.tens());
    await f.waitForFunction(() => sakura.state().step === 'ask', null, { timeout: 4000 });
    s = await st(f);
    t.eq(s.chars.find(c => c.role === 'a').v, 32, '十の位を 引いたら 32 に ならない');
    await f.evaluate(() => sakura.split());
    s = await st(f);
    t.eq(s.step, 'take');
    t.eq(s.chars.map(c => c.role).sort().join(','), 'b,rest,ten');
    await f.evaluate(v => sakura.predict(v), 25);
    await f.evaluate(() => sakura.take());
    await f.waitForFunction(() => sakura.state().step === 'merge', null, { timeout: 4000 });
    await f.evaluate(() => sakura.merge());
    await f.waitForFunction(() => sakura.state().step === 'done', null, { timeout: 4000 });
    s = await st(f);
    t.eq(s.eqAns, '25');
    t.ok(s.chars.some(c => c.role === 'ans' && c.v === 25), 'こたえの キャラが いない');
    // おなじかず：同じ 問題が はじめから
    await f.evaluate(() => document.getElementById('bSame').click());
    s = await st(f);
    t.eq(s.step, 'tens'); t.eq(s.a, 52); t.eq(s.b, 27);
  },

  'すきなかず：20−19 は ちょうど 10 に なるので 分けずに とって おわり': async t => {
    const { f } = await openSakura(t);
    t.eq(await f.evaluate(() => sakura.free(20, 19)), true);
    let s = await st(f);
    t.eq(s.step, 'tens'); t.eq(s.rest, 0); t.eq(s.ans, 1);
    await f.evaluate(() => sakura.tens());
    await f.waitForFunction(() => sakura.state().step === 'take', null, { timeout: 4000 });
    s = await st(f);
    t.ok(s.chars.some(c => c.role === 'ten' && c.v === 10), 'ちょうど 10 の キャラが いない');
    t.ok(!s.chars.some(c => c.role === 'rest'), 'のこり 0 なのに rest が いる');
    await f.evaluate(() => sakura.take());
    await f.waitForFunction(() => sakura.state().step === 'done', null, { timeout: 4000 });
    s = await st(f);
    t.eq(s.eqAns, '1');
  },

  'すきなかず：57−24（くり下がり なし）と 50−20（一の位 0）も 解ける': async t => {
    const { f } = await openSakura(t);
    t.eq(await f.evaluate(() => sakura.free(57, 24)), true);
    await f.evaluate(() => sakura.tens());
    await f.waitForFunction(() => sakura.state().step === 'ask', null, { timeout: 4000 });
    let s = await st(f);
    t.eq(s.chars.find(c => c.role === 'a').v, 37);
    t.eq(s.rest, 27); t.eq(s.r, 6);
    await f.evaluate(() => sakura.split());
    await f.evaluate(() => sakura.take());
    await f.waitForFunction(() => sakura.state().step === 'merge', null, { timeout: 4000 });
    await f.evaluate(() => sakura.merge());
    await f.waitForFunction(() => sakura.state().step === 'done', null, { timeout: 4000 });
    t.eq((await st(f)).eqAns, '33');
    t.eq(await f.evaluate(() => sakura.free(50, 20)), true);
    await f.evaluate(() => sakura.tens());
    await f.waitForFunction(() => sakura.state().step === 'done', null, { timeout: 4000 });
    t.eq((await st(f)).eqAns, '30');
  },

  'すきなかず：おかしな 組み合わせは 始まらない／入力パネルからも 始められる': async t => {
    const { f } = await openSakura(t);
    await f.evaluate(() => sakura.input());
    let s = await st(f);
    t.eq(s.step, 'input'); t.eq(s.mode, 'free');
    t.eq(await f.evaluate(() => sakura.free(24, 57)), false, 'a<b が 始まってしまう');
    t.eq((await st(f)).step, 'input');
    t.eq(await f.evaluate(() => sakura.free(9, 5)), false, 'a が 1桁でも 始まってしまう');
    t.eq(await f.evaluate(() => sakura.free(30, 1)), false, 'b が 1 でも 始まってしまう');
    // パネルの キーを 押して 42−15 を 入れる
    await f.evaluate(() => {
      const tap = txt => [...document.querySelectorAll('.fKey')].find(b => b.textContent === txt).click();
      document.getElementById('fA').click(); tap('⌫'); tap('⌫');
      document.getElementById('fB').click(); tap('⌫'); tap('⌫');
      document.getElementById('fA').click();
      tap('4'); tap('2'); tap('1'); tap('5');
      document.getElementById('fGo').click();
    });
    s = await st(f);
    t.eq(s.step, 'tens'); t.eq(s.a, 42); t.eq(s.b, 15); t.eq(s.ans, 27);
    await f.evaluate(() => sakura.backToRandom());
    s = await st(f);
    t.eq(s.mode, 'random'); t.eq(s.step, 'ask');
  }
};
