// おだい。手数の計算・クリア判定・ほめことば・ヒント。

const fs = require('fs'), path = require('path');
const { checkHtml } = require('../tools/solver.js');

// 3 と 7 で 10 をつくる（ステージ 3-1 ＝ 21問め）
const TEN = 20;
async function solveTen(p, detour){
  await p.evaluate(d => {
    setMode('+'); spawnBlock(3);
    for(let i = 0; i < d; i++){ scaleBlock(blocks[0], 'double'); scaleBlock(blocks[0], 'half'); }
    spawnBlock(7);
    fuseBlocks(blocks[0], blocks[1]);
    checkTask();
  }, detour || 0);
}

module.exports = {

  '60問すべての best/ref が、ソルバーの計算と一致する': async t => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const bad = checkHtml(html);
    t.eq(bad.map(b => `${b.n}(${b.use})`), [],
         'index.html の best/ref が計算と食いちがう（node tools/solver.js --write で直せる）');
  },

  'おだいは6レベルに10問ずつあり、おてほんは最短以上': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => ({
      perLv: TASK_LEVELS.map((_, lv) => TASKS.filter(x => x.lv === lv).length),
      badRef: TASKS.filter(x => !(x.ref >= x.best)).map(x => x.n)
    }));
    t.eq(r.perLv, [10,10,10,10,10,10], 'レベルごとの問題数がずれている');
    t.eq(r.badRef, [], 'おてほん手数が最短より少ないおだいがある');
  },

  'クリアすると、クリア印とてじゅんが残る': async t => {
    const p = await t.open();
    await p.evaluate(i => { taskOn = true; startTask(i); }, TEN);
    await solveTen(p);
    const r = await p.evaluate(i => ({
      done: taskDone, cleared: !!taskCleared[i], steps: (taskLogs[i] || []).length
    }), TEN);
    t.eq(r, { done:true, cleared:true, steps:3 }, '3+7=10 でクリアにならない、または記録が残らない');
  },

  'てじゅんは、いちばん短かったときのものを残す': async t => {
    const p = await t.open();
    await p.evaluate(i => { taskOn = true; startTask(i); }, TEN);
    await solveTen(p);
    await p.evaluate(i => startTask(i), TEN);
    await solveTen(p, 1);                                   // 2手 よけいにかける
    t.eq(await p.evaluate(i => taskLogs[i].length, TEN), 3, '遠回りした記録で上書きされている');
  },

  'ほめことばは1つだけ、決めた順番どおりに出る': async t => {
    const p = await t.open();
    const got = await p.evaluate(() => {
      const idx = TASKS.findIndex(x => x.n === 777);      // さいたん7 / おてほん9 → じょうずは11手まで
      const j = (moves, prev, papa) => {
        taskStore.papa.logs = {};
        if(papa !== null) taskStore.papa.logs[idx] = new Array(papa);
        const r = judgeClear(idx, moves, prev);
        return r ? r.text : null;
      };
      return [ j(9,null,null), j(11,null,null), j(12,null,null), j(12,13,null),
               j(13,13,null), j(12,13,12), j(14,13,15) ];
    });
    t.eq(got, ['じょうず！','じょうず！',null,'ちぢんだ！',null,'とってもじょうず！','とってもじょうず！'],
         'ほめことばの出かたが決めた順番とちがう');
  },

  'ヒントは苦戦したときだけ出て、いちど出たら引っこまない': async t => {
    const p = await t.open();
    // 1だけで5をつくる（さいたん5手）→ 9手めでヒント
    await p.evaluate(() => { taskOn = true; startTask(0); });
    const at = n => p.evaluate(k => {
      while(taskLog.length < k) spawnBlock(1);
      return hintReady();
    }, n);
    t.eq(await at(0), false, 'はじめからヒントが出ている');
    t.eq(await at(8), false, '8手でヒントが出ている（9手めからのはず）');
    t.eq(await at(9), true,  '9手でもヒントが出ない');
    await p.evaluate(() => { drawTaskCard(ctx, 0); doUndo(); doUndo(); doUndo(); });
    t.eq(await p.evaluate(() => hintReady()), true, 'もどすで手数が減ったらヒントが引っこんだ');

    // 時間でも出る
    await p.evaluate(() => startTask(1));
    t.eq(await p.evaluate(() => hintReady()), false, 'おだいを変えたのにヒントが残っている');
    await p.evaluate(() => { taskStartT = Date.now() - 61000; });
    t.eq(await p.evaluate(() => hintReady()), true, '60秒たってもヒントが出ない');
  },

  'クリアすると、3秒ほどで 自動で つぎのおだいへ進む': async t => {
    const p = await t.open();
    await p.evaluate(i => { taskOn = true; startTask(i); }, TEN);
    await solveTen(p);
    await t.sleep(1500);
    t.eq(await p.evaluate(() => [taskIdx, taskDone]), [TEN, true], '演出の途中で進んでしまった');
    await t.sleep(2000);
    t.eq(await p.evaluate(() => [taskIdx, taskDone]), [TEN + 1, false], '3秒すぎても つぎへ進まない');
    t.eq(await p.evaluate(i => !!taskCleared[i], TEN), true, '進んだら まえのクリア印が消えた');
  },

  '「てじゅん」を押したら、自動では進まない': async t => {
    const p = await t.open();
    await p.evaluate(i => { taskOn = true; startTask(i); }, TEN);
    await solveTen(p);
    await p.evaluate(() => {
      drawTaskCard(ctx, 0);
      const b = taskBtns.find(x => x.val === 'steps');
      handleStart(b.x + b.w/2, b.y + b.h/2, 'n');
      stageOpen = false; stageDetail = -1;           // てじゅんを見て、とじた
      clearedAt = Date.now() - 5000; tickAutoNext();
    });
    t.eq(await p.evaluate(() => taskIdx), TEN, 'てじゅんを見たのに 勝手に進んだ');
  },

  'もどすで クリアを取り消したら、進まない': async t => {
    const p = await t.open();
    await p.evaluate(i => { taskOn = true; startTask(i); }, TEN);
    await solveTen(p);
    await p.evaluate(() => { doUndo(); tickAutoNext(); });
    await t.sleep(3300);
    t.eq(await p.evaluate(() => [taskIdx, taskDone]), [TEN, false], 'もどしたのに つぎへ進んだ');
  },

  '「つぎ」を押せば、待たずに すぐ進む': async t => {
    const p = await t.open();
    await p.evaluate(i => { taskOn = true; startTask(i); }, TEN);
    await solveTen(p);
    await p.evaluate(() => {
      drawTaskCard(ctx, 0);
      const b = taskBtns.find(x => x.val === 'next');
      handleStart(b.x + b.w/2, b.y + b.h/2, 'n');
    });
    t.eq(await p.evaluate(() => [taskIdx, taskDone]), [TEN + 1, false], 'つぎを押しても進まない');
  },
};
