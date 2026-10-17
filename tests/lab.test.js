// ためし（lab.html）：ほんたいに いれる まえに ためす ページの いちらん。せっていの「ためし」から ひらく。
const openLab = async (t, file) => { const p = await t.open(); await p.goto(new URL(file, p.url()).href); await p.waitForTimeout(400); return p; };

module.exports = {
  'せっていの「ためし」で いちらんが ひらき、ためしの ページへ いける': async t => {
    const p = await t.open();
    await p.evaluate(() => { setOpen = true; drawSettings(ctx); const b = setBtns.find(x => x.val === 'lab'); handleSettingsTap(b.x + b.w/2, b.y + b.h/2); });
    await p.waitForURL(/lab\.html/, { timeout: 5000 });
    const links = await p.evaluate(() => [...document.querySelectorAll('a.exp')].map(a => a.getAttribute('href').split('?')[0]));
    t.ok(links.includes('lab-mizu.html'), 'みずの ためしが ない ' + links);
    for(const f of links){ const r = await p.request.get(new URL(f, p.url()).href); t.eq(r.status(), 200, f + ' が ない'); }
  },

  'みず：かたむけると みずの おもてが ぎゃくに かたむいて すいへいを たもつ。センサーが なくても ゆびで ためせる': async t => {
    const p = await openLab(t, 'lab-mizu.html');
    await p.evaluate(() => { mizu.start(); mizu.feed(25); });
    await p.waitForTimeout(1500);
    const th = await p.evaluate(() => mizu.big().th);
    t.ok(Math.abs(th + 25*Math.PI/180) < 0.08, 'みぎに かたむけても すいへいに ならない ' + th);
    await p.evaluate(() => mizu.feed(0));
    // ゆびで よこに なぞる（センサー なし の かわり）
    const box = await p.locator('#c').boundingBox();
    await p.mouse.move(box.x + 100, box.y + 100); await p.mouse.down(); await p.mouse.move(box.x + 100 - box.width*0.25, box.y + 100);
    await p.waitForTimeout(1500);
    const th2 = await p.evaluate(() => mizu.big().th);
    t.ok(th2 > 0.3, 'ゆびで かたむかない ' + th2);
    await p.mouse.up(); await p.waitForTimeout(2000);
    t.ok(Math.abs(await p.evaluate(() => mizu.big().th)) < 0.08, 'はなしても もどらない');
  },
};
