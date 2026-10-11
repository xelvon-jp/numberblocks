// わけっこ（waru.html）：ぜんぶの かずを いくつずつ に わけると、グループが なんこ・あまりが なんこ。
// ゲームの「わけっこ」タブで タブの 下に iframe で かさなる。

const tapTab = (p, val) => p.evaluate(v => { const b = tabBtns.find(x => x.val === v); handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm'); }, val);
async function openWaru(t, o){
  const p = await t.open(o);
  await tapTab(p, 'waru');
  await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="waru.html"]'); return f && f.contentWindow && f.contentWindow.waru; }, null, { timeout: 5000 });
  const f = p.frames().find(x => x.url().includes('waru.html'));
  await f.waitForTimeout(150);
  return { p, f };
}
const vis = p => p.evaluate(() => { const f = document.querySelector('iframe[src^="waru.html"]'); return f ? f.style.visibility : 'none'; });
const say = f => f.evaluate(() => document.querySelector('#say').innerText.replace(/\s+/g, ' ').trim());
// よそうを とばして わけきる（「わけてみる！」→ きこえた → おわり）
async function split(f){
  await f.evaluate(() => { waru.start(); waru.heard(); });
  await f.waitForFunction(() => waru.phase() === 'run' || waru.phase() === 'done', null, { timeout: 2000 });
  await f.evaluate(() => waru.finish());
  await f.waitForFunction(() => waru.phase() === 'done', null, { timeout: 2000 });
  await f.waitForTimeout(50);
}
const chips = f => f.evaluate(() => [...document.querySelectorAll('#memo .chip')].map(c => c.textContent + (c.classList.contains('just') ? '★' : '')));

module.exports = {
  'タブで ひらくと タブの 下に かさなり、ほかの タブ・せってい では かくれる。もどると まえの かずの まま': async t => {
    const { p, f } = await openWaru(t);
    t.eq(await vis(p), 'visible', 'わけっこで 見えない');
    t.ok(await p.evaluate(() => document.querySelector('iframe[src^="waru.html"]').getBoundingClientRect().top === TAB_H), 'タブの 下から はじまらない');
    await f.evaluate(() => { waru.setN(17); waru.setD(5); });
    await tapTab(p, 'factor'); await p.waitForTimeout(100);
    t.eq(await vis(p), 'hidden', 'ほかの タブで かくれない');
    await tapTab(p, 'waru'); await p.waitForTimeout(100);
    t.eq([await vis(p), await f.evaluate(() => [waru.st().n, waru.st().d])], ['visible', [17, 5]], 'もどったら かずが きえた');
    await tapTab(p, 'settings'); await p.waitForTimeout(100);
    t.eq(await vis(p), 'hidden', 'せっていの うしろに のこる');
  },

  'かずを かえても うごかない（まるごとの まま）。「わけてみる！」→ よそう → こえ（いった！）で わかれる。うごいて いる あいだは かえられない': async t => {
    const { f } = await openWaru(t, { storage: { nb_waru: JSON.stringify({ n: 40, d: 3, seen: {} }) } });
    await f.evaluate(() => { waru.setD(4); waru.setD(3); });
    t.eq(await f.evaluate(() => [waru.phase(), waru.busy(), waru.L().d]), ['idle', false, 40], 'かずを かえたら うごいた');
    t.eq(await say(f), '40 を 3 ずつ に わけると… 「わけてみる！」を おしてね', 'まえの ことば');
    await f.click('#go');
    t.eq(await f.evaluate(() => [waru.phase(), document.querySelector('#ask .q').textContent]), ['ask', '3 は なんこ できるかな？'], 'よそうの カード');
    await f.evaluate(() => waru.setD(5));
    t.eq(await f.evaluate(() => waru.st().d), 3, 'よそうの あいだに かえられた');
    // マイクが つかえない（テストの ブラウザ）ときは すぐ「いった！」が 出る
    await f.waitForFunction(() => document.querySelector('#ask .said').classList.contains('show'), null, { timeout: 4000 });
    await f.click('#ask .said');
    t.eq(await f.evaluate(() => document.querySelector('#ask .hint .txt').textContent), 'きこえた！', 'きこえた が 出ない');
    await f.waitForFunction(() => waru.phase() === 'run', null, { timeout: 2000 });
    await f.waitForTimeout(300);
    const mid = await f.evaluate(() => ({ busy: waru.busy(), count: waru.scene().count }));
    t.ok(mid.busy && mid.count < 13, 'すぐに ぜんぶ できて しまう: ' + JSON.stringify(mid));
    await f.evaluate(() => waru.setD(5));
    t.eq(await f.evaluate(() => waru.st().d), 3, 'うごいて いる あいだに かえられた');
    await f.waitForTimeout(2600);
    const later = await f.evaluate(() => waru.scene().count);
    t.ok(later > 0 && later < 13, 'じゅんばんに ふえない: ' + later);
    await f.waitForFunction(() => waru.phase() === 'done', null, { timeout: 8000 });
    await f.waitForTimeout(100);
    t.eq(await say(f), '40 は 3 が 13こ と あまり 1 40 ÷ 3 ＝ 13 あまり 1', 'ことば');
    t.eq(await chips(f), ['3が13と1'], 'メモ');
    t.eq(await f.evaluate(() => document.querySelector('#go').textContent), 'もういちど わけてみる', 'もういちど');
    // ぴったり
    await f.evaluate(() => waru.setD(4));
    t.eq(await f.evaluate(() => [waru.phase(), waru.L().d]), ['idle', 40], 'かえたら まるごとに もどらない');
    await split(f);
    t.eq(await say(f), '40 は 4 が 10こ ぴったり！ 40 ÷ 4 ＝ 10', 'ぴったりの ことば');
    t.eq(await chips(f), ['3が13と1', '4が10★'], 'メモ（ぴったりは 金）');
    await f.click('#memo .chip >> nth=0');
    t.eq(await f.evaluate(() => [waru.st().d, waru.phase()]), [3, 'idle'], 'メモで もどれない');
  },

  'よそうは「やめる」で もどれる。こえ オフ でも「いった！」で すすむ': async t => {
    const { f } = await openWaru(t, { storage: { nb_waru: JSON.stringify({ n: 17, d: 5, seen: {}, mic: false }) } });
    t.eq(await f.evaluate(() => document.querySelector('#mic').textContent), '🎤 こえ：オフ', 'オフの しるし');
    await f.click('#go');
    t.eq(await f.evaluate(() => [document.querySelector('#ask .hint .txt').textContent, document.querySelector('#ask').classList.contains('nomic')]),
         ['こえに だして いってから おしてね', true], 'オフの ことば');
    await f.click('#ask .cancel');
    t.eq(await f.evaluate(() => waru.phase()), 'idle', 'やめる で もどらない');
    await split(f);
    t.eq(await say(f), '17 は 5 が 3こ と あまり 2 17 ÷ 5 ＝ 3 あまり 2', '17÷5');
  },

  '1 ふやすと あまりが かわり、そろうと グループが 1つ ふえる。いくつずつ は ぜんぶ より 大きく ならない': async t => {
    const { f } = await openWaru(t, { storage: { nb_waru: JSON.stringify({ n: 41, d: 3, seen: {} }) } });
    await split(f);
    t.eq(await f.evaluate(() => [waru.L().q, waru.L().r]), [13, 2], '41');
    await f.evaluate(() => waru.setN(42)); await split(f);
    t.eq(await say(f), '42 は 3 が 14こ ぴったり！ 42 ÷ 3 ＝ 14', '42');
    await f.evaluate(() => { waru.setD(42); waru.setN(10); });
    t.eq(await f.evaluate(() => [waru.st().n, waru.st().d]), [10, 10], 'ぜんぶを へらすと いくつずつ も へる');
    t.eq(await f.evaluate(() => [document.querySelector('#spD .p').classList.contains('off'), document.querySelector('#spN .m').classList.contains('off')]), [true, false], 'ボタンの おせない しるし');
    // いくつずつ ＝ ぜんぶ は うごかずに すぐ こたえ
    await split(f);
    t.eq(await say(f), '10 は 10 が 1こ ぴったり！ 10 ÷ 10 ＝ 1', '10÷10');
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
    await split(f);
    await f.evaluate(() => waru.setD(5)); await split(f);
    await p.reload(); await p.waitForFunction(() => typeof drawFrame === 'function');
    await p.evaluate(() => { whoOpen = false; });
    await tapTab(p, 'waru');
    await p.waitForFunction(() => { const fr = document.querySelector('iframe[src^="waru.html"]'); return fr && fr.contentWindow && fr.contentWindow.waru; });
    const f2 = p.frames().find(x => x.url().includes('waru.html'));
    await f2.waitForTimeout(100);
    t.eq([await f2.evaluate(() => [waru.st().n, waru.st().d]), await chips(f2)], [[40, 5], ['3が13と1', '5が8★']], 'のこらない');
  },
};
