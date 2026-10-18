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

  'みず：かたむけると みずの おもてが ぎゃくに かたむいて すいへいを たもつ。さかさまでも。センサーが なくても ゆびで ためせる': async t => {
    const p = await openLab(t, 'lab-mizu.html');
    const th = async () => p.evaluate(() => mizu.big().th);
    // みぎに 25° かたむけた（がめんの なかで「うえ」が ひだりへ 25°）
    await p.evaluate(() => { mizu.start(); const a = 25*Math.PI/180; mizu.grav(-Math.sin(a)*9.8, Math.cos(a)*9.8); });
    await p.waitForTimeout(1800);
    t.ok(Math.abs(await th() + 25*Math.PI/180) < 0.08, 'みぎに かたむけても すいへいに ならない ' + await th());
    // さかさま：みずは がめんの うえへ
    await p.evaluate(() => mizu.grav(0.3, -9.8));
    await p.waitForTimeout(2500);
    t.ok(Math.abs(Math.abs(await th()) - Math.PI) < 0.15, 'さかさまで うえに いかない ' + await th());
    // どんな かたむきでも みずの りょうは おなじ
    const areas = await p.evaluate(() => [0, 0.5, 1, 2, 3].flatMap(a => [0.1, 0.5, 0.9].map(f => Math.abs(mizu.area(a, f) - f))));
    t.ok(Math.max(...areas) < 1e-3, 'みずの りょうが かわる ' + Math.max(...areas));
    // ゆびで よこに なぞる（センサー なし の かわり）
    await p.evaluate(() => { mizu.grav(0, 9.8); const s = mizu.sens(); s.ux = 0; s.uy = 1; });
    await p.waitForTimeout(1500);
    const box = await p.locator('#c').boundingBox();
    await p.mouse.move(box.x + 100, box.y + 100); await p.mouse.down(); await p.mouse.move(box.x + 100 + box.width*0.125, box.y + 100);
    await p.waitForTimeout(1800);
    t.ok(Math.abs(await th() + 30*Math.PI/180) < 0.1, 'ゆびで かたむかない ' + await th());
    await p.mouse.up(); await p.waitForTimeout(2000);
    t.ok(Math.abs(await th()) < 0.08, 'はなしても もどらない');
  },
};
