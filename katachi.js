// ─── かたち に ぴったり（めんせき・ためし）──────────────────────────────────
// けいさん の がめん に かたち を おき、その ひろさ（マス の かず）の キャラ を けいさん で つくって
// かたち の うえ で はなす。ぴったり なら かたち が キャラ の いろ で いっぱい に なる。
//   たりない → みず の ように とちゅう まで たまって「あと ○ マス」。おおい → あふれて「○ マス おおい」。キャラ は もどる。
//   なやんで いる（2かい ちがう・45びょう たつ）と 🛠️ こうさくしつ（lab-menseki.html を うえ に かさねる）。
//   こうさくしつ で きって うごかして ながしかく に すると「よこ ○ × たて ○」が ヒント に のこる。
// ためし（lab.html）から index.html?katachi=1 で ひらいた とき だけ。きろく（おだい）とは べつ。
// index.html から よぶ のは katachiStart・katachiStop・katachiTap・katachiDrop・drawKatachi だけ。
const KATACHI = [
  // マス が みえる（1 を たして も いい。× だと はやい）
  { show:'grid',  kind:'rect', w:4, h:3 },
  { show:'grid',  kind:'rect', w:5, h:2 },
  { show:'grid',  kind:'rect', w:3, h:3 },
  { show:'grid',  kind:'rtri', w:4, h:3 },
  // ふち に めもり だけ
  { show:'ticks', kind:'rect', w:6, h:3 },
  { show:'ticks', kind:'rect', w:4, h:4 },
  { show:'ticks', kind:'para', w:5, h:3, o:1 },
  { show:'ticks', kind:'rtri', w:6, h:4 },
  // へん の ながさ の かず だけ（しき が いる）
  { show:'num',   kind:'rect', w:7, h:4 },
  { show:'num',   kind:'rect', w:8, h:5 },
  { show:'num',   kind:'para', w:6, h:4, o:2 },
  { show:'num',   kind:'tri',  w:4, h:3, o:1 },
  { show:'num',   kind:'tri',  w:5, h:3, o:2 },
  { show:'num',   kind:'tri',  w:6, h:4, o:2 },
];
const KATACHI_STUCK_MISS = 2, KATACHI_STUCK_MS = 45000;
let katachiOn = false, katachiIdx = 0, kst = null, kousakuFrame = null;

function kPts(s){
  const { w, h, o = 0 } = s;
  if(s.kind === 'rect') return [[0,0],[w,0],[w,h],[0,h]];
  if(s.kind === 'para') return [[o,0],[w+o,0],[w,h],[0,h]];
  if(s.kind === 'rtri') return [[0,0],[0,h],[w,h]];
  return [[o,0],[w,h],[0,h]];                                  // tri：てっぺん は よこ o の ところ
}
const kArea = s => (s.kind === 'rtri' || s.kind === 'tri') ? s.w*s.h/2 : s.w*s.h;
const kPolyArea = P => { let a = 0; for(let i = 0; i < P.length; i++){ const [x0,y0] = P[i], [x1,y1] = P[(i+1)%P.length]; a += x0*y1 - x1*y0; } return Math.abs(a)/2; };
// y ＞＝ v の ところ（した がわ）だけ のこす
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
function kLevel(P, h, f){
  let lo = 0, hi = h; const A = kPolyArea(P);
  for(let k = 0; k < 30; k++){ const m = (lo + hi)/2; if(kPolyArea(kClipBelow(P, m)) > f*A) lo = m; else hi = m; }
  return (lo + hi)/2;
}

// がめん の どこ に かくか（アイコン の れつ と しき の した、キャラ の うえ）
function kLayout(){
  const s = KATACHI[katachiIdx], maxW = Math.max(s.w + (s.o || 0), s.w);
  const top = TAB_H + 158, availH = Math.max(90, calcFloor() - 150 - top);
  const C = Math.max(12, Math.floor(Math.min(34, (sw - 96)/maxW, availH/s.h)));
  const W = maxW*C, H = s.h*C;
  return { s, C, x: Math.round((sw - W)/2), y: top, W, H };
}
function kousakuBtn(){ const L = kLayout(); return { x: L.x + L.W + 10, y: L.y - 6, w: 44, h: 44 }; }
function kNextBtn(){ const L = kLayout(); return { x: sw/2 - 70, y: L.y + L.H + 56, w: 140, h: 40 }; }   // 「ぴったり！」の した

function katachiStart(i){
  katachiOn = true; katachiIdx = Math.max(0, Math.min(KATACHI.length - 1, i || 0));
  kst = { miss: 0, t0: Date.now(), fill: null, msg: '', hint: null, done: false, stuck: false };
  if(typeof blocks !== 'undefined'){ blocks = []; clearUndo(); }
}
function katachiStop(){ katachiOn = false; kst = null; closeKousaku(); }

