// ─── 手がきの 数字を よむ（0〜9 の 1もじ）──────────────────────────
// 指の うごき（線の かたち）を、お手本の 数字と くらべる。絵では なく「点の あつまり」どうしを
// くらべる やりかた（$P：point-cloud recognizer）なので、書きはじめの いち・むき・画数が ちがっても よめる。
// ネットに つながらなくても うごく。
//
//   Ink.recognize(strokes) → { digit, score, mirrored } か null（よめない）
//     strokes … [[{x,y}, …], …]（1画ずつ）
//   Ink.learn(digit, strokes) … その人の 字を お手本に くわえる（この端末に 保存）
//   Ink.forget()              … おぼえた 字を けす
//   Ink.record / records / fixRecord … 書いた 字の きろく。まちがって よんだ 字を 正しい 数字として おぼえさせる
//
// かがみもじ（左右 はんたい）の お手本も もっていて、それに いちばん にていたら mirrored:true。
// 形で 1ばん・2ばんが きっこう したときは、書きじゅん・線の むきも くらべて きめる（byOrder:true）。
(function(root){
  const N = 32;                        // 1もじを この数の 点に ならべなおして くらべる
  const REJECT = 1.35;                 // これより にていなければ「よめない」（ためして きめた）
  const KEY = 'nb_ink_samples';
  const STRETCH_MIN = 0.3;             // よこ÷たて が これより 小さい（ほそい）字は のばさない

  // お手本（0〜1 の わくの中の 線。y は下むき）
  const ell = (cx, cy, rx, ry, a0, a1, k) => { const o = []; for(let i=0;i<=k;i++){ const a = a0 + (a1 - a0)*i/k; o.push([cx + rx*Math.cos(a), cy + ry*Math.sin(a)]); } return o; };
  const BASE = {
    0: [ [ell(0.5,0.5,0.34,0.5,-Math.PI/2, Math.PI*1.5, 24)], [ell(0.5,0.5,0.3,0.5,-Math.PI/2, -Math.PI*2.5, 24)] ],
    1: [ [[[0.5,0],[0.5,1]]], [[[0.3,0.2],[0.52,0],[0.52,1]]], [[[0.3,0.2],[0.52,0],[0.52,1]],[[0.28,1],[0.76,1]]] ],
    2: [ [[[0.15,0.25],[0.3,0.05],[0.55,0],[0.8,0.12],[0.85,0.35],[0.6,0.62],[0.1,1],[0.9,1]]],
         [[[0.12,0.15],[0.5,0],[0.85,0.2],[0.75,0.5],[0.1,1],[0.9,0.98]]] ],
    3: [ [[[0.15,0.12],[0.45,0],[0.8,0.12],[0.8,0.35],[0.45,0.48],[0.85,0.62],[0.85,0.88],[0.5,1],[0.12,0.9]]],
         [[[0.15,0],[0.85,0],[0.45,0.4],[0.85,0.6],[0.8,0.9],[0.45,1],[0.12,0.88]]] ],
    4: [ [[[0.65,0],[0.05,0.68],[0.95,0.68]],[[0.68,0.25],[0.68,1]]],
         [[[0.25,0],[0.12,0.6],[0.92,0.6]],[[0.7,0.05],[0.7,1]]],
         [[[0.65,1],[0.65,0],[0.05,0.68],[0.95,0.68]]] ],
    5: [ [[[0.82,0.02],[0.25,0.02]],[[0.25,0.02],[0.2,0.45],[0.55,0.38],[0.85,0.55],[0.82,0.85],[0.5,1],[0.12,0.9]]],
         [[[0.85,0],[0.25,0],[0.2,0.45],[0.55,0.38],[0.85,0.55],[0.82,0.85],[0.5,1],[0.12,0.9]]],
         // 書きじゅんちがい：たて・まるを 先に 書いて、さいごに 上の よこ線（左→右）
         [[[0.25,0.02],[0.2,0.45],[0.55,0.38],[0.85,0.55],[0.82,0.85],[0.5,1],[0.12,0.9]],[[0.25,0.02],[0.82,0.02]]] ],
    6: [ [[[0.72,0.02],[0.4,0.2],[0.18,0.5],[0.15,0.78],[0.35,0.98],[0.65,0.98],[0.85,0.78],[0.75,0.55],[0.5,0.5],[0.22,0.62]]],
         [[[0.65,0],[0.25,0.4],[0.18,0.75],[0.4,1],[0.75,0.9],[0.8,0.62],[0.5,0.5],[0.2,0.7]]] ],
    7: [ [[[0.1,0.02],[0.9,0.02],[0.45,1]]], [[[0.1,0.22],[0.1,0.02],[0.9,0.02],[0.45,1]]], [[[0.1,0.02],[0.9,0.02],[0.55,0.5],[0.5,1]]] ],
    8: [ [[[0.8,0.15],[0.5,0],[0.2,0.15],[0.25,0.35],[0.5,0.48],[0.8,0.65],[0.8,0.88],[0.5,1],[0.2,0.88],[0.2,0.65],[0.5,0.48],[0.75,0.35],[0.8,0.15]]],
         [ell(0.5,0.25,0.26,0.25,Math.PI/2, Math.PI*2.5, 16), ell(0.5,0.74,0.32,0.26,-Math.PI/2, Math.PI*1.5, 16)] ],
    9: [ [[[0.82,0.28],[0.6,0.02],[0.3,0.05],[0.15,0.28],[0.35,0.5],[0.7,0.45],[0.85,0.25],[0.82,1]]],
         [[[0.8,0.25],[0.5,0],[0.2,0.2],[0.4,0.45],[0.8,0.3]],[[0.8,0.1],[0.8,1]]] ]
  };
  const MIRROR = [2,3,4,5,6,7,9];      // 左右 はんたいに 書くと べつの 形に なる 数字

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function toPoints(strokes){
    const pts = [];
    strokes.forEach((s, id) => s.forEach(p => pts.push({ x: p.x !== undefined ? p.x : p[0], y: p.y !== undefined ? p.y : p[1], id })));
    return pts;
  }
  function pathLength(pts){ let d = 0; for(let i=1;i<pts.length;i++) if(pts[i].id === pts[i-1].id) d += dist(pts[i-1], pts[i]); return d; }
  function resample(src, n){
    const pts = src.map(p => ({ x:p.x, y:p.y, id:p.id }));
    const I = pathLength(pts) / (n - 1);
    if(!(I > 0)) return null;
    let D = 0; const out = [{ ...pts[0] }];
    for(let i=1;i<pts.length;i++){
      if(pts[i].id !== pts[i-1].id) continue;
      const d = dist(pts[i-1], pts[i]);
      if(D + d >= I){
        const q = { x: pts[i-1].x + ((I - D)/d)*(pts[i].x - pts[i-1].x), y: pts[i-1].y + ((I - D)/d)*(pts[i].y - pts[i-1].y), id: pts[i].id };
        out.push(q); pts.splice(i, 0, q); D = 0;
      } else D += d;
    }
    while(out.length < n) out.push({ ...pts[pts.length - 1] });
    return out.slice(0, n);
  }
  function normalize(strokes){
    const pts0 = toPoints(strokes);
    if(pts0.length < 2) return null;
    const pts = resample(pts0, N); if(!pts) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for(const p of pts){ x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    // ほそながい 字（1）いがいは、たて・よこ べつべつに わくいっぱいに のばす。
    // こうすると ほそく書いた 7 や 2 が「1」に まちがわれにくい。
    const w = x1 - x0, h = y1 - y0, a = w / (h || 1);
    const stretch = a > STRETCH_MIN && a < 1 / STRETCH_MIN;
    const sx = stretch ? (w || 1) : (Math.max(w, h) || 1), sy = stretch ? (h || 1) : sx;
    let cx = 0, cy = 0;
    const sc = pts.map(p => ({ x:(p.x - x0)/sx, y:(p.y - y0)/sy }));
    for(const p of sc){ cx += p.x; cy += p.y; } cx /= N; cy /= N;
    return sc.map(p => ({ x: p.x - cx, y: p.y - cy }));
  }
  function cloudDistance(a, b, start){
    const matched = new Array(N).fill(false);
    let sum = 0, i = start;
    do{
      let idx = -1, min = Infinity;
      for(let j=0;j<N;j++) if(!matched[j]){ const d = dist(a[i], b[j]); if(d < min){ min = d; idx = j; } }
      matched[idx] = true;
      sum += (1 - ((i - start + N) % N)/N) * min;
      i = (i + 1) % N;
    } while(i !== start);
    return sum;
  }
  function score(c, t){ const g = greedy(c, t.cloud); return { g, s: g }; }
  function greedy(a, b){
    const step = Math.floor(Math.pow(N, 0.5)); let min = Infinity;
    for(let i=0;i<N;i+=step) min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
    return min;
  }

  // お手本を ならべる（かがみもじ も）
  const flip = strokes => strokes.map(s => s.map(p => [1 - p[0], p[1]]));
  let TEMPLATES = [];
  function build(){
    TEMPLATES = [];
    for(const d in BASE) for(const v of BASE[d]){
      TEMPLATES.push({ digit:+d, mirrored:false, cloud: normalize(v) });
      if(MIRROR.includes(+d)) TEMPLATES.push({ digit:+d, mirrored:true, cloud: normalize(flip(v)) });
    }
    for(const s of loadSamples()) TEMPLATES.push({ digit:s.digit, mirrored:false, cloud:s.cloud, mine:true });
  }
  function loadSamples(){
    try{ const v = JSON.parse((root.localStorage && root.localStorage.getItem(KEY)) || '[]'); return Array.isArray(v) ? v : []; }
    catch(e){ return []; }
  }
  function saveSamples(list){ try{ root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(list)); }catch(e){} }

  // 書いた じゅんばん どおりに 点を ならべて くらべる（書きじゅん・線の むき も 見る）。
  // 5 と 6、7 と 9、0 と 6 のように 形の にている 字は、書きかたの ほうが ちがいが 大きい
  function orderDistance(a, b){ let d = 0; for(let i=0;i<N;i++) d += dist(a[i], b[i]); return d / N; }
  const ORDER_MARGIN = 0.15;   // 形の にかたの 1ばんと 2ばんが これより 近いときだけ 書きじゅんで きめる
  const ORDER_RATIO = 1.25;    // 書きじゅんが これだけ はっきり 2ばんに にていたら 2ばんに する
  function recognize(strokes){
    const c = normalize(strokes); if(!c) return null;
    // 数字（かがみもじは べつ）ごとに いちばん にている お手本
    const by = {};
    for(const t of TEMPLATES){
      const k = t.digit + (t.mirrored ? 'm' : ''), r = score(c, t);
      if(!by[k]) by[k] = { digit:t.digit, mirrored:t.mirrored, score:r.g, s:r.s, list:[] };
      by[k].list.push(t);
      if(r.s < by[k].s){ by[k].s = r.s; by[k].score = r.g; }
    }
    const top = Object.values(by).sort((a, b) => a.s - b.s);
    let best = top[0], byOrder = false;
    const second = top[1];
    if(best && second && second.s - best.s < ORDER_MARGIN){
      const od = e => Math.min(...e.list.map(t => orderDistance(c, t.cloud)));
      const o1 = od(best), o2 = od(second);
      if(o2*ORDER_RATIO < o1){ best = second; byOrder = true; }
    }
    // 「よめない」の はんていは 形の にかた だけで する
    if(!best || best.score > REJECT) return null;
    return { digit:best.digit, score:best.score, mirrored:best.mirrored, byOrder };
  }
  // 1もじ ぶんの 線を、いちばん にている じゅんに（しらべる・テスト用）
  function rank(strokes){
    const c = normalize(strokes); if(!c) return [];
    const byDigit = {};
    for(const t of TEMPLATES){ const s = score(c, t).s; const k = t.digit + (t.mirrored ? 'm' : ''); if(!(k in byDigit) || s < byDigit[k]) byDigit[k] = s; }
    return Object.keys(byDigit).map(k => ({ key:k, score:byDigit[k] })).sort((a,b) => a.score - b.score);
  }
  function learn(digit, strokes){
    const c = normalize(strokes); if(!c) return false;
    const list = loadSamples(); list.push({ digit, cloud:c });
    saveSamples(list.slice(-80)); build(); return true;
  }
  function forget(){ saveSamples([]); build(); }
  // おぼえた 字を 1つ けす（まちがえて べつの 数字を 書いたとき）。i を はぶくと さいごの 1つ
  function unlearn(i){ const list = loadSamples(); if(!list.length) return false; list.splice(i === undefined ? list.length - 1 : i, 1); saveSamples(list); build(); return true; }

  // ─── きろく：じっさいに 書いた 字と、なにと よんだか（あとで 見なおして なおすため）───
  const LOG = 'nb_ink_log', LOG_MAX = 60;
  function records(){ try{ const v = JSON.parse((root.localStorage && root.localStorage.getItem(LOG)) || '[]'); return Array.isArray(v) ? v : []; }catch(e){ return []; } }
  function saveRecords(list){ try{ root.localStorage && root.localStorage.setItem(LOG, JSON.stringify(list.slice(-LOG_MAX))); }catch(e){} }
  // strokes は ますの 中の 線、box は ますの わく。0〜100 に して 点を へらして のこす
  function record(strokes, box, info){
    const sx = 100/(box.w || 1), sy = 100/(box.h || 1);
    const pack = strokes.filter(q => q.length).map(q => {
      const step = Math.max(1, Math.ceil(q.length / 40));
      return q.filter((p, i) => i % step === 0 || i === q.length - 1).map(p => [Math.round((p.x - box.x)*sx), Math.round((p.y - box.y)*sy)]);
    });
    const list = records(); list.push(Object.assign({ at: Date.now(), s: pack }, info)); saveRecords(list);
  }
  function fixRecord(i, digit){
    const list = records(); const r = list[i]; if(!r) return false;
    r.fixed = digit; saveRecords(list);
    return learn(digit, r.s);
  }
  function clearRecords(){ saveRecords([]); }
  build();
  root.Ink = { recognize, rank, learn, forget, samples: () => loadSamples().length, mine: loadSamples, unlearn, record, records, fixRecord, clearRecords, BASE, N, REJECT };
})(typeof window !== 'undefined' ? window : globalThis);
