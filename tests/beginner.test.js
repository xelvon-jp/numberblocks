// ビギナー。1〜10 のキーで同じおだいを遊ぶ。記録は ふつう と別。手数は見ない。

const keys = p => p.evaluate(() => getNumpadLayout().map(b => b.label));

// ステージいちらんの「ふつう／ビギナー」を押す
async function tapMode(p, beg){
  await p.evaluate(v => {
    stageOpen = true; drawStageSelect(ctx, 0);
    const b = stageBtns.find(x => x.val === 'mode' && x.v === v);
    if(!b) throw new Error('ふつう／ビギナー の切りかえが見つからない');
    handleStart(b.x + b.w/2, b.y + b.h/2, 'b');
    stageOpen = false;
  }, beg);
}

// 3 と 7 だけのおだい（10をつくる）を、ビギナーらしく 10 を1回押して解く
async function clearTenByOneKey(p){
  await p.evaluate(() => {
    taskOn = true; startTask(20);
    const k = getNumpadLayout().find(b => b.val === 10);
    if(!k) throw new Error('10 のキーがない');
    handleStart(k.x + k.w/2, k.y + k.h/2, 'k');
    handleEnd(k.x + k.w/2, k.y + k.h/2, 'k');
    checkTask();
  });
}

module.exports = {

  'ビギナーでは 1〜10 のキーが出る（R は出ない）': async t => {
    const p = await t.open();
    await p.evaluate(() => { taskOn = true; startTask(20); });   // ふつう：3 と 7 だけ
    t.eq(await keys(p), ['3','7','CLR'], 'ふつうのおだいで しばりの数字になっていない');
    await tapMode(p, true);
    t.eq(await keys(p), ['1','2','3','4','5','6','7','8','9','10','CLR'],
         'ビギナーで 1〜10 と CLR にならない');
  },

  'ビギナーでクリアしても、ふつうの記録には付かない（開き直しても）': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);
    await clearTenByOneKey(p);
    const count = () => p.evaluate(() => [clearedCountOf('hinata', false), clearedCountOf('hinata', true)]);
    t.eq(await p.evaluate(() => taskDone), true, 'ビギナーで 10 を押しても クリアにならない');
    t.eq(await count(), [0, 1], 'ビギナーのクリアが ふつうの記録に付いた');
    await p.reload();
    await p.waitForFunction(() => typeof drawFrame === 'function');
    t.eq(await count(), [0, 1], '開き直したら記録が変わった');
  },

  'ビギナーでは ほめことば・★・ヒントを出さない（手数を見ない）': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);
    await clearTenByOneKey(p);
    const r = await p.evaluate(() => {
      drawTaskCard(ctx, 0);
      return { praise: winFx && winFx.praise, star: isNice(20),
               hint: (startTask(0), taskStartT = Date.now() - 120000,
                      taskLog = new Array(30).fill({k:'new',a:1}), hintReady()) };
    });
    t.eq(r, { praise:null, star:false, hint:false }, 'ビギナーで 手数にもとづく表示が出ている');
  },

  'ふつう／ビギナーは 人ごとに覚えていて、開き直しても もどる': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);                                      // ひなた → ビギナー
    await p.evaluate(() => setProfile(PROFILES.findIndex(x => x.id === 'papa')));
    t.eq(await p.evaluate(() => begMode()), false, 'パパまでビギナーになった');
    await p.evaluate(() => setProfile(0));
    t.eq(await p.evaluate(() => begMode()), true, 'ひなたに戻したら ビギナーが解けた');
    await p.reload();
    await p.waitForFunction(() => typeof drawFrame === 'function');
    t.eq(await p.evaluate(() => [begOf('hinata'), begOf('papa')]), [true, false],
         '開き直したら モードを忘れた');
  },

  'きろくの せいり は、いまのモードの記録だけにさわる': async t => {
    const p = await t.open({ who:'hinata' });
    const r = await p.evaluate(() => {
      const mk = n => new Array(n).fill({ k:'new', a:1 });
      const h = recOf('hinata', false), hb = recOf('hinata', true);
      h.cleared = {0:true, 1:true}; h.logs = {0:mk(5), 1:mk(4)};
      hb.cleared = {0:true, 2:true, 12:true}; hb.logs = {0:mk(1), 2:mk(1), 12:mk(2)};
      taskStore.hinata.useBeg = true; loadProfileState();

      clearLevelRecords('hinata', 1);               // ビギナーのレベル2（12番）だけ
      const a = [clearedCountOf('hinata', false), clearedCountOf('hinata', true)];
      moveRecords('hinata', 'mama');                // ビギナーどうしで移る
      const b = [clearedCountOf('hinata', false), clearedCountOf('hinata', true),
                 clearedCountOf('mama', false),   clearedCountOf('mama', true)];
      // ひなたのビギナーに記録を1つ入れなおしてから、ふつうを ぜんぶ消す
      const hb2 = recOf('hinata', true); hb2.cleared = {5:true}; hb2.logs = {5:mk(1)};
      taskStore.hinata.useBeg = false; loadProfileState();
      clearAllRecords('hinata');
      const c = [clearedCountOf('hinata', false), clearedCountOf('hinata', true)];
      return { a, b, c };
    });
    t.eq(r.a, [2, 2],       'ビギナーのレベルを消したら ふつうまで減った');
    t.eq(r.b, [2, 0, 0, 2], 'ビギナーの記録が ママのビギナーへ移っていない');
    t.eq(r.c, [0, 1],       'ふつうを ぜんぶ消したら ビギナーの記録まで消えた');
  },

  'ビギナーでは、ふつうで使う数字以外のキーは ひかえめだが、押せば ふつうに出る': async t => {
    const p = await t.open();
    await tapMode(p, true);
    await p.evaluate(() => { taskOn = true; startTask(20); });     // ふつうなら 3 と 7 だけ
    const dim = await p.evaluate(() =>
      getNumpadLayout().filter(b => b.dim).map(b => b.label));
    t.eq(dim, ['1','2','4','5','6','8','9','10'], 'ひかえめにするキーがちがう（3 と 7 と CLR 以外）');
    const n = await p.evaluate(() => {
      const k = getNumpadLayout().find(b => b.val === 9);     // ひかえめなキー
      handleStart(k.x + k.w/2, k.y + k.h/2, 'k'); handleEnd(k.x + k.w/2, k.y + k.h/2, 'k');
      return blocks.map(b => b.num);
    });
    t.eq(n, [9], 'ひかえめなキーを押しても キャラが出ない');
  },
};
