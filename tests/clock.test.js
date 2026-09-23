// とけいの おだい と まぜまぜ。はりを あわせる判定・ドラムロールで よむ・虹・
// ヒントを出さないこと・しゅるいの切りかえ・記録の引っこし。

// そのおだいの番号をさがす（ページの中で）
const find = (p, src) => p.evaluate(s => TASKS.findIndex(new Function('x', 'return ' + s)), src);

// ながいはりを つかんで、m ぷんの場所まで まわして はなす（ほんとうの指と同じ道を通る）
async function dragMinute(p, m, steps){
  await p.evaluate(([m, steps]) => {
    const g = getClockGeom();
    const at = f => handPos(g, f, g.R*0.78);
    const f0 = clockMin()/60;
    let df = m/60 - f0;
    if(df > 0.5) df -= 1; if(df < -0.5) df += 1;
    const s = at(f0);
    handleStart(s.x, s.y, 'm');
    for(let i=1;i<=steps;i++){ const q = at(f0 + df*i/steps); handleMove(q.x, q.y, 'm'); }
    const e = at(f0 + df);
    handleEnd(e.x, e.y, 'm');
  }, [m, steps || 12]);
}
// はりを v（0時からの ふん）に じかに置いて はなす（1かい と数える）
const setHands = (p, v) => p.evaluate(v => {
  clockDrag = 'min'; clockDragFrom = clockT; clockT = ((v % 720) + 720) % 720;
  handleEnd(0, 0, 'm');
}, v);

