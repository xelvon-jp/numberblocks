// レインボー🌈クリア（おてほんの 手数いないで つくる）。まえは beginner.test.js に あった（ビギナーは 2026-10-24 に なくした）。

module.exports = {

  'ふつうでは おてほんの 手数いないなら 虹、こえたら じょうず': async t => {
    const p = await t.open({ who:'hinata' });
    const pr = await p.evaluate(() => {
      const out = {};
      taskOn = true; setMode('+'); startTask(20);
      out.ref = TASKS[20].ref || TASKS[20].best;
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
      out.a = { moves: taskLog.length, text: winFx.praise.text, rainbow: !!winFx.praise.rainbow, mark: !!(curRec().rainbow && curRec().rainbow[20]) };
      startTask(20);
      spawnBlock(1); spawnBlock(2); fuseBlocks(blocks[0], blocks[1]); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
      out.b = { moves: taskLog.length, text: winFx.praise.text, rainbow: !!winFx.praise.rainbow };
      return out;
    });
    t.ok(pr.a.moves <= pr.ref && pr.a.rainbow && pr.a.text === 'レインボー🌈クリア！' && pr.a.mark, 'おてほんどおりで 虹が出ない: ' + JSON.stringify(pr));
    t.ok(pr.b.moves > pr.ref && !pr.b.rainbow && pr.b.text === 'じょうず！', 'おてほんを こえても 虹が出る: ' + JSON.stringify(pr));
  },

  '虹の印は 開き直しても残り、きろくの せいりで消える': async t => {
    const p = await t.open({ who:'hinata' });
    await p.evaluate(() => {
      taskOn = true; setMode('+'); startTask(20);
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
    });
    await p.reload();
    await p.waitForFunction(() => typeof drawFrame === 'function');
    const r = await p.evaluate(() => {
      whoOpen = false; setProfile(0);
      const kept = !!recOf('hinata').rainbow[20];
      clearLevelRecords('hinata', 2);                  // 20番は レベル3
      return { kept, after: !!recOf('hinata').rainbow[20] };
    });
    t.eq(r, { kept:true, after:false }, '虹の印が 残らない／消えない');
  },

  '虹は キャラのジャンプといっしょに動かず、画面の同じ場所にかかる': async t => {
    const p = await t.open({ who:'hinata' });
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
    t.eq(await p.evaluate(() => Math.abs(winFx.arc.cx - sw*0.58) < 0.5), true, '虹が 決めた横の位置にない');
  },

  '虹は 遠くの空にかかる：お山・木より うしろ、キャラより うしろ': async t => {
    const p = await t.open({ who:'hinata' });
    await p.evaluate(() => {
      taskOn = true; setMode('+'); startTask(20);
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
    });
    await p.waitForFunction(() => rainbowTime() > 100, null, { timeout: 4000 });
    const order = await p.evaluate(() => new Promise(done => {
      const log = [], sc = sceneryLayers(sh - GH - bottomPanelH());
      const b0 = blocks[0], di = ctx.drawImage, ra = drawRainbowArc, rb = b0.draw;
      ctx.drawImage = function(img){ if(img === sc.far) log.push('far'); else if(img === sc.near) log.push('near');
                                     return di.apply(this, arguments); };
      drawRainbowArc = function(){ log.push('rainbow'); return ra.apply(this, arguments); };
      b0.draw = function(){ log.push('block'); return rb.apply(this, arguments); };
      requestAnimationFrame(() => requestAnimationFrame(() => {
        ctx.drawImage = di; drawRainbowArc = ra; b0.draw = rb;
        done(log.slice(0, 4));
      }));
    }));
    t.eq(order, ['rainbow','far','near','block'], '虹の重なり順が ちがう');
    const r = await p.evaluate(() => ({ cy: winFx.arc.cy, grass: groundTopY() }));
    t.ok(r.cy <= r.grass + 1, '虹の足が 草はらより手前にささっている');
  },

  '虹は キャラが着地してから かかる': async t => {
    const p = await t.open({ who:'hinata' });
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
    await p.evaluate(() => {
      taskOn = true; setMode('+'); startTask(20);
      spawnBlock(3); spawnBlock(7); fuseBlocks(blocks[0], blocks[1]); checkTask();
    });
    await t.sleep(2400);                               // ふつうの演出（2秒）は もう終わっている
    t.eq(await p.evaluate(() => rainbowTime() > 0), true, '2秒すぎで 虹が消えてしまった');
  },

  '「レインボー🌈クリア！」の文字は 虹といっしょに出る': async t => {
    const p = await t.open({ who:'hinata' });
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
    t.eq(land.n, 1, '虹が出たのに スタンプに 虹の文字が出ていない');
  },
};
