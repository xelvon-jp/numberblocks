// はんぶん（hanbun.html）：ゆび 2ほんで ひろげると はんぶんこ（5 → 2.5 と 2.5）、かさねると くっつく。
// ゲームの「はんぶん」タブで タブの 下に iframe で かさなる。

const tapTab = (p, val) => p.evaluate(v => { const b = tabBtns.find(x => x.val === v); handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm'); }, val);
async function openHanbun(t, chars){
  const p = await t.open(chars ? { storage: { nb_hanbun: JSON.stringify({ n: 5, chars }) } } : undefined);
  await tapTab(p, 'hanbun');
  await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="hanbun.html"]'); return f && f.contentWindow && f.contentWindow.hanbun; }, null, { timeout: 5000 });
  const f = p.frames().find(x => x.url().includes('hanbun.html'));
  await f.waitForTimeout(400);      // あしもとに おりる
  return { p, f };
}
const vis = p => p.evaluate(() => { const f = document.querySelector('iframe[src^="hanbun.html"]'); return f ? f.style.visibility : 'none'; });
const vals = f => f.evaluate(() => hanbun.chars());
// ゆびの イベント（id ごと）
const ptr = (f, type, id, x, y) => f.evaluate(([type, id, x, y]) => {
  const cv = document.getElementById('c'), r = cv.getBoundingClientRect();
  cv.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 1 }));
}, [type, id, x, y]);
// i ばんめの キャラを 2ほんの ゆびで つまんで よこに ひろげる
async function pinchOut(f, i){
  const a = await f.evaluate(i => hanbun.at(i), i);
  await ptr(f, 'pointerdown', 1, a.x - 4, a.y);
  await ptr(f, 'pointerdown', 2, a.x + 4, a.y);
  for(let k = 1; k <= 6; k++){ await ptr(f, 'pointermove', 1, a.x - 4 - k*8, a.y); await ptr(f, 'pointermove', 2, a.x + 4 + k*8, a.y); }
  await ptr(f, 'pointerup', 1, a.x - 52, a.y); await ptr(f, 'pointerup', 2, a.x + 52, a.y);
  await f.waitForTimeout(50);
}
// i ばんめの キャラを j ばんめの キャラの うえへ ドラッグして はなす
async function dragOnto(f, i, j){
  const a = await f.evaluate(i => hanbun.at(i), i), b = await f.evaluate(j => hanbun.at(j), j);
  await ptr(f, 'pointerdown', 1, a.x, a.y);
  for(let k = 1; k <= 8; k++) await ptr(f, 'pointermove', 1, a.x + (b.x - a.x)*k/8, a.y + (b.y - a.y)*k/8);
  await ptr(f, 'pointerup', 1, b.x, b.y);
  await f.waitForTimeout(50);
}

