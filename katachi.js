// ─── かたち に ぴったり（めんせき・ためし）──────────────────────────────────
// けいさん の がめん に かたち を おき、その ひろさ（マス の かず）の キャラ を けいさん で つくって
// かたち の うえ で はなす。ぴったり なら かたち が キャラ の いろ で いっぱい に なる。
//   たりない → みず の ように とちゅう まで たまって「あと ○ マス」。おおい → あふれて「○ マス おおい」。キャラ は もどる。
//   🛠️ こうさくしつ（lab-menseki.html を うえ に かさねる）は いつでも おせる。なやんで いる（2かい ちがう・45びょう）と ゆれて しらせる。
//   こうさくしつ で わかる と「ヒント：4 × 3 の はんぶん を つくろう」が のこる。
// かたち と ひろさ は kata.js（こうさくしつ と おなじ）。
// ためし（lab.html）から index.html?katachi=1 で ひらいた とき だけ。きろく（おだい）とは べつ。
// index.html から よぶ のは katachiStart・katachiStop・katachiTap・katachiDrop・drawKatachi・drawKatachiFront だけ。
//
// レベル は パパと きめた じゅん：ましかく → ながしかく → ちょっかく さんかく → えいかく さんかく → どんかく さんかく
//   → ひしがた → へいこうしへんけい → だいけい → ふくざつ な かたち。どれも 3もん（マス が みえる 2もん → へん の かず だけ）。
// めもり だけ（マス目 なし）は「とても わかりにくい」ので やめた（パパ）。
const KATACHI_LV = ['ましかく', 'ながしかく', 'ちょっかく さんかく', 'えいかく さんかく', 'どんかく さんかく', 'ひしがた', 'へいこうしへんけい', 'だいけい', 'ふくざつ な かたち'];
// ひろさ は ぜんぶ せいすう（.5 は ださない）で、27もん とも ちがう こたえ（おなじ しき・こたえ を くりかえさない）。パパと きめた。
const KATACHI = [
  { lv:0, show:'grid',  kind:'sq',   w:3, h:3 },                 //  9
  { lv:0, show:'grid',  kind:'sq',   w:5, h:5 },                 // 25
  { lv:0, show:'num',   kind:'sq',   w:6, h:6 },                 // 36
  { lv:1, show:'grid',  kind:'rect', w:4, h:3 },                 // 12
  { lv:1, show:'grid',  kind:'rect', w:6, h:5 },                 // 30
  { lv:1, show:'num',   kind:'rect', w:8, h:4 },                 // 32
  { lv:2, show:'grid',  kind:'rtri', w:3, h:2 },                 //  3
  { lv:2, show:'grid',  kind:'rtri', w:5, h:4 },                 // 10
  { lv:2, show:'num',   kind:'rtri', w:7, h:4 },                 // 14
  { lv:3, show:'grid',  kind:'tri',  w:6, h:5, o:2 },            // 15
  { lv:3, show:'grid',  kind:'tri',  w:8, h:5, o:3 },            // 20
  { lv:3, show:'num',   kind:'tri',  w:7, h:6, o:3 },            // 21
  { lv:4, show:'grid',  kind:'otri', w:2, h:5, o:4 },            //  5
  { lv:4, show:'grid',  kind:'otri', w:3, h:4, o:5 },            //  6
  { lv:4, show:'num',   kind:'otri', w:2, h:7, o:4 },            //  7
  { lv:5, show:'grid',  kind:'rhom', w:4, h:2 },                 //  4
  { lv:5, show:'grid',  kind:'rhom', w:4, h:4 },                 //  8
  { lv:5, show:'num',   kind:'rhom', w:8, h:6 },                 // 24
  { lv:6, show:'grid',  kind:'para', w:4, h:4, o:1 },            // 16
  { lv:6, show:'grid',  kind:'para', w:7, h:4, o:2 },            // 28
  { lv:6, show:'num',   kind:'para', w:8, h:5, o:2 },            // 40
  { lv:7, show:'grid',  kind:'trap', w:8, h:2, o:2, a:3 },       // 11
  { lv:7, show:'grid',  kind:'trap', w:9, h:2, o:2, a:4 },       // 13
  { lv:7, show:'num',   kind:'trap', w:8, h:4, o:1, a:5 },       // 26
  // ふくざつ：ながしかく や さんかく を あわせた かたち（split ＝ マス目 と、わけめ の てんせん）
  { lv:8, show:'grid',  kind:'comp', parts:[{ kind:'rect', x:0, y:0, w:3, h:2 }, { kind:'rect', x:0, y:2, w:6, h:2 }] },               // 18（L）
  { lv:8, show:'grid',  kind:'comp', parts:[{ kind:'rect', x:2, y:0, w:2, h:2 }, { kind:'rect', x:0, y:2, w:6, h:3 }] },               // 22（凸）
  { lv:8, show:'split', kind:'comp', parts:[{ kind:'tri', x:0, y:0, w:6, h:3, o:3 }, { kind:'rect', x:0, y:3, w:6, h:3 }] },           // 27（いえ）
];
const KATACHI_STUCK_MISS = 2, KATACHI_STUCK_MS = 45000;
let katachiOn = false, katachiIdx = 0, kst = null, kousakuFrame = null;
// ── いちらん（おだい と おなじ ように レベル と もんだい を えらぶ）。できた もんだい は ⭐（ひと ごと に のこす）──
let kList = false, kListBtns = [];
const KATACHI_COLORS = ['#c08a20', '#4a9a55', '#c0558a', '#7a5ad0', '#d0553f', '#2a9db0', '#3f8fd0', '#b0508a', '#6a7a2a'];
const kWho = () => { try{ return profile().id; }catch(e){ return 'x'; } };
function kClears(){ try{ return (JSON.parse(localStorage.getItem('nb_katachi') || '{}')[kWho()]) || []; }catch(e){ return []; } }
function kMarkClear(i){ try{ const all = JSON.parse(localStorage.getItem('nb_katachi') || '{}'), a = all[kWho()] || []; if(!a.includes(i)) a.push(i); all[kWho()] = a; localStorage.setItem('nb_katachi', JSON.stringify(all)); }catch(e){} }
function kListOpenBtn(){ return { x: 6, y: TAB_H + 126, w: 170, h: 28 }; }
function kListLayout(){
  const w = Math.min(360, sw - 20), rowH = Math.max(30, Math.min(46, (sh - TAB_H - 130)/KATACHI_LV.length)), head = 44;
  const h = head + rowH*KATACHI_LV.length + 58, x = (sw - w)/2, y = Math.max(TAB_H + 8, (sh - h)/2);
  return { x, y, w, h, rowH, head };
}
// いちらん を だして いる あいだ は、ぜんぶ の タップ を ここ で うける（うしろ の ボタン に とどかない）
function katachiListTap(x, y){
  if(!katachiOn || !kList) return false;
  for(const b of kListBtns) if(ptInRect(x, y, b.x, b.y, b.w, b.h)){ if(b.i === -1) kList = false; else { kList = false; katachiStart(b.i); } return true; }
  return true;
}
function drawKatachiList(ctx, t){
  if(!katachiOn || !kList) return;
  const L = kListLayout(), cl = kClears(); kListBtns = [];
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, TAB_H, sw, sh - TAB_H);
  ctx.fillStyle = '#fdfdff'; ctx.beginPath(); ctx.roundRect(L.x, L.y, L.w, L.h, 14); ctx.fill();
  ctx.fillStyle = '#2b3a52'; ctx.font = '900 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🔷 かたち の いちらん（⭐ ' + cl.length + '/' + KATACHI.length + '）', L.x + L.w/2, L.y + L.head/2 + 2);
  const nameW = Math.min(150, L.w*0.44), cellW = (L.w - nameW - 28)/3;
  KATACHI_LV.forEach((name, lv) => {
    const ry = L.y + L.head + lv*L.rowH, col = KATACHI_COLORS[lv];
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(L.x + 8, ry + 3, nameW, L.rowH - 6, 9); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 ' + (name.length > 7 ? 12 : 14) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(name, L.x + 8 + nameW/2, ry + L.rowH/2);
    KATACHI.forEach((sh, i) => { if(sh.lv !== lv) return;
      const k = KATACHI.slice(0, i).filter(q => q.lv === lv).length, cx = L.x + 16 + nameW + k*cellW, done = cl.includes(i), cur = i === katachiIdx;
      ctx.fillStyle = done ? '#fff1c2' : '#eef2f7'; ctx.beginPath(); ctx.roundRect(cx + 2, ry + 3, cellW - 4, L.rowH - 6, 9); ctx.fill();
      if(cur){ ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.fillStyle = '#2b3a52'; ctx.font = '900 15px sans-serif'; ctx.fillText((k + 1) + (sh.show === 'num' ? ' 🔢' : '') + (done ? ' ⭐' : ''), cx + cellW/2, ry + L.rowH/2);
      kListBtns.push({ x: cx + 2, y: ry + 3, w: cellW - 4, h: L.rowH - 6, i });
    });
  });
  const bx = L.x + L.w/2 - 70, by = L.y + L.h - 48;
  ctx.fillStyle = '#dfe6ef'; ctx.beginPath(); ctx.roundRect(bx, by, 140, 38, 12); ctx.fill();
  ctx.fillStyle = '#2b3a52'; ctx.font = '900 16px sans-serif'; ctx.fillText('とじる', bx + 70, by + 19);
  kListBtns.push({ x: bx, y: by, w: 140, h: 38, i: -1 });
  ctx.restore();
}

