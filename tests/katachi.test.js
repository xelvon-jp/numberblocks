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
    t.eq(await p.evaluate(() => [mode, katachiIdx, kArea(KATACHI[0])]), ['x', 0, 12], 'かたち が はじまらない');
    await p.evaluate(() => { spawnBlock(4); spawnBlock(3); fuseBlocks(blocks[0], blocks[1]); });
    await p.waitForTimeout(300);
    const r = await dropOnShape(p, 12);
    t.eq([r.n, r.done, r.msg], [0, true, 'ぴったり！ よこ 4 × たて 3 ＝ 12'], 'ぴったり に ならない');
    await p.waitForTimeout(900);
    const nx = await p.evaluate(() => { const b = kNextBtn(); handleStart(b.x + b.w/2, b.y + b.h/2, 8); handleEnd(b.x + b.w/2, b.y + b.h/2, 8); return [katachiIdx, kst.done]; });
    t.eq(nx, [1, false], 'つぎへ で すすまない');
  },

  'かたち：ちがう かず は「あと ○ マス」「○ マス おおい」で キャラ は のこる。2かい で 🛠️ こうさくしつ → ながしかく に すると ヒント、もどる で とじる': async t => {
    const p = await openK(t);
    await p.evaluate(() => { spawnBlock(10); spawnBlock(7); });
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
    t.ok(src && src.startsWith('lab-menseki.html?embed=1&kind=rect&w=4&h=3'), 'こうさくしつ が ひらかない ' + src);
    const fr = await (await p.waitForSelector('iframe[src^="lab-menseki.html"]')).contentFrame();
    await fr.waitForFunction(() => window.men);
    const inner = await fr.evaluate(() => { const ids = men.pieces().map(q => q.id), n0 = ids.length; ids.forEach((id, k) => men.moveTo(id, 2, 2 + k)); return [n0, men.done(), !!document.getElementById('bk')]; });
    t.eq(inner, [3, true, true], 'こうさくしつ で ぼう 3ぼん の ながしかく に ならない');
    await p.waitForTimeout(200);
    t.eq(await p.evaluate(() => kst.hint), { w: 4, h: 3, half: false }, 'ヒント が ゲーム に こない');
    await fr.click('#bk');
    await p.waitForTimeout(200);
    t.eq(await p.evaluate(() => [!!kousakuFrame, document.querySelectorAll('iframe[src^="lab-menseki"]').length]), [false, 0], 'もどる で とじない');
  },

  'かたち：さんかく は ÷2 の かず（4 × 3 ÷ 2 ＝ 6）。こうさくしつ は かがみ つき。タブ を おすと おわる': async t => {
    const p = await openK(t);
    const r = await p.evaluate(() => { katachiStart(3); spawnBlock(6); return [KATACHI[3].kind, kArea(KATACHI[3])]; });
    t.eq(r, ['rtri', 6], 'ちょっかく さんかく で ない');
    await p.waitForTimeout(300);
    t.eq((await dropOnShape(p, 6)).msg, 'ぴったり！ ていへん 4 × たかさ 3 ÷ 2 ＝ 6', 'さんかく が ぴったり に ならない');
    const half = await p.evaluate(() => { katachiStart(12); return kArea(KATACHI[12]); });
    t.eq(half, 7.5, '5 × 3 ÷ 2 が 7.5 で ない');
    await p.evaluate(() => { openKousaku(); });
    const fr = await (await p.waitForSelector('iframe[src^="lab-menseki.html"]')).contentFrame();
    await fr.waitForFunction(() => window.men);
    const m = await fr.evaluate(() => { const [tr] = men.pieces(); const d = men.mirror(tr.id); men.rotate(d); return [men.copies(), document.getElementById('rot').style.visibility]; });
    t.eq(m, [1, 'visible'], 'こうさくしつ に かがみ・まわす が ない');
    await p.evaluate(() => { drawTabsAndUI(ctx); const b = tabBtns.find(x => x.val === 'calc'); handleStart(b.x + b.w/2, b.y + b.h/2, 's'); });
    t.eq(await p.evaluate(() => [katachiOn, !!kousakuFrame]), [false, false], 'タブ で おわらない');
  },
};
