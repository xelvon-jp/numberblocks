// かぞくで どうき：2だいの スマホ（べつべつの ブラウザ）と にせの Worker で、上書きせずに あわさるか。

const URL_ = 'https://sync.test/save';
function fakeWorker(){
  const db = {};
  return async route => {
    const req = route.request(), code = req.headers()['x-family'] || '';
    if(code.length < 16) return route.fulfill({ status: 403, body: '{}' });
    const cur = db[code] || { ver: 0, data: null, at: 0 };
    if(req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cur) });
    const body = JSON.parse(req.postData());
    if((body.base | 0) !== cur.ver) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(cur) });
    db[code] = { ver: cur.ver + 1, data: body.data, at: Date.now() };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ver: db[code].ver }) });
  };
}
async function phone(t, worker){
  const p = await t.open({ storage: { nb_sync_url: URL_, nb_sync_code: 'abcd-efgh-jkmn-pqrs' } });
  await p.route(URL_, worker);
  await p.waitForFunction(() => typeof sync !== 'undefined');
  return p;
}
const syncNow = p => p.evaluate(async () => { for(let i=0;i<20;i++){ await sync.run(); if(sync.state() === 'ok') return 'ok'; await new Promise(r => setTimeout(r, 100)); } return sync.state(); });

module.exports = {
  'あわせかた：クリアは りょうほう、手数は すくない ほう、レベルは たかい ほう、かけざん・はやさは あたらしい ほう': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      const a = { hinata: { idx:3, cleared:{ 0:true }, logs:{ 0:[1,2,3] }, rainbow:{}, clock:{ lv:2, hist:[] }, hissan:{ lv:3, hist:[] },
                            kake:{ f:{ '7x8':{ c:1, last:100 }, '6x7':{ c:5, last:900 } }, stage:0 }, spd:{ c1:[1000], _t:{ c1:50 } } } };
      const b = { hinata: { idx:9, cleared:{ 1:true }, logs:{ 0:[1,2], 1:[4] }, rainbow:{ 1:true }, clock:{ lv:3, hist:[true] }, hissan:{ lv:2, hist:[] },
                            kake:{ f:{ '7x8':{ c:2, last:200 }, '6x7':{ c:1, last:10 } }, stage:1 }, spd:{ c1:[9000], c2:[5000], _t:{ c1:10, c2:20 } } },
                  papa: { idx:0, cleared:{ 5:true }, logs:{}, rainbow:{} } };
      const keep = a.hinata.cleared;
      NBMerge.mergeTaskStore(a, b);
      const h = a.hinata;
      return { sameObj: h.cleared === keep, cleared: Object.keys(h.cleared), log0: h.logs[0].length, log1: h.logs[1].length, rb: !!h.rainbow[1], idx: h.idx,
               clock: h.clock.lv, hissan: h.hissan.lv, k78: h.kake.f['7x8'].c, k67: h.kake.f['6x7'].c, stage: h.kake.stage,
               spd: [h.spd.c1[0], h.spd.c2[0]], papa: !!a.papa, ink: NBMerge.mergeInk([{ digit:1, cloud:[1] }], [{ digit:1, cloud:[1] }, { digit:2, cloud:[2] }]).length };
    });
    t.eq(r, { sameObj:true, cleared:['0','1'], log0:2, log1:1, rb:true, idx:3, clock:3, hissan:3, k78:2, k67:5, stage:1, spd:[1000, 5000], papa:true, ink:2 }, 'あわせかた');
  },

  '2だいで あそんでも 上書きせず あわさる（さきに おくられて いても 409 で あわせなおす）': async t => {
    const worker = fakeWorker();
    const A = await phone(t, worker), B = await phone(t, worker);
    await A.evaluate(() => { const r = curRec(); r.cleared[0] = true; taskCleared = r.cleared; kake().f['7x8'] = { c:1, s:1, m:false, g:false, w:0, due:0, last:Date.now() }; saveTask(); });
    t.eq(await syncNow(A), 'ok', 'A が おくれない');
    await B.evaluate(() => { const r = curRec(); r.cleared[1] = true; saveTask(); });
    t.eq(await syncNow(B), 'ok', 'B が おくれない');
    t.eq(await B.evaluate(() => [!!curRec().cleared[0], !!curRec().cleared[1], !!kake().f['7x8']]), [true, true, true], 'B に A の ぶんが こない');
    // A は ふるい ver の まま つづけて あそぶ → 409 → あわせなおし
    await A.evaluate(() => { curRec().cleared[2] = true; saveTask(); });
    t.eq(await syncNow(A), 'ok', 'A の 2かいめ');
    t.eq(await A.evaluate(() => Object.keys(curRec().cleared).sort().join()), '0,1,2', 'A に B の ぶんが こない');
    await syncNow(B);
    t.eq(await B.evaluate(() => Object.keys(curRec().cleared).sort().join()), '0,1,2', 'B に A の 2かいめが こない');
  },

  'あいことばが なければ どうき しない。せっていの「どうき」で つくれる': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      play._raw({ mode:'soft' });                    // おやの OK だと 番号が いるので
      const out = { on: sync.on() };
      window.prompt = () => ''; window.alert = m => { out.alert = m; };
      sync.setup();
      out.code = localStorage.getItem('nb_sync_code');
      return out;
    });
    t.ok(r.on === false && /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(r.code) && r.alert.includes(r.code), 'あいことばを つくれない: ' + JSON.stringify(r));
  },
};
