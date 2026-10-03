// いなずま⚡（はやく とけた）：めあての じかんの バー、いなずま⚡クリア、いなずまレインボー⚡🌈クリア。

module.exports = {
  'めあての じかん：はじめは きまった ねだん、3かい から さいきんの まんなか（0.6〜1.5ばい）': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => [speedTarget([], 10000), speedTarget([8000, 9000], 10000), speedTarget([8000, 9000, 12000], 10000),
                                       speedTarget([1000, 1000, 1000], 10000), speedTarget([30000, 30000, 30000], 10000)]);
    t.eq(r, [10000, 10000, 9000, 6000, 15000], 'めあての じかん');
  },

  'けいさん：めあて いないなら いなずま、レインボーも なら いなずまレインボー（虹は あらしの あと）。おそければ ふつう': async t => {
    const p = await t.open({ who:'hinata' });
    const r = await p.evaluate(() => {
      window.__speedOff = false;
      const out = {};
      taskOn = true; setMode('+'); startTask(20);                        // 3 と 7 で 10（おてほん 3て）
      out.target = taskSpeed().target;
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
      out.fast = { text: winFx.praise.text, bolt: !!winFx.bolt, rt: rainbowTime() };
      winFx.landedAt = 0; winFx.t = 1000; out.rtDuringBolt = rainbowTime();
      winFx.t = BOLT_MS + 500; out.rtAfter = rainbowTime() >= 0;
      for(let i=0;i<3;i++) drawFrame(performance.now() + i*500);
      out.err = window.loopErr || '';
      startTask(20); taskStartT = Date.now() - 60000;
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
      out.slow = { text: winFx.praise.text, bolt: !!winFx.bolt };
      out.hist = spdHist(taskSpeed().key).length;
      return out;
    });
    t.eq(r.target, 18000, 'はじめの めあて（6びょう ＋ 3て×4びょう）');
    t.eq([r.fast.text, r.fast.bolt, r.rtDuringBolt, r.rtAfter, r.err], ['いなずまレインボー⚡🌈クリア！', true, -1, true, ''], 'いなずまレインボー');
    t.eq(r.slow, { text:'レインボー🌈クリア！', bolt:false }, 'おそい ときは ふつうの レインボー');
    t.eq(r.hist, 2, 'はやさが きろく されない');
  },

  'ひっさん：バーが へっていき、めあて いないで まちがい なしなら いなずまレインボー、ゲームに はやさを しらせる': async t => {
    const p = await t.open();
    await p.evaluate(() => localStorage.setItem('nb_hissan_try', JSON.stringify({ m:'write', k:'add' })));
    await p.goto(p.url().replace('index.html', 'hissan.html'));
    await p.waitForFunction(() => typeof newProblem === 'function' && P);
    const r = await p.evaluate(() => {
      window.__speedOff = false;
      setProblem('+', 16, 74);
      const out = { target: S.target };
      S.lastInk = S.t0 + 5000; judgeCell('o', 0); judgeCell('t', 9);
      out.res = [S.bolt, S.rainbow, S.msg, S.ms];
      setProblem('+', 16, 74); S.lastInk = S.t0 + 30000; judgeCell('o', 0); judgeCell('t', 9);
      out.slow = [S.bolt, S.msg];
      return out;
    });
    t.eq(r.target, 17000, 'はじめの めあて（2けた×6びょう ＋ くり上がり 5びょう）');
    t.eq(r.res, [true, true, 'いなずまレインボー⚡🌈クリア！', 5000], 'いなずまレインボー');
    t.eq(r.slow, [false, 'レインボー🌈クリア！'], 'おそい ときは レインボー');
  },
};
