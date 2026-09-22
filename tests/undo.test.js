// もどす。画面の「もどす」ボタンを実際に押して確かめる。

const nums = p => p.evaluate(() => blocks.map(b => b.num).sort((a,b) => a-b));
async function pressUndo(p){
  await p.evaluate(() => {
    const b = opBarBtns.find(x => x.op === 'undo');
    handleStart(b.x + b.w/2, b.y + b.h/2, 'u');
    handleEnd(b.x + b.w/2, b.y + b.h/2, 'u');
  });
}

module.exports = {

  'もどすは1手ずつ、3手まで': async t => {
    const p = await t.open();
    await p.evaluate(() => { spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); });
    t.eq(await nums(p), [10], '3と7が10にならない');
    await pressUndo(p); t.eq(await nums(p), [3,7], '1回もどしても 3と7 にならない');
    await pressUndo(p); t.eq(await nums(p), [3],   '2回もどしても 3 にならない');
    await pressUndo(p); t.eq(await nums(p), [],    '3回もどしても からっぽにならない');
    await pressUndo(p); t.eq(await nums(p), [],    'もどす履歴がないのに何か変わった');
  },

  '4手すすめて4回おしても、もどれるのは3手まで': async t => {
    const p = await t.open();
    await p.evaluate(() => { spawnBlock(2); spawnBlock(4); spawnBlock(6); spawnBlock(8); });
    await pressUndo(p); await pressUndo(p); await pressUndo(p);
    t.eq(await nums(p), [2], '3回もどしたのに 1手め だけにならない');
    await pressUndo(p);                                     // 4回め：もう戻れないはず
    t.eq(await nums(p), [2], '4手ぶん もどせてしまう（3手までのはず）');
  },

  '×2・コピー・おうちも もどせる': async t => {
    const p = await t.open();
    await p.evaluate(() => spawnBlock(6));
    await p.evaluate(() => scaleBlock(blocks[0], 'double'));
    t.eq(await nums(p), [12], '×2 にならない');
    await pressUndo(p); t.eq(await nums(p), [6], '×2 をもどせない');
    await p.evaluate(() => duplicateAtMirror(blocks[0]));
    t.eq(await nums(p), [6,6], 'コピーされない');
    await pressUndo(p); t.eq(await nums(p), [6], 'コピーをもどせない');
    await p.evaluate(() => sendHome(blocks[0]));
    t.eq(await nums(p), [], 'おうちに帰らない');
    await pressUndo(p); t.eq(await nums(p), [6], 'おうちをもどせない');
  },

  'おだい中は、てじゅんと「できた」も一緒に巻き戻る': async t => {
    const p = await t.open();
    await p.evaluate(() => {
      taskOn = true; startTask(20);                         // 3と7で10
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
    });
    t.eq(await p.evaluate(() => [taskDone, taskLog.length]), [true, 3], 'クリアにならない');
    await pressUndo(p);
    t.eq(await p.evaluate(() => [taskDone, taskLog.length]), [false, 2],
         'もどしたのに「できた」やてじゅんが残っている');
  },
};
