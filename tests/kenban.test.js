// けんばん（kenban.html）：キーボードの おもちゃの しろい けんばん（ひだりから 1〜15）を ひくと その かずの キャラが でる。
// せっていの「けんばん」から ひらき、タブの 下に iframe で かさなる。

async function openKenban(t, o){
  const p = await t.open(o);
  await p.evaluate(() => { setOpen = true; drawSettings(ctx); const b = setBtns.find(x => x.val === 'kenban'); handleStart(b.x + b.w/2, b.y + b.h/2, 's'); });
  await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="kenban.html"]'); return f && f.contentWindow && f.contentWindow.kenban; }, null, { timeout: 5000 });
  const f = p.frames().find(x => x.url().includes('kenban.html'));
  await f.evaluate(() => document.getElementById('startBox').classList.remove('on'));   // テストでは マイクを つかわない
  return { p, f };
}
const vis = p => p.evaluate(() => { const f = document.querySelector('iframe[src^="kenban.html"]'); return f ? f.style.visibility : 'none'; });
const WHITE = [176.5, 197.6, 222.6, 249.4, 264.1, 296.2, 332.8, 349.6, 392.4, 441.6, 495.7, 525, 589.4, 665.2, 703.9];
const BLACK = [186.6, 209.2, 236, 279.5, 314.1, 370.3, 416.8, 467.8, 557.1, 625.8];

module.exports = {
  'せっていの「けんばん」で タブの 下に ひらき、タブを おすと もどる': async t => {
    const { p } = await openKenban(t);
    t.eq([await p.evaluate(() => [mode, setOpen]), await vis(p)], [['kenban', false], 'visible'], 'ひらかない');
    t.ok(await p.evaluate(() => document.querySelector('iframe[src^="kenban.html"]').getBoundingClientRect().top === TAB_H), 'タブの 下から はじまらない');
    await p.evaluate(() => { const b = tabBtns.find(x => x.val === 'calc'); handleStart(b.x + b.w/2, b.y + b.h/2, 'm'); handleEnd(b.x + b.w/2, b.y + b.h/2, 'm'); });
    await p.waitForTimeout(100);
    t.eq(await vis(p), 'hidden', 'タブで もどらない');
  },

  'しろい けんばんは 1〜15、くろい けんばんは なし、はずれた おとも なし': async t => {
    const { f } = await openKenban(t);
    const r = await f.evaluate(([W, B]) => ({
      w: W.map(x => { const k = kenban.whichKey(x*1.004); return k && k.white !== undefined ? k.white + 1 : null; }),
      b: B.map(x => { const k = kenban.whichKey(x*0.997); return k && k.black !== undefined ? 'b' : null; }),
      off: [100, 900, 176.5*Math.pow(2, 0.5/12)].map(x => kenban.whichKey(x)),
    }), [WHITE, BLACK]);
    t.eq(r.w, [...Array(15)].map((_, i) => i + 1), 'しろ');
    t.eq(r.b, BLACK.map(() => 'b'), 'くろ');
    t.eq(r.off, [null, null, null], 'はずれ');
  },

  'ひくと その かずの キャラが まんなかと けんばんの うえに でる。くろい けんばんでは でない。かたづける で きえる': async t => {
    const { f } = await openKenban(t);
    await f.evaluate(([W, B]) => { kenban.onNote(W[2]); kenban.onNote(W[4]); kenban.onNote(B[0]); }, [WHITE, BLACK]);
    t.eq(await f.evaluate(() => [Object.keys(kenban.standing()), kenban.big().n]), [['3', '5'], 5], 'キャラ');
    await f.click('#clear');
    t.eq(await f.evaluate(() => [Object.keys(kenban.standing()), kenban.big()]), [[], null], 'かたづけ');
  },

  'おぼえなおす：しろい 15こを ひだりから ならすと おぼえて、くろいのは あいだに きまる。ひらきなおしても のこる': async t => {
    const { p, f } = await openKenban(t);
    await f.click('#relearn');
    t.ok(await f.evaluate(() => document.getElementById('learnTip').classList.contains('on') && /1ばんめ/.test(document.querySelector('#learnTip .big').textContent)), 'おぼえる しらせ');
    // ぜんたいに 半音 たかい キーボード
    await f.evaluate(W => W.forEach(x => kenban.onNote(x*Math.pow(2, 1/12))), WHITE);
    const r = await f.evaluate(() => ({ learning: kenban.learning(), w: kenban.tune().white.length, b: kenban.tune().black.length,
                                         k1: kenban.whichKey(176.5*Math.pow(2, 1/12)), kOld: kenban.whichKey(176.5) }));
    t.eq([r.learning, r.w, r.b, r.k1, r.kOld], [null, 15, 10, { white: 0 }, null], 'おぼえなおし');
    await p.reload(); await p.waitForFunction(() => typeof drawFrame === 'function');
    await p.evaluate(() => { whoOpen = false; setOpen = true; drawSettings(ctx); const b = setBtns.find(x => x.val === 'kenban'); handleStart(b.x + b.w/2, b.y + b.h/2, 's'); });
    await p.waitForFunction(() => { const fr = document.querySelector('iframe[src^="kenban.html"]'); return fr && fr.contentWindow && fr.contentWindow.kenban; });
    const f2 = p.frames().find(x => x.url().includes('kenban.html'));
    t.eq(await f2.evaluate(() => kenban.whichKey(176.5*Math.pow(2, 1/12))), { white: 0 }, 'のこらない');
  },

  'たかさ：おもちゃの ような おと（しかく・のこぎり）でも ぜんぶの けんばんを あてる': async t => {
    const { f } = await openKenban(t);
    const bad = await f.evaluate(([W, B]) => {
      kenban.setSr(48000);
      const waves = { square: ph => (ph % 1) < 0.5 ? 1 : -1, saw: ph => 2*(ph % 1) - 1 };
      const out = [];
      for(const [nm, w] of Object.entries(waves)) W.concat(B).forEach((fq, i) => {
        const x = new Float32Array(1024); for(let j = 0; j < 1024; j++) x[j] = 0.3*w(fq*j/48000) + 0.003*(Math.random()*2 - 1);
        const p = kenban.pitch(x), k = p && kenban.whichKey(p.f);
        const want = i < 15 ? { white: i } : { black: i - 15 };
        if(JSON.stringify(k) !== JSON.stringify(want)) out.push(nm + ' ' + fq + ' → ' + JSON.stringify(k));
      });
      return out;
    }, [WHITE, BLACK]);
    t.eq(bad, [], 'あてられない');
  },
};
