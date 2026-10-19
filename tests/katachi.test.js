// かたち に ぴったり（めんせき の ためし・katachi.js）：index.html?katachi=1
async function openK(t){
  const p = await t.open();
  await p.goto(p.url().split('?')[0] + '?katachi=1');
  await p.waitForFunction(() => typeof drawFrame === 'function' && katachiOn);
  await p.evaluate(() => { whoOpen = false; setQuizOn(false); });
  return p;
}
// キャラ を もって かたち の まんなか で はなす
const dropOnShape = (p, n) => p.evaluate(n => {
  const b = blocks.find(x => Num.toNumber(x.q) === n), L = kLayout(), tx = L.x + L.W/2, ty = L.y + L.H/2;
  blocks.splice(blocks.indexOf(b), 1); blocks.push(b);        // かさなって いても この キャラ を つかむ（いちばん てまえ）
  handleStart(b.cx, b.cy, 7); handleMove(tx, ty, 7); handleEnd(tx, ty, 7);
  return { n: blocks.length, msg: kst.msg, done: kst.done, miss: kst.miss, stuck: kst.stuck };
}, n);

module.exports = {
  'かたち：4 × 3 で 12 を つくって ながしかく に はなすと ぴったり。つぎへ で つぎ の かたち': async t => {
    const p = await openK(t);
    t.eq(await p.evaluate(() => [mode, katachiIdx, KATACHI_LV.length, KATACHI.length]), ['x', 0, 9, 27], 'かたち が はじまらない');
    await p.evaluate(() => katachiStart(3));     // ながしかく 4×3
    await p.evaluate(() => { spawnBlock(4); spawnBlock(3); fuseBlocks(blocks[0], blocks[1]); });
    await p.waitForTimeout(300);
    const r = await dropOnShape(p, 12);
    t.eq([r.n, r.done, r.msg], [0, true, 'ぴったり！ よこ 4 × たて 3 ＝ 12'], 'ぴったり に ならない');
    await p.waitForTimeout(900);
    const nx = await p.evaluate(() => { const b = kNextBtn(); handleStart(b.x + b.w/2, b.y + b.h/2, 8); handleEnd(b.x + b.w/2, b.y + b.h/2, 8); return [katachiIdx, kst.done]; });
    t.eq(nx, [4, false], 'つぎへ で すすまない');
  },

  'かたち：ちがう かず は「あと ○ マス」「○ マス おおい」で キャラ は のこる。2かい で 🛠️ が ゆれる → こうさくしつ で ながしかく に すると ヒント、「めんせき わかった！」で とじる': async t => {
    const p = await openK(t);
    await p.evaluate(() => { katachiStart(3); spawnBlock(10); spawnBlock(7); });
    await p.waitForTimeout(300);
    const a = await dropOnShape(p, 10);
    t.eq([a.n, a.done, a.msg, a.stuck], [2, false, 'あと 2 マス たりない', false], 'たりない とき が ちがう');
    await p.evaluate(() => { setMode('+'); fuseBlocks(blocks[0], blocks[1]); });   // 17
    await p.waitForTimeout(300);
    const b = await dropOnShape(p, 17);
    t.eq([b.n, b.msg, b.miss], [1, '5 マス おおい', 2], 'おおい とき が ちがう');
    await p.waitForTimeout(50);
    t.eq(await p.evaluate(() => kst.stuck), true, '2かい ちがって も こうさくしつ が でない');
    const src = await p.evaluate(() => { const b = kousakuBtn(); handleStart(b.x + b.w/2, b.y + b.h/2, 9); handleEnd(b.x + b.w/2, b.y + b.h/2, 9); return kousakuFrame && kousakuFrame.getAttribute('src'); });
    const sh = src && JSON.parse(decodeURIComponent(/[?&]s=([^&]*)/.exec(src)[1]));
    t.eq(sh, { kind:'rect', w:4, h:3 }, 'こうさくしつ に かたち が わたらない ' + src);
    const fr = await (await p.waitForSelector('iframe[src^="lab-menseki.html"]')).contentFrame();
    await fr.waitForFunction(() => window.men);
    const inner = await fr.evaluate(() => { const ids = men.pieces().map(q => q.id), n0 = ids.length; ids.forEach((id, k) => men.moveTo(id, 2, 2 + k));
      return [n0, men.done(), getComputedStyle(document.getElementById('ok')).display, getComputedStyle(document.querySelector('.back')).display]; });
    t.eq(inner, [3, true, 'block', 'none'], 'こうさくしつ で ぼう 3ぼん の ながしかく に ならない／「めんせき わかった！」が ない');
    await p.waitForTimeout(200);
    t.eq(await p.evaluate(() => kst.hint), '4 × 3', 'ヒント が ゲーム に こない');
    await fr.click('#ok', { force: true });   // できた あと は ゆれて いる（とまる の を またない）
    await p.waitForTimeout(200);
    t.eq(await p.evaluate(() => [!!kousakuFrame, document.querySelectorAll('iframe[src^="lab-menseki"]').length]), [false, 0], 'もどる で とじない');
  },

  'かたち：さんかく は ÷2 の かず（4 × 3 ÷ 2 ＝ 6）。こうさくしつ は ながしかく から きりだす。タブ を おすと おわる': async t => {
    const p = await openK(t);
    const r = await p.evaluate(() => { katachiStart(6); spawnBlock(6); return [KATACHI[6].kind, kArea(KATACHI[6])]; });
    t.eq(r, ['rtri', 6], 'ちょっかく さんかく で ない');
    await p.waitForTimeout(300);
    t.eq((await dropOnShape(p, 6)).msg, 'ぴったり！ ていへん 4 × たかさ 3 ÷ 2 ＝ 6', 'さんかく が ぴったり に ならない');
    const half = await p.evaluate(() => { katachiStart(11); return kArea(KATACHI[11]); });
    t.eq(half, 7.5, '5 × 3 ÷ 2 が 7.5 で ない');
    await p.evaluate(() => { openKousaku(); });
    const fr = await (await p.waitForSelector('iframe[src^="lab-menseki.html"]')).contentFrame();
    await fr.waitForFunction(() => window.men);
    // とがった さんかく 5×3：まわり の ながしかく（15）から てんせん 2ほん で きりだす → ヒント「5 × 3 の はんぶん」
    const m = await fr.evaluate(() => { const a0 = men.pieces().map(q => q.area); for(const g of men.guides()) men.cut(g[0][0], g[0][1], g[1][0], g[1][1]);
      return [a0, men.done()]; });
    t.eq(m, [[15], true], 'こうさくしつ で ながしかく から さんかく を きりだせない');
    await p.waitForTimeout(200);
    t.eq(await p.evaluate(() => kst.hint), '5 × 3 の はんぶん', 'さんかく の ヒント が ちがう');
    await p.evaluate(() => { drawTabsAndUI(ctx); const b = tabBtns.find(x => x.val === 'calc'); handleStart(b.x + b.w/2, b.y + b.h/2, 's'); });
    t.eq(await p.evaluate(() => [katachiOn, !!kousakuFrame]), [false, false], 'タブ で おわらない');
  },

  'かたち：9 レベル の ひろさ と しき（どんかく・ひしがた・だいけい・ふくざつ も）': async t => {
    const p = await openK(t);
    const r = await p.evaluate(() => KATACHI.map(s => [s.lv, Kata.area(s)]));
    t.eq(r.map(x => x[0]), [0,0,0,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8], 'レベル の じゅん が ちがう');
    t.eq(r.map(x => x[1]), [9,16,36,12,18,28,6,12,7.5,6,12,7.5,6,6,10,8,12,18,15,15,24,9,8,16,18,12,16], 'ひろさ が ちがう');
    const f = await p.evaluate(() => [12, 15, 21, 24, 26].map(i => Kata.formula(KATACHI[i])));
    t.eq(f, ['ていへん 3 × たかさ 4 ÷ 2 ＝ 6', 'たいかくせん 4 × 4 ÷ 2 ＝ 8', '（じょうてい 2 ＋ かてい 4）× たかさ 3 ÷ 2 ＝ 9', '3 × 2 ＋ 6 × 2 ＝ 18', '4 × 2 ÷ 2 ＋ 4 × 3 ＝ 16'], 'しき が ちがう');
    // ふくざつ（L の かたち）も ぴったり で いっぱい に なる
    await p.evaluate(() => { katachiStart(24); setMode('+'); spawnBlock(9); spawnBlock(9); fuseBlocks(blocks[0], blocks[1]); });
    await p.waitForTimeout(300);
    t.eq((await dropOnShape(p, 18)).done, true, 'ふくざつ な かたち が ぴったり に ならない');
  },
};
