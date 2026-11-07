// しょうすう ブロック（lab-shosublock.html・ためし）：小数を面積で見る あそび。
const openSb = async (t) => { const p = await t.open(); await p.goto(new URL('lab-shosublock.html', p.url()).href); await p.waitForTimeout(500); return p; };
const tap = (p, i, n) => p.evaluate(([i, n]) => { const b = [...document.querySelectorAll('#partsbox button')]; for(let k = 0; k < n; k++) b[i].click(); }, [i, n]);
const total = p => p.evaluate(() => document.getElementById('totaldisp').textContent);

module.exports = {
  'しょうすう：1・0.1・0.01 の ぶひんばこ と、ごうけいの ひょうじ': async t => {
    const p = await openSb(t);
    t.eq(await p.evaluate(() => document.querySelectorAll('#partsbox button').length), 3, 'ぶひんばこが 3つ ない');
    await tap(p, 0, 1); await tap(p, 1, 2); await tap(p, 2, 3);
    await p.waitForTimeout(300);
    t.eq(await total(p), 'いま 1.23', 'ごうけいが 1.23 でない ' + await total(p));
  },

  'しょうすう：0.01 が 10こ たまると 0.1 の ぼう に くりあがる': async t => {
    const p = await openSb(t);
    await tap(p, 2, 10);
    await p.waitForTimeout(700);
    t.eq(await total(p), 'いま 0.10');
    const kinds = await p.evaluate(() => [...new Set([...document.querySelectorAll('#stage > .piece')].map(e => e.className))].join('|'));
    t.ok(/piece-tenth/.test(kinds) && !/piece-hundredth/.test(kinds), 'ぼう に まとまって いない ' + kinds);
  },

  'しょうすう：おだいを つくると ふりかえりと「つぎの おだい」が でて、おすと ぜんぶ きえて つぎへ': async t => {
    const p = await openSb(t);
    const c = await p.evaluate(() => Math.round(parseFloat(document.getElementById('challengetext').textContent) * 100));
    await tap(p, 0, Math.floor(c / 100)); await tap(p, 1, Math.floor((c % 100) / 10)); await tap(p, 2, c % 10);
    await p.waitForFunction(() => getComputedStyle(document.getElementById('nextbtn')).display !== 'none', null, { timeout: 8000 });
    t.ok(await p.evaluate(() => document.getElementById('recipe').children.length > 0), 'ふりかえりが でない');
    await p.evaluate(() => document.getElementById('nextbtn').click());
    await p.waitForTimeout(500);
    t.eq(await p.evaluate(() => document.querySelectorAll('#stage > .piece').length), 0, 'つぎの おだいで きえない');
  },

  'しょうすう：たしざんの おだいでは こたえ（あと〜）を かくす': async t => {
    const p = await openSb(t);
    // つくる → つぎ → たしざん（循環の 2ばんめ）
    const c = await p.evaluate(() => Math.round(parseFloat(document.getElementById('challengetext').textContent) * 100));
    await tap(p, 0, Math.floor(c / 100)); await tap(p, 1, Math.floor((c % 100) / 10)); await tap(p, 2, c % 10);
    await p.waitForFunction(() => getComputedStyle(document.getElementById('nextbtn')).display !== 'none', null, { timeout: 8000 });
    await p.evaluate(() => document.getElementById('nextbtn').click());
    await p.waitForTimeout(400);
    t.ok(/＋/.test(await p.evaluate(() => document.getElementById('challengetext').textContent)), 'たしざんの おだいで ない');
    t.eq(await p.evaluate(() => document.getElementById('challengesub').textContent.trim()), '', 'こたえが みえている');
  },

  'しょうすう：ためしに もどる リンクがあり、外部へ つうしんしない': async t => {
    const p = await openSb(t);
    t.eq(await p.evaluate(() => document.getElementById('backbtn').getAttribute('href')), 'lab.html');
    const html = await p.evaluate(() => document.documentElement.outerHTML);
    t.ok(!/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, '')), '外部URLが ある');
  },
};
