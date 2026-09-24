// ひっさん（ためし）のページ。もんだいの作りかた と、5つの こたえかた（へや・おまかせ・ドラム・えらぶ・かく）が
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
// ゆびで 数字を 書く（お手本の 線を ますの 大きさに して、じっさいに ポインタで なぞる）
async function writeDigit(p, key, d, opt){
  opt = opt || {};
  const strokes = await p.evaluate(([key, d, opt]) => {
    const r = WL().cells[key], m = 0.18;
    const v = Ink.BASE[d][opt.variant || 0];
    return v.map(s => s.map(([x, y]) => [r.x + r.w*(m + (1 - 2*m)*(opt.mirror ? 1 - x : x)*0.7 + 0.15*(1 - 2*m)), r.y + r.h*(m + (1 - 2*m)*y)]));
  }, [key, d, opt]);
  for(const s of strokes){
    await p.mouse.move(s[0][0], s[0][1]); await p.mouse.down();
    for(let i=1;i<s.length;i++){
      const [x0, y0] = s[i-1], [x1, y1] = s[i];
      for(let k=1;k<=5;k++) await p.mouse.move(x0 + (x1 - x0)*k/5, y0 + (y1 - y0)*k/5);
    }
    await p.mouse.up();
  }
  await p.waitForFunction(key => S.cells[key].st !== 'wait', key, { timeout: 4000 });
  return p.evaluate(key => ({ st: S.cells[key].st, val: S.cells[key].val, msg: S.wmsg }), key);
}
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

  'よみとり：小さな まるに ながい しっぽの 9 を 7 と まちがえない（96−57 で あった 字）': async t => {
    const p = await openH(t, 'write', 'sub');
    const r = await p.evaluate(() => {
      const d = pts => { const o = []; for(let i=0;i<pts.length-1;i++) for(let k=0;k<8;k++) o.push({ x:pts[i][0] + (pts[i+1][0]-pts[i][0])*k/8, y:pts[i][1] + (pts[i+1][1]-pts[i][1])*k/8 }); return o; };
      const one = [[720,1220],[690,1195],[640,1200],[605,1240],[600,1290],[660,1295],[720,1270],[730,1240],[715,1265],[690,1380],[660,1500],[620,1610],[570,1680],[550,1715]];
      const two = [one.slice(0, 8), one.slice(8)];
      const seven = [[600,1200],[730,1200],[690,1380],[640,1600]];
      return [Ink.recognize([d(one)]), Ink.recognize(two.map(d)), Ink.recognize([d(seven)])].map(q => q && q.digit);
    });
    t.eq(r, [9, 9, 7], 'しっぽの ながい 9 が よめない');
  },

  'E かく：12+39 を 指で 書く（線の上は メモ → 一 → 十）': async t => {
    const p = await openH(t, 'write', 'add');
    await p.evaluate(() => setProblem('+', 12, 39));
    // 十のくらいの 上に くり上がりの 1 を メモ：よみとらない
    const memo = await p.evaluate(() => WL().carry);
    await p.mouse.move(memo.x + memo.w/2, memo.y + 4); await p.mouse.down();
    await p.mouse.move(memo.x + memo.w/2, memo.y + memo.h/2); await p.mouse.move(memo.x + memo.w/2, memo.y + memo.h - 4); await p.mouse.up();
    await t.sleep(900);
    t.eq(await p.evaluate(() => [S.memo.length, S.wmsg, Ink.records().length]), [1, '', 0], 'メモが よみとられた');
    t.eq((await writeDigit(p, 'o', 1)).st, 'ok', '一のくらいの 1 が よめない');
    t.eq((await writeDigit(p, 't', 5)).st, 'ok', '十のくらいの 5 が よめない');
    t.eq(await p.evaluate(() => [S.done, S.miss, S.memo.length]), [true, 0, 1], 'おわらない');
    // 書いた 字は きろくに のこる
    t.eq(await p.evaluate(() => Ink.records().map(r => [r.want, r.got])), [[1, 1], [5, 5]], 'きろく');
  },

  'E かく：まちがえると どこが ちがうか おしえる（くり上がり わすれ・かがみもじ）、よめない ときは「？」': async t => {
    const p = await openH(t, 'write', 'add');
    await p.evaluate(() => setProblem('+', 12, 39));
    let r = await writeDigit(p, 't', 4);
    t.eq([r.st, r.val], ['bad', 4], '4 を まちがいに しない');
    t.ok(/くり上がりの 1 を たしわすれ/.test(r.msg), 'くり上がり わすれの ことば: ' + r.msg);
    t.eq(await p.evaluate(() => S.pulse && S.pulse.k), 'carry', '十のくらいの 上を 光らせない');
    r = await writeDigit(p, 't', 5);                   // 上から 書きなおせる
    t.eq(r.st, 'ok', '書きなおせない');
    r = await writeDigit(p, 'o', 2);
    t.ok(r.st === 'bad' && /2 \+ 9 は？/.test(r.msg), '一のくらいの ことば: ' + r.msg);
    t.eq(await p.evaluate(() => S.miss), 2, 'まちがいが かぞえられない');
    await p.evaluate(() => setProblem('+', 18, 29));   // 一のくらい 7 を かがみもじで
    r = await writeDigit(p, 'o', 7, { mirror:true });
    t.ok(r.st === 'bad' && /かがみもじ/.test(r.msg), 'かがみもじを おしえない: ' + JSON.stringify(r));
    // らくがきは よめない
    await p.evaluate(() => { const c = WL().cells.t; S.cells.t.strokes = [[0,.3,.1,.9,.2,.1,.8,.9,.5,.2,.95,.6].reduce((a, v, i, s) => (i%2 ? a : a.concat({ x:c.x + c.w*v, y:c.y + c.h*s[i+1] })), [])]; S.cells.t.st = 'wait'; judgeCell('t'); });
    const u = await p.evaluate(() => ({ msg: S.wmsg, st: S.cells.t.st, n: S.cells.t.strokes.length, unk: S.cells.t.unk > 0 }));
    t.ok(u.msg === 'もういちど かいてね' && u.st === 'empty' && u.n === 0 && u.unk, 'よめない ときは「？」を 出して けす: ' + JSON.stringify(u));
    await p.evaluate(() => { inkDown(WL().cells.t.x + 10, WL().cells.t.y + 10); inkUp(); clearTimeout(inkTimer); S.cells.t.strokes = []; S.cells.t.st = 'empty'; });
    t.eq(await p.evaluate(() => [S.wmsg, S.cells.t.unk]), ['', 0], '書きはじめたら「？」と ことばが きえない');
    // こたえを けす は こたえだけ、けしゴム は メモだけ
    await p.evaluate(() => { S.memo.push([{ x:10, y:200 }, { x:30, y:220 }]); eraseInk(); });
    t.eq(await p.evaluate(() => [S.cells.o.st, S.cells.o.strokes.length, S.cells.t.st, S.memo.length]), ['empty', 0, 'empty', 1], 'こたえを けす');
    await p.evaluate(() => eraseMemo());
    t.eq(await p.evaluate(() => S.memo.length), 0, 'けしゴムで メモが きえない');
  },

  'E かく：ひき算 52−27（一 5、十 2）と くり下がり わすれ・3けた': async t => {
    const p = await openH(t, 'write', 'sub');
    await p.evaluate(() => setProblem('-', 52, 27));
    let r = await p.evaluate(() => { judgeCell('t', 3); return [S.wmsg, S.pulse.k]; });
    t.ok(/くり下がりで 十のくらいが 1 へった/.test(r[0]) && r[1] === 'carry', 'くり下がり わすれの ことば: ' + r);
    await p.evaluate(() => setProblem('-', 61, 38));
    r = await p.evaluate(() => { judgeCell('o', 7); return S.wmsg; });
    t.ok(/1 から 8 は ひけない/.test(r), 'ぎゃくに ひいた ときの ことば: ' + r);
    await p.evaluate(() => { judgeCell('o', 3); judgeCell('t', 2); });
    t.eq(await p.evaluate(() => S.done), true, 'おわらない');
    await p.evaluate(() => setProblem('+', 58, 67));
    t.eq(await p.evaluate(() => cellKeys().map(cellWant)), [5, 2, 1], '3けたの ます');
  },

  'E かく：おぼえる・きろくの「ほんとうは？」で お手本に なる': async t => {
    const p = await openH(t, 'write', 'add');
    const r = await p.evaluate(() => {
      openTrain();
      const b = trainBox();
      train.strokes = [[{ x:b.x + 10, y:b.y + 10 }, { x:b.x + 60, y:b.y + 12 }, { x:b.x + 20, y:b.y + 90 }]];
      trainDone();
      const n = Ink.samples(), i = train.i;
      closeTrain(); Ink.forget();
      return [n, i, Ink.samples(), !!train];
    });
    t.eq(r, [1, 1, 0, false], 'おぼえる が うごかない');
    // まちがえて おぼえさせた 字を けす：ひとつ もどる／おぼえた字 から えらんで けす
    const u = await p.evaluate(() => {
      openTrain(); const b = trainBox(), st = [[{ x:b.x + 50, y:b.y + 10 }, { x:b.x + 52, y:b.y + 200 }]];
      train.strokes = st.map(q => q.slice()); trainDone();
      train.strokes = st.map(q => q.slice()); trainDone();
      const before = [train.i, Ink.samples()];
      btns = []; drawTrain(); btns.find(q => q.x > 28 && q.y === btns[0].y && q !== btns[0] && q !== btns[2]).act();   // ひとつ もどる
      const after = [train.i, Ink.samples()];
      train.view = 'mine'; btns = []; drawMine(); btns[0].act(); const sel = train.sel;
      btns = []; drawMine(); btns[1].act();        // この字を けす
      return [before, after, sel, Ink.samples(), window.__err || ''];
    });
    t.eq(u, [[2, 2], [1, 1], 0, 0, ''], 'まちがえた 字を けせない');
    await p.evaluate(() => closeTrain());
    // きろくを なおす
    await p.evaluate(() => setProblem('+', 12, 39));
    await writeDigit(p, 't', 4);
    const q = await p.evaluate(() => {
      openTrain(); train.view = 'rec'; btns = []; drawRecords();
      btns[0].act();                                   // いちばん あたらしい 字
      btns = []; drawRecords();
      const b5 = btns.find(b => b.w < 40 && b.y > H - 200 && btns.indexOf(b) === btns.length - 3 - 10 + 5);
      b5.act();
      const rec = Ink.records()[0];
      return [train.sel, rec.fixed, Ink.samples(), window.__err || ''];
    });
    t.eq(q, [null, 5, 1, ''], 'ほんとうは？ で なおせない');
  },

  'どの画面でも へや・ボタンが 収まり、エラーが 出ない（5つの こたえかた）': async t => {
    for(const [w, h] of [[393, 780], [375, 667], [430, 932]]){
      for(const m of ['room', 'auto', 'drum', 'pick', 'write']){
        const p = await openH(t, m, 'mix', { width:w, height:h });
        await t.sleep(150);
        const r = await p.evaluate(() => {
          setProblem('+', 76, 58); const l = L(); draw();
          const fit = btns.every(b => b.x >= 0 && b.x + b.w <= W + 0.5 && b.y >= 0 && b.y + b.h <= H + 0.5);
          if(modeId === 'write'){
            const wl = WL(), cs = Object.values(wl.cells);
            const ok = wl.cw >= 60 && cs.every(c => c.x >= 0 && c.x + c.w <= W && c.y > l.top - 1 && c.y + c.h < wl.msgY) && wl.msgY + 50 < l.bottom;
            return { fit, rooms: ok, err: window.__err || '' };
          }
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
    // ボタンを おすと、キャッシュの 古い版では なく 新しい版を ひらき、もどる で ゲームに もどる
    await p.evaluate(() => { const b = setBtns.find(b => b.val === 'hissan'); handleSettingsTap(b.x + 2, b.y + 2); });
    await p.waitForFunction(() => /hissan\.html\?v=\d+/.test(location.href) && typeof newProblem === 'function' && typeof Ink === 'object');
    await t.sleep(200);
    await p.evaluate(() => goBack());
    await p.waitForFunction(() => /index\.html/.test(location.href) && typeof drawFrame === 'function');
  },
};
