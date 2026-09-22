// ひなた と パパ。「パパが ひなたの記録で遊んでしまう」を確実に防げているか。

const OLD = JSON.stringify({ v:2, on:true, cur:'hinata', p:{
  hinata:{ idx:20, cleared:{0:true}, logs:{} },
  papa:  { idx:5,  cleared:{},        logs:{} } } });

// きろく や 切り替え のボタンを、ms ミリ秒おしつづけて離す
async function hold(p, pred, ms){
  await p.evaluate(src => {
    const f = new Function('b', 'return ' + src);
    const b = [...stageBtns].reverse().find(f);
    if(!b) throw new Error('ボタンがない: ' + src);
    window.__h = b;
    handleStart(b.x + b.w/2, b.y + b.h/2, 'h');
  }, pred);
  const t0 = Date.now();
  while(Date.now() - t0 < ms){
    await p.evaluate(() => drawStageSelect(ctx, 0));      // ゲージを進める
    await new Promise(r => setTimeout(r, 50));
  }
  await p.evaluate(() => { const b = window.__h; handleEnd(b.x + b.w/2, b.y + b.h/2, 'h'); });
}

module.exports = {

  '開き直すと、前がひなたでも必ずパパから始まり、だれか聞かれる': async t => {
    const p = await t.open({ storage:{ 'nbg.task.v1': OLD }, keepPicker:true });
    t.eq(await p.evaluate(() => [profile().id, whoOpen]), ['papa', true],
         '開き直したのにパパから始まらない／だれか聞かれない');
  },

  '聞いているあいだは、うしろのゲームに触れない': async t => {
    const p = await t.open({ storage:{ 'nbg.task.v1': OLD }, keepPicker:true });
    await p.evaluate(() => {
      for(const b of getNumpadLayout()) handleStart(b.x + b.w/2, b.y + b.h/2, 'z');
    });
    t.eq(await p.evaluate(() => blocks.length), 0, '聞いているあいだに数字キーが効いた');
    await p.evaluate(() => { const w = whoBtns[0]; handleStart(w.x + w.w/2, w.y + w.h/2, 'z'); });
    t.eq(await p.evaluate(() => [profile().id, whoOpen]), ['hinata', false], 'ひなたを押しても決まらない');
  },

  'ひなたのまま5分ほうっておくとパパに戻る（1分では戻らない）': async t => {
    const p = await t.open({ who:'hinata' });
    await p.evaluate(() => { taskOn = true; lastTouchAt = Date.now() - 60*1000; guardKidProfile(); });
    t.eq(await p.evaluate(() => profile().id), 'hinata', '1分で パパに戻ってしまった');
    await p.evaluate(() => { lastTouchAt = Date.now() - 6*60*1000; guardKidProfile(); });
    t.eq(await p.evaluate(() => [profile().id, whoOpen]), ['papa', true], '5分たってもパパに戻らない');
  },

  'パパのまま放っておいても、何も起きない': async t => {
    const p = await t.open({ who:'papa' });
    await p.evaluate(() => { taskOn = true; lastTouchAt = Date.now() - 60*60*1000; guardKidProfile(); });
    t.eq(await p.evaluate(() => [profile().id, whoOpen]), ['papa', false], 'パパなのに聞き直された');
  },

  'きろく と 切り替えは、長押しでだけ開く': async t => {
    const p = await t.open({ who:'papa' });
    await p.evaluate(() => { taskOn = true; stageOpen = true; drawStageSelect(ctx, 0); });
    await hold(p, "b.val==='rec'", 250);
    t.eq(await p.evaluate(() => recOpen), false, 'ちょっと押しただけで きろく が開いた');
    await hold(p, "b.val==='rec'", 1500);
    t.eq(await p.evaluate(() => recOpen), true, '長押ししても きろく が開かない');
    await p.evaluate(() => { recOpen = false; drawStageSelect(ctx, 0); });
    await hold(p, "b.val==='prof'&&b.i===0", 250);
    t.eq(await p.evaluate(() => profile().id), 'papa', 'ちょっと押しただけで ひなたに切り替わった');
    await hold(p, "b.val==='prof'&&b.i===0", 1500);
    t.eq(await p.evaluate(() => profile().id), 'hinata', '長押ししても ひなたに切り替わらない');
  },

  '記録はふたりで別々に残り、開き直しても消えない': async t => {
    const p = await t.open({ who:'hinata' });
    await p.evaluate(() => {
      taskOn = true; startTask(20);
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
    });
    const count = () => p.evaluate(() => [clearedCountOf('hinata'), clearedCountOf('papa')]);
    t.eq(await count(), [1, 0], 'ひなたのクリアがパパにも付いた');
    await p.reload();
    await p.waitForFunction(() => typeof drawFrame === 'function');
    t.eq(await count(), [1, 0], '開き直したら記録が変わった');
  },

  'レベルごとに けせて、うつすときは短いほうが残る': async t => {
    const p = await t.open({ who:'hinata' });
    const r = await p.evaluate(() => {
      const mk = n => new Array(n).fill({ k:'new', a:1 });
      taskStore.hinata = { idx:0, cleared:{0:true, 5:true, 6:true, 12:true},
                           logs:{0:mk(5), 5:mk(9), 6:mk(12), 12:mk(4)} };
      taskStore.papa   = { idx:0, cleared:{5:true, 6:true}, logs:{5:mk(12), 6:mk(9)} };
      loadProfileState();
      clearLevelRecords('hinata', 1);                       // レベル2（12番）だけ消す
      const afterClear = [levelCountOf('hinata',0), levelCountOf('hinata',1)];
      moveRecords('hinata', 'papa');
      return { afterClear, hinata: clearedCountOf('hinata'), papa: clearedCountOf('papa'),
               l5: taskStore.papa.logs[5].length, l6: taskStore.papa.logs[6].length };
    });
    t.eq(r.afterClear, [3, 0], 'レベル2だけを消せていない');
    t.eq([r.hinata, r.papa], [0, 3], 'うつしたあとの数がおかしい');
    t.eq([r.l5, r.l6], [9, 9], '同じおだいで、短いほうの記録が残っていない');
  },
};
