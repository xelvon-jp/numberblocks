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

  'めんせき：ぼう を つむと ながしかく、へいこうしへんけい は きって うごかすと、さんかく は かがみ と まわす で できる。ひろさ は かわらない': async t => {
    const p = await openLab(t, 'lab-menseki.html');
    const r = await p.evaluate(() => {
      const out = {};
      men.load(0); const ids = men.pieces().map(q => q.id);
      men.moveTo(ids[0], 2, 2); men.moveTo(ids[1], 2, 3); out.mid = men.done();
      men.moveTo(ids[2], 2, 4); out.rows = [men.done(), JSON.stringify(men.rect())];
      men.load(1); const sq = men.pieces().map(q => q.id);
      sq.forEach((id, k) => men.moveTo(id, k*4 > 7 ? 0 : k*4, k*4 > 7 ? 1 : 0)); out.notSquare = men.done();   // 8×2 は ましかく で ない
      sq.forEach((id, k) => men.moveTo(id, 1, 1 + k)); out.square = men.done();
      // へいこうしへんけい：てっぺん の かど（x＝1）で たて に きる → さんかく を みぎ へ 5
      men.load(2); const [pg] = men.pieces(); const ox = pg.pts[3][0], oy = pg.pts[0][1];
      men.cut(ox + 1, oy - 1, ox + 1, oy + 4);
      const ps = men.pieces(); out.cutN = ps.length; out.cutArea = ps.reduce((s, q) => s + q.area, 0);
      const tri = ps.find(q => q.area === 1.5);
      men.moveTo(tri.id, ox + 5, oy); out.pg = [men.done(), JSON.stringify(men.rect())];
      // ちょっかく さんかく：かがみ → まわす → くっつける
      men.load(3); const [rt] = men.pieces(); const c = men.mirror(rt.id); men.rotate(c);
      men.moveTo(rt.id, 1, 4); men.moveTo(c, 1, 4); out.rt = [men.done(), men.copies(), men.pieces().reduce((s, q) => s + q.area, 0)];
      // とがった さんかく：かがみ → まわす → ずらして くっつける → きる → うごかす
      men.load(4); const [tr] = men.pieces(); const d = men.mirror(tr.id); men.rotate(d);
      men.moveTo(tr.id, 1, 4); men.moveTo(d, 2, 4);           // へいこうしへんけい（1,4）〜（6,7）
      out.para = men.done();
      men.cut(2, 3, 2, 8); const small = men.pieces().find(q => Math.abs(q.area - 1.5) < 1e-9 && q.pts.some(v => v[0] === 1));
      men.moveTo(small.id, 5, 4); out.tr = [men.done(), JSON.stringify(men.rect())];
      return out;
    });
    t.eq([r.mid, ...r.rows], [false, true, '{"w":4,"h":3}'], 'ぼう 3ぼん で ながしかく に ならない');
    t.eq([r.notSquare, r.square], [false, true], 'ましかく の はんてい が ちがう');
    t.eq([r.cutN, r.cutArea], [2, 15], 'きると ひろさ が かわった／2つ に ならない');
    t.eq(r.pg, [true, '{"w":5,"h":3}'], 'へいこうしへんけい が ながしかく に ならない');
    t.eq(r.rt, [true, 1, 12], 'ちょっかく さんかく が できない');
    t.eq(r.para, false, 'へいこうしへんけい の まま で できた に なった');
    t.eq(r.tr, [true, '{"w":4,"h":3}'], 'とがった さんかく が できない');
  },

  'めんせき：どんかく さんかく は ● で ちょっかく に しても ひろさ が おなじ（とうせき へんけい）→ かがみ で ながしかく。だいけい は 2つ で へいこうしへんけい → きって ながしかく。ひしがた は たいかくせん で 4つ': async t => {
    const p = await openLab(t, 'lab-menseki.html');
    const r = await p.evaluate(() => {
      const out = {};
      men.load(5); const [ob] = men.pieces(); men.shear(ob.id, 0);        // てっぺん を ていへん の まうえ へ
      const sheared = men.pieces()[0]; out.shear = [sheared.area, JSON.stringify(sheared.pts)];
      const c = men.mirror(ob.id); men.rotate(c); men.moveTo(ob.id, 2, 3); men.moveTo(c, 2, 3);
      out.ob = [men.done(), JSON.stringify(men.rect())];
      men.load(7); const [tp] = men.pieces(); const d = men.mirror(tp.id); men.rotate(d);
      men.moveTo(tp.id, 1, 4); men.moveTo(d, 4, 4); out.para = men.done();
      men.cut(2, 3, 2, 8); const sm = men.pieces().find(q => Math.abs(q.area - 1.5) < 1e-9 && q.pts.some(v => v[0] === 1));
      men.moveTo(sm.id, 7, 4); out.trap = [men.done(), JSON.stringify(men.rect())];
      men.load(6); const [rh] = men.pieces(); const x0 = rh.pts[3][0], y0 = rh.pts[0][1];
      men.cut(x0 + 2, y0 - 1, x0 + 2, y0 + 5); men.cut(x0 - 1, y0 + 2, x0 + 5, y0 + 2);
      out.rhom = men.pieces().map(q => q.area);
      men.load(8); out.comp = men.pieces().reduce((s, q) => s + q.area, 0);
      return out;
    });
    t.eq(r.shear[0], 6, '● を うごかすと ひろさ が かわった');
    t.eq(r.ob, [true, '{"w":3,"h":4}'], 'どんかく さんかく が ながしかく に ならない');
    t.eq([r.para, ...r.trap], [false, true, '{"w":6,"h":3}'], 'だいけい が ながしかく に ならない');
    t.eq(r.rhom, [2, 2, 2, 2], 'ひしがた が 4つ に きれない');
    t.eq(r.comp, 16, 'ふくざつ な かたち の ひろさ');
  },
};
