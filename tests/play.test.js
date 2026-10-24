// ちいさな ゴール（まぜまぜ）と、タブ が おだい だけ に なった こと（2026-10-24）。
// けいさん・はんぶん の じゆうあそびを 1〜2て の ゴール に して おだいの あいだに はさむ。

module.exports = {
  'ちいさな ゴール：キャラが はじめから いて、くっつけると できた。けいさんの きろく には つかない': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true; startTask(5);
      const before = JSON.stringify(taskCleared);
      startPlayTask({ n:7, start:[3, 4], say:'3 と 4 を くっつけよう' });
      const start = blocks.map(b => b.num).sort((a, b) => a - b), keys = getNumpadLayout().map(b => b.label);
      fuseBlocks(blocks[0], blocks[1]); checkTask();
      return { start, keys, done: taskDone, same: JSON.stringify(taskCleared) === before, hint: hintReady(), idx: taskIdx };
    });
    t.eq(r, { start:[3, 4], keys:['3', '4', 'CLR'], done:true, same:true, hint:false, idx:5 }, 'ちいさな ゴールが おかしい');
  },

  'ちいさな ゴール：はんぶんこ（5 → 2.5）で できる。つぎは けいさんの おだい。ゴールは じゅんに まわる': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      taskOn = true; startTask(0); queue = [{ k:'play' }, { k:'calc', idx:1 }];   // あそび の つぎ は けいさん
      startPlayTask({ n:2.5, start:[5], say:'5 を はんぶんこ しよう' });
      scaleBlock(blocks[0], 'half'); checkTask();
      const done = taskDone;
      nextTask(); if(paradeBreak) endParadeBreak();
      const back = !genTask && !hissanTask && isCalcMode();
      const i0 = playOf(profile().id).i; startPlayTask(); const a = currentTask().say; startPlayTask(); const b = currentTask().say;
      return { done, back, a: a === PLAY_GOALS[i0].say, b: b === PLAY_GOALS[i0 + 1].say };
    });
    t.eq(r, { done:true, back:true, a:true, b:true }, 'はんぶんこ の ゴール／つぎへ の すすみかたが ちがう');
  },

  'タブは おだい だけ。ひらくと おだい（だれが あそぶ？）。ためし から ?mode=calc・?mode=hanbun・?katachi=1 で ひらける': async t => {
    const p = await t.open({ keepPicker:true });
    const r = await p.evaluate(() => ({ tabs: tabBtns.map(b => b.val), taskOn, whoOpen }));
    t.eq(r, { tabs:['task', 'settings'], taskOn:true, whoOpen:true }, 'ひらいた ときが おだい で ない');
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