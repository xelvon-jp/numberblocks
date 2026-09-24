// ひっさん（ためし）のページ。もんだいの作りかた と、4つの こたえかた（へや・おまかせ・ドラム・えらぶ）が
// さいごまで とけること、まちがいの あつかい。

async function openH(t, mode, kind, size){
  const p = await t.open(size || {});
  await p.evaluate(([m, k]) => localStorage.setItem('nb_hissan_try', JSON.stringify({ m, k })), [mode, kind]);
  await p.goto(p.url().replace('index.html', 'hissan.html'));
  await p.waitForFunction(() => typeof newProblem === 'function' && P);
  return p;
}
// ページの中で ゆびを うごかす（キャラの まんなかから 目的の へや・だん へ）
const dragIn = (p, from, to) => p.evaluate(([from, to]) => {
  const l = L();
  const pt = {
    onesA: () => { const q = onesPos(l, 'a', S.onesA), sp = blockSpec(S.onesA); return [q.x + sp.cols*l.bs/2, q.y - 10]; },
    onesB: () => { const q = onesPos(l, 'b', S.onesB), sp = blockSpec(S.onesB); return [q.x + sp.cols*l.bs/2, q.y - 10]; },
    tensA: () => { const q = rodPos(l, 'a', 0); return [q.x + 2, q.y - 20]; },
    tensB: () => { const q = rodPos(l, 'b', 0); return [q.x + 2, q.y - 20]; },
    carry: () => { const q = rodPos(l, 'c', 0); return [q.x + 2, q.y - 20]; },
    roomO: () => [l.rooms.o.x + l.rooms.o.w/2, l.rowBottom('a') - 20],
    roomT: () => [l.rooms.t.x + l.rooms.t.w/2, l.rowBottom('a') - 20],
    roomH: () => [l.rooms.h.x + l.rooms.h.w/2, l.rowBottom('a') - 20],
  };
  const [x0, y0] = pt[from](), [x1, y1] = pt[to]();
  startDrag(x0, y0);
  const got = drag ? drag.kind : null;
  if(drag){ drag.x = x1; drag.y = y1; }
  return endDrag(x1, y1).then(() => got);
}, [from, to]);
const waitIdle = p => p.waitForFunction(() => busy === 0 && anims.length === 0, null, { timeout: 8000 });