const kArea = s => Kata.area(s);
// y ＞＝ v の ところ（した がわ）だけ のこす（とつ で ない かたち でも ひろさ は ただしい）
function kClipBelow(P, v){
  const out = [];
  for(let i = 0; i < P.length; i++){
    const a = P[i], b = P[(i+1)%P.length], ia = a[1] >= v, ib = b[1] >= v;
    if(ia) out.push(a);
    if(ia !== ib){ const t = (v - a[1])/(b[1] - a[1]); out.push([a[0] + (b[0]-a[0])*t, v]); }
  }
  return out;
}
// した から ひろさ の f（0〜1）だけ たまった とき の みず の たかさ
function kLevel(parts, h, f){
  const below = m => parts.reduce((t, P) => t + Kata.polyArea(kClipBelow(P, m)), 0), A = below(0);
  let lo = 0, hi = h;
  for(let k = 0; k < 30; k++){ const m = (lo + hi)/2; if(below(m) > f*A) lo = m; else hi = m; }
  return (lo + hi)/2;
}

// がめん の どこ に かくか（アイコン の れつ と しき の した、キャラ の うえ）
function kLayout(){
  const s = KATACHI[katachiIdx], parts = Kata.parts(s);
  let bw = 0, bh = 0; for(const P of parts) for(const [x, y] of P){ bw = Math.max(bw, x); bh = Math.max(bh, y); }
  const top = TAB_H + 158, availH = Math.max(90, calcFloor() - 150 - top);
  const C = Math.max(12, Math.floor(Math.min(34, (sw - 110)/bw, availH/bh)));
  const W = bw*C, H = bh*C;
  return { s, parts, C, bw, bh, x: Math.round((sw - W)/2), y: top, W, H };
}
function kousakuBtn(){ const L = kLayout(); return { x: Math.min(sw - 52, L.x + L.W + 10), y: L.y - 6, w: 44, h: 44 }; }
function kNextBtn(){ const L = kLayout(); return { x: sw/2 - 70, y: L.y + L.H + 56, w: 140, h: 40 }; }   // 「ぴったり！」の した