module.exports = {
  'タブで ひらくと タブの 下に かさなり、ほかの タブ では かくれる': async t => {
    const { p } = await openHanbun(t);
    t.eq(await vis(p), 'visible', 'はんぶんで 見えない');
    t.ok(await p.evaluate(() => document.querySelector('iframe[src^="hanbun.html"]').getBoundingClientRect().top === TAB_H), 'タブの 下から はじまらない');
    await tapTab(p, 'waru'); await p.waitForTimeout(100);
    t.eq(await vis(p), 'hidden', 'ほかの タブで かくれない');
  },

  'ゆび 2ほんで ひろげると はんぶんこ（4 → 2 と 2、5 → 2.5 と 2.5、1 → 0.5 と 0.5）。2.5・0.5 は わけられない': async t => {
    const { f } = await openHanbun(t, [5]);
    await pinchOut(f, 0);
    t.eq(await vals(f), [2.5, 2.5], '5 が わかれない');
    t.ok((await f.evaluate(() => hanbun.say())).includes('2.5 は「2 と はんぶん」'), 'ことば ' + await f.evaluate(() => hanbun.say()));
    await pinchOut(f, 0);
    t.eq(await vals(f), [2.5, 2.5], '2.5 が わかれた');
    t.ok((await f.evaluate(() => hanbun.say())).includes('できないよ'), 'わけられない ことば');
    await f.evaluate(() => { hanbun.clear(); hanbun.add(4); hanbun.add(1); });
    await f.waitForTimeout(400);
    await pinchOut(f, 0); await f.waitForTimeout(300); await pinchOut(f, (await vals(f)).indexOf(1));
    t.eq((await vals(f)).slice().sort(), [0.5, 0.5, 2, 2], '4・1 が わかれない');
    await f.waitForTimeout(300);
    const i = (await vals(f)).indexOf(0.5);
    await pinchOut(f, i);
    t.eq((await vals(f)).filter(v => v === 0.5).length, 2, '0.5 が わかれた');
  },

  'うえ・したに ひろげると うえ・したに わかれる。わけた あと しばらく その ばしょで まってから ならびなおす': async t => {
    const { f } = await openHanbun(t, [4]);
    const a = await f.evaluate(() => hanbun.at(0));
    await ptr(f, 'pointerdown', 1, a.x, a.y - 4); await ptr(f, 'pointerdown', 2, a.x, a.y + 4);
    for(let k = 1; k <= 6; k++){ await ptr(f, 'pointermove', 1, a.x, a.y - 4 - k*8); await ptr(f, 'pointermove', 2, a.x, a.y + 4 + k*8); }
    await ptr(f, 'pointerup', 1, a.x, a.y - 52); await ptr(f, 'pointerup', 2, a.x, a.y + 52);
    t.eq(await vals(f), [2, 2], 'わかれない');
    await f.waitForTimeout(700);
    const m = await f.evaluate(() => [hanbun.at(0), hanbun.at(1)]);
    t.ok(Math.abs(m[0].x - m[1].x) < 10 && m[1].y - m[0].y > m[0].h, 'うえ・したに わかれない ' + JSON.stringify(m));
    await f.waitForTimeout(1500);
    const e = await f.evaluate(() => [hanbun.at(0), hanbun.at(1)]);
    t.ok(Math.abs(e[0].y - e[1].y) < 2 && Math.abs(e[0].x - e[1].x) > e[0].w, 'ならびなおさない ' + JSON.stringify(e));
  },

  'ドラッグで かさねると くっつく（2.5 ＋ 2.5 ＝ 5、0.5 ＋ 0.5 ＝ 1）。はなれた ところで はなすと くっつかない。ひらきなおしても のこる': async t => {
    const { f } = await openHanbun(t, [2.5, 2.5, 0.5, 0.5]);
    await dragOnto(f, 0, 1);
    t.eq((await vals(f)).slice().sort(), [0.5, 0.5, 5], '2.5 と 2.5 が くっつかない');
    t.ok((await f.evaluate(() => hanbun.say())).startsWith('2.5 ＋ 2.5 ＝ 5'), 'しき');
    await f.waitForTimeout(400);
    const v = await vals(f), a = v.indexOf(0.5), b = v.lastIndexOf(0.5);
    await dragOnto(f, a, b);
    t.eq((await vals(f)).slice().sort((x, y) => x - y), [1, 5], '0.5 と 0.5 が くっつかない');
    // あいて いない ところで はなす
    await f.waitForTimeout(400);
    const c = await f.evaluate(() => hanbun.at(0));
    await ptr(f, 'pointerdown', 1, c.x, c.y); await ptr(f, 'pointermove', 1, c.x, c.y - 120); await ptr(f, 'pointerup', 1, c.x, c.y - 120);
    t.eq((await vals(f)).length, 2, 'くっついた');
    const saved = await f.evaluate(() => JSON.parse(localStorage.getItem('nb_hanbun')).chars.slice().sort((x, y) => x - y));
    t.eq(saved, [1, 5], 'のこらない');
  },

  'おうちに つれて いって はなすと その キャラだけ かえる。とちゅうまで ひろげて はなすと わかれない': async t => {
    const { f } = await openHanbun(t, [3, 4]);
    const h = await f.evaluate(() => { const r = document.getElementById('home').getBoundingClientRect(), cr = document.getElementById('c').getBoundingClientRect(); return { x: r.left + r.width/2 - cr.left, y: r.top + r.height/2 - cr.top }; });
    const a = await f.evaluate(() => hanbun.at(0));
    await ptr(f, 'pointerdown', 1, a.x, a.y);
    for(let k = 1; k <= 8; k++) await ptr(f, 'pointermove', 1, a.x + (h.x - a.x)*k/8, a.y + (h.y - a.y)*k/8);
    t.ok(await f.evaluate(() => document.getElementById('home').classList.contains('over')), 'おうちが ひからない');
    await ptr(f, 'pointerup', 1, h.x, h.y);
    t.eq(await vals(f), [4], '3 が かえらない');
    t.ok((await f.evaluate(() => hanbun.say())).includes('おうちに かえった'), 'ことば');
    await f.waitForTimeout(400);
    const b = await f.evaluate(() => hanbun.at(0));
    await ptr(f, 'pointerdown', 1, b.x - 4, b.y); await ptr(f, 'pointerdown', 2, b.x + 4, b.y);
    await ptr(f, 'pointermove', 1, b.x - 20, b.y); await ptr(f, 'pointermove', 2, b.x + 20, b.y);
    await ptr(f, 'pointerup', 1, b.x - 20, b.y); await ptr(f, 'pointerup', 2, b.x + 20, b.y);
    t.eq(await vals(f), [4], 'とちゅうで わかれた');
  },

  'たくさん わけても たて・よこに ならんで ちいさく なりすぎない（0.5 が 16にん）': async t => {
    const { f } = await openHanbun(t, Array(16).fill(0.5));
    await f.waitForTimeout(1200);
    const r = await f.evaluate(() => { const ys = new Set(hanbun.chars().map((_, i) => Math.round(hanbun.at(i).y))); return { rows: ys.size, bs: hanbun.bs() }; });
    t.ok(r.rows >= 2, 'よこ 1れつ の まま');
    t.ok(r.bs >= 25, 'ちいさい ' + r.bs);
  },

  'だす・かたづける。はんぶんの キャラも ぶたいの 中に おさまる': async t => {
    const { f } = await openHanbun(t, []);
    t.eq(await f.evaluate(() => [...document.querySelectorAll('#nums button')].map(b => b.textContent)), ['0.5', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'かたづける'], 'ボタン');
    await f.evaluate(() => { [...document.querySelectorAll('#nums button')].find(b => b.textContent === '7').click(); [...document.querySelectorAll('#nums button')].find(b => b.textContent === '0.5').click(); });
    t.eq(await vals(f), [7, 0.5], 'だす');
    await f.evaluate(() => { hanbun.clear(); [0.5, 2.5, 3.5, 6.5, 7.5, 10.5, 20.5, 99.5].forEach(v => hanbun.add(v)); });
    await f.waitForTimeout(1500);
    const r = await f.evaluate(() => { const W = document.getElementById('c').clientWidth, H = document.getElementById('c').clientHeight;
      return hanbun.chars().map((v, i) => { const a = hanbun.at(i); return [v, a.x - a.w/2 >= 0 && a.x + a.w/2 <= W && a.y - a.h/2 >= 0 && a.y + a.h/2 <= H]; }).filter(x => !x[1]); });
    t.eq(r, [], 'はみだす');
    await f.click('#clear');
    t.eq(await vals(f), [], 'かたづけない');
  },
};
