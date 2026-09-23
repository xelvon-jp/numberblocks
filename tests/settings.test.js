// せってい。上の段をなくして歯車の奥にまとめた設定が、ちゃんと効くか。

const SIZES = [[320,568],[375,667],[393,780],[430,932],[780,393]];

// せってい の中のボタンを押す（val と v で指定）
async function tapSetting(p, val, v){
  await p.evaluate(([val, v]) => {
    drawSettings(ctx);
    const b = setBtns.find(x => x.val === val && (v === undefined || x.v === v));
    if(!b) throw new Error('せってい に ボタンがない: ' + val + ' ' + v);
    handleStart(b.x + b.w/2, b.y + b.h/2, 's');
  }, [val, v]);
}
async function tapGear(p){
  await p.evaluate(() => {
    drawTabsAndUI(ctx);
    const g = tabBtns.find(b => b.val === 'settings');
    handleStart(g.x + g.w/2, g.y + g.h/2, 's');
  });
}

module.exports = {

  '上の段がなくなり、タブと歯車が1段に収まる': async t => {
    for(const [w,h] of SIZES){
      const p = await t.open({ width:w, height:h });
      const r = await p.evaluate(() => {
        drawTabsAndUI(ctx);
        const bs = tabBtns.map(b => ({ l:b.x, r:b.x+b.w, v:b.val }));
        const overlap = bs.some((a,i) => bs.some((b,j) => i<j && a.l < b.r && b.l < a.r));
        return { tabH: TAB_H, vals: bs.map(b => b.v), overlap,
                 out: bs.some(b => b.l < 0 || b.r > innerWidth),
                 html: !!(document.getElementById('zukan-btn') || document.getElementById('fs-btn')) };
      });
      t.eq(r.tabH, 44, `${w}x${h} で上部バーの高さが 44 ではない`);
      t.eq(r.vals, ['calc','factor','quiz','clock','settings'], `${w}x${h} でタブの並びがちがう`);
      t.ok(!r.overlap, `${w}x${h} でタブどうしが重なる`);
      t.ok(!r.out, `${w}x${h} でタブが画面からはみ出す`);
      t.ok(!r.html, 'HTML の ずかん・全画面ボタンが残っている');
    }
  },

  '歯車で せってい が開き、もう一度押すと閉じる': async t => {
    const p = await t.open();
    await tapGear(p);
    t.eq(await p.evaluate(() => setOpen), true, '歯車を押しても開かない');
    await tapGear(p);
    t.eq(await p.evaluate(() => setOpen), false, 'もう一度押しても閉じない');
  },

  'せってい の外を押すと閉じ、うしろのゲームには届かない': async t => {
    const p = await t.open();
    await tapGear(p);
    await p.evaluate(() => {
      const n = getNumpadLayout()[0];                      // 数字キーの位置（パネルの外）
      handleStart(n.x + n.w/2, n.y + n.h/2, 's');
    });
    t.eq(await p.evaluate(() => [setOpen, blocks.length]), [false, 0],
         '外を押しても閉じない、または うしろの数字キーが効いた');
  },

  'せってい で キャラの大きさ と クイズ を変えられる': async t => {
    const p = await t.open();
    await tapGear(p);
    await tapSetting(p, 'size', 'S');
    t.eq(await p.evaluate(() => bsKey), 'S', '大きさ S にならない');
    await tapSetting(p, 'size', 'A');
    t.eq(await p.evaluate(() => bsKey), 'A', '大きさ A に戻らない');
    await tapSetting(p, 'quiz', true);
    t.eq(await p.evaluate(() => quizOn), true, 'クイズ ON にならない');
    await tapSetting(p, 'quiz', false);
    t.eq(await p.evaluate(() => quizOn), false, 'クイズ OFF にならない');
  },

  'おだいを ON にすると、だれが遊ぶか聞かれる': async t => {
    const p = await t.open({ who:'papa' });
    await p.evaluate(() => { taskOn = false; });
    await tapGear(p);
    await tapSetting(p, 'task', true);
    t.eq(await p.evaluate(() => [taskOn, setOpen, whoOpen]), [true, false, true],
         'おだい ON のあと「だれが あそぶ？」が出ない');
    await p.evaluate(() => { const w = whoBtns[0]; drawWhoPicker(ctx, 0); handleStart(w.x+w.w/2, w.y+w.h/2, 's'); });
    await tapGear(p);
    await tapSetting(p, 'task', false);
    t.eq(await p.evaluate(() => [taskOn, whoOpen]), [false, false], 'おだい OFF にしても聞かれてしまう');
  },

  'せってい が どの画面でも収まる': async t => {
    for(const [w,h] of SIZES){
      const p = await t.open({ width:w, height:h });
      const r = await p.evaluate(() => {
        setOpen = true;
        const box = drawSettings(ctx);
        return { box, btnOut: setBtns.filter(b => b.x < 0 || b.x+b.w > innerWidth || b.y+b.h > innerHeight).length };
      });
      t.ok(r.box.y >= 0 && r.box.y + r.box.h <= h, `${w}x${h} で せってい が画面からはみ出す`);
      t.eq(r.btnOut, 0, `${w}x${h} で せってい のボタンが画面の外にある`);
    }
  },

  'にじの ちょうせい：せっていから開いて、動かした値が 虹に使われ、のこり、もとにもどせる': async t => {
    const p = await t.open();
    const r0 = await p.evaluate(() => JSON.stringify(rainbowArcPlace()));
    await p.evaluate(() => {
      setOpen = true; drawSettings(ctx);
      const b = setBtns.find(x => x.val === 'arc');
      handleSettingsTap(b.x + b.w/2, b.y + b.h/2);
    });
    t.eq(await p.evaluate(() => [setOpen, arcTuning, !!document.getElementById('arc-tuner')]),
         [false, true, true], 'ちょうせいパネルが開かない');
    const slide = (k, v) => p.evaluate(([k, v]) => {
      const i = document.querySelector('#arc-tuner input[data-k="' + k + '"]');
      i.value = v; i.dispatchEvent(new Event('input'));
    }, [k, v]);
    await slide('x', 0.3); await slide('r', 0.9); await slide('foot', 0.2);
    t.eq(await p.evaluate(() => (JSON.parse(localStorage.getItem('nb_arc_tune')) || {}).foot), 0.2,
         'スライダーを動かしても 保存されない');
    await p.evaluate(() => [...document.querySelectorAll('#arc-tuner button')].find(b => b.textContent === '木の前').click());
    const r1 = await p.evaluate(() => ({ cx: rainbowArcPlace().cx / sw, R: rainbowArcPlace().R / sw,
      up: (groundTopY() - rainbowArcPlace().cy) / arcPlayH(), layer: arcLayer(),
      saved: JSON.parse(localStorage.getItem('nb_arc_tune')) }));
    t.eq([+r1.cx.toFixed(2), +r1.R.toFixed(2), +r1.up.toFixed(2), r1.layer], [0.3, 0.9, 0.2, 2], '動かした値が 虹に使われていない');
    t.eq([r1.saved.x, r1.saved.r, r1.saved.layer], [0.3, 0.9, 2], '値が保存されていない');
    t.ok(/よこ 0\.30/.test(await p.evaluate(() => document.getElementById('arc-tune-text').textContent)),
         '値の文字が 出ていない');
    // 開きなおしても のこっている
    await p.reload(); await p.waitForFunction(() => typeof drawFrame === 'function');
    t.eq(await p.evaluate(() => arcLayer()), 2, '開きなおすと 値が消える');
    await p.evaluate(() => { openArcTuner();
      [...document.querySelectorAll('#arc-tuner button')].find(b => b.textContent === 'もとにもどす').click(); closeArcTuner(); });
    t.eq(await p.evaluate(() => [JSON.stringify(rainbowArcPlace()), localStorage.getItem('nb_arc_tune'), arcTuning,
                                 !!document.getElementById('arc-tuner')]),
         [r0, null, false, false], 'もとにもどす／とじる が きかない');
  },
};
