// ちいさな ゴール（まぜまぜ）と、タブ が おだい だけ に なった こと（2026-10-24）。
// けいさん・はんぶん の じゆうあそびを 1〜2て の ゴール に して おだいの あいだに はさむ。

module.exports = {
  'ちいさな ゴール（けいさん）：いつも の キー ぜんぶ（R なし）・しき も でる。ゴール が できたら できた。けいさん の きろく には つかない': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true; startTask(5);
      const before = JSON.stringify(taskCleared);
      startPlayTask('c', { type:'make', n:777, say:'777 を つくろう', lv:3 });
      const keys = getNumpadLayout().map(b => b.label);
      spawnBlock(700); spawnBlock(77);
      let shown = false; const ft = ctx.fillText; ctx.fillText = function(s){ if(/700 \+ 77/.test(String(s)) || /77 \+ 700/.test(String(s))) shown = true; return ft.apply(this, arguments); };
      try{ drawFormula(ctx); } finally { ctx.fillText = ft; }
      checkTask(); const early = taskDone;
      fuseBlocks(blocks[0], blocks[1]); checkTask();
      return { keys: keys.join(), shown, early, done: taskDone, same: JSON.stringify(taskCleared) === before, hint: hintReady() };
    });
    t.eq(r, { keys:'0.1,0.5,1,2,3,4,5,6,7,8,9,10,CLR', shown:true, early:false, done:true, same:true, hint:false }, 'けいさん の ちいさな ゴール が おかしい');
  },

  'ちいさな ゴール：make・op・count・pair の できた の きまり': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true; startTask(0);
      const chk = (g, f) => { startPlayTask('c', Object.assign({ say:'', lv:1 }, g)); f(); return goalMet(currentTask()); };
      return [
        chk({ type:'op', op:'square', n:144 }, () => spawnBlock(144)),                                 // しかく を つかって いない
        chk({ type:'op', op:'square', n:144 }, () => { spawnBlock(12); scaleBlock(blocks[0], 'square'); }),
        chk({ type:'count', n:250, cnt:2 }, () => { spawnBlock(250); }),
        chk({ type:'count', n:250, cnt:2 }, () => { spawnBlock(250); spawnBlock(250); }),
        chk({ type:'pair', n:1000 }, () => { spawnBlock(400); spawnBlock(600); }),
        chk({ type:'pair', n:1 }, () => { spawnBlock(0.3); spawnBlock(0.7); }),
      ];
    });
    t.eq(r, [false, true, false, true, true, true], 'ゴール の きまり が ちがう');
  },

  'ちいさな ゴール の だん：はじめ は けいさん 2・はんぶん 1。90びょう いない に 2かい で うえ、おそい・とばす と した': async t => {
    const p = await t.open({ who:'hinata' });
    const r = await p.evaluate(() => {
      const g = goalOf('hinata'), a = [g.c, g.h];
      noteGoal('c', true, 30000); const b = g.c; noteGoal('c', true, 30000); const c = g.c;
      noteGoal('c', false); const d = g.c; noteGoal('c', true, 300000); const e = g.c;
      return [a, b, c, d, e];
    });
    t.eq(r, [[2, 1], 2, 3, 2, 1], 'だん の うごき が ちがう');
  },

  'ちいさな ゴール（はんぶん）：はんぶん の がめん を かさねて ゴール。できたら「つぎ」で ゲーム へ もどる': async t => {
    const p = await t.open();
    await p.evaluate(() => { taskOn = true; startTask(0); queue = [{ k:'play', sub:'h' }, { k:'calc', idx:3 }]; startPlayTask('h', { type:'count', v:2.5, cnt:2, say:'2.5 を 2にん つくろう', lv:2 }); });
    await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="hanbun.html"]'); return f && f.contentWindow && f.contentWindow.hanbun; }, null, { timeout: 5000 });
    const f = p.frames().find(x => x.url().includes('hanbun.html'));
    const a = await f.evaluate(() => { const c0 = hanbun.chars().length; hanbun.add(5); const before = hanbun.goalDone(); hanbun.split(0); return [c0, before, hanbun.goalDone()]; });
    t.eq(a, [0, false, true], 'はんぶん の ゴール が おかしい（から から はじまる・2.5 が 2にん で できた）');
    await f.evaluate(() => document.getElementById('gnext').click());
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ frame: !!document.querySelector('iframe[src^="hanbun.html"]'), idx: taskIdx, sh: goalOf(profile().id).sh }));
    t.eq(r, { frame:false, idx:3, sh:1 }, 'はんぶん の ゴール の あと つぎ へ すすまない');
  },

  'タブは おだい だけ。ひらくと おだい（だれが あそぶ？）。ためし から ?mode=calc・?mode=hanbun・?katachi=1 で ひらける': async t => {
    const p = await t.open({ keepPicker:true });
    const r = await p.evaluate(() => ({ tabs: tabBtns.map(b => b.val), taskOn, whoOpen }));
    t.eq(r, { tabs:['task', 'hanbun', 'settings'], taskOn:true, whoOpen:true }, 'ひらいた ときが おだい で ない');
    // うえ の ½ を ながおし すると はんぶん へ（ちょん では いかない）
    const h = await p.evaluate(() => { whoOpen = false; drawTabsAndUI(ctx); const b = tabBtns.find(x => x.val === 'hanbun');
      handleStart(b.x + b.w/2, b.y + b.h/2, 'h'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'h'); const tap = [taskOn, mode];
      handleStart(b.x + b.w/2, b.y + b.h/2, 'h'); hanHold.t0 -= 1000; drawTabsAndUI(ctx); return [tap, [taskOn, mode]]; });
    t.eq(h, [[true, h[0][1]], [false, 'hanbun']], '½ の ながおし で はんぶん に はいらない');
    for(const [q, want] of [['mode=calc', '+'], ['mode=hanbun', 'hanbun'], ['katachi=1', 'katachi']]){
      await p.goto(new URL('index.html?' + q, p.url()).href); await p.waitForFunction(() => typeof drawFrame === 'function');
      const s = await p.evaluate(() => ({ taskOn, mode, katachi: katachiOn }));
      t.ok(!s.taskOn && (want === 'katachi' ? s.katachi : s.mode === want), q + ' で ひらけない ' + JSON.stringify(s));
    }
  },
  '1もんずつ の きろく：出した とき・できた・手数・ヒント を のこす。できずに ほかへ いった ものは ok なし': async t => {
    const p = await t.open({ who:'hinata' });
    await p.evaluate(() => {
      taskOn = true; setMode('+');
      startTask(21);                                            // できずに ほかへ
      startTask(20); hintUsed = true;
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
      saveTask();
    });
    await p.reload(); await p.waitForFunction(() => typeof drawFrame === 'function');
    const r = await p.evaluate(() => {
      const H = taskStore.hinata.hist, a = H[20][0], b = H[21][0];
      return { a: [a.ok, a.mv, a.h, a.t > 0, a.ms >= 0], b: [b.ok, b.t > 0] };
    });
    t.eq(r, { a:[1, 3, 1, true, true], b:[undefined, true] }, '1もんずつ の きろくが ちがう');
  },
  'これから の おだい：5こ ならぶ。とけたら ひだり に ずれて みぎ に 1こ。ながおし で その おだい まで とぶ': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true; startTask(0); ensureQueue();
      const key = q => q.k + (q.k === 'calc' ? q.idx : '');
      const a = queue.map(key);
      spawnBlock(currentTask().n); checkTask(); nextTask(); if(paradeBreak) endParadeBreak();
      const b = queue.map(key);
      drawTabsAndUI(ctx);
      const ic = qBtns[3]; handleStart(ic.x + 2, ic.y + 2, 'q'); qHold.t0 -= QHOLD_MS + 10; drawTabsAndUI(ctx);
      return { n: a.length, shift: b.slice(0, 4).join() === a.slice(1).join(), len: b.length, skip: key(queue[0]) === b[3], icons: qBtns.length };
    });
    t.eq(r, { n:5, shift:true, len:5, skip:true, icons:5 }, 'これから の おだい の ならび が ちがう');
  },

  'まぜまぜ の 図形の面積：lab-zukei.html を かさねて 1もん。せいかい の あと「つぎ」で ゲーム へ もどり、つぎ の おだい': async t => {
    const p = await t.open();
    await p.evaluate(() => { taskOn = true; startTask(0); queue = [{ k:'zukei' }, { k:'calc', idx:2 }]; startZukeiTask(); });
    await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="lab-zukei.html"]'); return f && f.contentWindow && f.contentWindow.zukei; }, null, { timeout: 5000 });
    const f = p.frames().find(x => x.url().includes('lab-zukei.html'));
    t.eq(await f.evaluate(() => [zukei.shape(), document.body.classList.contains('embed')]), ['rect', true], 'さいしょ は 長方形 の 1もん で ない');
    await f.evaluate(() => { const g = zukei.goal(); zukei.set(g); zukei.pressDone(); });
    await f.waitForTimeout(200);
    await f.evaluate(() => zukei.pressDone());                     // つぎ ▶
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ frame: !!document.querySelector('iframe[src^="lab-zukei.html"]'), z: !!(zukeiTask && zukeiTask.frame), idx: taskIdx, calc: !genTask && isCalcMode(), next: zukeiOf(profile().id).i }));
    t.eq(r, { frame:false, z:false, idx:2, calc:true, next:1 }, '図形の面積 の あと つぎ へ すすまない');
  },
};