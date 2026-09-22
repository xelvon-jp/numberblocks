// ひととおり動かして、止まったりエラーが出たりしないか。

module.exports = {

  'すべてのモードを行き来しても止まらない': async t => {
    const p = await t.open();
    for(const m of ['+','-','x','div','factor','quiz','clock','calc']){
      await p.evaluate(mm => setMode(mm), m);
      await t.sleep(200);
    }
    t.eq(await p.evaluate(() => loopErr), '', '描画ループでエラーが出た');
  },

  '101〜1000 の大きいキャラを出しても止まらない': async t => {
    const p = await t.open();
    for(const n of [101, 243, 500, 777, 999, 1000]){
      await p.evaluate(v => { blocks = []; spawnBlock(v); }, n);
      await t.sleep(250);
    }
    t.eq(await p.evaluate(() => loopErr), '', '大きいキャラでエラーが出た');
  },

  'とけいを3時ちょうどにしても止まらない（ゼロの表示で固まったことがある）': async t => {
    const p = await t.open();
    await p.evaluate(() => setMode('clock'));
    for(const m of [180, 0, 359, 719]){
      await p.evaluate(v => { clockT = v; }, m);
      await t.sleep(250);
    }
    t.eq(await p.evaluate(() => loopErr), '', 'とけいでエラーが出た');
  },

  'おだいをクリアしたときの演出で止まらない': async t => {
    const p = await t.open();
    await p.evaluate(() => {
      taskOn = true; startTask(43);                         // 777
      setMode('x'); spawnBlock(10); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]);
      setMode('+'); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]);
      setMode('x'); spawnBlock(10); fuseBlocks(blocks.find(b=>b.num===77), blocks.find(b=>b.num===10));
      setMode('+'); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]);
    });
    await t.sleep(1500);
    t.eq(await p.evaluate(() => [taskDone, loopErr]), [true, ''], '777のクリア演出でつまずいた');
  },
};