function katachiStart(i){
  katachiOn = true; katachiIdx = Math.max(0, Math.min(KATACHI.length - 1, i || 0));
  kst = { miss: 0, t0: Date.now(), fill: null, msg: '', hint: null, done: false, stuck: false };
  if(typeof blocks !== 'undefined'){ blocks = []; clearUndo(); }
}
function katachiStop(){ katachiOn = false; kst = null; kList = false; closeKousaku(); }

// タップ：🛠️ と つぎへ。うけたら true
function katachiTap(x, y){
  if(!katachiOn) return false;
  { const b = kListOpenBtn(); if(ptInRect(x, y, b.x, b.y, b.w, b.h)){ kList = true; return true; } }   // 📋 いちらん
  if(kst.done){ const b = kNextBtn(); if(ptInRect(x, y, b.x, b.y, b.w, b.h)){ katachiStart((katachiIdx + 1) % KATACHI.length); return true; } }
  else { const b = kousakuBtn(); if(ptInRect(x, y, b.x, b.y, b.w, b.h)){ openKousaku(); return true; } }   // 🛠️ は いつも おせる
  return false;
}
// キャラ を はなした：かたち の うえ なら ためす。うけたら true（キャラ は ばしょ を かえる か きえる）
function katachiDrop(b, x, y){
  if(!katachiOn || kst.done) return false;
  const L = kLayout(), pad = 16;
  if(!(x > L.x - pad && x < L.x + L.W + pad && y > L.y - pad && y < L.y + L.H + pad)) return false;
  const A = kArea(L.s), v = Num.toNumber(b.q), col = kColor(b.q), now = performance.now();
  if(Math.abs(v - A) < 1e-9){
    blocks = blocks.filter(o => o !== b);
    kst.done = true; kst.fill = { f: 0, to: 1, col, t: now, keep: true };
    kst.msg = 'ぴったり！ ' + Kata.formula(L.s);
    kMarkClear(katachiIdx);
    for(let i = 0; i < 60; i++) fxParticles.push(new Particle(L.x + L.W/2, L.y + L.H/2));
  } else {
    kst.miss++;
    kst.fill = { f: 0, to: Math.min(1, v/A), col, t: now, over: v > A ? v - A : 0 };
    kst.msg = v < A ? 'あと ' + Kata.fmt(A - v) + ' マス たりない' : Kata.fmt(v - A) + ' マス おおい';
    b.y = calcFloor() - b.height; b.vy = -6; b.x = Math.min(Math.max(playLeft(), b.x), sw - EDGE_MARGIN - b.width);   // キャラ は した へ もどる
  }
  updateTargets();
  return true;
}
function kColor(q){ const f = Num.floor(q); return f === 0 ? glassLiqColor(Math.round(Num.toNumber(Num.fracPart(q))*10)) : mainColorOf(Math.min(f, 1000)); }

