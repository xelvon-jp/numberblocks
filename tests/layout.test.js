// 画面の配置。「どの端末でも押せる・重ならない・はみ出さない」を見る。

const SIZES = [[320,568],[375,667],[393,780],[430,932],[780,393]];

module.exports = {

  'ドリルの下の設定が、どの画面サイズでもはみ出さない': async t => {
    for(const [w,h] of SIZES){
      const p = await t.open({ width:w, height:h });
      await p.evaluate(() => setMode('quiz'));
      await t.sleep(250);
      const out = await p.evaluate(() => {
        const bad = [];
        for(const el of document.querySelectorAll('#quiz-ui button, #quiz-ui input, #quiz-ui label')){
          const r = el.getBoundingClientRect();
          if(!r.width) continue;
          if(r.right > innerWidth+1 || r.bottom > innerHeight+1 || r.left < -1)
            bad.push((el.textContent || el.id).trim());
        }
        return bad;
      });
      t.eq(out, [], `${w}x${h} でドリルの下の設定が画面の外に出ている`);
    }
  },

  '＋−×÷ と もどす は、計算のときだけ出る': async t => {
    const p = await t.open();
    await t.sleep(150);
    t.eq(await p.evaluate(() => opBarBtns.map(b => b.op)), ['+','-','x','div','undo'],
         '計算のときに ＋−×÷ と もどす が並んでいない');
    for(const m of ['quiz','clock','factor']){
      await p.evaluate(mm => setMode(mm), m);
      await t.sleep(150);
      t.eq(await p.evaluate(() => opBarBtns.length), 0,
           `${m} で演算子の段（の当たり判定）が残っている`);
    }
  },

  'おだい中は、カードが道具の列より上にあって重ならない': async t => {
    const p = await t.open();
    await p.evaluate(() => { taskOn = true; startTask(0); });
    await t.sleep(150);
    for(const hint of [false, true]){
      const r = await p.evaluate(h => {
        hintOn = h;
        const c = getTaskCardRect(), i = getTargetRect('home');
        return { cardBottom: c.y + c.h, iconTop: i.y };
      }, hint);
      t.ok(r.cardBottom <= r.iconTop,
           `ヒント${hint ? 'あり' : 'なし'}で、おだいカード(下端 ${r.cardBottom})が道具の列(上端 ${r.iconTop})に重なる`);
    }
  },

  'おだい中は数式を出さない（合体の前に答えが見えてしまうため）': async t => {
    const p = await t.open();
    const drawn = on => p.evaluate(v => {
      taskOn = v; if(v) startTask(0);
      blocks = []; spawnBlock(1); spawnBlock(1);
      const got = [], orig = ctx.fillText;
      ctx.fillText = function(s, ...a){ got.push(String(s)); return orig.call(this, s, ...a); };
      try{ drawFormula(ctx); } finally { ctx.fillText = orig; }
      return got.filter(s => s.includes('='));
    }, on);
    t.ok((await drawn(false)).length > 0, 'おだいOFFなのに数式が出ていない');
    t.eq(await drawn(true), [], 'おだい中に数式が出ている');
  },

  '画面を横にしても、大きいキャラがはみ出さない': async t => {
    const p = await t.open();
    await p.evaluate(() => { spawnBlock(1000); spawnBlock(7); });
    await t.sleep(600);
    await p.setViewportSize({ width:780, height:393 });
    await t.sleep(900);
    const bad = await p.evaluate(() => blocks.filter(b =>
      b.x < 0 || b.x + b.width > sw + 1 || b.height > calcFloor() - TAB_H
    ).map(b => b.num));
    t.eq(bad, [], '横にしたとき画面からはみ出すキャラがある');
  },

  'ステージいちらんの名前の札が、どの画面でも きろく・とじる と重ならない': async t => {
    for(const [w,h] of SIZES){
      const p = await t.open({ width:w, height:h });
      const r = await p.evaluate(() => {
        taskOn = true; stageOpen = true; drawStageSelect(ctx, 0);
        const box = b => ({ l:b.x, r:b.x + b.w, t:b.y, b:b.y + b.h });
        const hit = (a, c) => a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;
        const bad = [];
        const chips = stageBtns.filter(b => b.val === 'prof').map(box);
        const btns  = stageBtns.filter(b => b.val === 'rec' || b.val === 'close' || b.val === 'mode').map(box);
        const modes = stageBtns.filter(b => b.val === 'mode').map(box);
        const keys2 = stageBtns.filter(b => b.val === 'rec' || b.val === 'close').map(box);
        if(modes.length !== 2) bad.push('ふつう／ビギナー の切りかえが2つない');
        for(const m of modes){
          if(keys2.some(b => hit(m, b))) bad.push('ふつう／ビギナー が きろく・とじる に重なる');
          if(m.l < 0) bad.push('ふつう／ビギナー が はみ出す');
        }
        const cells = stageBtns.filter(b => b.val === 'go').map(box);
        for(const c of chips){
          if(c.r > innerWidth + 1) bad.push('札が はみ出す');
          if(btns.some(b => hit(c, b)))  bad.push('札が ボタンに重なる');
          if(cells.some(b => hit(c, b))) bad.push('札が マス目に重なる');
        }
        return { n: chips.length, bad: [...new Set(bad)] };
      });
      t.eq(r.n, 3, `${w}x${h} で名前の札が3つない`);
      t.eq(r.bad, [], `${w}x${h} で名前の札の配置がおかしい`);
    }
  },

  '「だれが あそぶ？」の3つのボタンが、どの画面でも収まる': async t => {
    for(const [w,h] of SIZES){
      const p = await t.open({ width:w, height:h, keepPicker:true,
                               storage:{ 'nbg.task.v1': JSON.stringify({ v:2, on:true }) } });
      await p.evaluate(() => drawWhoPicker(ctx, 0));
      const bad = await p.evaluate(() => whoBtns.filter(b =>
        b.y < 0 || b.y + b.h > innerHeight || b.x < 0 || b.x + b.w > innerWidth).length);
      t.eq(bad, 0, `${w}x${h} で「だれが あそぶ？」のボタンが画面からはみ出す`);
    }
  },

  '背景：キャラの足もとは どの画面・どのモードでも 手前の草はらの上': async t => {
    for(const [w,h] of SIZES){
      const p = await t.open({ width:w, height:h });
      for(const m of ['calc','clock']){
        const r = await p.evaluate(mm => {
          setMode(mm); drawBG(ctx);
          return { floor: calcFloor(), grass: groundTopY(), panel: sh - bottomPanelH() };
        }, m);
        t.ok(r.floor >= r.grass && r.floor <= r.panel,
             `${w}x${h} ${m} で キャラの足もと(${Math.round(r.floor)})が 草はら(${Math.round(r.grass)}〜${Math.round(r.panel)})の外にある`);
      }
    }
  },

  '背景：動かない景色は 一度だけ描いて使いまわし、地面の高さが変わったら描きなおす': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      setMode('calc');
      const gy = () => sh - GH - bottomPanelH();
      const a = sceneryLayer(gy()), b = sceneryLayer(gy());
      setMode('clock');                                // 下のパネルの高さが変わる
      const c = sceneryLayer(gy());
      return { same: a === b, redrawn: a !== c };
    });
    t.eq(r, { same:true, redrawn:true }, '景色の使いまわし／描きなおしが ねらいどおりでない');
  },
};
