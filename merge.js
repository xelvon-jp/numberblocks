/* =====================================================================
   2だいの スマホの セーブデータを あわせる（かぞくで どうき）。
   どちらかを まるごと 上書きは しない。きまりは：
     クリアした おだい・レインボー …… どちらかで できていれば できた
     てじゅん（いちばん すくない 手数）…… すくない ほう
     とけい・ひっさんの レベル …… たかい ほう（おなじなら こちら）
     かけざん …… もんだいごとに さいごに こたえた ほう（last）。だんかいは たかい ほう
     はやさ（spd）…… しゅるいごとに さいごに きろくした ほう（_t）
     いまの おだいの ばしょ・まぜまぜ・ごほうびの かず …… この スマホの まま
     手がきの お手本 …… りょうほう（おなじ ものは 1つ、80こ まで）
   local を その まま かきかえる（ゲームが もっている オブジェクトを とりかえないため）。
   ブラウザでは window.NBMerge、node では require('./merge.js')。
   ===================================================================== */
(function(root){
  function mergeMarks(a, b){            // { idx: true } の あつまり
    if(!b) return a || {};
    a = a || {};
    for(const k in b) if(b[k]) a[k] = true;
    return a;
  }
  function mergeLogs(a, b){             // { idx: [手じゅん] }。すくない ほう
    if(!b) return a || {};
    a = a || {};
    for(const k in b){ if(!Array.isArray(b[k])) continue; if(!Array.isArray(a[k]) || b[k].length < a[k].length) a[k] = b[k]; }
    return a;
  }
  function mergeRec(a, b){              // おだいの きろく（ふつう／ビギナー）
    if(!b) return a;
    a.cleared = mergeMarks(a.cleared, b.cleared);
    a.logs = mergeLogs(a.logs, b.logs);
    a.rainbow = mergeMarks(a.rainbow, b.rainbow);
    return a;
  }
  function mergeLevel(a, b){            // { lv, hist, … }。たかい ほう
    if(!b || !b.lv) return a;
    if(!a || !a.lv || b.lv > a.lv) return Object.assign({}, b);
    return a;
  }
  function mergeKake(a, b){
    if(!b || !b.f) return a;
    if(!a || !a.f) return JSON.parse(JSON.stringify(b));
    for(const k in b.f){ const x = a.f[k], y = b.f[k]; if(!x || (y && (y.last || 0) > (x.last || 0))) a.f[k] = y; }
    a.stage = Math.max(a.stage || 0, b.stage || 0);
    return a;
  }
  function mergeSpd(a, b){
    if(!b) return a || {};
    a = a || {};
    const ta = a._t || (a._t = {}), tb = b._t || {};
    for(const k in b){
      if(k === '_t' || !Array.isArray(b[k])) continue;
      if(!Array.isArray(a[k]) || (tb[k] || 0) > (ta[k] || 0)){ a[k] = b[k].slice(); ta[k] = tb[k] || 0; }
    }
    return a;
  }
  function mergeProfile(a, b){
    if(!b) return a;
    mergeRec(a, b);
    a.beg = mergeRec(a.beg || { idx:0, cleared:{}, logs:{}, rainbow:{} }, b.beg);
    a.clock = mergeLevel(a.clock, b.clock);
    a.hissan = mergeLevel(a.hissan, b.hissan);
    a.kake = mergeKake(a.kake, b.kake);
    a.spd = mergeSpd(a.spd, b.spd);
    return a;
  }
  // おだいの きろく ぜんぶ（nbg.task.v1 の p）
  function mergeTaskStore(local, remote){
    if(!remote) return local;
    for(const id in remote){
      if(!local[id]) local[id] = JSON.parse(JSON.stringify(remote[id]));
      else mergeProfile(local[id], remote[id]);
    }
    return local;
  }
  // 手がきの お手本（nb_ink_samples）
  const INK_MAX = 80;
  function inkKey(s){ return s.digit + ':' + JSON.stringify(s.cloud || []).slice(0, 120); }
  function mergeInk(local, remote){
    local = Array.isArray(local) ? local : [];
    if(!Array.isArray(remote)) return local;
    const seen = new Set(local.map(inkKey)), out = local.slice();
    for(const s of remote) if(s && !seen.has(inkKey(s))){ seen.add(inkKey(s)); out.push(s); }
    return out.slice(-INK_MAX);
  }
  const api = { mergeTaskStore, mergeProfile, mergeInk, mergeSpd, mergeKake };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NBMerge = api;
})(typeof window !== 'undefined' ? window : this);