// タップ：🛠️ と つぎへ。うけたら true
function katachiTap(x, y){
  if(!katachiOn) return false;
  if(kst.done){ const b = kNextBtn(); if(ptInRect(x, y, b.x, b.y, b.w, b.h)){ katachiStart((katachiIdx + 1) % KATACHI.length); return true; } }
  else if(kst.stuck){ const b = kousakuBtn(); if(ptInRect(x, y, b.x, b.y, b.w, b.h)){ openKousaku(); return true; } }
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
    kst.msg = 'ぴったり！ ' + kFormula(L.s);
    for(let i = 0; i < 60; i++) fxParticles.push(new Particle(L.x + L.W/2, L.y + L.H/2));
  } else {
    kst.miss++;
    kst.fill = { f: 0, to: Math.min(1, v/A), col, t: now, over: v > A ? v - A : 0 };
    kst.msg = v < A ? 'あと ' + kFmt(A - v) + ' マス たりない' : kFmt(v - A) + ' マス おおい';
    b.y = calcFloor() - b.height; b.vy = -6; b.x = Math.min(Math.max(playLeft(), b.x), sw - EDGE_MARGIN - b.width);   // キャラ は した へ もどる
  }
  updateTargets();
  return true;
}
const kFmt = v => String(Math.round(v*100)/100);
function kColor(q){ const f = Num.floor(q); return f === 0 ? glassLiqColor(Math.round(Num.toNumber(Num.fracPart(q))*10)) : mainColorOf(Math.min(f, 1000)); }
function kFormula(s){
  const A = kArea(s);
  if(s.kind === 'rect') return s.w === s.h ? `${s.w} × ${s.h} ＝ ${A}（ましかく）` : `よこ ${s.w} × たて ${s.h} ＝ ${A}`;
  if(s.kind === 'para') return `ていへん ${s.w} × たかさ ${s.h} ＝ ${A}`;
  return `ていへん ${s.w} × たかさ ${s.h} ÷ 2 ＝ ${kFmt(A)}`;
}

// ── こうさくしつ（きって うごかす）：lab-menseki.html を うえ に かさねる ──
function openKousaku(){
  closeKousaku();
  const s = KATACHI[katachiIdx], f = document.createElement('iframe');
  f.src = 'lab-menseki.html?embed=1&kind=' + s.kind + '&w=' + s.w + '&h=' + s.h + '&o=' + (s.o || 0) + '&v=' + Date.now();
  f.style.cssText = 'position:fixed;left:0;right:0;bottom:0;width:100%;border:0;z-index:60;background:#f3f7ea;top:' + TAB_H + 'px;height:calc(100% - ' + TAB_H + 'px)';
  document.body.appendChild(f); kousakuFrame = f;
}
function closeKousaku(){ if(kousakuFrame){ kousakuFrame.remove(); kousakuFrame = null; } }
window.addEventListener('message', e => {
  const d = e.data; if(!d || d.from !== 'menseki' || !kousakuFrame || e.source !== kousakuFrame.contentWindow) return;
  if(d.type === 'done' && kst) kst.hint = { w: d.w, h: d.h, half: !!d.half };
  if(d.type === 'close') closeKousaku();
});

