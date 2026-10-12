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
// マイクの かわりに ずっと なる おと（f Hz、ばいおんの つよさ parts）で「はじめる 🎤」
async function openKenbanMic(t, f0, parts, o){
  const p = await t.open(o);
  await p.evaluate(() => { setOpen = true; drawSettings(ctx); const b = setBtns.find(x => x.val === 'kenban'); handleStart(b.x + b.w/2, b.y + b.h/2, 's'); });
  await p.waitForFunction(() => { const f = document.querySelector('iframe[src^="kenban.html"]'); return f && f.contentWindow && f.contentWindow.kenban; }, null, { timeout: 5000 });
  const f = p.frames().find(x => x.url().includes('kenban.html'));
  await f.evaluate(([f0, parts]) => { navigator.mediaDevices.getUserMedia = async () => {
    const ac = new AudioContext(), dst = ac.createMediaStreamDestination(), o = ac.createOscillator(), g = ac.createGain();
    const re = new Float32Array(parts.length + 1), im = new Float32Array([0].concat(parts));
    o.setPeriodicWave(ac.createPeriodicWave(re, im, { disableNormalization: true })); o.frequency.value = f0; g.gain.value = 0.1;
    o.connect(g); g.connect(dst); o.start(); window.__fakeAc = ac; return dst.stream; }; }, [f0, parts]);
  await f.click('#start');
  await f.waitForFunction(() => !document.getElementById('startBox').classList.contains('on'));
  return { p, f };
}
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
    await f.click('#sub button >> text=かたづける');
    t.eq(await f.evaluate(() => [Object.keys(kenban.standing()), kenban.big()]), [[], null], 'かたづけ');
  },

  'ひく：えほんの しるし（ド4＝まんなかの ○ あか、ド#4＝①、ド5＝△）。きょくの つぎの おとを ひくと すすみ、さいごまで で できた': async t => {
    const { f } = await openKenban(t, { storage: { nb_kenban_game: JSON.stringify({ mode: 'help' }) } });
    t.eq(await f.evaluate(() => kenban.mode()), 'play', 'まえの「たすける」が「ひく」に ならない');
    t.eq(await f.evaluate(() => { const c4 = kenban.kOfName('ド4'), cs4 = kenban.kOfName('ド#4'), c5 = kenban.kOfName('ド5');
      return [c4, kenban.labelOf(c4), kenban.shapeOf(c4), kenban.colorOf(c4), kenban.labelOf(cs4), kenban.shapeOf(c5), kenban.shapeOf(kenban.kOfName('シ3')), kenban.kOfName('ファ3'), kenban.kOfName('ファ5')]; }),
         [7, 'ド', 'ci', '#e8423f', '1', 'tr', 'sq', 0, 24], 'しるし');
    // きょくは どれも キーボードの なか（0〜24）
    t.ok(await f.evaluate(() => kenban.allSongs().every(sg => sg.notes.every(k => k >= 0 && k <= 24))), 'キーボードに ない おと');
    await f.evaluate(() => { kenban.gs().play = 's3'; kenban.game().reset(); });   // メリーさんのひつじ
    const notes = await f.evaluate(() => kenban.game().notes);
    t.eq(await f.evaluate(() => kenban.game().glowK()), notes[0], 'つぎの けんばんが ひからない');
    await f.evaluate(k => kenban.k25(k), notes[0] === 7 ? 9 : 7);       // ちがう けんばん
    t.eq(await f.evaluate(() => kenban.game().idx), 0, 'ちがう けんばんで すすんだ');
    for(const k of notes){ await f.evaluate(k => kenban.k25(k), k); await f.waitForTimeout(180); }
    t.eq(await f.evaluate(() => [kenban.game().idx, !!kenban.game().done]), [notes.length, true], 'さいごまで いかない');
  },

  'ひく：おなじ おとを すぐ（0.16びょう いない）2かい きいても 1かい。1おんずつ は ★ が ふえる': async t => {
    const { f } = await openKenban(t, { storage: { nb_kenban_game: JSON.stringify({ mode: 'play', play: 's0' }) } });
    await f.evaluate(() => { kenban.k25(7); kenban.k25(7); });     // きらきらぼしは ド ド
    t.eq(await f.evaluate(() => kenban.game().idx), 1, '1かいの おとで 2つ すすんだ');
    await f.waitForTimeout(200); await f.evaluate(() => kenban.k25(7));
    t.eq(await f.evaluate(() => kenban.game().idx), 2, 'つぎの ド で すすまない');
    await f.evaluate(() => { kenban.gs().play = 'one'; kenban.game().reset(); });
    for(let i = 0; i < 3; i++){ await f.evaluate(() => kenban.k25(kenban.game().expect())); await f.waitForTimeout(180); }
    t.eq(await f.evaluate(() => kenban.game().stars), 3, '1おんずつの ★');
  },

  'ひく：きょくを おぼえる（ひいた おとが そのまま きょくに なり、えらべる・けせる）': async t => {
    const { f } = await openKenban(t, { storage: { nb_kenban_game: JSON.stringify({ mode: 'play', play: 's0' }) } });
    await f.click('#sub button >> text=＋きょくを おぼえる');
    for(const k of [7, 9, 11, 12]) await f.evaluate(k => kenban.k25(k), k);
    await f.evaluate(() => { window.prompt = () => 'ためしの きょく'; });
    await f.click('#sub button >> text=おわり');
    const r = await f.evaluate(() => ({ name: kenban.game().songName(), notes: kenban.game().notes, saved: JSON.parse(localStorage.getItem('nb_kenban_songs')) }));
    t.eq([r.name, r.notes, r.saved.length], ['ためしの きょく', [7, 9, 11, 12], 1], 'おぼえた きょく');
    await f.evaluate(() => { window.confirm = () => true; });
    await f.click('#sub button >> text=この きょくを けす');
    t.eq(await f.evaluate(() => [JSON.parse(localStorage.getItem('nb_kenban_songs')).length, kenban.gs().play]), [0, 's0'], 'けせない');
  },

  'つくる：ひいた かずが がったいして めあてに ぴったり なら できた、こえたら あふれて やりなおし。くろい けんばんでも やりなおし': async t => {
    const { f } = await openKenban(t, { storage: { nb_kenban_game: JSON.stringify({ mode: 'make', makeLv: 1 }) } });
    await f.evaluate(() => { const g = kenban.game(); g.T = 10; g.clear(); kenban.white(3); });
    await f.waitForTimeout(600);
    await f.evaluate(() => kenban.white(7));
    await f.waitForTimeout(600);
    t.eq(await f.evaluate(() => { const g = kenban.game(); return [g.parts, g.sum, !!g.done, g.made]; }), [[3, 7], 10, true, 1], 'ぴったり');
    await f.waitForTimeout(2600);
    await f.evaluate(() => { const g = kenban.game(); g.T = 6; g.clear(); kenban.white(4); kenban.white(5); });
    await f.waitForTimeout(600);
    t.eq(await f.evaluate(() => { const g = kenban.game(); return [g.sum, !!g.over]; }), [9, true], 'あふれ');
    await f.waitForTimeout(1800);
    t.eq(await f.evaluate(() => kenban.game().sum), 0, 'あふれた あと もどらない');
    await f.evaluate(() => kenban.white(2)); await f.waitForTimeout(600);
    await f.evaluate(() => kenban.black(0));
    t.eq(await f.evaluate(() => kenban.game().sum), 0, 'くろい けんばんで やりなおし しない');
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

  'おぼえなおす：おとの かたちも はかる（えほんと ばいおんが ちがう 13の レ でも、おぼえなおすと でる）': async t => {
    // きほんの おと と 2ばいおんが おなじ くらい（えほんで はかった ド5〜ファ5 は ほぼ きほんの おと だけ）
    const { f } = await openKenbanMic(t, 589.4, [1, 0.8, 0.05]);
    await f.waitForTimeout(400);
    await f.evaluate(() => kenban.white(13));
    t.eq(await f.evaluate(() => Object.keys(kenban.standing())), [], 'まえから でた（ためしの おとが えほんの かたちに にすぎ）');
    t.ok(await f.evaluate(() => kenban.dbgLog().some(e => e.k === 21 && e.why === 'corr' && !e.ok)), 'よぶ で はじいた きろくが 🔍 に ない');
    await f.click('#relearn');
    for(let i = 1; i <= 15; i++){ await f.evaluate(i => kenban.white(i), i); if(i >= 13) await f.waitForTimeout(450); }
    const r = await f.evaluate(() => ({ learning: kenban.learning(), p13: kenban.tune().prof[12], saved: JSON.parse(localStorage.getItem('nb_kenban')).prof[12] }));
    t.ok(!r.learning && r.p13 && Math.abs(r.p13[1] - 0.8) < 0.15 && r.p13[0] > 0.9, 'かたちを はかって いない ' + JSON.stringify(r.p13));
    t.eq(r.saved, r.p13, 'しまって いない');
    await f.waitForTimeout(200);
    await f.evaluate(() => kenban.white(13));
    t.eq(await f.evaluate(() => Object.keys(kenban.standing())), ['13'], 'おぼえなおしても でない');
  },

  'さっきの 30びょうを おくる：マイクの あいだ ためて おき、おすと はん（版）と いっしょに おくる。やめたら おくらない': async t => {
    const { f } = await openKenbanMic(t, 392.4, [0.44, 0.08, 1, 0.2, 0.08, 0.09, 0.05],   // ソ4（9）：えほんで はかった かたち
       { storage: { nb_sync_code: 'abcdefghijklmnop1234', nb_kenban_game: JSON.stringify({ mode: 'free' }) } });
    const ver = await f.evaluate(() => KENBAN_VER);
    t.ok(/^\d{4}-\d\d-\d\d/.test(ver), 'はんの しるしが ない');
    t.ok((await f.textContent('#ver')).includes(ver), '🔍 に はんが でない');
    await f.waitForTimeout(1500);
    await f.evaluate(() => { window.__sent = []; window.fetch = async (u, o) => { window.__sent.push({ u, o }); return new Response('{"id":"rec:x:123456"}', { status: 200 }); }; window.prompt = () => null; });
    await f.evaluate(() => document.getElementById('recBtn').click());
    t.eq(await f.evaluate(() => window.__sent.length), 0, 'やめたのに おくった');
    await f.evaluate(() => { window.prompt = () => '13の レが でない'; kenban.white(9); });
    await f.evaluate(() => document.getElementById('recBtn').click());
    await f.waitForFunction(() => window.__sent.length === 1);
    const b = await f.evaluate(() => { const s = window.__sent[0], j = JSON.parse(s.o.body); return { u: s.u, m: s.o.method, fam: s.o.headers['X-Family'], ver: j.ver, mode: j.mode, memo: j.memo, sec: j.sec,
      wavLen: atob(j.wav).length, log: j.log.map(e => [e.k, e.ok, e.rt >= 0]), cfg: !!j.cfg, msg: document.getElementById('recMsg').textContent }; });
    t.eq([b.u.endsWith('/rec'), b.m, b.fam, b.ver, b.mode, b.memo], [true, 'PUT', 'abcdefghijklmnop1234', ver, 'free', '13の レが でない'], 'おくった なかみ');
    t.ok(b.sec > 1 && b.sec < 4 && Math.abs(b.wavLen - 44 - b.sec*32000) < 32000*0.2, 'おとの ながさ ' + b.sec + ' ' + b.wavLen);
    t.eq([b.log, b.cfg], [[[14, 1, true]], true], 'よぶ の きろく');
    t.ok(/おくりました/.test(b.msg), 'おくれた しらせ');
  },
};