// ── こうさくしつ（きって うごかす）：lab-menseki.html を うえ に かさねる ──
function openKousaku(){
  closeKousaku();
  const s = KATACHI[katachiIdx], f = document.createElement('iframe');
  const shape = Object.assign({}, s); delete shape.lv; delete shape.show;
  f.src = 'lab-menseki.html?embed=1&s=' + encodeURIComponent(JSON.stringify(shape)) + '&v=' + Date.now();
  f.style.cssText = 'position:fixed;left:0;right:0;bottom:0;width:100%;border:0;z-index:60;background:#f3f7ea;top:' + TAB_H + 'px;height:calc(100% - ' + TAB_H + 'px)';
  document.body.appendChild(f); kousakuFrame = f;
}
function closeKousaku(){ if(kousakuFrame){ kousakuFrame.remove(); kousakuFrame = null; } }
window.addEventListener('message', e => {
  const d = e.data; if(!d || d.from !== 'menseki' || !kousakuFrame || e.source !== kousakuFrame.contentWindow) return;
  if(d.type === 'done' && kst) kst.hint = d.hint;                 // 「4 × 3 の はんぶん」など
  if(d.type === 'close') closeKousaku();
});

// たかさ の せん を ひく ところ（てっぺん の よこ）
function kApexX(s){ return (s.kind === 'tri' || s.kind === 'otri' || s.kind === 'para' || s.kind === 'trap') ? (s.o || 0) : 0; }