function drawKatachi(ctx, t){
  if(!katachiOn || !kst) return;
  const L = kLayout(), { s, C } = L, P = kPts(s), now = performance.now();
  if(!kst.done && !kst.stuck && (kst.miss >= KATACHI_STUCK_MISS || Date.now() - kst.t0 > KATACHI_STUCK_MS)){
    kst.stuck = true; if(!kst.fill) kst.msg = 'こまったら 🛠️ こうさくしつ で しらべて みよう';
  }
  const path = () => { ctx.beginPath(); P.forEach(([x, y], i) => { const X = L.x + x*C, Y = L.y + y*C; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); };
  ctx.save();
  // ドラッグ ちゅう に うえ に くると ひかる
  const hover = !!(dragBlock && dragPtr && dragPtr.x > L.x - 16 && dragPtr.x < L.x + L.W + 16 && dragPtr.y > L.y - 16 && dragPtr.y < L.y + L.H + 16);
  path(); ctx.fillStyle = hover ? 'rgba(255,250,215,0.95)' : 'rgba(255,255,255,0.88)'; ctx.fill();
  // みず の ように たまる（ぴったり なら いっぱい）
  if(kst.fill){
    const F = kst.fill, age = now - F.t, rise = Math.min(1, age/700), drain = F.keep ? 0 : Math.max(0, (age - 1900)/600);
    F.f = F.to * rise * (1 - Math.min(1, drain));
    if(!F.keep && drain >= 1){ kst.fill = null; if(kst.stuck) kst.msg = 'こまったら 🛠️ こうさくしつ で しらべて みよう'; }
    else if(F.f > 0.001){
      const lv = kLevel(P, s.h, F.f);
      ctx.save(); path(); ctx.clip(); ctx.fillStyle = rgb(F.col); ctx.fillRect(L.x - 2, L.y + lv*C, L.W + 4, L.H - lv*C + 2); ctx.restore();
      if(F.over && rise >= 1 && drain < 1){                    // あふれた ぶん：うえ に こぼれる ブロック
        ctx.save(); ctx.globalAlpha = 1 - drain; ctx.fillStyle = rgb(F.col);
        const n = Math.min(24, Math.ceil(F.over)), bob = Math.sin(now*0.012)*2;
        for(let i = 0; i < n; i++){ const cx = L.x + L.W/2 + (i - (n-1)/2)*(C*0.62), cy = L.y - C*0.6 - (i%2)*C*0.35 + bob; ctx.fillRect(cx - C*0.27, cy - C*0.27, C*0.54, C*0.54); }
        ctx.restore();
      }
    }
  }
  // マス目（grid の とき・ぴったり の あと）
  if(s.show === 'grid' || kst.done){
    ctx.save(); path(); ctx.clip(); ctx.strokeStyle = kst.done ? 'rgba(255,255,255,0.6)' : 'rgba(120,140,170,0.45)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for(let x = 0; x <= L.W/C; x++){ ctx.moveTo(L.x + x*C, L.y); ctx.lineTo(L.x + x*C, L.y + L.H); }
    for(let y = 0; y <= s.h; y++){ ctx.moveTo(L.x, L.y + y*C); ctx.lineTo(L.x + L.W, L.y + y*C); }
    ctx.stroke(); ctx.restore();
  }
  path(); ctx.strokeStyle = hover ? '#e0a000' : '#4a5a74'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
  // ていへん（した の へん）と たかさ
  const base = [0, s.w];                                      // ていへん は いつも した の 0〜w
  const hx = s.kind === 'tri' || s.kind === 'para' ? (s.o || 0) : 0;   // たかさ の せん を ひく ところ
  if(s.kind === 'tri' || s.kind === 'para'){
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#d0553f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L.x + hx*C, L.y); ctx.lineTo(L.x + hx*C, L.y + L.H); ctx.stroke(); ctx.restore();
  }
  if(s.show === 'ticks' && !kst.done){
    ctx.save(); ctx.strokeStyle = '#4a5a74'; ctx.lineWidth = 2; ctx.beginPath();
    for(let x = base[0]; x <= base[1]; x++){ ctx.moveTo(L.x + x*C, L.y + L.H); ctx.lineTo(L.x + x*C, L.y + L.H + 7); }
    for(let y = 0; y <= s.h; y++){ const X = L.x + hx*C; ctx.moveTo(X, L.y + y*C); ctx.lineTo(X - 7, L.y + y*C); }
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
// もじ・ボタン は キャラ より てまえ（キャラ に かくれない）
function drawKatachiFront(ctx, t){
  if(!katachiOn || !kst) return;
  const L = kLayout(), { s, C } = L;
  ctx.save();
  if(s.show === 'num' || kst.done){
    const bw = s.kind === 'rect' ? 'よこ ' : 'ていへん ', hh = s.kind === 'rect' ? 'たて ' : 'たかさ ';
    kLabel(ctx, bw + s.w, L.x + s.w/2*C, L.y + L.H + 4, 'center', 'top', '#2b3a52', '900 15px sans-serif');
    kLabel(ctx, hh + s.h, L.x - 6, L.y + L.H/2, 'right', 'middle', s.kind === 'rect' ? '#2b3a52' : '#d0553f', '900 15px sans-serif');
  }
  // なんもんめ・ことば・ヒント
  kLabel(ctx, 'かたち ' + (katachiIdx + 1) + '/' + KATACHI.length, 10, TAB_H + 140, 'left', 'top', '#5a6576', 'bold 12px sans-serif');
  let ty = L.y + L.H + 28;
  if(kst.hint && !kst.done){
    const H = kst.hint; kLabel(ctx, 'ヒント：' + H.w + ' × ' + H.h + (H.half ? ' の はんぶん' : '') + ' を つくろう', sw/2, ty, 'center', 'top', '#7a5ad0', '900 15px sans-serif'); ty += 22;
  }
  if(kst.msg){
    kLabel(ctx, kst.msg, sw/2, ty, 'center', 'top', kst.done ? '#d06a00' : '#2b3a52', '900 17px sans-serif');
  }
  if(kst.done){ const b = kNextBtn(); ctx.fillStyle = '#3ebb47'; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('つぎ へ ▶', b.x + b.w/2, b.y + b.h/2); }
  else if(kst.stuck){
    const b = kousakuBtn(), k = 1 + 0.08*Math.sin(t*0.008);
    ctx.save(); ctx.translate(b.x + b.w/2, b.y + b.h/2); ctx.scale(k, k);
    ctx.fillStyle = '#fff1c2'; ctx.strokeStyle = '#e0a000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-b.w/2, -b.h/2, b.w, b.h, 12); ctx.fill(); ctx.stroke();
    ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🛠️', 0, 1); ctx.restore();
  }
  ctx.restore();
}
function kLabel(ctx, text, x, y, align, base, col, font){
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = base;
  ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = col; ctx.fillText(text, x, y);
}
