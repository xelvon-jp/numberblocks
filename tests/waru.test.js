// わけっこ（waru.html）：ぜんぶの かずを いくつずつ に わけると、グループが なんこ・あまりが なんこ。
// ゲームの「わけっこ」タブで タブの 下に iframe で かさなる。

const tapTab = (p, val) => p.evaluate(v => { const b = tabBtns.find(x => x.val === v); handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm'); }, val);
async function openWaru(t, o){
  const p = await t.open(o);
  await tapTab(p, 'waru');
  await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="waru.html"]'); return f && f.contentWindow && f.contentWindow.waru; }, null, { timeout: 5000 });
  const f = p.frames().find(x => x.url().includes('waru.html'));
  await f.waitForTimeout(800);   // はじめの「まるごと → わける」が はじまるまで
  return { p, f };
}
const vis = p => p.evaluate(() => { const f = document.querySelector('iframe[src^="waru.html"]'); return f ? f.style.visibility : 'none'; });
const say = f => f.evaluate(() => document.querySelector('#say').innerText.replace(/\s+/g, ' ').trim());
const chips = f => f.evaluate(() => [...document.querySelectorAll('#memo .chip')].map(c => c.textContent + (c.classList.contains('just') ? '★' : '')));

module.exports = {
  'タブで ひらくと タブの 下に かさなり、ほかの タブ・せってい では かくれる。もどると まえの かずの まま': async t => {
    const { p, f } = await openWaru(t);
    t.eq(await vis(p), 'visible', 'わけっこで 見えない');
    t.ok(await p.evaluate(() => document.querySelector('iframe[src^="waru.html"]').getBoundingClientRect().top === TAB_H), 'タブの 下から はじまらない');
    await f.evaluate(() => { waru.setN(17); waru.setD(5); waru.finish(); });
    await tapTab(p, 'factor'); await p.waitForTimeout(100);
    t.eq(await vis(p), 'hidden', 'ほかの タブで かくれない');
    await tapTab(p, 'waru'); await p.waitForTimeout(100);
    t.eq([await vis(p), await f.evaluate(() => [waru.st().n, waru.st().d])], ['visible', [17, 5]], 'もどったら かずが きえた');
    await tapTab(p, 'settings'); await p.waitForTimeout(100);
    t.eq(await vis(p), 'hidden', 'せっていの うしろに のこる');
  },

  '40 を 3ずつ：13こ と あまり 1。とちゅうは 1グループずつ ふえて、おわると メモに のこる。ぴったりは 金': async t => {
    const { f } = await openWaru(t, { storage: { nb_waru: JSON.stringify({ n: 40, d: 40, seen: {} }) } });
    await f.evaluate(() => waru.finish());
    await f.evaluate(() => waru.setD(3));
    await f.waitForTimeout(250);
    const mid = await f.evaluate(() => ({ busy: waru.busy(), count: waru.scene().count }));
    t.ok(mid.busy && mid.count < 13, 'すぐに ぜんぶ できて しまう: ' + JSON.stringify(mid));
    await f.waitForTimeout(2600);
    const later = await f.evaluate(() => waru.scene().count);
    t.ok(later > 0 && later < 13, 'じゅんばんに ふえない: ' + later);
    await f.waitForFunction(() => !waru.busy(), null, { timeout: 8000 });
    await f.waitForTimeout(100);
    t.eq(await say(f), '40 は 3 が 13こ と あまり 1 40 ÷ 3 ＝ 13 あまり 1', 'ことば');
    t.eq(await chips(f), ['3が13と1'], 'メモ');
    await f.evaluate(() => { waru.setD(4); waru.finish(); }); await f.waitForTimeout(100);
    t.eq(await say(f), '40 は 4 が 10こ ぴったり！ 40 ÷ 4 ＝ 10', 'ぴったりの ことば');
    t.eq(await chips(f), ['3が13と1', '4が10★'], 'メモ（ぴったりは 金）');
    // メモを おすと その かずに もどる
    await f.click('#memo .chip >> nth=0'); await f.evaluate(() => waru.finish()); await f.waitForTimeout(100);
    t.eq(await f.evaluate(() => waru.st().d), 3, 'メモで もどれない');
  },

  '1 ふやすと あまりだけ かわり、あまりが いくつずつ に なったら グループが 1つ ふえる': async t => {
    const { f } = await openWaru(t, { storage: { nb_waru: JSON.stringify({ n: 40, d: 3, seen: {} }) } });
    await f.evaluate(() => waru.finish());
    await f.evaluate(() => { waru.setN(41); waru.finish(); });
    t.eq(await f.evaluate(() => [waru.L().q, waru.L().r]), [13, 2], '41');
    await f.evaluate(() => waru.setN(42));
    const still = await f.evaluate(() => { const s = waru.scene(); return s.count; });
    t.eq(still, 13, 'うごかない グループは そのまま かぞえる はず');
    await f.evaluate(() => waru.finish()); await f.waitForTimeout(100);
    t.eq(await say(f), '42 は 3 が 14こ ぴったり！ 42 ÷ 3 ＝ 14', '42');
    // いくつずつ は ぜんぶ より 大きく ならない
    await f.evaluate(() => { waru.setD(42); waru.setN(10); waru.finish(); });
    t.eq(await f.evaluate(() => [waru.st().n, waru.st().d]), [10, 10], 'ぜんぶを へらすと いくつずつ も へる');
    t.eq(await f.evaluate(() => [document.querySelector('#spD .p').classList.contains('off'), document.querySelector('#spN .m').classList.contains('off')]), [true, false], 'ボタンの おせない しるし');
  },

  'どの くみあわせ（1〜100）でも、キャラは ぶたいの 中に かさならずに おさまる': async t => {
    const { f } = await openWaru(t);
    const bad = await f.evaluate(() => {
      const W = document.getElementById('stage').clientWidth, H = document.getElementById('stage').clientHeight, out = [];
      for(let n = 1; n <= 100; n++) for(let d = 1; d <= n; d++){
        const L = waru.layout(n, d);
        const idx = new Set(); for(let i = 0; i < n; i++) if(L.cubes[i]) idx.add(i);
        if(idx.size !== n || L.cubes.length !== n){ out.push(n + '/' + d + ' cubes'); continue; }
        for(const s of L.slots){ const b = s.box; if(b.x < 0 || b.y < 0 || b.x + b.w > W + 0.5 || b.y + b.h > H + 0.5) { out.push(n + '/' + d + ' out'); break; } }
        for(let i = 0; i < L.slots.length; i++) for(let j = i + 1; j < L.slots.length; j++){
          const a = L.slots[i].box, b = L.slots[j].box;
          if(a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5){ out.push(n + '/' + d + ' overlap'); i = 1e9; break; }
        }
        if(L.q !== Math.floor(n/d) || L.r !== n % d) out.push(n + '/' + d + ' qr');
      }
      return out.slice(0, 5);
    });
    t.eq(bad, [], 'はみだす／かさなる');
  },

  'かずと メモは ひらきなおしても のこる': async t => {
    const { p, f } = await openWaru(t, { storage: { nb_waru: JSON.stringify({ n: 40, d: 3, seen: {} }) } });
    await f.evaluate(() => waru.finish()); await f.waitForTimeout(100);
    await f.evaluate(() => { waru.setD(5); waru.finish(); }); await f.waitForTimeout(100);
    await p.reload(); await p.waitForFunction(() => typeof drawFrame === 'function');
    await p.evaluate(() => { whoOpen = false; });
    await tapTab(p, 'waru');
    await p.waitForFunction(() => { const fr = document.querySelector('iframe[src^="waru.html"]'); return fr && fr.contentWindow && fr.contentWindow.waru; });
    const f2 = p.frames().find(x => x.url().includes('waru.html'));
    await f2.waitForTimeout(100);
    t.eq([await f2.evaluate(() => [waru.st().n, waru.st().d]), await chips(f2)], [[40, 5], ['3が13と1', '5が8★']], 'のこらない');
  },
};
