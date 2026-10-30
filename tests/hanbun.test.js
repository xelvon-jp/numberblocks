// はんぶん（hanbun.html）：ゆび 2ほんで ひろげると はんぶんこ（5 → 2.5 と 2.5）、かさねると くっつく。
// ゲームの「はんぶん」タブで タブの 下に iframe で かさなる。

// タブ に ない がめん（わけっこ・因数 など）は ためし から ひらく（index.html?mode=○○ と おなじ setMode）。はんぶん（うえ の ½）は ながおし なので じか に
const tapTab = (p, val) => p.evaluate(v => { const b = tabBtns.find(x => x.val === v); if(!b || v === 'hanbun'){ if(taskOn) setTaskOn(false); setMode(v); return; } handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm'); }, val);
async function openHanbun(t, chars){
  const p = await t.open(chars ? { storage: { nb_hanbun: JSON.stringify({ n: 5, chars }) } } : undefined);
  await tapTab(p, 'hanbun');
  await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="hanbun.html"]'); return f && f.contentWindow && f.contentWindow.hanbun; }, null, { timeout: 5000 });
  const f = p.frames().find(x => x.url().includes('hanbun.html'));
  await f.waitForTimeout(400);      // あしもとに おりる
  return { p, f };
}
const sh0 = p => p.viewportSize().height;
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

  'ゆび 2ほんで ひろげると はんぶんこ（4 → 2 と 2、5 → 2.5 と 2.5、1 → 0.5 と 0.5、0.5 → 0.25 と 0.25）。0.01 より こまかく なる 1.25・0.25 は わけられない': async t => {
    const { f } = await openHanbun(t, [5]);
    await pinchOut(f, 0);
    t.eq(await vals(f), [2.5, 2.5], '5 が わかれない');
    t.ok((await f.evaluate(() => hanbun.say())).includes('2.5 は「2 と はんぶん」'), 'ことば ' + await f.evaluate(() => hanbun.say()));
    await f.evaluate(() => { hanbun.clear(); hanbun.add(1.25); });
    await f.waitForTimeout(300);
    await pinchOut(f, 0);
    t.eq(await vals(f), [1.25], '1.25 が わかれた');
    t.ok((await f.evaluate(() => hanbun.say())).includes('できないよ'), 'わけられない ことば ' + await f.evaluate(() => hanbun.say()));
    await f.evaluate(() => { hanbun.clear(); hanbun.add(4); hanbun.add(1); });
    await f.waitForTimeout(400);
    await pinchOut(f, 0); await f.waitForTimeout(300); await pinchOut(f, (await vals(f)).indexOf(1));
    t.eq((await vals(f)).slice().sort(), [0.5, 0.5, 2, 2], '4・1 が わかれない');
    await f.waitForTimeout(300);
    const i = (await vals(f)).indexOf(0.5);
    await pinchOut(f, i);
    t.eq((await vals(f)).filter(v => v === 0.25).length, 2, '0.5 が 0.25 と 0.25 に わかれない');
    t.ok((await f.evaluate(() => hanbun.say())).includes('0.25 は「はんぶん の はんぶん」'), 'ことば ' + await f.evaluate(() => hanbun.say()));
  },

  '0.1〜0.9：1 を ダブルタップ すると 0.1 が 10こ。かさねて あつめると また 1。0.4 は 0.2 と 0.2、0.3 は 0.15 と 0.15': async t => {
    const { f } = await openHanbun(t, [1]);
    const a = await f.evaluate(() => hanbun.at(0));
    for(let k = 0; k < 2; k++){ await ptr(f, 'pointerdown', 1, a.x, a.y); await ptr(f, 'pointerup', 1, a.x, a.y); await f.waitForTimeout(80); }
    t.eq(await vals(f), Array(10).fill(0.1), 'パラパラ しない');
    t.ok((await f.evaluate(() => hanbun.say())).includes('0.1 が 10こ'), 'ことば');
    // 0.1 を ひとつずつ あつめる（0.1 ＋ 0.2 が 0.30000000000000004 に ならない）
    for(let k = 0; k < 9; k++) await f.evaluate(() => hanbun.merge(0, 1));
    t.eq(await vals(f), [1], '1 に もどらない');
    t.ok((await f.evaluate(() => hanbun.say())).startsWith('0.9 ＋ 0.1 ＝ 1'), 'しき ' + await f.evaluate(() => hanbun.say()));
    await f.evaluate(() => { hanbun.clear(); hanbun.add(0.4); hanbun.add(0.3); });
    await f.evaluate(() => hanbun.split(0));
    t.eq(await vals(f), [0.2, 0.2, 0.3], '0.4 が わかれない');
    await f.evaluate(() => hanbun.split(2));
    t.eq(await vals(f), [0.2, 0.2, 0.15, 0.15], '0.3 が 0.15 と 0.15 に わかれない');
    await f.evaluate(() => { hanbun.clear(); hanbun.add(0.3); hanbun.add(0.7); hanbun.merge(0, 1); });
    t.eq(await vals(f), [1], '0.3 ＋ 0.7');
    t.ok((await f.evaluate(() => hanbun.say())).includes('いっぱい'), 'いっぱい の ことば');
    await f.evaluate(() => { hanbun.clear(); hanbun.add(2); hanbun.add(0.3); hanbun.merge(1, 0); });
    t.eq(await vals(f), [2.3], '2 ＋ 0.3');
    t.ok((await f.evaluate(() => hanbun.say())).includes('2.3 は「2 と 0.3」'), 'よみかた');
  },

  'みず：スマホを かたむけると ガラスの みずが すいへいを たもつ（センサーは はじめから オン）。ためし で しまった せってい が すぐ きく': async t => {
    const { p, f } = await openHanbun(t, [0.5, 2.3]);
    // ゆるしが いる ブラウザ（iPhone・Chromium 153〜）では さいしょに さわった とき に きく
    if(await f.evaluate(() => typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function')){
      await p.mouse.click(20, sh0(p) - 20);
      await f.waitForFunction(() => Mizu.sens.on, null, { timeout: 3000 }).catch(() => {});
    }
    t.ok(await f.evaluate(() => Mizu.sens.on && Mizu.opt.sensor), 'センサーが オンに ならない');
    t.ok((await p.evaluate(() => document.querySelector('iframe[src^="hanbun.html"]').allow)).includes('accelerometer'), 'iframe で センサーが つかえない');
    await f.evaluate(() => { const a = 25*Math.PI/180; Mizu.grav(-Math.sin(a)*9.8, Math.cos(a)*9.8); });
    await f.waitForTimeout(2000);
    const th = await f.evaluate(() => [hanbun.water(0).th, hanbun.water(1).th]);
    t.ok(th.every(x => Math.abs(x + 25*Math.PI/180) < 0.1), 'かたむかない ' + th);
    // ためし の「はんぶんに つかう」＝ ほかの ページで nb_mizu を しまう → すぐ きく
    await p.evaluate(() => localStorage.setItem('nb_mizu', JSON.stringify({ k: 40, damp: 12, wave: 0, shk: 0, smooth: 10, level: false, sensor: true })));
    await f.waitForFunction(() => Mizu.opt.k === 40 && Mizu.opt.level === false, null, { timeout: 3000 });
    await f.waitForTimeout(2500);
    t.ok(Math.abs(await f.evaluate(() => hanbun.water(0).th)) < 0.1, 'すいへい を けしても かたむいた まま');
  },

  'ひろげて いる あいだは まだ わかれず、2ひきが ゆびさきに くっついて くる。ゆびを はなすと そこで わかれる。もどすと もとどおり': async t => {
    const { f } = await openHanbun(t, [4]);
    const a = await f.evaluate(() => hanbun.at(0));
    await ptr(f, 'pointerdown', 1, a.x - 4, a.y); await ptr(f, 'pointerdown', 2, a.x + 4, a.y);
    for(let k = 1; k <= 8; k++){ await ptr(f, 'pointermove', 1, a.x - 4 - k*9, a.y + k*3); await ptr(f, 'pointermove', 2, a.x + 4 + k*9, a.y - k*3); }
    t.eq(await vals(f), [4], 'はなす まえに わかれた');
    const pv = await f.evaluate(() => hanbun.preview());
    t.ok(pv && pv.length === 2 && pv.every(c => c.v === 2), 'ゆびに 2ひきが ついて こない ' + JSON.stringify(pv));
    t.ok(Math.hypot(pv[0].x - (a.x - 76), pv[0].y - (a.y + 24)) < 3 && Math.hypot(pv[1].x - (a.x + 76), pv[1].y - (a.y - 24)) < 3, 'ゆびさきに いない ' + JSON.stringify(pv));
    // ゆびを ちかづけると もとに もどる、また ひろげると つく
    await ptr(f, 'pointermove', 1, a.x - 6, a.y); await ptr(f, 'pointermove', 2, a.x + 6, a.y);
    t.eq(await f.evaluate(() => hanbun.preview()), null, 'もどしても わかれた まま');
    await ptr(f, 'pointermove', 1, a.x - 80, a.y); await ptr(f, 'pointermove', 2, a.x + 80, a.y);
    await ptr(f, 'pointerup', 1, a.x - 80, a.y); await ptr(f, 'pointerup', 2, a.x + 80, a.y);
    t.eq(await vals(f), [2, 2], 'はなしても わかれない');
    await f.waitForTimeout(600);
    const m = await f.evaluate(() => [hanbun.at(0), hanbun.at(1)]);
    t.ok(Math.abs(m[0].x - (a.x - 80)) < 12 && Math.abs(m[1].x - (a.x + 80)) < 12, 'はなした ところに いない ' + JSON.stringify(m));
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
    await f.waitForTimeout(80);      // ひかるのは つぎの フレーム
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

  'だす・かたづける（ながおし）。はんぶんの キャラも ぶたいの 中に おさまる': async t => {
    const { p, f } = await openHanbun(t, []);
    t.eq(await f.evaluate(() => [...document.querySelectorAll('#nums button')].map(b => b.textContent)), ['0.01', '0.05', '0.1', '0.5', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'かたづける'], 'ボタン');
    await f.evaluate(() => { [...document.querySelectorAll('#nums button')].find(b => b.textContent === '7').click(); [...document.querySelectorAll('#nums button')].find(b => b.textContent === '0.5').click(); });
    t.eq(await vals(f), [7, 0.5], 'だす');
    await f.evaluate(() => { hanbun.clear(); [0.5, 2.5, 3.5, 6.5, 7.5, 10.5, 20.5, 99.5].forEach(v => hanbun.add(v)); });
    await f.waitForTimeout(1500);
    const r = await f.evaluate(() => { const W = document.getElementById('c').clientWidth, H = document.getElementById('c').clientHeight;
      return hanbun.chars().map((v, i) => { const a = hanbun.at(i); return [v, a.x - a.w/2 >= 0 && a.x + a.w/2 <= W && a.y - a.h/2 >= 0 && a.y + a.h/2 <= H]; }).filter(x => !x[1]); });
    t.eq(r, [], 'はみだす');
    await f.click('#clear');                                        // ちょん と おした だけ では かたづけない
    t.eq((await vals(f)).length, 8, 'ちょん で かたづいた');
    const cb = await f.evaluate(() => { const r = document.getElementById('clear').getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; });
    const fb = await (await f.frameElement()).boundingBox();
    await p.mouse.move(fb.x + cb[0], fb.y + cb[1]); await p.mouse.down(); await f.waitForTimeout(1000); await p.mouse.up();
    t.eq(await vals(f), [], 'ながおし で かたづけない');
  },

  'ダブルタップ：10 → 1 が 10こ、100 → 10 が 10こ。なわ で かこむ と ぜんぶ くっつく（0.1 が 10こ で 1）。0.01 は はんぶんこ できない。よみあげ は れい てん に ご': async t => {
    const { f } = await openHanbun(t, []);
    const r = await f.evaluate(() => {
      hanbun.add(10); hanbun.scatter(0); const a = hanbun.chars().slice();
      hanbun.clear(); hanbun.add(100); hanbun.scatter(0); const b = hanbun.chars().slice();
      hanbun.clear(); for(let i = 0; i < 10; i++) hanbun.add(0.1);
      hanbun.mergeMany([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); const c = [hanbun.chars(), hanbun.say()];
      hanbun.clear(); hanbun.add(0.01); hanbun.split(0); const d = hanbun.chars();
      hanbun.clear(); document.querySelector('#nums button').click(); const e = hanbun.lastTalk();
      return { a, b, c, d, e };
    });
    t.eq(r.a, Array(10).fill(1), '10 が 1 の 10こ に ならない');
    t.eq(r.b, Array(10).fill(10), '100 が 10 の 10こ に ならない');
    t.eq(r.c[0], [1], 'なわ で 0.1 が 10こ を かこんでも 1 に ならない');
    t.ok(r.c[1].includes('0.1 が 10こ で 1'), 'ことば ' + r.c[1]);
    t.eq(r.d, [0.01], '0.01 が わかれた');
    t.eq(r.e, 'れい てん れい いち', 'よみあげ が ちがう');
  },

  'ストーリー（ためし）：クラブまつりの 導入。はじめから じゆうに わけると スタンプ（お手本なし）。nb_hanbun は かわらない': async t => {
    const p = await t.open({ storage: { nb_hanbun: JSON.stringify({ chars: [3] }) } });
    await tapTab(p, 'story');
    await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="hanbun.html"]'); return f && f.contentWindow && f.contentWindow.hanbun && f.contentWindow.hanbun.story(); }, null, { timeout: 5000 });
    const f = p.frames().find(x => x.url().includes('story=1'));
    await f.waitForTimeout(300);
    const st0 = await f.evaluate(() => hanbun.story());
    t.eq([st0.ch, st0.step, st0.done], [0, 0, false], '導入が はじまらない');
    t.eq(await vals(f), [5], 'ホストの 5 から ではない');
    t.ok((await f.evaluate(() => hanbun.say())).includes('クラブまつり'), 'あいさつの ことば');
    await f.evaluate(() => hanbun.storyNext());
    await f.waitForFunction(() => hanbun.story().step === 2, null, { timeout: 6000 });
    t.eq(await vals(f), [5], 'おてほん で 5 に もどらない');
    await pinchOut(f, 0);
    t.eq(await vals(f), [2.5, 2.5], 'わけられない');
    t.eq((await f.evaluate(() => hanbun.story())).done, true, 'スタンプが つかない');
    t.ok((await f.evaluate(() => hanbun.say())).includes('スタンプ'), 'スタンプの ことば');
    t.eq(await f.evaluate(() => JSON.parse(localStorage.getItem('nb_hanbun')).chars), [3], 'nb_hanbun が かわった');
  },

  'ストーリー つづき：しかく・ステップ・ながしかく の 3章が スタンプまで すすむ（nb_story に おぼえる）': async t => {
    const p = await t.open({ storage: { nb_story: JSON.stringify({ done: [0] }) } });
    await tapTab(p, 'story');
    await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="hanbun.html"]'); return f && f.contentWindow && f.contentWindow.hanbun && f.contentWindow.hanbun.story(); }, null, { timeout: 5000 });
    const f = p.frames().find(x => x.url().includes('story=1'));
    await f.waitForTimeout(300);
    t.eq((await f.evaluate(() => hanbun.story())).select, true, '入り口の えらぶ が でない');
    await f.evaluate(() => hanbun.storyNext());
    t.eq((await f.evaluate(() => hanbun.story())).ch, 1, '第1章から はじまらない');
    t.eq(await vals(f), [2], 'しかく：2 から ではない');
    await f.evaluate(() => hanbun.square(0));
    await f.waitForFunction(() => hanbun.chars()[0] === 3, null, { timeout: 5000 });
    t.eq(await vals(f), [3], 'しかく：2→4 の つぎは 3 の はず');
    await f.evaluate(() => hanbun.square(0));
    await f.waitForFunction(() => hanbun.chars()[0] === 4, null, { timeout: 5000 });
    t.eq(await vals(f), [4], 'しかく：3→9 の つぎは 4 の はず');
    await f.evaluate(() => hanbun.square(0));
    await f.waitForFunction(() => hanbun.chars()[0] === 5, null, { timeout: 5000 });
    t.eq(await vals(f), [5], 'しかく：4→16 の つぎは 5 の はず');
    await f.evaluate(() => hanbun.square(0));
    t.eq((await f.evaluate(() => hanbun.story())).done, true, 'しかく：スタンプが つかない');
    await f.evaluate(() => hanbun.storyNext());
    t.eq((await f.evaluate(() => hanbun.story())).ch, 2, '第2章へ すすまない');
    t.eq(await vals(f), [], 'ステップ：からっぽ から ではない');
    await f.evaluate(() => { for(const v of [1, 2, 3, 4, 5]) hanbun.add(v); });
    await f.evaluate(() => hanbun.mergeMany([0, 1, 2, 3, 4]));
    t.eq((await f.evaluate(() => hanbun.story())).done, true, 'ステップ：スタンプが つかない');
    await f.evaluate(() => hanbun.storyNext());
    t.eq(await vals(f), [6], 'ながしかく：6 から ではない');
    await f.evaluate(() => hanbun.mirror(0));
    t.eq(await vals(f), [6, 6], 'ミラーで ふえない');
    await f.evaluate(() => hanbun.merge(0, 1));
    await f.waitForFunction(() => hanbun.chars()[0] === 4, null, { timeout: 5000 });
    t.eq(await vals(f), [4], 'ながしかく：12 の つぎは 4 の はず');
    await f.evaluate(() => { hanbun.mirror(0); hanbun.mirror(0); });
    t.eq((await vals(f)).length, 3, '4 が 3ひきに ならない');
    await f.evaluate(() => hanbun.mergeMany([0, 1, 2]));
    await f.waitForFunction(() => hanbun.chars()[0] === 3, null, { timeout: 5000 });
    t.eq(await vals(f), [3], 'ながしかく：つぎは 3 の はず');
    await f.evaluate(() => { hanbun.mirror(0); hanbun.mirror(0); hanbun.mirror(0); });
    await f.evaluate(() => hanbun.mergeMany([0, 1, 2, 3]));
    await f.waitForFunction(() => hanbun.chars()[0] === 12, null, { timeout: 5000 });
    t.eq(await vals(f), [12], 'ながしかく：さいごは 12 の はず');
    await f.waitForFunction(() => !hanbun.story().busy, null, { timeout: 5000 });
    await f.evaluate(() => hanbun.split(0));
    t.eq((await f.evaluate(() => hanbun.story())).done, true, 'ながしかく：スタンプが つかない');
    t.eq(await f.evaluate(() => hanbun.story().prog), [0, 1, 2, 3], 'スタンプ帳が たまらない');
  },

  'ストーリー 入り口：「はじめから」で スタンプ帳が けえて 導入に もどる': async t => {
    const p = await t.open({ storage: { nb_story: JSON.stringify({ done: [0, 1] }) } });
    await tapTab(p, 'story');
    await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="hanbun.html"]'); return f && f.contentWindow && f.contentWindow.hanbun && f.contentWindow.hanbun.story(); }, null, { timeout: 5000 });
    const f = p.frames().find(x => x.url().includes('story=1'));
    await f.waitForTimeout(300);
    t.eq((await f.evaluate(() => hanbun.story())).select, true, '入り口の えらぶ が でない');
    await f.evaluate(() => document.getElementById('gskip').click());
    const s2 = await f.evaluate(() => hanbun.story());
    t.eq([s2.ch, s2.step, s2.prog.length], [0, 0, 0], 'はじめからに ならない');
    t.eq(await f.evaluate(() => JSON.parse(localStorage.getItem('nb_story')).done), [], 'nb_story が けえていない');
  },

  'ストーリー 後半：第4章〜フィナーレ（ピクニック）が スタンプまで すすむ': async t => {
    const p = await t.open({ storage: { nb_story: JSON.stringify({ done: [0, 1, 2, 3] }) } });
    await tapTab(p, 'story');
    await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="hanbun.html"]'); return f && f.contentWindow && f.contentWindow.hanbun && f.contentWindow.hanbun.story(); }, null, { timeout: 5000 });
    const f = p.frames().find(x => x.url().includes('story=1'));
    await f.waitForTimeout(300);
    await f.evaluate(() => hanbun.storyNext());
    t.eq((await f.evaluate(() => hanbun.story())).ch, 4, '第4章から はじまらない');
    for(const [v, nx] of [[6, 7], [7, 8], [8, 9], [9, 0]]){
      await f.evaluate(() => hanbun.split(0));
      if(nx) await f.waitForFunction(n => hanbun.chars()[0] === n, nx, { timeout: 5000 });
    }
    t.eq((await f.evaluate(() => hanbun.story())).done, true, 'きすう・ぐうすう：スタンプが つかない');
    await f.evaluate(() => hanbun.storyNext());
    t.eq(await vals(f), [4], 'ダブル：4 から ではない');
    await f.evaluate(() => hanbun.mirror(0));
    await f.evaluate(() => hanbun.merge(0, 1));
    await f.waitForFunction(() => hanbun.chars()[0] === 4 && !hanbun.story().busy, null, { timeout: 5000 });
    await f.evaluate(() => { hanbun.mirror(0); hanbun.mirror(0); });
    await f.evaluate(() => hanbun.mergeMany([0, 1, 2]));
    await f.waitForFunction(() => hanbun.chars()[0] === 4 && !hanbun.story().busy, null, { timeout: 5000 });
    await f.evaluate(() => { hanbun.mirror(0); hanbun.mirror(0); hanbun.mirror(0); });
    await f.evaluate(() => hanbun.mergeMany([0, 1, 2, 3]));
    await f.waitForFunction(() => hanbun.chars()[0] === 2.5, null, { timeout: 5000 });
    await f.evaluate(() => hanbun.mirror(0));
    await f.evaluate(() => hanbun.merge(0, 1));
    t.eq((await f.evaluate(() => hanbun.story())).done, true, 'ダブル：スタンプが つかない');
    await f.evaluate(() => hanbun.storyNext());
    t.eq(await vals(f), [7.5], 'サラダ：7.5 から ではない');
    await f.evaluate(() => hanbun.split(0));
    await f.waitForFunction(() => hanbun.chars()[0] === 7.5 && !hanbun.story().busy, null, { timeout: 5000 });
    await f.evaluate(() => { hanbun.clear(); hanbun.add(7); hanbun.add(0.5); });
    await f.waitForFunction(() => hanbun.chars()[0] === 7.5 && !hanbun.story().busy, null, { timeout: 5000 });
    await f.evaluate(() => { hanbun.clear(); hanbun.add(5); hanbun.add(2.5); });
    await f.waitForFunction(() => hanbun.chars()[0] === 1, null, { timeout: 5000 });
    await f.evaluate(() => hanbun.scatter(0));
    await f.waitForTimeout(400);
    await f.evaluate(() => hanbun.mergeMany([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    await f.waitForFunction(() => hanbun.chars()[0] === 2.75, null, { timeout: 5000 });
    await f.evaluate(() => hanbun.tap(0));
    t.eq((await f.evaluate(() => hanbun.story())).done, true, 'サラダ：スタンプが つかない');
    await f.evaluate(() => hanbun.storyNext());
    await f.evaluate(() => hanbun.tap(1));
    await f.waitForFunction(() => hanbun.chars()[0] === 4, null, { timeout: 5000 });
    await f.evaluate(() => hanbun.square(0));
    t.eq((await f.evaluate(() => hanbun.story())).done, true, 'たんてい：スタンプが つかない');
    await f.evaluate(() => hanbun.storyNext());
    t.eq((await f.evaluate(() => hanbun.story())).ch, 8, 'フィナーレに すすまない');
    await f.evaluate(() => hanbun.square(0));
    await f.waitForFunction(() => !hanbun.story().busy, null, { timeout: 5000 });
    await f.evaluate(() => hanbun.split(0));
    await f.waitForFunction(() => hanbun.chars()[0] === 4, null, { timeout: 5000 });
    await f.evaluate(() => { hanbun.mirror(0); hanbun.mirror(0); hanbun.mirror(0); });
    await f.evaluate(() => hanbun.mergeMany([0, 1, 2, 3]));
    await f.waitForFunction(() => hanbun.chars()[0] === 8 && !hanbun.story().busy, null, { timeout: 5000 });
    await f.evaluate(() => hanbun.mirror(0));
    await f.evaluate(() => hanbun.merge(0, 1));
    t.eq((await f.evaluate(() => hanbun.story())).done, true, 'ピクニック：スタンプが つかない');
    t.eq(await f.evaluate(() => hanbun.story().prog), [0, 1, 2, 3, 4, 5, 6, 7, 8], 'スタンプ帳が そろわない');
  },
};