module.exports = {

  'とけいの おだいは「よんで えらぶ」と「はりを あわせる」の 2しゅるいだけ（4レベル×10問）': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      const list = catTasks('clock').map(i => TASKS[i]);
      const set = TASKS.find(x => x.k === 'clock' && x.to === '3:47').c;
      const pm  = TASKS.find(x => x.k === 'pick' && x.to === '15:52').c;
      const am  = TASKS.find(x => x.k === 'pick' && x.to === '4:37').c;
      return { kinds: [...new Set(list.map(x => x.k))].sort(), n: list.length,
               levels: catLevels('clock').map(lv => TASK_LEVELS[lv].name),
               set: [set.start, fmtT(set.goal), set.title + set.tail],
               pm: [pm.start, pm.h24, pm.tail], am: [am.start, am.h24, am.tail] };
    });
    t.eq(r.kinds, ['clock', 'pick'], 'とけいの おだいに ほかの しゅるいが まざっている');
    t.eq(r.n, 40, 'とけいの おだいの数');
    t.eq(r.levels, ['よんで えらぶ', 'はりを あわせる', 'ごごを よむ', 'ごごに あわせる'], 'とけいの レベル');
    t.eq(r.set, [0, '3:47', '3:47 に あわせよう！'], 'はりを あわせる おだい');
    t.eq(r.pm, [952, true, 'ごごの とけい。デジタルで なんじ？'], 'ごごを よむ おだい');
    t.eq(r.am, [277, false, 'とけいを よんで えらぼう！'], 'よんで えらぶ おだい');
  },

  'はりを あわせる おだいを はじめると とけいの画面になり、はりは 12:00、文字盤は カードの下': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.to==='3:47'");
    const r = await p.evaluate(i => {
      setMode('+'); taskOn = true; startTask(i);
      const card = getTaskCardRect(), g = getClockGeom();
      return { mode, clockT, active: taskActive(), below: g.cy - g.R > card.y + card.h };
    }, i);
    t.eq(r, { mode:'clock', clockT:0, active:true, below:true }, 'はりを あわせる おだいの はじまりが おかしい');
  },

  'ながいはりを まわして はなしたら できた。best 回いないなら レインボー': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.to==='4:03'");
    await p.evaluate(i => { taskOn = true; startTask(i); clockT = 4*60; }, i);
    await dragMinute(p, 3);
    const r = await p.evaluate(i => ({ clockT, done: taskDone, cleared: !!taskCleared[i], moves: (taskLogs[i]||[]).length,
                                       rainbow: !!(winFx && winFx.praise && winFx.praise.rainbow),
                                       mark: !!(curRec().rainbow||{})[i] }), i);
    t.eq(r, { clockT:243, done:true, cleared:true, moves:1, rainbow:true, mark:true }, '4:03 に あわせても できたにならない');
  },

  'とちゅうで こたえを 通りすぎても できたにしない。さわっただけは 数えない。best をこえたら 虹なし': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.to==='4:03'");
    await p.evaluate(i => { taskOn = true; startTask(i); clockT = 4*60; }, i);
    await dragMinute(p, 10, 20);                           // 4:03 を 通りすぎて 4:10 で はなす
    t.eq(await p.evaluate(() => [clockT, taskDone, taskLog.length]), [250, false, 1], '通りすぎただけで できたになった');
    await p.evaluate(() => { const g = getClockGeom(); const s = handPos(g, clockMin()/60, g.R*0.78);
                             handleStart(s.x, s.y, 'm'); handleEnd(s.x, s.y, 'm'); });
    t.eq(await p.evaluate(() => taskLog.length), 1, 'さわっただけ（はりが動かない）なのに 1かい と数えた');
    await dragMinute(p, 5);
    await dragMinute(p, 3);
    const r = await p.evaluate(() => ({ done: taskDone, moves: taskLog.length,
                                        rainbow: !!(winFx && winFx.praise && winFx.praise.rainbow) }));
    t.eq(r, { done:true, moves:3, rainbow:false }, '3かいめで できた／虹は出ない のはず');
  },

  'ごごに あわせる おだいは、12じかんの とけいで あっていれば できた': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.to==='15:45'");
    await p.evaluate(i => { taskOn = true; startTask(i); }, i);
    await setHands(p, 3*60);
    t.eq(await p.evaluate(() => taskDone), false, '3:00 で できたになった');
    await setHands(p, 3*60 + 45);
    t.eq(await p.evaluate(() => [taskDone, winFx.praise && winFx.praise.rainbow]), [true, true],
         '3:45（＝15:45）で できたにならない');
  },

  'とけいの おだいは ふつうでも ビギナーでも ヒント・みちしるべを 出さない': async t => {
    const p = await t.open();
    const set = await find(p, "x.k==='clock' && x.to==='3:47'");
    const pick = await find(p, "x.k==='pick' && x.to==='4:37'");
    const look = (i, beg) => p.evaluate(([i, beg]) => {
      setBegMode(beg); taskOn = true; startTask(i);
      taskStartT = Date.now() - HINT_AFTER_MS - 1000;       // 苦戦したことにする
      for(let k=0;k<8;k++) taskLog.push({k:'clock', a:0, r:1});
      drawTaskCard(ctx, 0);
      const got = [], ft = ctx.fillText;
      ctx.fillText = function(s){ got.push(String(s)); return ft.apply(this, arguments); };
      try{ drawClockMode(ctx, 0); } finally { ctx.fillText = ft; }
      return { hint: taskBtns.some(b => b.val === 'hint'), way: currentWay().length, cardH: taskCardH(),
               texts: got.filter(s => /はり|5が/.test(s)) };
    }, [i, beg]);
    for(const beg of [false, true]){
      for(const [i, name] of [[set, 'あわせる'], [pick, 'よむ']]){
        t.eq(await look(i, beg), { hint:false, way:0, cardH:50, texts:[] },
             `${beg ? 'ビギナー' : 'ふつう'}の ${name} で ヒントが出ている`);
      }
    }
  },

  'といている最中は、デジタル表示と 5のなかまの答えを かくす（ビギナーでも）。できたら出す': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.to==='15:45'");
    const texts = () => p.evaluate(() => {
      const got = [], ft = ctx.fillText;
      ctx.fillText = function(s){ got.push(String(s)); return ft.apply(this, arguments); };
      try{ drawClockMode(ctx, 0); } finally { ctx.fillText = ft; }
      return got;
    });
    for(const beg of [false, true]){
      await p.evaluate(([i, beg]) => { setBegMode(beg); taskOn = true; startTask(i); clockT = 3*60 + 40; }, [i, beg]);
      const live = await texts();
      t.ok(!live.some(s => /^\d+:\d\d$/.test(s)), 'といている最中に デジタル表示が出ている: ' + live.join(' | '));
      t.ok(live.some(s => /= ？$/.test(s)), '5のなかまの式の こたえが かくれていない');
    }
    await setHands(p, 3*60 + 45);
    const done = await texts();
    t.ok(done.includes('15:45'), 'できたのに 15:45 と出ない: ' + done.join(' | '));
  },

  'とけいの つぎ は、とけいの中で進み、さいごからは はじめへ もどる': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      const list = catTasks('clock');
      taskOn = true; startTask(list[3]); nextTask();
      const a = taskIdx === list[4];
      startTask(list[list.length-1]); nextTask();
      return { a, wrap: taskIdx === list[0], mode };
    });
    t.eq(r, { a:true, wrap:true, mode:'clock' }, 'とけいの中で 進まない');
  },

  'まぜまぜ：けいさん と とけい が まざって出て、中の画面は かわるが おだいの ままで いる': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      const list = catTasks('mix');
      taskOn = true; startTask(list[0]);
      const m0 = mode; nextTask();                        // けいさん → よんで えらぶ
      const m1 = mode, a1 = taskActive(), d1 = !!drum; nextTask();   // → けいさん
      const m2 = mode, a2 = taskActive();
      return { m0, m1, a1, d1, m2, a2, on: taskOn,
               kinds: [...new Set(list.map(i => TASKS[i].k || 'calc'))].sort() };
    });
    t.eq(r, { m0:'+', m1:'clock', a1:true, d1:true, m2:'+', a2:true, on:true, kinds:['calc','clock','pick'] },
         'まぜまぜで 画面が きりかわらない');
  },

  'いちらん：しゅるいを えらぶと その レベルだけ ならび、マスを押すと その画面で はじまる': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true; startTask(0); openStages(); drawStageSelect(ctx, 0);
      const cats = stageBtns.filter(b => b.val === 'cat').map(b => b.v);
      const tap = b => handleStageTap(b.x + b.w/2, b.y + b.h/2, 'm');
      tap(stageBtns.find(b => b.val === 'cat' && b.v === 'clock'));
      drawStageSelect(ctx, 0);
      const gos = stageBtns.filter(b => b.val === 'go');
      const allClock = gos.every(b => catOf(b.idx) === 'clock');
      tap(gos[0]);
      return { cats, n: gos.length, allClock, open: stageOpen, mode, idx: taskIdx === catTasks('clock')[0] };
    });
    t.eq(r, { cats:['calc','clock','mix'], n:40, allClock:true, open:false, mode:'clock', idx:true },
         'いちらんの しゅるいの切りかえが おかしい');
  },

  'いちらん：どの画面でも しゅるいの段が 名前の札・マスと重ならず、マスは画面に収まる': async t => {
    for(const [w, h] of [[393, 780], [375, 667], [780, 393], [667, 375]]){
      const p = await t.open({ width:w, height:h });
      for(const cat of ['calc', 'clock', 'mix']){
        const r = await p.evaluate(c => {
          taskOn = true; openStages(); stageCat = c; drawStageSelect(ctx, 0);
          const cats = stageBtns.filter(b => b.val === 'cat'), prof = stageBtns.filter(b => b.val === 'prof');
          const gos = stageBtns.filter(b => b.val === 'go'), head = stageBtns.filter(b => b.val === 'mode' || b.val === 'rec' || b.val === 'close');
          const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          const over = cats.some(c => prof.concat(gos, head).some(o => hit(c, o)));
          const bottom = Math.max(...gos.map(b => b.y + b.h));
          const right = Math.max(...cats.map(b => b.x + b.w));
          return { over, fits: bottom <= sh && right <= sw };
        }, cat);
        t.eq(r, { over:false, fits:true }, `${w}x${h} ${cat} で いちらんが 重なる／はみ出す`);
      }
    }
  },

  'とけいで クリアしても 止まらず、演出のあと つぎへ進む': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.to==='3:47'");
    await p.evaluate(i => { taskOn = true; startTask(i); }, i);
    await setHands(p, 3*60 + 47);
    await t.sleep(400);
    t.ok(await p.evaluate(() => winFx && winFx.center && rainbowTime() >= 0), 'とけいの演出が出ていない');
    await t.sleep(3000);
    t.eq(await p.evaluate(i => [taskIdx === i + 1, mode, taskDone], i), [true, 'clock', false], 'つぎへ進まない');
  },

  'おだいの ならびを かえたとき：けいさんの記録は のこり、とけい・まぜまぜの 古い記録は けす。虹の印は のこる': async t => {
    const old = { v:2, on:false, cur:'hinata', p:{
      hinata:{ idx:75, cleared:{5:true, 75:true}, logs:{5:[{k:'new',a:1}], 75:[{k:'new',a:1}]}, rainbow:{75:true},
               beg:{ idx:3, cleared:{2:true, 90:true}, logs:{}, rainbow:{90:true} } } } };
    const p = await t.open({ storage:{ 'nbg.task.v1': JSON.stringify(old) } });
    const r = await p.evaluate(() => {
      const h = taskStore.hinata;
      return { c: Object.keys(h.cleared), l: Object.keys(h.logs), idx: h.idx,
               bc: Object.keys(h.beg.cleared), br: Object.keys(h.beg.rainbow) };
    });
    t.eq(r, { c:['5'], l:['5'], idx:0, bc:['2'], br:[] }, '引っこしで 記録の のこりかたが ちがう');
    // あたらしい版で 保存した 虹の印（ふつう）は、開きなおしても のこる
    const i = await find(p, "x.k==='clock' && x.to==='3:47'");
    await p.evaluate(i => { setProfile(PROFILES.findIndex(x => x.id === 'hinata')); taskOn = true; startTask(i); }, i);
    await setHands(p, 3*60 + 47);
    await p.reload(); await p.waitForFunction(() => typeof drawFrame === 'function');
    t.eq(await p.evaluate(i => [!!taskStore.hinata.cleared[i], !!(taskStore.hinata.rainbow || {})[i]], i), [true, true],
         '開きなおすと とけいの クリア／虹の印が きえる');
  },


  'よんで えらぶ：はりは こたえの時こくで止まり、さわっても動かない。ドラムは 12:00 から': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='pick' && x.to==='4:37'");
    const r = await p.evaluate(i => {
      taskOn = true; startTask(i);
      const before = clockT, g = getClockGeom(), m = handPos(g, clockMin()/60, g.R*0.78);
      handleStart(m.x, m.y, 'm'); handleMove(m.x + 40, m.y + 60, 'm'); handleEnd(m.x + 40, m.y + 60, 'm');
      return { mode, before, after: clockT, drum: drumTime(), lists: drum.lists.map(l => l.length) };
    }, i);
    t.eq(r, { mode:'clock', before:277, after:277, drum:720, lists:[12,6,10] }, 'よんで えらぶ の はじまりが おかしい');
  },

  'ドラム：はじいて まわすと 数がかわり、上下を ちょんと押すと 1つずつ かわる': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='pick' && x.to==='4:37'");
    const r = await p.evaluate(i => {
      taskOn = true; startTask(i);
      const dg = drumGeom(), w = dg.wheels[2], cx = w.x + w.w/2, cy = w.y + w.h/2;
      // 一のくらいを 3だん 上へ はじく（ゆっくり）
      handleStart(cx, cy, 'm');
      for(let k=1;k<=10;k++) handleMove(cx, cy - dg.rowH*3*k/10, 'm');
      drum.drag.v = 0;                                     // いきおいは のせない
      handleEnd(cx, cy - dg.rowH*3, 'm');
      const a = drumVal(2);
      // じ の ドラムの 下を ちょんと押す → 12 の つぎの 1
      const h = dg.wheels[0];
      handleStart(h.x + h.w/2, h.y + h.h - 6, 'm'); handleEnd(h.x + h.w/2, h.y + h.h - 6, 'm');
      const b = drumVal(0);
      handleStart(h.x + h.w/2, h.y + 6, 'm'); handleEnd(h.x + h.w/2, h.y + 6, 'm');
      handleStart(h.x + h.w/2, h.y + 6, 'm'); handleEnd(h.x + h.w/2, h.y + 6, 'm');
      return { a, b, c: drumVal(0) };
    }, i);
    t.eq(r, { a:3, b:1, c:11 }, 'ドラムが おもったとおりに まわらない');
  },

  'よんで えらぶ：ちがうと ゆれて できない。あっていれば できた。1かいめなら 虹': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='pick' && x.to==='4:37'");
    const press = () => p.evaluate(() => { const b = drumGeom().btn; handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm'); });
    await p.evaluate(i => { taskOn = true; startTask(i); drumSet(4, 37); }, i);
    await press();
    t.eq(await p.evaluate(() => [taskDone, !!winFx.praise.rainbow, taskLog.length]), [true, true, 1], '4:37 で できたにならない');
    await p.evaluate(i => { startTask(i); drumSet(7, 22); }, i);        // みじかいはり と ながいはり を とりちがえた
    await press();
    t.eq(await p.evaluate(() => [taskDone, drum.miss, drum.shake > 0]), [false, 1, true], 'ちがうのに できたになった');
    await p.evaluate(() => drumSet(4, 37));
    await press();
    t.eq(await p.evaluate(() => [taskDone, !!(winFx.praise && winFx.praise.rainbow)]), [true, false],
         '2かいめで できた／虹は出ない のはず');
  },

  'ごごの じこく：じの ドラムは 0〜23。1:18 では だめで 13:18 で できた': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='pick' && x.to==='13:18'");
    const press = () => p.evaluate(() => drumAnswer());
    const r0 = await p.evaluate(i => { taskOn = true; startTask(i); return { n: drum.lists[0].length, clockT, tail: currentTask().c.tail }; }, i);
    t.eq(r0, { n:24, clockT:78, tail:'ごごの とけい。デジタルで なんじ？' }, 'ごごの じこく の はじまりが おかしい');
    await p.evaluate(() => drumSet(1, 18)); await press();
    t.eq(await p.evaluate(() => taskDone), false, '1:18 で できたになった（ごごなので 13:18）');
    await p.evaluate(() => drumSet(13, 18)); await press();
    t.eq(await p.evaluate(() => taskDone), true, '13:18 で できたにならない');
  },

  'よんで えらぶ：ドラムが どの画面でも 文字盤と重ならず、下のパネルより上に収まる': async t => {
    for(const [w, h] of [[393, 780], [375, 667], [430, 932], [780, 393]]){
      const p = await t.open({ width:w, height:h });
      const r = await p.evaluate(() => {
        taskOn = true; startTask(TASKS.findIndex(x => x.k==='pick')); drum.miss = 1;   // 「ちがうよ」も出す
        const g = getClockGeom(), dg = drumGeom();
        const all = dg.wheels.concat([dg.btn]);
        return { belowDial: dg.top >= g.cy + g.R, fits: dg.top + dg.H + 50 <= sh - bottomPanelH() + 4,
                 inside: all.every(b => b.x >= 0 && b.x + b.w <= sw) };
      });
      t.eq(r, { belowDial:true, fits:true, inside:true }, `${w}x${h} で ドラムが はみ出す／重なる`);
    }
  },
};
