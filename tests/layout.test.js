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
};
