// とけいの おだい と まぜまぜ。時こくの計算・はりを あわせたときの判定・虹・
// みちしるべ・しゅるいの切りかえ。

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

  'とけいの おだい：あわせる時こく・みちしるべ・ことばが 正しい': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      const c = (from, d) => TASKS.find(x => x.k === 'clock' && x.from === from && x.d === d).c;
      const s = to => TASKS.find(x => x.k === 'clock' && x.to === to).c;
      const f = c => ({ goal: fmtT(c.goal), way: c.way.map(fmtT), tail: c.tail });
      return {
        a: f(c('15:45', -13)), b: f(c('10:50', 25)), d: f(c('23:30', 50)),
        e: f(c('15:45', -73)), g: f(c('4:50', 135)), h: f(s('3:47')), i: f(s('4:03')),
        words: [3, 5, 10, 12, 13, 17, 25, 38, 44, 59].map(funWord),
        hint: c('8:40', -180).hint
      };
    });
    t.eq(r.a, { goal:'15:32', way:['15:35'], tail:' の 13ぷん まえ' }, '15:45 の 13ぷん まえ');
    t.eq(r.b, { goal:'11:15', way:['11:00'], tail:' の 25ふん あと' }, '10:50 の 25ふん あと（時をまたぐ）');
    t.eq(r.d, { goal:'0:20', way:['0:00'], tail:' の 50ぷん あと' }, '23:30 の 50ぷん あと（日をまたぐ）');
    t.eq(r.e, { goal:'14:32', way:['14:45','14:35'], tail:' の 1じかん13ぷん まえ' }, '15:45 の 1じかん13ぷん まえ');
    t.eq(r.g, { goal:'7:05', way:['6:50','7:00'], tail:' の 2じかん15ふん あと' }, '4:50 の 2じかん15ふん あと');
    t.eq(r.h, { goal:'3:47', way:['3:00','3:45'], tail:' に あわせよう！' }, '3:47 に あわせる');
    t.eq(r.i, { goal:'4:03', way:['4:00'], tail:' に あわせよう！' }, '4:03 に あわせる');
    t.eq(r.words, ['3ぷん','5ふん','10ぷん','12ふん','13ぷん','17ふん','25ふん','38ぷん','44ぷん','59ふん'],
         '「ふん／ぷん」の よみが ちがう');
    t.eq(r.hint, 'みじかいはりを 3つ もどす', 'ちょうど なんじかん の ヒント');
  },

  'どの とけいの おだいも、みちしるべは こたえに向かって 1方向に進む': async t => {
    const p = await t.open();
    const bad = await p.evaluate(() => TASKS.filter(x => x.k === 'clock').filter(x => {
      const c = x.c, pts = [c.start, ...c.way, c.goal];
      if(x.from){
        if(c.goal !== tmin(x.from) + x.d) return true;
        const dir = Math.sign(x.d);
        for(let i=1;i<pts.length;i++) if(Math.sign(pts[i]-pts[i-1]) !== dir) return true;
      } else {
        if(fmtT(c.goal) !== x.to) return true;
        if(c.way.some(v => v === c.goal)) return true;
      }
      return false;
    }).map(x => x.to || (x.from + ' ' + x.d)));
    t.eq(bad, [], 'みちしるべ か こたえが おかしい おだいがある');
  },

  'とけいの おだいを はじめると とけいの画面になり、はりは はじめの時こく、文字盤は カードの下': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.from==='15:45' && x.d===-13");
    const r = await p.evaluate(i => {
      setMode('+'); taskOn = true; startTask(i);
      const card = getTaskCardRect(), g = getClockGeom();
      return { mode, clockT, active: taskActive(), below: g.cy - g.R > card.y + card.h };
    }, i);
    t.eq(r, { mode:'clock', clockT:225, active:true, below:true }, 'とけいの おだいの はじまりが おかしい');
  },

  'ながいはりを まわして はなしたら できた。1かいで あわせたら レインボー': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.from==='3:20' && x.d===10");
    await p.evaluate(i => { taskOn = true; startTask(i); }, i);
    await dragMinute(p, 30);
    const r = await p.evaluate(i => ({ clockT, done: taskDone, cleared: !!taskCleared[i], moves: (taskLogs[i]||[]).length,
                                       rainbow: !!(winFx && winFx.praise && winFx.praise.rainbow),
                                       mark: !!(curRec().rainbow||{})[i] }), i);
    t.eq(r, { clockT:210, done:true, cleared:true, moves:1, rainbow:true, mark:true }, '3:30 に あわせても できたにならない');
  },

  'とちゅうで こたえを 通りすぎても できたにしない。ちがう時こくで はなしても できない': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.from==='3:20' && x.d===10");
    await p.evaluate(i => { taskOn = true; startTask(i); }, i);
    await dragMinute(p, 40, 20);                           // 3:30 を 通りすぎて 3:40 で はなす
    t.eq(await p.evaluate(() => [clockT, taskDone, taskLog.length]), [220, false, 1], '通りすぎただけで できたになった');
    await p.evaluate(() => { const g = getClockGeom(); const s = handPos(g, clockMin()/60, g.R*0.78);
                             handleStart(s.x, s.y, 'm'); handleEnd(s.x, s.y, 'm'); });
    t.eq(await p.evaluate(() => taskLog.length), 1, 'さわっただけ（はりが動かない）なのに 1かい と数えた');
    await dragMinute(p, 30);
    const r = await p.evaluate(() => ({ done: taskDone, moves: taskLog.length,
                                        rainbow: !!(winFx && winFx.praise && winFx.praise.rainbow) }));
    t.eq(r, { done:true, moves:2, rainbow:false }, '2かいめで できた／虹は出ない のはず');
  },

  '24じかんの おだいは、12じかんの とけいで あっていれば できた': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.to==='15:45'");
    await p.evaluate(i => { taskOn = true; startTask(i); }, i);
    await setHands(p, 3*60);
    t.eq(await p.evaluate(() => taskDone), false, '3:00 で できたになった');
    await setHands(p, 3*60 + 45);
    t.eq(await p.evaluate(() => [taskDone, winFx.praise && winFx.praise.rainbow]), [true, true],
         '3:45（＝15:45）で できたにならない');
  },

  'ふつうでは ヒントを開いたら 虹は出ない': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.from==='3:20' && x.d===10");
    await p.evaluate(i => {
      taskOn = true; startTask(i);
      taskStartT = Date.now() - HINT_AFTER_MS - 1000;     // 苦戦したことにする
      drawTaskCard(ctx, 0);
      const b = taskBtns.find(x => x.val === 'hint');
      handleStart(b.x + b.w/2, b.y + b.h/2, 'm');
    }, i);
    t.eq(await p.evaluate(() => [hintOn, clockHintUsed]), [true, true], 'ヒントが開かない');
    await setHands(p, 3*60 + 30);
    t.eq(await p.evaluate(() => [taskDone, !!(winFx.praise && winFx.praise.rainbow)]), [true, false],
         'ヒントを見たのに 虹が出た');
  },

  'ふつうで といている最中は、デジタル表示と 5のなかまの答えを かくす。できたら出す': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.from==='15:45' && x.d===-13");
    const texts = () => p.evaluate(() => {
      const got = [], ft = ctx.fillText;
      ctx.fillText = function(s){ got.push(String(s)); return ft.apply(this, arguments); };
      try{ drawClockMode(ctx, 0); } finally { ctx.fillText = ft; }
      return got;
    });
    await p.evaluate(i => { taskOn = true; startTask(i); }, i);
    const live = await texts();
    t.ok(!live.some(s => /^\d+:\d\d$/.test(s)), 'といている最中に デジタル表示が出ている: ' + live.join(' | '));
    t.ok(live.some(s => /= ？$/.test(s)), '5のなかまの式の こたえが かくれていない');
    await setHands(p, 3*60 + 32);
    const done = await texts();
    t.ok(done.includes('15:32'), 'できたのに 15:32 と出ない: ' + done.join(' | '));
  },

  'ビギナーでは みちしるべの時こくに はなすと つぎへ進み、式の こたえも出る': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='clock' && x.from==='15:45' && x.d===-73");
    await p.evaluate(i => { setBegMode(true); taskOn = true; startTask(i); }, i);
    t.eq(await p.evaluate(() => currentWay().map(fmtT)), ['14:45','14:35'], 'みちしるべが出ない');
    await setHands(p, 2*60 + 45);
    t.eq(await p.evaluate(() => [wayIdx, taskDone]), [1, false], '14:45 で つぎへ進まない');
    await setHands(p, 2*60 + 32);                           // 14:35 を とばして こたえへ
    t.eq(await p.evaluate(() => [taskDone, !!winFx.praise.rainbow]), [true, true],
         'ビギナーで 2かいで できたのに 虹が出ない（best 2）');
    const t2 = await p.evaluate(() => { startTask(taskIdx); const got = [], ft = ctx.fillText;
      ctx.fillText = function(s){ got.push(String(s)); return ft.apply(this, arguments); };
      try{ drawClockMode(ctx, 0); } finally { ctx.fillText = ft; } return got; });
    t.ok(t2.some(s => /= 45$/.test(s)), 'ビギナーなのに 式の こたえが かくれている');
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

  'まぜまぜ：けいさん と とけい が まざって出て、画面が 自動で かわる': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      const list = catTasks('mix');
      taskOn = true; startTask(list[0]);
      const m0 = mode; nextTask();                        // けいさん → とけい
      const m1 = mode, a1 = taskActive(); nextTask();     // とけい → よんでつくる（けいさん）
      const m2 = mode, a2 = taskActive();
      return { m0, m1, a1, m2, a2, kinds: list.map(i => TASKS[i].k || 'calc').slice(0, 3) };
    });
    t.eq(r, { m0:'+', m1:'clock', a1:true, m2:'+', a2:true, kinds:['calc','clock','read'] },
         'まぜまぜで 画面が きりかわらない');
  },

  'よんでつくる：とけいの こたえの数を つくれば できた': async t => {
    const p = await t.open();
    const i = await find(p, "x.k==='read' && x.from==='3:20'");
    const r = await p.evaluate(i => {
      taskOn = true; startTask(i);
      const got = [], ft = ctx.fillText;
      ctx.fillText = function(s){ got.push(String(s)); return ft.apply(this, arguments); };
      try{ drawTaskCard(ctx, 0); } finally { ctx.fillText = ft; }
      spawnBlock(20); checkTask();
      const before = taskDone;
      spawnBlock(25); checkTask();
      return { title: got.join('|'), before, done: taskDone };
    }, i);
    t.ok(r.title.includes('3:20→3:45') && r.title.includes('なんぷん'), 'カードに 問題が出ない: ' + r.title);
    t.eq([r.before, r.done], [false, true], '25 を つくっても できたにならない');
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
    t.eq(r, { cats:['calc','clock','mix'], n:80, allClock:true, open:false, mode:'clock', idx:true },
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
    const i = await find(p, "x.k==='clock' && x.from==='3:20' && x.d===10");
    await p.evaluate(i => { taskOn = true; startTask(i); }, i);
    await setHands(p, 3*60 + 30);
    await t.sleep(400);
    t.ok(await p.evaluate(() => winFx && winFx.center && rainbowTime() >= 0), 'とけいの演出が出ていない');
    await t.sleep(3000);
    t.eq(await p.evaluate(i => [taskIdx === i + 1, mode, taskDone], i), [true, 'clock', false], 'つぎへ進まない');
  },

  // ── よんで えらぶ（ドラムロール）──
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
        taskOn = true; setBegMode(true); startTask(TASKS.findIndex(x => x.k==='pick'));
        const g = getClockGeom(), dg = drumGeom();
        const all = dg.wheels.concat([dg.btn]);
        return { belowDial: dg.top >= g.cy + g.R, fits: dg.top + dg.H + 50 <= sh - bottomPanelH() + 4,
                 inside: all.every(b => b.x >= 0 && b.x + b.w <= sw) };
      });
      t.eq(r, { belowDial:true, fits:true, inside:true }, `${w}x${h} で ドラムが はみ出す／重なる`);
    }
  },
};
