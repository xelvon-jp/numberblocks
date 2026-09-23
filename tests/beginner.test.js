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

  'ビギナーでは みちしるべが出て、作れたら つぎの数へ進む': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);
    const r = await p.evaluate(() => {
      taskOn = true; startTask(TASKS.findIndex(x => x.n === 777));
      const out = { way: currentWay(), h0: taskCardH(), idx0: wayIdx };
      setMode('x'); spawnBlock(10); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]);   // 70
      checkWay();
      out.idx1 = wayIdx;
      return out;
    });
    t.eq(r.way, [70, 77, 770], '777 のみちしるべがちがう');
    t.eq(r.h0, 80, 'みちしるべのぶん カードがのびていない');
    t.eq([r.idx0, r.idx1], [0, 1], '70 を作っても つぎの みちしるべへ進まない');
  },

  '先の みちしるべを先に作ったら、そこまで飛ぶ': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);
    const idx = await p.evaluate(() => {
      taskOn = true; startTask(TASKS.findIndex(x => x.n === 777));
      spawnBlock(77); checkWay();                   // 70 をとばして 77
      return wayIdx;
    });
    t.eq(idx, 2, '先の みちしるべを作っても そこまで飛ばない');
  },

  'ふつうでは みちしるべを出さない': async t => {
    const p = await t.open({ who:'hinata' });
    const r = await p.evaluate(() => {
      taskOn = true; startTask(TASKS.findIndex(x => x.n === 777));
      return { way: currentWay(), h: taskCardH() };
    });
    t.eq(r, { way: [], h: 50 }, 'ふつうなのに みちしるべが出ている');
  },

  'くっきりしたキーだけで作ると虹、ひかえめなキーを使うと出ない': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);
    const r = await p.evaluate(() => {
      const out = {};
      taskOn = true; setMode('+'); startTask(20);      // 10 を 3 と 7 で
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
      out.good = !!(winFx && winFx.praise && winFx.praise.rainbow);
      out.text = winFx && winFx.praise && winFx.praise.text;
      out.goodMark = !!(curRec().rainbow && curRec().rainbow[20]);
      startTask(21); setMode('x');                    // 30 を 4 と 7 で…のところを 10×3 で
      spawnBlock(10); spawnBlock(3); fuseBlocks(blocks[0], blocks[1]); checkTask();
      out.done2 = taskDone;
      out.bad = !!(winFx && winFx.praise && winFx.praise.rainbow);
      out.badMark = !!(curRec().rainbow && curRec().rainbow[21]);
      return out;
    });
    t.eq(r.text, 'レインボー🌈クリア！', 'ほめことばが「レインボー🌈クリア！」になっていない');
    delete r.text;
    t.eq(r, { good:true, goodMark:true, done2:true, bad:false, badMark:false },
         '虹の出る／出ないが ちがう');
  },

  'ひかえめなキーを もどすで取り消せば、虹は また出る': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);
    const rb = await p.evaluate(() => {
      taskOn = true; setMode('+'); startTask(20);
      spawnBlock(10); doUndo();                        // 10（ひかえめ）を押して、もどす
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
      return !!(winFx && winFx.praise && winFx.praise.rainbow);
    });
    t.eq(rb, true, 'もどしたのに 虹が出ない');
  },

  'ふつうでは 虹は出ない': async t => {
    const p = await t.open({ who:'hinata' });
    const pr = await p.evaluate(() => {
      taskOn = true; setMode('+'); startTask(20);
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
      return winFx && winFx.praise ? { text: winFx.praise.text, rainbow: !!winFx.praise.rainbow } : null;
    });
    t.eq(pr, { text:'じょうず！', rainbow:false }, 'ふつうのクリアで 虹が出た');
  },

  '虹の印は 開き直しても残り、きろくの せいりで消える': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);
    await p.evaluate(() => {
      taskOn = true; setMode('+'); startTask(20);
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
    });
    await p.reload();
    await p.waitForFunction(() => typeof drawFrame === 'function');
    const r = await p.evaluate(() => {
      whoOpen = false; setProfile(0);
      const kept = !!recOf('hinata', true).rainbow[20];
      clearLevelRecords('hinata', 2);                  // 20番は レベル3
      return { kept, after: !!recOf('hinata', true).rainbow[20] };
    });
    t.eq(r, { kept:true, after:false }, '虹の印が 残らない／消えない');
  },

  '虹は キャラのジャンプといっしょに動かず、画面の同じ場所にかかる': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);
    await p.evaluate(() => {
      taskOn = true; setMode('+'); startTask(20);
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
    });
    const at = () => p.evaluate(() => ({ arc: JSON.stringify(winFx && winFx.arc),
                                        feet: winFx && winFx.block ? Math.round(winFx.block.y + winFx.block.height) : null }));
    const a = await at();
    await t.sleep(250);                                // 跳ねている最中
    const b = await at();
    t.ok(a.arc && a.arc !== 'null', '虹の位置が決まっていない');
    t.ok(a.feet !== b.feet, 'キャラが跳ねていない（この確認が意味をなさない）');
    t.eq(b.arc, a.arc, 'キャラが跳ねると 虹も動いてしまう');
    t.eq(await p.evaluate(() => winFx.arc.cx === sw/2), true, '虹が 画面の横まん中にない');
  },

  '虹は キャラが着地してから かかる': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);
    await p.evaluate(() => {
      taskOn = true; setMode('+'); startTask(20);
      spawnBlock(3); spawnBlock(7);
    });
    await t.sleep(900);                                // キャラが地面に立つまで待つ
    await p.evaluate(() => { fuseBlocks(blocks[0], blocks[1]); checkTask(); });
    await t.sleep(120);
    const air = await p.evaluate(() => ({ rt: rainbowTime(), onGround: winFx.block.onGround }));
    t.eq(air, { rt:-1, onGround:false }, '跳ねている最中なのに 虹がかかりはじめた');
    await t.sleep(1300);
    const land = await p.evaluate(() => ({ rt: rainbowTime(), landedAt: winFx.landedAt }));
    t.ok(land.rt > 0, '着地しても 虹がかからない');
    t.ok(land.landedAt > 300, '着地をまたずに 虹がかかった（landedAt=' + Math.round(land.landedAt) + 'ms）');
  },

  '虹は つぎのおだいへ進むまで 途中で切れない': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);
    await p.evaluate(() => {
      taskOn = true; setMode('+'); startTask(20);
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
    });
    await t.sleep(2400);                               // ふつうの演出（2秒）は もう終わっている
    t.eq(await p.evaluate(() => rainbowTime() > 0), true, '2秒すぎで 虹が消えてしまった');
  },

  '「レインボー🌈クリア！」の文字は 虹といっしょに出る': async t => {
    const p = await t.open({ who:'hinata' });
    await tapMode(p, true);
    await p.evaluate(() => {
      taskOn = true; setMode('+'); startTask(20);
      spawnBlock(3); spawnBlock(7);
    });
    await t.sleep(900);
    await p.evaluate(() => { fuseBlocks(blocks[0], blocks[1]); checkTask(); });
    // スタンプとカードを描いて、虹の文字が描かれたかを数える
    const words = () => p.evaluate(() => {
      let n = 0; const orig = drawRainbowWords;
      drawRainbowWords = function(...a){ n++; return orig.apply(this, a); };
      try{ drawWinStamp(ctx); drawTaskCard(ctx, 0); } finally { drawRainbowWords = orig; }
      return { n, rt: rainbowTime() };
    });
    await t.sleep(120);
    const air = await words();
    t.eq(air, { n:0, rt:-1 }, '跳ねている最中に もう虹の文字が出ている');
    await t.sleep(1100);
    const land = await words();
    t.ok(land.rt > 0, '着地しても 虹が出ていない');
    t.eq(land.n, 2, '虹が出たのに スタンプとカードの両方に 虹の文字が出ていない');
  },
};