module.exports = {

  'もんだい：たし算は かならず くり上がり（4かいに1かいは 3けた）、ひき算は かならず くり下がり（こたえは 10 いじょう）': async t => {
    const p = await openH(t, 'room', 'add');
    const r = await p.evaluate(() => {
      let bad = 0, big = 0; const N = 2000;
      for(let i=0;i<N;i++){
        const q = genProblem('add');
        if(!(q.op === '+' && q.a >= 10 && q.a < 100 && q.b >= 10 && q.b < 100 && q.a%10 + q.b%10 >= 10 && q.ans === q.a + q.b)) bad++;
        if(q.ans >= 100) big++;
        const s = genProblem('sub');
        if(!(s.op === '-' && s.a > s.b && s.a - s.b >= 10 && s.a%10 < s.b%10 && s.b >= 10 && s.a < 100 && s.ans === s.a - s.b)) bad++;
        const w = wrongAnswers(q).concat(wrongAnswers(s));
        if(w.length !== 4 || w.includes(q.ans) && wrongAnswers(q).includes(q.ans)) bad++;
      }
      return { bad, big: big/N };
    });
    t.eq(r.bad, 0, 'きまりに あわない もんだいが ある');
    t.ok(r.big > 0.15 && r.big < 0.35, '3けたの わりあい: ' + r.big);
  },

  'A へや：たし算 38+45 を ドラッグと 数字キーで とく（がったい → くり上がり → 十のへや）': async t => {
    const p = await openH(t, 'room', 'add');
    await p.evaluate(() => setProblem('+', 38, 45));
    t.eq(await dragIn(p, 'onesB', 'onesA'), 'onesB', '一のへやの 5 を つかめない'); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.onesA, S.onesB]), [13, 0], 'がったい できない');
    await dragIn(p, 'onesA', 'roomT'); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.onesA, S.carry, S.markT]), [3, 1, true], 'くり上がり できない');
    await p.evaluate(() => pressDigit(4)); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.res.o, S.miss]), [null, 1], 'まちがえたのに 入った');
    await p.evaluate(() => pressDigit(3)); await waitIdle(p);
    await dragIn(p, 'tensB', 'roomT'); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.tensA, S.tensB, S.carry]), [8, 0, 0], '十のへやで がったい できない');
    await p.evaluate(() => pressDigit(8)); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.done, S.res.o, S.res.t, S.miss, window.__err || '']), [true, 3, 8, 1, ''], 'さいごまで とけない');
  },

  'A へや：3けたの たし算 76+58 は 10が 10本で 百のへやへ': async t => {
    const p = await openH(t, 'room', 'add');
    await p.evaluate(() => setProblem('+', 76, 58));
    await dragIn(p, 'onesB', 'onesA'); await waitIdle(p);
    await dragIn(p, 'onesA', 'roomT'); await waitIdle(p);
    await p.evaluate(() => pressDigit(4)); await waitIdle(p);
    await dragIn(p, 'carry', 'roomT'); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.tensA, S.tensB, S.carry]), [13, 0, 0], '十のへやで ぜんぶ あつまらない');
    await dragIn(p, 'tensA', 'roomH'); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.tensA, S.hund, S.markH]), [3, 1, true], '百のへやへ いけない');
    await p.evaluate(() => pressDigit(3)); await waitIdle(p);
    await p.evaluate(() => pressDigit(1)); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.done, S.miss]), [true, 0], '3けたが とけない');
  },

  'A へや：ひき算 52−27 は、かりてこないと ひけない。10 を 1本 つれてきて ひく': async t => {
    const p = await openH(t, 'room', 'sub');
    await p.evaluate(() => setProblem('-', 52, 27));
    await dragIn(p, 'onesB', 'onesA'); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.onesA, S.onesB, /ひけない/.test(S.msg)]), [2, 7, true], 'かりずに ひけてしまった');
    await dragIn(p, 'tensA', 'roomO'); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.tensA, S.onesA, S.borrow]), [4, 12, true], 'くり下がり できない');
    await dragIn(p, 'onesB', 'onesA'); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.onesA, S.onesB]), [5, 0], 'ひけない');
    await p.evaluate(() => pressDigit(5)); await waitIdle(p);
    await dragIn(p, 'tensB', 'roomT'); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.tensA, S.tensB]), [2, 0], '十のへやで ひけない');
    await p.evaluate(() => pressDigit(2)); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.done, S.miss]), [true, 0], 'ひき算が とけない');
  },

  'A へや：うごかす前に こたえが わかったら、数字だけで すすむ（のこりの うごきは 見せる）': async t => {
    const p = await openH(t, 'room', 'add');
    await p.evaluate(() => setProblem('+', 38, 45));
    await p.evaluate(() => pressDigit(3)); await waitIdle(p);
    t.eq(await p.evaluate(() => [S.res.o, S.onesB, S.carry]), [3, 0, 1], '一のくらいの うごきが のこっている');
    await p.evaluate(() => pressDigit(8)); await waitIdle(p);
    t.eq(await p.evaluate(() => S.done), true, 'おわらない');
  },

  'B おまかせ：キャラは じどうで うごき、とまったところで こたえる': async t => {
    const p = await openH(t, 'auto', 'add');
    await p.evaluate(() => setProblem('+', 27, 36));      // おまかせは はじまると じどうで うごきだす
    await p.waitForFunction(() => askResolve && askCol === 'o', null, { timeout: 8000 });
    t.eq(await p.evaluate(() => [S.onesA, S.carry]), [3, 1], 'じどうで うごかない');
    await p.evaluate(() => pressDigit(2)); await p.waitForFunction(() => S.miss === 1);
    await p.evaluate(() => pressDigit(3));
    await p.waitForFunction(() => askResolve && askCol === 't', null, { timeout: 8000 });
    await p.evaluate(() => pressDigit(6));
    await p.waitForFunction(() => S.done, null, { timeout: 8000 });
    t.eq(await p.evaluate(() => [S.res.o, S.res.t, S.miss]), [3, 6, 1], 'おまかせで とけない');
  },

  'C ドラム：まちがいは ゆれるだけ。あたったら うごきで わけを 見せて おわる': async t => {
    const p = await openH(t, 'drum', 'sub');
    await p.evaluate(() => setProblem('-', 61, 38));
    t.eq(await p.evaluate(() => answerAll(33)), false, 'まちがいが 入った');
    await p.evaluate(() => answerAll(23));
    await p.waitForFunction(() => S.done, null, { timeout: 10000 });
    t.eq(await p.evaluate(() => [S.miss, S.tensA, S.onesA, S.borrow]), [1, 2, 3, true], 'わけの うごきが おかしい');
  },

  'D えらぶ：こうほに せいかいが あり、まちがいを おすと うすくなる': async t => {
    const p = await openH(t, 'pick', 'add');
    await p.evaluate(() => setProblem('+', 38, 45));
    const r = await p.evaluate(() => ({ ch: choices.slice().sort((a,b) => a-b), wrong: wrongAnswers(P) }));
    t.ok(r.ch.includes(83) && r.ch.length === 3 && new Set(r.ch).size === 3, 'こうほが おかしい: ' + r.ch);
    const w = r.ch.find(v => v !== 83);
    await p.evaluate(async w => { btns = []; drawBottom(L()); const b = btns[choices.indexOf(w)]; await b.act(); }, w);
    t.eq(await p.evaluate(w => [S.bad.has(w), S.done], w), [true, false], 'まちがいが うすく ならない');
    await p.evaluate(() => answerAll(83));
    await p.waitForFunction(() => S.done, null, { timeout: 10000 });
  },

  'どの画面でも へや・ボタンが 収まり、エラーが 出ない（4つの こたえかた）': async t => {
    for(const [w, h] of [[393, 780], [375, 667], [430, 932]]){
      for(const m of ['room', 'auto', 'drum', 'pick']){
        const p = await openH(t, m, 'mix', { width:w, height:h });
        await t.sleep(150);
        const r = await p.evaluate(() => {
          setProblem('+', 76, 58); const l = L(); draw();
          const fit = btns.every(b => b.x >= 0 && b.x + b.w <= W + 0.5 && b.y >= 0 && b.y + b.h <= H + 0.5);
          return { fit, rooms: l.rooms.t.h > 120, err: window.__err || '' };
        });
        t.eq(r, { fit:true, rooms:true, err:'' }, `${w}x${h} ${m} で はみ出す／エラー`);
      }
    }
  },

  'ゲームの せっていから ひっさん（ためし）を ひらける': async t => {
    const p = await t.open();
    const has = await p.evaluate(() => { setOpen = true; drawSettings(ctx); return setBtns.some(b => b.val === 'hissan'); });
    t.eq(has, true, 'せっていに ひっさん（ためし）が ない');
  },
};
