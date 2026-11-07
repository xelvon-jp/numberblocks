// かずブロック（lab-kazublock.html・ためし）：ぶひんばこ から ブロックを だして あそぶ ためし。
const openKb = async (t) => { const p = await t.open(); await p.goto(new URL('lab-kazublock.html', p.url()).href); await p.waitForTimeout(400); return p; };

module.exports = {
  'かずブロック：ぶひんばこ（1〜10）から ブロックが でて、ぜんぶ けす で きえる': async t => {
    const p = await openKb(t);
    const n = await p.evaluate(() => document.querySelectorAll('#partsbox button').length);
    t.eq(n, 10, 'ぶひんばこ の ボタンが 10こ ない ' + n);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#partsbox button')]; b.find(x => x.textContent.trim() === '5').click(); b.find(x => x.textContent.trim() === '7').click(); });
    await p.waitForTimeout(250);
    t.eq(await p.evaluate(() => document.querySelectorAll('.block').length), 2, 'ブロックが 2こ でない');
    await p.evaluate(() => document.getElementById('clearbtn').click());
    await p.waitForTimeout(250);
    t.eq(await p.evaluate(() => document.querySelectorAll('.block').length), 0, 'ぜんぶ けす で きえない');
  },

  'かずブロック：ためし に もどる リンクがあり、外部へ つうしんしない': async t => {
    const p = await openKb(t);
    t.eq(await p.evaluate(() => document.getElementById('backbtn').getAttribute('href')), 'lab.html');
    const html = await p.evaluate(() => document.documentElement.outerHTML);
    t.ok(!/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, '')), '外部URLが ある');
  },

  'かずブロック：お題を つくると レシピが でて「つぎの おだい」が ひょうじされ、おすと ぜんぶ きえて つぎの おだい': async t => {
    const p = await openKb(t);
    const target = await p.evaluate(() => parseInt(document.getElementById('challengetext').textContent));
    const a = Math.min(10, target - 1), b = target - a;
    await p.evaluate(([a, b]) => { const bs = [...document.querySelectorAll('#partsbox button')]; bs.find(x => x.textContent.trim() === String(a)).click(); bs.find(x => x.textContent.trim() === String(b)).click(); }, [a, b]);
    await p.waitForTimeout(300);
    const c = await p.evaluate(() => [...document.querySelectorAll('.block')].map(e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
    await p.mouse.move(c[1][0], c[1][1]); await p.mouse.down(); await p.mouse.move(c[0][0], c[0][1], { steps: 8 }); await p.mouse.up();
    await p.waitForFunction(() => getComputedStyle(document.getElementById('nextbtn')).display !== 'none', null, { timeout: 6000 });
    t.ok(await p.evaluate(() => document.getElementById('recipe').children.length > 0), 'レシピが でない');
    const before = await p.evaluate(() => document.getElementById('challengetext').textContent);
    await p.evaluate(() => document.getElementById('nextbtn').click());
    await p.waitForTimeout(400);
    t.eq(await p.evaluate(() => document.querySelectorAll('.block').length), 0, 'つぎの おだい で ぜんぶ きえない');
  },
};
