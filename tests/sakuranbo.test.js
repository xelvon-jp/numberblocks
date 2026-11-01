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
    t.eq(s.chars.map(c => c.v), [s.a]);
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
    t.ok(s.predQ.includes('ひいたら'), 'よそうの 文が ひいたら でない: ' + s.predQ);
    t.ok(s.pred, 'よそう パネルが 出ていない');
    t.ok(s.choices.includes(s.r), 'よそうの こうほに せいかいが ない ' + JSON.stringify(s.choices));
    t.eq(s.chars.map(c => c.role).sort().join(','), 'b,rest,ten');
    // まちがった よそう → すすまない
    const wrong = s.choices.find(v => v !== s.r);
    t.eq(await f.evaluate(v => sakura.predict(v), wrong), false);
    t.eq((await st(f)).step, 'predict');
    // せいかいの よそう → とる へ
    t.eq(await f.evaluate(v => sakura.predict(v), s.r), true);
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
    t.eq([s.a, s.b], ab); t.eq(s.step, 'ask'); t.eq(s.frame, false);
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
    await f.evaluate(v => sakura.predict(v), s.r);
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
};
