// ためし（lab.html）：ほんたいに いれる まえに ためす ページの いちらん。せっていの「ためし」から ひらく。
const openLab = async (t, file) => { const p = await t.open(); await p.goto(new URL(file, p.url()).href); await p.waitForTimeout(400); return p; };

// 図形の面積：i ばんめ の ● を dx, dy マス ドラッグ（おだい の カード で キャンバス が うごく ので まいかい はかる）
async function dragH(p, i, dx, dy){
  const a = await p.evaluate(i => ({ h: zukei.handles()[i], C: zukei.C() }), i);
  const box = await p.evaluate(() => { const r = document.getElementById('c').getBoundingClientRect(); return [r.left, r.top]; });
  await p.mouse.move(box[0] + a.h[0], box[1] + a.h[1]); await p.mouse.down();
  await p.mouse.move(box[0] + a.h[0] + a.C*dx, box[1] + a.h[1] - a.C*dy, { steps: 6 }); await p.mouse.up();
}

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

  'めんせき：ぼう を つむと ながしかく・ましかく。へいこうしへんけい は てんせん で きって ゴースト の あいた ところ へ。ひろさ は かわらない': async t => {
    const p = await openLab(t, 'lab-menseki.html');
    const r = await p.evaluate(() => {
      const out = {};
      men.load(0); const [gx, gy] = men.ghost(), ids = men.pieces().map(q => q.id);
      men.moveTo(ids[0], gx, gy); men.moveTo(ids[1], gx, gy + 1); out.mid = men.done();
      men.moveTo(ids[2], gx, gy + 2); out.rows = [men.done(), JSON.stringify(men.rect())];
      men.load(1); const sq = men.pieces().map(q => q.id);
      sq.forEach((id, k) => men.moveTo(id, k*4 > 7 ? 0 : k*4, k*4 > 7 ? 1 : 0)); out.notSquare = men.done();   // 8×2 は ましかく で ない
      sq.forEach((id, k) => men.moveTo(id, 1, 1 + k)); out.square = men.done();
      men.load(2); const [[a, b]] = men.guides();
      men.cut(a[0], a[1] - 1, b[0], b[1] + 1);
      const ps = men.pieces(); out.cut = [ps.length, ps.reduce((s, q) => s + q.area, 0)];
      const tri = ps.find(q => q.area === 1.5); men.move(tri.id, 5, 0); out.pg = [men.done(), JSON.stringify(men.rect())];
      return out;
    });
    t.eq([r.mid, ...r.rows], [false, true, '{"w":4,"h":3}'], 'ぼう 3ぼん で ながしかく に ならない');
    t.eq([r.notSquare, r.square], [false, true], 'ましかく の はんてい が ちがう');
    t.eq(r.cut, [2, 15], 'きると ひろさ が かわった／2つ に ならない');
    t.eq(r.pg, [true, '{"w":5,"h":3}'], 'へいこうしへんけい が ながしかく に ならない');
  },

  'めんせき：さんかく・ひしがた は ながしかく から てんせん で きりだす（はんぶん）。どんかく は ● で ゴースト へ（ひろさ おなじ）。だいけい は さんかく 2つ。ななめ に なぞると ななめ に きれる': async t => {
    const p = await openLab(t, 'lab-menseki.html');
    const r = await p.evaluate(() => {
      const out = {}, cutG = g => men.cut(g[0][0], g[0][1], g[1][0], g[1][1]), areas = () => men.pieces().map(q => q.area).sort((a, b) => a - b);
      men.load(3); out.rt0 = areas(); cutG(men.guides()[0]); out.rt = [men.done(), areas()];
      men.load(4); const [g1, g2] = men.guides(); cutG(g1); out.tri1 = men.done(); cutG(g2); out.tri = [men.done(), areas()];
      men.load(5); const [ob] = men.pieces(), [gx] = men.ghost(); men.shear(ob.id, gx + 1); out.ob1 = [men.done(), men.pieces()[0].area];
      men.shear(ob.id, gx); out.ob = [men.done(), men.pieces()[0].area];
      men.load(6); for(const g of men.guides()) cutG(g); out.rhom = [men.done(), areas()];
      men.load(7); cutG(men.guides()[0]); out.trap = [men.done(), areas()];
      // きった あと の さんかく も ● で とうせき へんけい（ひろさ は おなじ）
      const tops = men.pieces(), t3 = tops.find(q => q.area === 3), ys = t3.pts.map(v => v[1]);
      const ap = t3.pts.find(v => ys.filter(y => y === v[1]).length === 1);
      men.shear(t3.id, ap[0] + 2); out.trapShear = [men.pieces().find(q => q.id === t3.id).area, men.pieces().find(q => q.id === t3.id).pts.some(v => v[0] === ap[0] + 2)];
      men.load(8); out.comp = men.pieces().reduce((s, q) => s + q.area, 0);
      // てんせん から はずれた ななめ は マス の せん（たて か よこ）で きれる
      men.load(3); const [gg] = men.guides(); men.cut(gg[0][0] + 2, gg[0][1] - 0.5, gg[0][0] + 2.2, gg[1][1] + 0.5); out.off = areas();
      return out;
    });
    t.eq(r.rt0, [12], 'ちょっかく さんかく は ながしかく から はじまる');
    t.eq(r.rt, [true, [6, 6]], 'ながしかく を ななめ に きって さんかく 2つ に ならない');
    t.eq([r.tri1, ...r.tri], [false, true, [1.5, 4.5, 6]], 'えいかく さんかく を きりだせない（のこり 1.5 ＋ 4.5 ＝ 6）');
    t.eq([r.ob1, r.ob], [[false, 6], [true, 6]], '● で ゴースト に いれても ひろさ が ちがう／できた に ならない');
    t.eq(r.rhom, [true, [2, 2, 2, 2, 8]], 'ひしがた を きりだせない');
    t.eq(r.trap, [true, [3, 6]], 'だいけい が さんかく 2つ に ならない');
    t.eq(r.trapShear, [3, true], 'だいけい の さんかく を ● で うごかせない／ひろさ が かわった');
    t.eq(r.comp, 16, 'ふくざつ な かたち の ひろさ');
    t.eq(r.off, [6, 6], 'たて に なぞって も マス の せん で きれない');
  },
  '図形の面積：6つ の 図形 の 面積（こうしき）。三角形 の てっぺん を よこ は 面積 おなじ・たて は 高さ が かわる。タップ で 面積': async t => {
    const p = await openLab(t, 'lab-zukei.html');
    const ar = await p.evaluate(() => [['tri', { b:7, h:6 }], ['rect', { w:6, h:4 }], ['sq', { a:5 }], ['para', { b:6, h:4 }], ['trap', { a:3, b:6, h:4 }], ['rhom', { d1:6, d2:4 }]]
      .map(([k, o]) => { zukei.setShape(k); zukei.set(o); return zukei.area(); }));
    t.eq(ar, [21, 24, 25, 24, 18, 12], '面積 が ちがう');
    await p.evaluate(() => { zukei.setShape('tri'); zukei.set({ b:6, h:4, px:2 }); });
    await dragH(p, 0, 2, 0);
    t.eq(await p.evaluate(() => [zukei.st().px, zukei.st().h, zukei.area()]), [4, 4, 12], 'よこに うごかすと 面積 が かわる');
    await p.evaluate(() => zukei.set({ b:6, h:4, px:2 }));
    await dragH(p, 0, 0, -1);
    t.eq(await p.evaluate(() => [zukei.st().h, zukei.area()]), [3, 9], 'たてに うごかしても 高さ が かわらない');
    await p.evaluate(() => zukei.toggle());
    t.eq(await p.evaluate(() => zukei.mode()), 'calc', 'タップ で 面積 に ならない');
    await p.evaluate(() => zukei.toggle());
    t.eq(t.errors, [], 'ページで エラー');
  },

  '図形の面積：おだい。カード で えが つぶれず ● を うごかせる。ちがう うちは 面積 を ださない。せいかい の あと「つぎ」まで は 等積変形 だけ': async t => {
    const p = await openLab(t, 'lab-zukei.html');
    await p.evaluate(() => { zukei.setShape('trap'); zukei.setGoal({ a:3, b:6, h:4 }); zukei.set({ a:2, b:6, h:4, off:1 }); });
    await p.waitForTimeout(400);
    const fit = await p.evaluate(() => { const c = document.getElementById('c'); return Math.abs(c.height/devicePixelRatio - c.clientHeight) < 2; });
    t.eq(fit, true, 'おだい の カード で えが たてに つぶれる');
    await dragH(p, 1, 1, 0);                                    // うえ の みぎ の かど → 上底 3
    t.eq(await p.evaluate(() => zukei.st().a), 3, 'おだい の とき ● を うごかせない');
    await p.evaluate(() => zukei.set({ a:3, b:5 }));
    const g = await p.evaluate(() => { zukei.pressDone(); const a = zukei.mode(); zukei.tapShape(); const b = zukei.mode();
      zukei.set({ b:6 }); zukei.pressDone(); return [a, b, zukei.mode(), zukei.locked(), document.getElementById('done').textContent]; });
    t.eq(g, ['shape', 'shape', 'calc', true, 'つぎ ▶'], 'おだい：ちがう かたち で 面積 が でる／あって いる のに でない');
    // せいかい の あと：うえ の ひだり の かど は よこ だけ（高さ そのまま）、ほか の ● と かず は きかない。面積 は でた まま
    await dragH(p, 0, 2, 2);
    await dragH(p, 2, 2, 0);
    await p.evaluate(() => document.querySelector('#nums button').click());
    t.eq(await p.evaluate(() => [zukei.st().off, zukei.st().h, zukei.st().b, zukei.st().a, zukei.area(), zukei.mode()]), [3, 4, 6, 3, 18, 'calc'], 'せいかい の あと に 面積 が かわる うごき が できる');
    await p.evaluate(() => zukei.pressDone());
    t.eq(await p.evaluate(() => zukei.locked()), false, '「つぎ」で もどらない');
    t.eq(t.errors, [], 'ページで エラー');
  },
};