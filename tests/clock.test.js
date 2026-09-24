// まぜまぜ と とけいの おだい。とけいは その場で作る（6レベル）。
// 時こくの作りかた・レベルの上がりかた・けいさん2問に とけい1問・はりを あわせる判定・
// ドラムロールで よむ・ヒントを出さないこと・記録の引っこし。

// とけいの おだいを はじめる（spec を わたすと その おだい）
const start = (p, spec) => p.evaluate(sp => { taskOn = true; startClockTask(sp); }, spec);

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
// はりを v（0時からの ふん）に じかに置いて「これ！」を押す
const setHands = (p, v) => p.evaluate(v => {
  clockT = ((v % 720) + 720) % 720;
  const b = setBtnRect(getClockGeom()); handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm');
}, v);
// はりを あわせる おだいの「これ！」を押す
const pressSet = p => p.evaluate(() => { const b = setBtnRect(getClockGeom()); handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm'); });
// 「これ！」を押す
const press = p => p.evaluate(() => { const b = drumGeom().btn; handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm'); });

module.exports = {

  // ── 時こくの作りかた ──
  'レベルごとの 時こく：ちょうど／はん／5ふん／1ぷん（さかいめ多め）／ごご／ごごの1ぷん': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      const N = 1500, out = {};
      for(let lv=1; lv<=6; lv++){
        const vs = []; for(let i=0;i<N;i++) vs.push(clockGenTime(lv, Math.random));
        const h = vs.map(v => Math.floor(v/60)), m = vs.map(v => v % 60);
        out[lv] = { hMin: Math.min(...h), hMax: Math.max(...h),
                    m0: m.filter(x => x === 0).length / N, m30: m.filter(x => x === 30).length / N,
                    five: m.filter(x => x % 5 === 0).length / N,
                    edge: m.filter(x => x % 5 && (x <= 4 || x >= 56)).length / N,
                    fiveOnly: m.every(x => x % 5 === 0 && x !== 0 && x !== 30) };
      }
      return out;
    });
    t.eq([r[1].hMin, r[1].hMax, r[1].m0], [1, 12, 1], 'レベル1 は 1〜12時の ちょうど');
    t.ok(r[2].m30 > 0.7 && r[2].m30 + r[2].m0 === 1, 'レベル2 は はんが おおく、のこりは ちょうど');
    t.ok(r[3].fiveOnly, 'レベル3 は ちょうど・はん いがいの 5ふん');
    t.ok(r[4].five === 0 && r[4].edge > 0.2 && r[4].edge < 0.45, 'レベル4 は 1ぷん、さかいめ（:56〜:04）が 3わりくらい: ' + r[4].edge);
    t.eq([r[5].hMin, r[5].hMax, r[5].five], [13, 23, 1], 'レベル5 は 13〜23時の ちょうど・はん・5ふん');
    t.eq([r[6].hMin, r[6].hMax, r[6].five], [13, 23, 0], 'レベル6 は 13〜23時の 1ぷん');
  },

  'つぎの レベル：ふだんは いまの レベルと おさらい。正解が ふえたら つぎの レベルを おためし': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      const count = st => { const c = {}; for(let i=0;i<3000;i++){ const lv = clockNextLevel(st, Math.random); c[lv] = (c[lv]||0) + 1; } return c; };
      return {
        low:  count({ lv:3, hist:[true,false,false,true,false,false,false,false,false,true] }),   // 3/10
        high: count({ lv:3, hist:[true,true,true,true,true,true,false,false,false,false] }),     // 6/10
        one:  count({ lv:1, hist:[] }), top: count({ lv:6, hist:new Array(10).fill(true) })
      };
    });
    const f = (c, k) => (c[k] || 0) / 3000;
    t.ok(!r.low[4] && f(r.low, 3) > 0.62 && f(r.low, 3) < 0.78, 'ふだんは いまのレベル7わり: ' + JSON.stringify(r.low));
    t.ok(f(r.low, 1) + f(r.low, 2) > 0.22, 'おさらい（下の レベル）が まざらない');
    t.ok(f(r.high, 4) > 0.14 && f(r.high, 4) < 0.26, '6/10 で つぎの レベルが 2わり まざらない: ' + JSON.stringify(r.high));
    t.eq(Object.keys(r.one), ['1'], 'レベル1 は レベル1 だけ');
    t.ok(!r.top[7], 'レベル6 より 上は ない');
  },

  'とけいの おだいは「よむ」と「あわせる」が はんぶんずつ。つづけて同じ時こくに ならない': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      let pick = 0, same = 0, prev = -1;
      const st = { lv:1, hist:[] };
      for(let i=0;i<600;i++){
        const q = makeClockTask(st, Math.random, prev);
        if(q.k === 'pick') pick++;
        if(q.c.goal === prev) same++;
        prev = q.c.goal;
        if(q.best !== 1) return 'best';
      }
      return { pick: pick/600, same };
    });
    t.ok(r.pick > 0.4 && r.pick < 0.6 && r.same === 0, 'よむ／あわせる の わりあい か つづけて同じ: ' + JSON.stringify(r));
  },

  // ── レベルの上がりかた ──
  'いまの レベルで 直近10問中 8問 1かいめで あたれば レベルアップ。おさらいは 数えない。下がりは しない': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true;
      const st = clockStats(); st.lv = 2; st.hist = [];
      const ans = (lv, ok) => { startClockTask({ k:'pick', to:'3:30', clv:lv }); noteClockAnswer(ok); };
      for(let i=0;i<7;i++) ans(2, true);
      ans(1, true); ans(1, true);                         // おさらいは 数えない
      const before = st.lv;
      ans(2, false); ans(2, false);                       // 7/9 → 7/10
      const mid = st.lv;
      ans(2, true);                                       // 直近10問: 8問
      const after = st.lv, up = lastLevelUp, hist = st.hist.length;
      for(let i=0;i<10;i++) ans(3, false);                // まちがえつづけても 下がらない
      return { before, mid, after, up, hist, still: st.lv };
    });
    t.eq(r, { before:2, mid:2, after:3, up:3, hist:0, still:3 }, 'レベルの 上がりかたが ちがう');
  },

  'レベルアップしたら カードに「とけい レベル3「5ふんきざみ」に アップ！」': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true;
      const st = clockStats(); st.lv = 2; st.hist = new Array(7).fill(true).concat([false, false]);
      startClockTask({ k:'pick', to:'7:30', clv:2 }); drumSet(7, 30); drumAnswer();
      const got = [], ft = ctx.fillText;
      ctx.fillText = function(s){ got.push(String(s)); return ft.apply(this, arguments); };
      try{ drawTaskCard(ctx, 0); } finally { ctx.fillText = ft; }
      return { lv: st.lv, text: got.find(s => /アップ/.test(s)) || '' };
    });
    t.eq(r, { lv:3, text:'とけい レベル3「5ふんきざみ」に アップ！' }, 'レベルアップが カードに出ない');
  },

  '1かいめの こたえだけを 数える（よむ も あわせる も 最初の「これ！」）': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true;
      const st = clockStats(); st.lv = 4; st.hist = [];
      startClockTask({ k:'pick', to:'2:48', clv:4 }); drumSet(8, 12); drumAnswer(); drumSet(2, 48); drumAnswer();
      startClockTask({ k:'pick', to:'9:03', clv:4 }); drumSet(9, 3); drumAnswer();
      startClockTask({ k:'clock', to:'4:17', clv:4 });
      clockT = 4*60 + 10; clockT = 4*60 + 17; clockAnswer();       // はりは なんかい うごかしても よい
      startClockTask({ k:'clock', to:'5:41', clv:4 });
      clockT = 5*60 + 40; clockAnswer(); clockT = 5*60 + 41; clockAnswer();
      return st.hist;
    });
    t.eq(r, [false, true, true, false], '1かいめの 正解の 数えかたが ちがう');
  },

  // ── まぜまぜ ──
  'まぜまぜ：けいさん2問 → とけい1問 → けいさん の じゅん。とけいの あとは つぎの けいさんから': async t => {
    const p = await t.open();
    const seq = await p.evaluate(() => {
      taskOn = true; setMix(true); startTask(0);
      const out = [];
      for(let k=0;k<7;k++){
        const c = currentTask();
        out.push(isClockTask(c) ? 'と' : 'け' + taskIdx);
        if(isPickTask(c)){
          const h = Math.floor(c.c.goal/60);
          drumSet(c.c.h24 ? h : (h % 12) || 12, c.c.goal % 60); drumAnswer();
        } else if(isClockTask(c)){
          clockT = c.c.goal % 720; clockAnswer();
        } else { spawnBlock(c.n); checkTask(); }
        if(!taskDone) return 'できない ' + out.join(',');
        nextTask(); if(paradeBreak) endParadeBreak();      // ごほうびの パレードは とばす
      }
      return out.join(',');
    });
    t.eq(seq, 'け0,け1,と,け2,け3,と,け4', 'まぜまぜの じゅんばんが ちがう');
  },

  'まぜまぜで ないときは、とけいは 出ない': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true; setMix(false); startTask(0);
      for(let k=0;k<6;k++){ spawnBlock(currentTask().n); checkTask(); nextTask(); if(paradeBreak) endParadeBreak(); if(genTask) return 'とけいが出た'; }
      return taskIdx;
    });
    t.eq(r, 6, 'けいさんだけで 進まない');
  },

  'とけいが できても、けいさんの ステージの 記録には つけない。「てじゅん」も 出さない': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true; startTask(4);
      const before = JSON.stringify(taskCleared);
      startClockTask({ k:'pick', to:'4:37' }); drumSet(4, 37); drumAnswer();
      drawTaskCard(ctx, 0);
      return { done: taskDone, same: JSON.stringify(taskCleared) === before, steps: taskBtns.some(b => b.val === 'steps'),
               next: taskBtns.some(b => b.val === 'next') };
    });
    t.eq(r, { done:true, same:true, steps:false, next:true }, 'とけいの クリアが けいさんの 記録に まざる');
  },

  'いちらん：けいさん／まぜまぜ を えらべて、まぜまぜ には とけいの レベルが出る。とけいの とちゅうで やめたら けいさんへ': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true; startTask(3); clockStats().lv = 4;
      openStages(); drawStageSelect(ctx, 0);
      const btns = stageBtns.filter(b => b.val === 'mix');
      const got = [], ft = ctx.fillText;
      ctx.fillText = function(s){ got.push(String(s)); return ft.apply(this, arguments); };
      try{ drawStageSelect(ctx, 0); } finally { ctx.fillText = ft; }
      const tap = b => handleStageTap(b.x + b.w/2, b.y + b.h/2, 'm');
      tap(btns.find(b => b.v === true));
      const on = mixMode();
      startClockTask();
      openStages(); drawStageSelect(ctx, 0);
      tap(stageBtns.find(b => b.val === 'mix' && b.v === false));
      return { n: btns.length, label: got.includes('まぜまぜ（とけい4）'), on, off: mixMode(),
               back: !genTask && taskIdx === 3 && isCalcMode(), cells: stageBtns.filter(b => b.val === 'go').length };
    });
    t.eq(r, { n:2, label:true, on:true, off:false, back:true, cells:60 }, 'けいさん／まぜまぜ の切りかえが おかしい');
  },

  'まぜまぜ と とけいの レベルは 人ごとに のこり、開きなおしても きえない。きろくで 1に もどせる': async t => {
    const p = await t.open({ who:'hinata' });
    await p.evaluate(() => { taskOn = true; setMix(true); clockStats().lv = 5; clockStats().hist = [true]; saveTask(); });
    await p.reload(); await p.waitForFunction(() => typeof drawFrame === 'function');
    const r = await p.evaluate(() => {
      const h = taskStore.hinata;
      const a = { mix: !!h.mix, lv: h.clock.lv, papaLv: taskStore.papa.clock ? taskStore.papa.clock.lv : 1, papaMix: !!taskStore.papa.mix };
      whoOpen = false; setProfile(PROFILES.findIndex(x => x.id === 'hinata'));
      openStages(); recOpen = true; drawStageSelect(ctx, 0);
      const ask = stageBtns.find(b => b.val === 'recAsk' && b.kind === 'clock');
      handleStageTap(ask.x + 2, ask.y + 2, 'm'); drawStageSelect(ctx, 0);
      const yes = stageBtns.find(b => b.val === 'recYes');
      handleStageTap(yes.x + 2, yes.y + 2, 'm');
      return Object.assign(a, { reset: clockStats().lv });
    });
    t.eq(r, { mix:true, lv:5, papaLv:1, papaMix:false, reset:1 }, 'まぜまぜ／とけいの レベルの のこりかたが ちがう');
  },

  'ならびの版が ふるい記録：けいさんの記録は のこし、60番より うしろは けす': async t => {
    const old = { v:2, tv:3, on:false, cur:'hinata', p:{
      hinata:{ idx:75, cleared:{5:true, 75:true}, logs:{5:[{k:'new',a:1}], 75:[{k:'new',a:1}]}, rainbow:{3:true, 75:true},
               beg:{ idx:3, cleared:{2:true, 90:true}, logs:{}, rainbow:{90:true} } } } };
    const p = await t.open({ storage:{ 'nbg.task.v1': JSON.stringify(old) } });
    const r = await p.evaluate(() => {
      const h = taskStore.hinata;
      return { c: Object.keys(h.cleared), l: Object.keys(h.logs), idx: h.idx, rb: Object.keys(h.rainbow),
               bc: Object.keys(h.beg.cleared), br: Object.keys(h.beg.rainbow), clock: h.clock.lv };
    });
    t.eq(r, { c:['5'], l:['5'], idx:0, rb:['3'], bc:['2'], br:[], clock:1 }, '引っこしで 記録の のこりかたが ちがう');
  },

  // ── はりを あわせる ──
  'はりを あわせる：とけいの画面になり、はりは 12:00、文字盤は カードの下': async t => {
    const p = await t.open();
    await p.evaluate(() => setMode('+'));
    await start(p, { k:'clock', to:'3:47' });
    const r = await p.evaluate(() => {
      const card = getTaskCardRect(), g = getClockGeom();
      return { mode, clockT, active: taskActive(), below: g.cy - g.R > card.y + card.h, tab: taskOn };
    });
    t.eq(r, { mode:'clock', clockT:0, active:true, below:true, tab:true }, 'はりを あわせる おだいの はじまりが おかしい');
  },

  'はりを あわせる：はなしただけでは 見ない。「これ！」で こたえ、1かいめで あたれば レインボー': async t => {
    const p = await t.open();
    await start(p, { k:'clock', to:'4:03' });
    await p.evaluate(() => { clockT = 4*60; });
    await dragMinute(p, 3);                                // こたえの 4:03 で はなしても
    t.eq(await p.evaluate(() => [clockT, taskDone, taskLog.length]), [243, false, 0], 'はなしただけで できたになった');
    await dragMinute(p, 10); await dragMinute(p, 3);         // なんかい うごかしても よい
    await pressSet(p);
    const r = await p.evaluate(() => ({ done: taskDone, moves: taskLog.length,
                                        rainbow: !!(winFx && winFx.praise && winFx.praise.rainbow) }));
    t.eq(r, { done:true, moves:1, rainbow:true }, '「これ！」で できたにならない／虹が出ない');
  },

  'はりを あわせる：ちがうと「これ！」が ゆれて「ちがうよ」。あわせなおして あたれば できた（虹なし）': async t => {
    const p = await t.open();
    await start(p, { k:'clock', to:'4:03' });
    await p.evaluate(() => { clockT = 3*60 + 20; });         // みじかいはり と ながいはり を とりちがえた
    await pressSet(p);
    const miss = await p.evaluate(() => {
      const got = [], ft = ctx.fillText;
      ctx.fillText = function(s){ got.push(String(s)); return ft.apply(this, arguments); };
      try{ drawClockMode(ctx, 0); } finally { ctx.fillText = ft; }
      return [taskDone, setMiss, setShake > 0, got.some(s => /ちがうよ/.test(s))];
    });
    t.eq(miss, [false, 1, true, true], 'ちがうのに できたになった／ゆれない');
    await setHands(p, 4*60 + 3);
    t.eq(await p.evaluate(() => [taskDone, taskLog.length, !!(winFx.praise && winFx.praise.rainbow)]), [true, 2, false],
         '2かいめで できた／虹は出ない のはず');
  },

  'はりを あわせる：「これ！」は 文字盤と 5のなかまに 重ならず、画面に収まる': async t => {
    for(const [w, h] of [[393, 780], [375, 667], [430, 932], [780, 393]]){
      const p = await t.open({ width:w, height:h });
      await start(p, { k:'clock', to:'3:47' });
      const r = await p.evaluate(() => {
        clockT = 3*60 + 47;
        const g = getClockGeom(), b = setBtnRect(g), a = clockPartsArea(g);
        return { belowDial: b.y >= g.cy + g.R - 2, fits: b.y + b.h <= sh - bottomPanelH() && b.x + b.w <= sw,
                 parts: a.cx + a.w/2 <= b.x };
      });
      t.eq(r, { belowDial:true, fits:true, parts:true }, `${w}x${h} で「これ！」が 重なる／はみ出す`);
    }
  },

  'ごごに あわせる：12じかんの とけいで あっていれば できた': async t => {
    const p = await t.open();
    await start(p, { k:'clock', to:'15:45' });
    await setHands(p, 3*60);
    t.eq(await p.evaluate(() => taskDone), false, '3:00 で できたになった');
    await setHands(p, 3*60 + 45);
    t.eq(await p.evaluate(() => taskDone), true, '3:45（＝15:45）で できたにならない');
    await start(p, { k:'clock', to:'15:45' });
    await setHands(p, 3*60 + 45);
    t.eq(await p.evaluate(() => [taskDone, !!(winFx.praise && winFx.praise.rainbow)]), [true, true],
         '1かいめの 3:45（＝15:45）で 虹が出ない');
  },

  'とけいの おだいは ふつうでも ビギナーでも ヒント・みちしるべを 出さない': async t => {
    const p = await t.open();
    for(const beg of [false, true]){
      for(const k of ['clock', 'pick']){
        const r = await p.evaluate(([beg, k]) => {
          setBegMode(beg); taskOn = true; startClockTask({ k, to:'3:47' });
          taskStartT = Date.now() - HINT_AFTER_MS - 1000;       // 苦戦したことにする
          for(let i=0;i<8;i++) taskLog.push({k, a:0, r:1});
          drawTaskCard(ctx, 0);
          const got = [], ft = ctx.fillText;
          ctx.fillText = function(s){ got.push(String(s)); return ft.apply(this, arguments); };
          try{ drawClockMode(ctx, 0); } finally { ctx.fillText = ft; }
          return { hint: taskBtns.some(b => b.val === 'hint'), way: currentWay().length, cardH: taskCardH(),
                   texts: got.filter(s => /はり|5が/.test(s)) };
        }, [beg, k]);
        t.eq(r, { hint:false, way:0, cardH:50, texts:[] }, `${beg ? 'ビギナー' : 'ふつう'}の ${k} で ヒントが出ている`);
      }
    }
  },

  'といている最中は、デジタル表示と 5のなかまの答えを かくす（ビギナーでも）。できたら出す': async t => {
    const p = await t.open();
    const texts = () => p.evaluate(() => {
      const got = [], ft = ctx.fillText;
      ctx.fillText = function(s){ got.push(String(s)); return ft.apply(this, arguments); };
      try{ drawClockMode(ctx, 0); } finally { ctx.fillText = ft; }
      return got;
    });
    for(const beg of [false, true]){
      await p.evaluate(beg => { setBegMode(beg); taskOn = true; startClockTask({ k:'clock', to:'15:45' }); clockT = 3*60 + 40; }, beg);
      const live = await texts();
      t.ok(!live.some(s => /^\d+:\d\d$/.test(s)), 'といている最中に デジタル表示が出ている: ' + live.join(' | '));
      t.ok(live.some(s => /= ？$/.test(s)), '5のなかまの式の こたえが かくれていない');
    }
    await setHands(p, 3*60 + 45);
    const done = await texts();
    t.ok(done.includes('15:45'), 'できたのに 15:45 と出ない: ' + done.join(' | '));
  },

  'とけいで クリアしても 止まらず、演出のあと つぎの けいさんへ 進む': async t => {
    const p = await t.open();
    await p.evaluate(() => { taskOn = true; setMix(true); startTask(7); });
    await start(p, { k:'clock', to:'3:47' });
    await setHands(p, 3*60 + 47);
    await t.sleep(400);
    t.ok(await p.evaluate(() => winFx && winFx.center && rainbowTime() >= 0), 'とけいの演出が出ていない');
    await t.sleep(3000);
    t.eq(await p.evaluate(() => [taskIdx, !!genTask, isCalcMode(), taskDone]), [8, false, true, false], 'つぎの けいさんへ 進まない');
  },

  // ── よんで えらぶ（ドラムロール）──
  'よんで えらぶ：はりは こたえの時こくで止まり、さわっても動かない。ドラムは 12:00 から': async t => {
    const p = await t.open();
    await start(p, { k:'pick', to:'4:37' });
    const r = await p.evaluate(() => {
      const before = clockT, g = getClockGeom(), m = handPos(g, clockMin()/60, g.R*0.78);
      handleStart(m.x, m.y, 'm'); handleMove(m.x + 40, m.y + 60, 'm'); handleEnd(m.x + 40, m.y + 60, 'm');
      return { mode, before, after: clockT, drum: drumTime(), lists: drum.lists.map(l => l.length) };
    });
    t.eq(r, { mode:'clock', before:277, after:277, drum:720, lists:[12,6,10] }, 'よんで えらぶ の はじまりが おかしい');
  },

  'ドラム：はじいて まわすと 数がかわり、上下を ちょんと押すと 1つずつ かわる': async t => {
    const p = await t.open();
    await start(p, { k:'pick', to:'4:37' });
    const r = await p.evaluate(() => {
      const dg = drumGeom(), w = dg.wheels[2], cx = w.x + w.w/2, cy = w.y + w.h/2;
      handleStart(cx, cy, 'm');                          // 一のくらいを 3だん 上へ はじく（ゆっくり）
      for(let k=1;k<=10;k++) handleMove(cx, cy - dg.rowH*3*k/10, 'm');
      drum.drag.v = 0;
      handleEnd(cx, cy - dg.rowH*3, 'm');
      const a = drumVal(2);
      const h = dg.wheels[0];                            // じ の ドラムの 下を ちょんと押す → 12 の つぎの 1
      handleStart(h.x + h.w/2, h.y + h.h - 6, 'm'); handleEnd(h.x + h.w/2, h.y + h.h - 6, 'm');
      const b = drumVal(0);
      handleStart(h.x + h.w/2, h.y + 6, 'm'); handleEnd(h.x + h.w/2, h.y + 6, 'm');
      handleStart(h.x + h.w/2, h.y + 6, 'm'); handleEnd(h.x + h.w/2, h.y + 6, 'm');
      return { a, b, c: drumVal(0) };
    });
    t.eq(r, { a:3, b:1, c:11 }, 'ドラムが おもったとおりに まわらない');
  },

  'よんで えらぶ：ちがうと ゆれて できない。あっていれば できた。1かいめなら 虹': async t => {
    const p = await t.open();
    await start(p, { k:'pick', to:'4:37' });
    await p.evaluate(() => drumSet(4, 37));
    await press(p);
    t.eq(await p.evaluate(() => [taskDone, !!winFx.praise.rainbow, taskLog.length]), [true, true, 1], '4:37 で できたにならない');
    await start(p, { k:'pick', to:'4:37' });
    await p.evaluate(() => drumSet(7, 22));                 // みじかいはり と ながいはり を とりちがえた
    await press(p);
    t.eq(await p.evaluate(() => [taskDone, drum.miss, drum.shake > 0]), [false, 1, true], 'ちがうのに できたになった');
    await p.evaluate(() => drumSet(4, 37));
    await press(p);
    t.eq(await p.evaluate(() => [taskDone, !!(winFx.praise && winFx.praise.rainbow)]), [true, false],
         '2かいめで できた／虹は出ない のはず');
  },

  'ごごを よむ：じの ドラムは 0〜23。1:18 では だめで 13:18 で できた。12じ台は 12': async t => {
    const p = await t.open();
    await start(p, { k:'pick', to:'13:18' });
    t.eq(await p.evaluate(() => [drum.lists[0].length, clockT, currentTask().c.tail]), [24, 78, 'ごごの とけい。デジタルで なんじ？'],
         'ごごを よむ の はじまりが おかしい');
    await p.evaluate(() => { drumSet(1, 18); drumAnswer(); });
    t.eq(await p.evaluate(() => taskDone), false, '1:18 で できたになった（ごごなので 13:18）');
    await p.evaluate(() => { drumSet(13, 18); drumAnswer(); });
    t.eq(await p.evaluate(() => taskDone), true, '13:18 で できたにならない');
    await start(p, { k:'pick', to:'12:30' });
    await p.evaluate(() => { drumSet(12, 30); drumAnswer(); });
    t.eq(await p.evaluate(() => [drum.lists[0].length, taskDone]), [12, true], '12:30 が よめない');
  },

  'よんで えらぶ：ドラムが どの画面でも 文字盤と重ならず、下のパネルより上に収まる': async t => {
    for(const [w, h] of [[393, 780], [375, 667], [430, 932], [780, 393]]){
      const p = await t.open({ width:w, height:h });
      await start(p, { k:'pick', to:'4:37' });
      const r = await p.evaluate(() => {
        drum.miss = 1;                                     // 「ちがうよ」も出す
        const g = getClockGeom(), dg = drumGeom();
        const all = dg.wheels.concat([dg.btn]);
        return { belowDial: dg.top >= g.cy + g.R, fits: dg.top + dg.H + 50 <= sh - bottomPanelH() + 4,
                 inside: all.every(b => b.x >= 0 && b.x + b.w <= sw) };
      });
      t.eq(r, { belowDial:true, fits:true, inside:true }, `${w}x${h} で ドラムが はみ出す／重なる`);
    }
  },

  'よんで えらぶ：できたあとも、ドラムの場所に 時こくの文字を 重ねない': async t => {
    const p = await t.open();
    await start(p, { k:'pick', to:'2:48' });
    const r = await p.evaluate(() => {
      drumSet(2, 48); drumAnswer();
      const got = [], ft = ctx.fillText, dg = drumGeom();
      ctx.fillText = function(s, x, y){ got.push({ s:String(s), y }); return ft.apply(this, arguments); };
      try{ drawClockMode(ctx, 0); } finally { ctx.fillText = ft; }
      return { done: taskDone, over: got.filter(g => /\d+:\d\d|時/.test(g.s) && g.y >= dg.top - 20 && g.y <= dg.top + dg.H + 20).map(g => g.s) };
    });
    t.eq(r, { done:true, over:[] }, 'ドラムに 文字が かさなっている');
  },

  'いちらん：どの画面でも けいさん／まぜまぜ の段が 名前の札・マスと重ならず、マスは画面に収まる': async t => {
    for(const [w, h] of [[393, 780], [375, 667], [780, 393], [667, 375]]){
      const p = await t.open({ width:w, height:h });
      const r = await p.evaluate(() => {
        taskOn = true; openStages(); drawStageSelect(ctx, 0);
        const cats = stageBtns.filter(b => b.val === 'mix'), prof = stageBtns.filter(b => b.val === 'prof');
        const gos = stageBtns.filter(b => b.val === 'go'), head = stageBtns.filter(b => b.val === 'mode' || b.val === 'rec' || b.val === 'close');
        const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        const over = cats.some(c => prof.concat(gos, head).some(o => hit(c, o)));
        const bottom = Math.max(...gos.map(b => b.y + b.h));
        return { over, fits: bottom <= sh && Math.max(...cats.map(b => b.x + b.w)) <= sw };
      });
      t.eq(r, { over:false, fits:true }, `${w}x${h} で いちらんが 重なる／はみ出す`);
    }
  },

  // ── おいわいの キャラたち ──
  'かけつけ：とけいが できたら こたえの数が 走ってきて、画面の中で とまる（0ふんは じ だけ）': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true;
      const runs = () => cast.filter(a => a.kind === 'run').map(a => a.n);
      startClockTask({ k:'clock', to:'3:47' }); clockT = 3*60 + 47; clockAnswer();
      const a = runs();
      startClockTask({ k:'pick', to:'15:32' }); drumSet(15, 32); drumAnswer();
      const b = runs();
      startClockTask({ k:'clock', to:'12:00' }); clockT = 0; clockAnswer();
      const c = runs();
      // とまった あとの いち（体の左はし〜右はし）が 画面の中
      const xs = [];
      const orig = drawCastChar;
      drawCastChar = (ctx, n, x, bottom, bs) => { xs.push([x, x + blockSpec(n).cols*bs, bottom]); return 0; };
      try{ for(const a of cast) a.draw(ctx, 2500); } finally { drawCastChar = orig; }
      const inside = xs.length > 0 && xs.every(([l, r, y]) => l >= 0 && r <= sw && Math.abs(y - calcFloor()) < 30);
      startTask(0);                                      // つぎの おだいでは かえる
      return { a, b, c, inside, after: runs() };
    });
    t.eq(r, { a:[3,47], b:[15,32], c:[12], inside:true, after:[] }, 'かけつけの キャラが ちがう');
  },

  'パレード：とけいの レベルが上がったら 1〜10 が 行進する（そのときは かけつけは 出さない）': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true;
      const st = clockStats(); st.lv = 2; st.hist = new Array(7).fill(true).concat([false, false]);
      startClockTask({ k:'pick', to:'7:30', clv:2 }); drumSet(7, 30); drumAnswer();
      const kinds = cast.map(a => a.kind).concat(pendingParade ? ['あとで ' + pendingParade.join(',')] : []);
      nextTask();                                        // できた おだいを かたづけてから パレード
      const seen = [];
      const orig = drawCastChar;
      drawCastChar = (ctx, n) => { seen.push(n); return 0; };
      try{ for(const k of [800, 1600, 2400, 3200, 4000]) cast.find(a => a.kind === 'parade').draw(ctx, k); } finally { drawCastChar = orig; }
      return { kinds, all: [...new Set(seen)].sort((a,b) => a-b), stays: cast.some(a => a.kind === 'parade') };
    });
    t.eq(r, { kinds:['あとで 1,2,3,4,5,6,7,8,9,10'], all:[1,2,3,4,5,6,7,8,9,10], stays:true }, 'パレードが おかしい');
  },

  'パレード：左の おくから 右の てまえへ。すすむほど 右・下・大きく、おくの キャラから 先に描く': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true; castParade();
      const pr = cast.find(a => a.kind === 'parade');
      const frame = age => { const got = []; const orig = drawCastChar;
        drawCastChar = (ctx, n, x, bottom, bs) => { got.push({ n, x, bottom, bs }); return 0; };
        try{ pr.draw(ctx, age); } finally { drawCastChar = orig; } return got; };
      // 1（せんとう）を 追いかける
      const one = [800, 1600, 2400].map(a => frame(a).find(g => g.n === 1));
      const grows = one[0].x < one[1].x && one[1].x < one[2].x && one[0].bottom < one[1].bottom && one[1].bottom < one[2].bottom
                    && one[0].bs < one[1].bs && one[1].bs < one[2].bs;
      const f = frame(3000);
      const backFirst = f.every((g, k) => k === 0 || f[k-1].bs <= g.bs + 1e-9);
      const startLeftFar = paradePath(0).x < sw*0.1 && paradePath(0).y < paradePath(1).y && paradePath(1).x > sw;
      return { grows, backFirst, startLeftFar, many: f.length >= 5 };
    });
    t.eq(r, { grows:true, backFirst:true, startLeftFar:true, many:true }, 'パレードの うごきが ちがう');
  },

  '虹の すべりだい：1〜5 の だれかが 虹の上を 右の足もとまで すべる（画面の外へも そのまま）': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true;
      const ns = new Set();
      let onArc = true, foot = true;
      for(let k=0;k<40;k++){
        startClockTask({ k:'clock', to:'3:47' }); clockT = 3*60 + 47; clockAnswer();
        const a = winFx.arc, R = a.R + (a.band || 9)/2;
        const at = rt => { winFx.landedAt = 0; winFx.t = rt; return sliderPos(); };
        if(at(SLIDE_AT - 50) !== null) return 'はやすぎ';
        for(const f of [0.1, 0.5, 0.9]){
          const q = at(SLIDE_AT + SLIDE_MS*f);
          if(!q || Math.abs(Math.hypot(q.x - a.cx, q.y - a.cy) - R) > 1) onArc = false;
        }
        const end = at(SLIDE_AT + SLIDE_MS - 1);
        if(!(Math.abs(end.y - a.cy) < 3 && end.x > a.cx)) foot = false;   // 右の足もと（外でも よい）
        ns.add(end.n);
        if(at(SLIDE_AT + SLIDE_MS + 50) !== null) return 'おわらない';
      }
      return { onArc, foot, ns: [...ns].sort() };
    });
    t.eq(r, { onArc:true, foot:true, ns:[1,2,3,4,5] }, '虹の すべりだいが おかしい');
  },

  '虹の すべりだい：虹と おなじ かさなりで描く（お山のうしろの虹なら 手前の お山より先に描く）': async t => {
    const p = await t.open();
    const order = await p.evaluate(() => new Promise(done => {
      taskOn = true; startClockTask({ k:'clock', to:'3:47' }); clockT = 3*60 + 47; clockAnswer();
      winFx.landedAt = 0; winFx.t = SLIDE_AT + 300;
      const log = [], sc = sceneryLayers(sh - GH - bottomPanelH());
      const di = ctx.drawImage, dc = drawCastChar;
      ctx.drawImage = function(img){ if(img === sc.far) log.push('far'); else if(img === sc.near) log.push('near'); return di.apply(this, arguments); };
      drawCastChar = function(){ log.push('slider'); return dc.apply(this, arguments); };
      winFx.t = SLIDE_AT + 300; drawBG(ctx);
      ctx.drawImage = di; drawCastChar = dc;
      done(log.filter((v, i, a) => a.indexOf(v) === i));
    }));
    t.eq(order, ['slider', 'far', 'near'], 'すべる キャラが 虹と ちがう かさなりに いる');
  },

  'おいわいの キャラが出ている あいだ 画面を描いても 止まらない': async t => {
    const p = await t.open();
    await p.evaluate(() => {
      taskOn = true; const st = clockStats(); st.lv = 2; st.hist = new Array(7).fill(true).concat([false, false]);
      startClockTask({ k:'clock', to:'7:30', clv:2 }); clockT = 7*60 + 30; clockAnswer();
    });
    await t.sleep(2500);
    await p.evaluate(() => { setBegMode(true); setMode('+'); startTask(20); spawnBlock(10); checkTask(); });
    await t.sleep(2500);
    t.eq(t.errors, [], 'ページで エラー');
  },

  '虹の すべりだい：体は ほぼ まっすぐで、坂が きゅうに なるほど すこし うしろに もたれる（前に たおれない）': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      const top = sliderTilt(-Math.PI/2), mid = sliderTilt(-Math.PI/4), foot = sliderTilt(0);
      return { top: +top.toFixed(3), back: mid < 0 && foot < mid, small: Math.abs(foot) <= 0.4 };
    });
    t.eq(r, { top:0, back:true, small:true }, 'すべる 姿勢が ちがう');
  },

  'おいわいの プレビュー：せっていから すべりだい・パレード・かけつけ を すぐ見られる（どの画面でも）': async t => {
    const p = await t.open();
    const tap = v => p.evaluate(v => {
      setOpen = true; drawSettings(ctx);
      const b = setBtns.find(x => x.val === 'fx' && x.v === v);
      handleSettingsTap(b.x + b.w/2, b.y + b.h/2);
      return { open: setOpen, kinds: cast.map(a => a.kind), slide: !!(winFx && winFx.preview && winFx.praise.rainbow) };
    }, v);
    t.eq(await tap('parade'), { open:false, kinds:['parade'], slide:false }, 'パレードの プレビュー');
    t.eq((await tap('run')).kinds.includes('run'), true, 'かけつけの プレビュー');
    const sl = await tap('slide');
    t.eq(sl.slide, true, 'すべりだいの プレビュー');
    // 「できた！」の文字は 出さない
    const stamp = await p.evaluate(() => { const got = [], ft = ctx.fillText;
      ctx.fillText = function(s){ got.push(String(s)); return ft.apply(this, arguments); };
      try{ drawWinStamp(ctx); } finally { ctx.fillText = ft; } return got; });
    t.eq(stamp, [], 'プレビューで「できた！」が出た');
    // 因数・ドリルの画面でも 動いて、止まらない
    await p.evaluate(() => { setMode('factor'); previewFx('slide'); previewFx('parade'); });
    await t.sleep(1200);
    t.ok(await p.evaluate(() => rainbowTime() > 600 && cast.some(a => a.kind === 'parade')), '因数の画面で プレビューが すすまない');
    await p.evaluate(() => { setMode('quiz'); previewFx('run'); });
    await t.sleep(600);
    t.eq(t.errors, [], 'ページで エラー');
  },

  // ── ごほうびの パレード ──
  'ごほうびの パレード：おだいが 5問 できるごとに、その5問で つくった数が 行進する（とけいも 数える）': async t => {
    const p = await t.open({ who:'hinata' });
    const r = await p.evaluate(() => {
      taskOn = true; setMix(false); prize().n = 0; prize().made = [];
      const calc = i => { startTask(i); spawnBlock(TASKS[i].n); checkTask(); };
      calc(0); calc(1); calc(2);
      startClockTask({ k:'clock', to:'3:47' }); clockT = 3*60 + 47; clockAnswer();
      const before = { n: prize().n, parade: cast.some(a => a.kind === 'parade') };
      startClockTask({ k:'pick', to:'9:00' }); drumSet(9, 0); drumAnswer();
      const now = cast.some(a => a.kind === 'parade');
      nextTask();
      const pr = cast.find(a => a.kind === 'parade');
      const seen = []; const orig = drawCastChar;
      drawCastChar = (ctx, n) => { seen.push(n); return 0; };
      try{ for(let a=0;a<=pr.dur;a+=200) pr.draw(ctx, a); } finally { drawCastChar = orig; }
      return { before, now, after: prize().n, members: [...new Set(seen)] };
    });
    t.eq(r.before, { n:4, parade:false }, '4問めまでに パレードが出た');
    t.eq([r.after, r.now], [0, false], '5問めで かぞえなおしに ならない／できた その場で パレードが出た');
    t.eq(r.members.sort((a,b) => a-b), [5, 6, 8, 9, 47], '5問で つくった数（5,6,8 と 47ふん・9じ）が 行進しない');
  },

  'ごほうびの パレード：もどすで とりけして また できても 2かい 数えない。人ごとに のこる': async t => {
    const p = await t.open({ who:'hinata' });
    await p.evaluate(() => {
      taskOn = true; prize().n = 0; prize().made = [];
      startTask(20); setMode('+'); spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
      doUndo(); fuseBlocks(blocks[0], blocks[1]); checkTask();
      saveTask();
    });
    t.eq(await p.evaluate(() => [taskDone, prize().n]), [true, 1], 'とりけして また できたら 2かい 数えた');
    await p.reload(); await p.waitForFunction(() => typeof drawFrame === 'function');
    t.eq(await p.evaluate(() => [taskStore.hinata.prize.n, (taskStore.papa.prize || { n:0 }).n]), [1, 0], '人ごとに のこらない');
  },

  'ごほうびの パレード：カードに ●○ で あと なんもんか 出る。大きな数も 10 より 大きくは ならない': async t => {
    const p = await t.open({ who:'hinata' });
    const r = await p.evaluate(() => {
      taskOn = true; startTask(0); prize().n = 3;
      let filled = 0, empty = 0;
      const fa = ctx.fill, st = ctx.stroke;
      const arcs = []; const ar = ctx.arc;
      ctx.arc = function(x, y, rr){ arcs.push(rr); return ar.apply(this, arguments); };
      ctx.fill = function(){ if(arcs.length && arcs[arcs.length-1] === 3.6){ filled++; arcs.pop(); } return fa.apply(this, arguments); };
      ctx.stroke = function(){ if(arcs.length && arcs[arcs.length-1] === 3.6){ empty++; arcs.pop(); } return st.apply(this, arguments); };
      try{ drawTaskCard(ctx, 0); } finally { ctx.fill = fa; ctx.stroke = st; ctx.arc = ar; }
      castParade([1000, 144, 10]);
      const pr = cast.find(a => a.kind === 'parade'), sizes = {};
      const orig = drawCastChar;
      drawCastChar = (ctx, n, x, y, bs) => { const sp = blockSpec(n); sizes[n] = Math.max(sizes[n] || 0, Math.max(sp.rows, sp.cols)*bs / bs * bs); return 0; };
      try{ for(let a=0;a<pr.dur;a+=100) pr.draw(ctx, a); } finally { drawCastChar = orig; }
      return { filled, empty, big: sizes[1000] <= sizes[10] * 1.01 && sizes[144] <= sizes[10] * 1.01 };
    });
    t.eq(r, { filled:3, empty:2, big:true }, '●○ か 大きな数の おおきさが ちがう');
  },

  'ごほうびの パレードは、できた おだいを かたづけてから：つぎへ で 草はらを 行進し、おわったら つぎの おだい': async t => {
    const p = await t.open({ who:'hinata' });
    const r = await p.evaluate(() => {
      taskOn = true; setMix(false); prize().n = 4; prize().made = [5, 6, 8, 9];
      startTask(4); spawnBlock(TASKS[4].n); checkTask();
      const full = prizeFull, idx = taskIdx;
      nextTask();                                          // 「つぎ」
      const during = { brk: paradeBreak, blocks: blocks.length, same: taskIdx === idx, winFx: winFx };
      tickAutoNext(); tickAutoNext();                      // あいだに 自動で すすまない
      const still = paradeBreak && taskIdx === idx;
      // パレードが おわったら つぎへ
      cast.find(a => a.kind === 'parade').t0 -= 60000; drawFrame(performance.now());
      const after = { brk: paradeBreak, idx: taskIdx, done: taskDone };
      return { full, during, still, after, idx };
    });
    t.eq(r.full, true, '5こめの おだいで ●●●●● に ならない');
    t.eq(r.during, { brk:true, blocks:0, same:true, winFx:null }, 'パレードの あいだに 問題が のこっている');
    t.eq(r.still, true, 'パレードの あいだに 自動で すすんだ');
    t.eq(r.after, { brk:false, idx: r.idx + 1, done:false }, 'パレードの あとに つぎの おだいへ すすまない');
  },

  'パレードの とちゅうは、ちょんと おしても すすまない。ながおし で つぎの おだいへ（カードは 出さない）': async t => {
    const p = await t.open({ who:'hinata' });
    const r = await p.evaluate(() => {
      taskOn = true; setMix(false); prize().n = 4; prize().made = [1, 2, 3, 4];
      startTask(7); spawnBlock(TASKS[7].n); checkTask(); nextTask();
      taskBtns = []; drawFrame(performance.now());
      const card = taskBtns.length;
      handleStart(sw/2, sh/2, 'm'); handleEnd(sw/2, sh/2, 'm');          // ちょん
      const tap = [paradeBreak, taskIdx];
      handleStart(sw/2, sh/2, 'm'); paradeHold.t0 -= 600; drawFrame(performance.now());
      const half = [paradeBreak, taskIdx];                               // まだ はんぶん
      handleMove(sw/2 + 60, sh/2, 'm'); paradeHold && (paradeHold.t0 -= 5000); drawFrame(performance.now());
      const moved = [paradeBreak, taskIdx];                              // 指が うごいたら やめ
      handleStart(sw/2, sh/2, 'm'); paradeHold.t0 -= PARADE_HOLD_MS + 10; drawFrame(performance.now());
      return { card, tap, half, moved, done: [paradeBreak, taskIdx], parade: cast.some(a => a.kind === 'parade') };
    });
    t.eq(r, { card:0, tap:[true, 7], half:[true, 7], moved:[true, 7], done:[false, 8], parade:false },
         'パレードの とばしかたが ちがう');
  },

};
