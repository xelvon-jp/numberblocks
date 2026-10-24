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
      taskOn = true; startTask(0);
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
};
