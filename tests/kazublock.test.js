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
};