function drawKatachi(ctx, t){
  if(!katachiOn || !kst) return;
  const L = kLayout(), { s, C, parts } = L, now = performance.now();
  if(!kst.done && !kst.stuck && (kst.miss >= KATACHI_STUCK_MISS || Date.now() - kst.t0 > KATACHI_STUCK_MS)){
    kst.stuck = true; if(!kst.fill) kst.msg = 'こまったら 🛠️ こうさくしつ で しらべて みよう';
  }
  const X = x => L.x + x*C, Y = y => L.y + y*C;
  const path = P => { ctx.beginPath(); P.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.closePath(); };
  const all = () => { ctx.beginPath(); for(const P of parts){ P.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.closePath(); } };
  ctx.save();
  // ドラッグ ちゅう に うえ に くると ひかる
  const hover = !!(dragBlock && dragPtr && dragPtr.x > L.x - 16 && dragPtr.x < L.x + L.W + 16 && dragPtr.y > L.y - 16 && dragPtr.y < L.y + L.H + 16);
  // ふち：ぜんぶ の かたち を ふとく なぞって から なか を ぬる と、あわせめ の せん は きえて そと がわ だけ のこる
  ctx.lineJoin = 'round'; ctx.strokeStyle = hover ? '#e0a000' : '#4a5a74'; ctx.lineWidth = 6;
  for(const P of parts){ path(P); ctx.stroke(); }
  ctx.fillStyle = hover ? 'rgb(255,250,215)' : 'rgb(250,251,253)';
  for(const P of parts){ path(P); ctx.fill(); }
  // みず の ように たまる（ぴったり なら いっぱい）
  if(kst.fill){
    const F = kst.fill, age = now - F.t, rise = Math.min(1, age/700), drain = F.keep ? 0 : Math.max(0, (age - 1900)/600);
    F.f = F.to * rise * (1 - Math.min(1, drain));
    if(!F.keep && drain >= 1){ kst.fill = null; if(kst.stuck) kst.msg = 'こまったら 🛠️ こうさくしつ で しらべて みよう'; }
    else if(F.f > 0.001){
      const lv = kLevel(parts, L.bh, F.f);
      ctx.save(); all(); ctx.clip(); ctx.fillStyle = rgb(F.col); ctx.fillRect(L.x - 2, Y(lv), L.W + 4, L.H - lv*C + 2); ctx.restore();
      if(F.over && rise >= 1 && drain < 1){                    // あふれた ぶん：うえ に こぼれる ブロック
        ctx.save(); ctx.globalAlpha = 1 - drain; ctx.fillStyle = rgb(F.col);
        const n = Math.min(24, Math.ceil(F.over)), bob = Math.sin(now*0.012)*2;
        for(let i = 0; i < n; i++){ const cx = L.x + L.W/2 + (i - (n-1)/2)*(C*0.62), cy = L.y - C*0.6 - (i%2)*C*0.35 + bob; ctx.fillRect(cx - C*0.27, cy - C*0.27, C*0.54, C*0.54); }
        ctx.restore();
      }
    }
  }
  // マス目（grid の とき・ぴったり の あと）
  if(s.show === 'grid' || s.show === 'split' || kst.done){
    ctx.save(); all(); ctx.clip(); ctx.strokeStyle = kst.done ? 'rgba(255,255,255,0.6)' : 'rgba(120,140,170,0.45)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for(let x = 0; x <= L.bw; x++){ ctx.moveTo(X(x), L.y); ctx.lineTo(X(x), L.y + L.H); }
    for(let y = 0; y <= L.bh; y++){ ctx.moveTo(L.x, Y(y)); ctx.lineTo(L.x + L.W, Y(y)); }
    ctx.stroke(); ctx.restore();
  }
  // てんせん：たかさ・たいかくせん・わけめ
  ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#d0553f'; ctx.lineWidth = 2; ctx.beginPath();
  const k = s.kind, hx = kApexX(s);
  if(k === 'tri' || k === 'otri' || k === 'para' || k === 'trap'){ ctx.moveTo(X(hx), Y(0)); ctx.lineTo(X(hx), Y(s.h)); }
  if(k === 'otri'){ ctx.moveTo(X(s.w), Y(s.h)); ctx.lineTo(X(hx), Y(s.h)); }             // ていへん を のばした ところ
  if(k === 'rhom'){ ctx.moveTo(X(0), Y(s.h/2)); ctx.lineTo(X(s.w), Y(s.h/2)); ctx.moveTo(X(s.w/2), Y(0)); ctx.lineTo(X(s.w/2), Y(s.h)); }
  ctx.stroke();
  if(k === 'comp' && s.show === 'split'){ ctx.strokeStyle = '#7a8aa4'; for(const P of parts){ path(P); ctx.stroke(); } }
  ctx.restore();
  ctx.restore();
}
// もじ・ボタン は キャラ より てまえ（キャラ に かくれない）
function drawKatachiFront(ctx, t){
  if(!katachiOn || !kst) return;
  const L = kLayout(), { s, C } = L, X = x => L.x + x*C, Y = y => L.y + y*C, k = s.kind;
  const F = '900 15px sans-serif', red = '#d0553f', ink = '#2b3a52';
  ctx.save();
  if((s.show === 'num' || kst.done) && k !== 'comp'){
    if(k === 'sq'){ kLabel(ctx, 'いっぺん ' + s.w, X(s.w/2), Y(s.h) + 4, 'center', 'top', ink, F); }
    else if(k === 'rect'){ kLabel(ctx, 'よこ ' + s.w, X(s.w/2), Y(s.h) + 4, 'center', 'top', ink, F); kLabel(ctx, 'たて ' + s.h, L.x - 6, Y(s.h/2), 'right', 'middle', ink, F); }
    else if(k === 'rhom'){ kLabel(ctx, 'たいかくせん ' + s.w, X(s.w/2), Y(s.h) + 4, 'center', 'top', red, F); kLabel(ctx, s.h, L.x - 6, Y(s.h/2), 'right', 'middle', red, F); }
    else {
      kLabel(ctx, (k === 'trap' ? 'かてい ' : 'ていへん ') + s.w, X(s.w/2), Y(s.h) + 4, 'center', 'top', ink, F);
      kLabel(ctx, 'たかさ ' + s.h, L.x - 6, Y(s.h/2), 'right', 'middle', red, F);
      if(k === 'trap') kLabel(ctx, 'じょうてい ' + s.a, X(s.o + s.a/2), L.y - 4, 'center', 'bottom', ink, F);
    }
  }
  // なんもんめ・ことば・ヒント
  { const b = kListOpenBtn(), k = KATACHI.slice(0, katachiIdx).filter(q => q.lv === s.lv).length;   // 📋 いちらん を ひらく
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 10); ctx.fill();
    kLabel(ctx, '📋 ' + KATACHI_LV[s.lv] + ' ' + (k + 1) + '/3', b.x + 8, b.y + b.h/2, 'left', 'middle', KATACHI_COLORS[s.lv], 'bold 13px sans-serif'); }
  let ty = L.y + L.H + 28;
  if(kst.hint && !kst.done){
    kLabel(ctx, 'ヒント：' + kst.hint + ' を つくろう', sw/2, ty, 'center', 'top', '#7a5ad0', F); ty += 22;
  }
  if(kst.msg) kLabel(ctx, kst.msg, sw/2, ty, 'center', 'top', kst.done ? '#d06a00' : ink, kst.msg.length > 26 ? '900 14px sans-serif' : '900 17px sans-serif');
  if(kst.done){ const b = kNextBtn(); ctx.fillStyle = '#3ebb47'; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('つぎ へ ▶', b.x + b.w/2, b.y + b.h/2); }
  else {
    // 🛠️ こうさくしつ は さいしょ から。なやんで いる と ゆれて しらせる
    const b = kousakuBtn(), z = kst.stuck ? 1 + 0.08*Math.sin(t*0.008) : 1;
    ctx.save(); ctx.translate(b.x + b.w/2, b.y + b.h/2); ctx.scale(z, z);
    ctx.fillStyle = kst.stuck ? '#fff1c2' : '#ffffff'; ctx.strokeStyle = kst.stuck ? '#e0a000' : '#9aa8bc'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-b.w/2, -b.h/2, b.w, b.h, 12); ctx.fill(); ctx.stroke();
    // えもじ は 'middle' だと すこし ずれる ので、じっさい の おおきさ で まんなか に
    ctx.font = '24px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText('🛠️'), ew = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, eh = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    ctx.fillText('🛠️', -ew/2 + m.actualBoundingBoxLeft, -eh/2 + m.actualBoundingBoxAscent);
    ctx.restore();
  }
  ctx.restore();
}
function kLabel(ctx, text, x, y, align, base, col, font){
  text = String(text);
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = base;
  ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = col; ctx.fillText(text, x, y);
}
