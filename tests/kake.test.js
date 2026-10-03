// かけざん（まぜまぜ）：1もん→2もん→…→5もん の セット、もんだいの えらびかた、いなずま⚡・レインボー、だんかい。

async function openH(t){
  const p = await t.open();
  await p.evaluate(() => localStorage.setItem('nb_hissan_try', JSON.stringify({ m:'write', k:'add' })));
  await p.goto(p.url().replace('index.html', 'hissan.html'));
  await p.waitForFunction(() => typeof newProblem === 'function' && P);
  return p;
}

module.exports = {
  'セットは 1→2→3→4→5→5 もん。1時間 やすむと 1もんから。九九（A・B）だけ、おなじ もんだいは 出ない': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      const sent = []; hissanFrameEl(); hissanPost = m => sent.push(m); hissanReady = true;
      const sizes = [];
      for(let i=0;i<6;i++){ startKakeTask(); sizes.push(sent[sent.length - 1].set.length); closeHissan(); }
      kake().lastSet = Date.now() - 61*60*1000;
      startKakeTask(); sizes.push(sent[sent.length - 1].set.length); closeHissan();
      let bad = 0;
      for(let i=0;i<200;i++){
        const set = kakePick(5);
        const keys = set.map(q => q.a + 'x' + q.b);
        if(new Set(keys).size !== set.length || set.length !== 5) bad++;
        if(set.some(q => !['A','B'].includes(kakeGroup(q.a, q.b)) || q.a < 2 || q.b < 2)) bad++;
      }
      return { sizes, bad, kind: sent[0].kind, groups: [kakeGroup(7,7), kakeGroup(7,8), kakeGroup(13,7), kakeGroup(14,16), kakeGroup(10,9)] };
    });
    t.eq(r.sizes, [1, 2, 3, 4, 5, 5, 1], 'セットの おおきさ');
    t.eq(r.bad, 0, 'もんだいの えらびかた');
    t.eq(r.kind, 'mul', 'かけざんの しゅるい');
    t.eq(r.groups, ['A', 'B', 'C', 'D', 'A'], 'グループ');
  },

  'いなずまは グループの めあて（さいきんの まんなか、はじめは B 6びょう）いない。まちがえた もんだいは すぐ また 出る。8わり おぼえたら 2けた×1けたへ': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      const out = {};
      out.before = kakeBolt('B');
      for(const ms of [9000, 7000, 5000, 4000, 6000]) noteKake({ a:7, b:8, ms, miss:0 });
      out.th = kakeBolt('B');                       // [4000,5000,6000,7000,9000] の まんなか 6000
      noteKake({ a:6, b:7, ms:5500, miss:0 });
      out.gold = kake().f['6x7'].g;
      noteKake({ a:6, b:9, ms:3000, miss:1 });
      out.wrongSoon = kake().f['6x9'].due - Date.now() < 2*60*1000;
      out.inSet = kakePick(5, Date.now() + 61*1000).some(q => q.a === 6 && q.b === 9);
      // 九九を ぜんぶ 2かい 8びょう いないで
      for(let a=2;a<=10;a++) for(let b=2;b<=10;b++){ noteKake({ a, b, ms:3000, miss:0 }); noteKake({ a, b, ms:3000, miss:0 }); }
      out.stage = kake().stage;
      out.c = kakePick(5).some(q => kakeGroup(q.a, q.b) === 'C');
      saveTask(); out.saved = !!JSON.parse(localStorage.getItem(TASK_KEY)).p[profile().id].kake.f['7x8'];
      return out;
    });
    t.eq([r.before, r.th], [6000, 6000], 'いなずまの はやさ');
    t.eq(r.gold, true, 'いなずまで 金に ならない');
    t.eq([r.wrongSoon, r.inSet], [true, true], 'まちがえた もんだいが すぐ 出ない');
    t.eq([r.stage, r.c], [1, true], 'つぎの だんかいに すすまない');
    t.eq(r.saved, true, 'きろくが のこらない');
  },

  'ひっさんの 画面で セットを とく：たて書きで 手がき、いなずま・レインボー、こたえる たびに しらせて さいごに done': async t => {
    const p = await openH(t);
    await p.evaluate(() => { window.__speedOff = false; window.__msgs = []; tellGame = m => window.__msgs.push(m); startMul([{ a:7, b:8, th:600000 }, { a:3, b:3, th:null }], 'かけざん'); });
    const r1 = await p.evaluate(() => ({ P: [P.op, P.a, P.b, P.ans], keys: cellKeys(), hint: writeHint(), why: whyWrong('o', 1).t }));
    t.eq(r1, { P:['×', 7, 8, 56], keys:['o', 't'], hint:'こたえを かこう', why:'7 × 8 は？' }, '1もんめ');
    await p.evaluate(() => { S.lastInk = S.t0 + 2500; judgeCell('t', 5); judgeCell('o', 6); });
    let r = await p.evaluate(() => ({ done: S.done, bolt: S.bolt, rb: S.rainbow, msg: S.msg, sent: window.__msgs.slice() }));
    t.ok(r.done && r.bolt && r.rb && /いなずま/.test(r.msg), 'いなずまに ならない: ' + JSON.stringify(r));
    t.eq(r.sent[0], { type:'kake', a:7, b:8, ms:2500, miss:0 }, 'しらせ');
    await p.waitForFunction(() => P.a === 3 && !S.done, null, { timeout: 15000 });
    t.eq(await p.evaluate(() => cellKeys()), ['o'], '1けたの こたえは ます 1つ');
    await p.evaluate(() => { judgeCell('o', 8); S.lastInk = S.t0 + 9000; judgeCell('o', 9); });
    r = await p.evaluate(() => ({ bolt: !!S.bolt, rb: S.rainbow, msg: S.msg }));
    t.eq(r, { bolt:false, rb:false, msg:'できた！' }, 'まちがえたら レインボーも いなずまも なし');
    await p.waitForFunction(() => window.__msgs.some(m => m.type === 'done'), null, { timeout: 15000 });
    t.eq(await p.evaluate(() => [window.__msgs.map(m => m.type).join(), window.__err || '']), ['kake,kake,done', ''], 'さいごに done');
  },
};
