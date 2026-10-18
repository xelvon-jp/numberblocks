// ─── みず：スマホの かたむきで ガラスの なかの みずを うごかす（はんぶん・ためし で つかう）─────────
// ・おもさの むき（DeviceMotion の accelerationIncludingGravity。なければ DeviceOrientation の beta・gamma から）で、
//   みずの おもてが いつも すいへいに なる。かたむきの せいげんは なし（さかさまに すると みずは うえへ。がめんの かいてんロック を つかう）
// ・みずの りょうは どんな かたむきでも おなじ（おもての たかさを めんせきで きめる）
// ・ばね と ねばり で すこし おくれて ついてきて ゆれる。なみ：かたむきが かわる はやさ（なみ）・ふった いきおい（ふると なみ）
// ・せってい（つまみ）は ためし の「🌊 かたむけて みず」で きめて「はんぶんに つかう」で この たんまつに しまう（nb_mizu）。
//   しまうと ひらいて いる はんぶん にも すぐ きく（storage の しらせ）。
// ・センサーは はじめから オン。iPhone は ゆびで さわった とき でないと きけないので、さいしょに さわった とき に ゆるしを きく。
// つかいかた：Mizu.autoStart() → まいフレーム Mizu.tick(dt) → ガラス ごとに Mizu.step(st, dt, size) と Mizu.draw(...)
const Mizu = (() => {
  const KEY = 'nb_mizu';
  const DEF = { k: 90, damp: 6, wave: 4, shk: 4, smooth: 6, level: true, sensor: true };
  const opt = Object.assign({}, DEF);
  function load(){ try{ const v = JSON.parse(localStorage.getItem(KEY)); if(v && typeof v === 'object') for(const k in DEF) if(typeof v[k] === typeof DEF[k]) opt[k] = v[k]; }catch(e){} }
  function save(o){ for(const k in DEF) if(o && typeof o[k] === typeof DEF[k]) opt[k] = o[k]; try{ localStorage.setItem(KEY, JSON.stringify(pick())); }catch(e){} }
  const pick = () => { const o = {}; for(const k in DEF) o[k] = opt[k]; return o; };
  load();
  const listeners = [];
  window.addEventListener('storage', e => { if(e.key === KEY){ load(); listeners.forEach(f => f(opt)); if(opt.sensor) autoStart(); } });

  // ── センサー ──
  const sens = { on: false, asked: false, gamma: 0, beta: 0, ax: 0, ay: 0, gx: 0, gy: 0, got: false, gotG: false, sgn: 1, ux: 0, uy: 1,
                 n: 0, rate: 0, t0: performance.now(), fake: 0, msg: 'まだ' };
  function onOrient(e){ if(e.gamma == null) return; sens.gamma = e.gamma; sens.beta = e.beta || 0; sens.n++; sens.got = true; }
  function onMotion(e){ const a = e.acceleration || {}, g = e.accelerationIncludingGravity || {}; sens.ax = a.x || 0; sens.ay = a.y || 0;
    if(g.x != null && g.y != null){ sens.gx = g.x; sens.gy = g.y; sens.gotG = true; } }
  const needsPerm = () => typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
  function listen(){ if(sens.on) return; window.addEventListener('deviceorientation', onOrient); window.addEventListener('devicemotion', onMotion); sens.on = true; sens.msg = 'オン（0かい/びょう なら センサーが ない）'; }
  async function start(){
    try{
      if(needsPerm()){
        sens.asked = true;
        const r = await DeviceOrientationEvent.requestPermission();
        if(r !== 'granted'){ sens.msg = 'ゆるされなかった（' + r + '）。せっていの Safari → モーションと かたむき も みてね'; return false; }
        if(typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function'){ try{ await DeviceMotionEvent.requestPermission(); }catch(e){} }
      }
      listen(); return true;
    }catch(e){ sens.msg = 'だめ でした：' + (e && e.message || e); return false; }
  }
  // はじめから オン：ゆるしが いらない たんまつ は すぐ。iPhone は さいしょに さわった とき に きく（1かい だけ）
  let waiting = false;
  function autoStart(){
    if(!opt.sensor || sens.on) return;
    if(!needsPerm()){ listen(); return; }
    if(waiting || sens.asked) return;
    waiting = true; sens.msg = 'がめんに さわると ゆるしを きくよ';
    const once = () => { document.removeEventListener('touchend', once, true); document.removeEventListener('click', once, true); waiting = false; start(); };
    document.addEventListener('touchend', once, true); document.addEventListener('click', once, true);
  }
  // がめんの なかで「うえ」の むき（x：みぎ、y：うえ）。accelerationIncludingGravity は たんまつで +/− が ぎゃく なので beta・gamma の むきと くらべて あわせる
  function upRaw(){
    const b = sens.beta*Math.PI/180, g = sens.gamma*Math.PI/180, ox = -Math.sin(g)*Math.cos(b), oy = Math.sin(b);
    if(sens.gotG){ const d = sens.gx*ox + sens.gy*oy; if(sens.got && Math.hypot(ox, oy) > 0.5 && Math.abs(d) > 3) sens.sgn = d > 0 ? 1 : -1;
      const L = Math.hypot(sens.gx, sens.gy); if(L > 1.5) return [sens.sgn*sens.gx/L, sens.sgn*sens.gy/L]; }
    if(sens.got){ const L = Math.hypot(ox, oy); if(L > 0.15) return [ox/L, oy/L]; }
    return [0, 1];
  }

  // ── まいフレーム：めざす かたむき と ふった いきおい ──
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  const now = { tg: 0, jolt: 0 };
  function tick(dt){
    const t = performance.now(); if(t - sens.t0 > 1000){ sens.rate = sens.n; sens.n = 0; sens.t0 = t; }
    const [ux, uy] = sens.on && opt.sensor ? upRaw() : [0, 1];
    const kf = 1/(1 + opt.smooth); sens.ux += (ux - sens.ux)*kf; sens.uy += (uy - sens.uy)*kf;
    now.tg = Math.atan2(sens.ux, sens.uy) - sens.fake*Math.PI/180;      // ゆびで みぎに なぞる ＝ みぎに かたむけた（ためし）
    now.jolt = opt.sensor ? Math.min(20, Math.max(0, Math.hypot(sens.ax, sens.ay) - 0.6)) : 0;   // こまかい ふるえ（0.6 まで）は なみに しない
  }
  // ガラス 1こ ぶん。th：みずの おもての かたむき（がめんの なかで）、om：その はやさ、amp：なみ、ph：なみの いち
  const mk = () => ({ th: 0, om: 0, amp: 0, ph: Math.random()*6 });
  function step(g, dt, size){
    size = size || 0.5;
    const tg = opt.level ? now.tg : 0, k = opt.k/Math.sqrt(size), c = opt.damp/Math.sqrt(size);   // ちいさい ほど はやく ゆれる
    g.om += (k*wrapA(tg - g.th) - c*g.om)*dt; g.th = wrapA(g.th + g.om*dt);
    g.amp += (Math.abs(g.om)*opt.wave*0.002 + now.jolt*opt.shk*0.004)*dt*60; g.amp *= Math.pow(0.12, dt); g.amp = Math.min(0.12, g.amp);
    g.ph += dt*(6 + 4/Math.sqrt(size));
  }
  // どの かたむきでも みずの めんせき が fill に なる おもての いち（n：おもさの ほう）
  function clipArea(rx, ry, rw, rh, nx, ny, cx, cy, s){
    const P = [[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]], out = [], f = p => (p[0] - cx)*nx + (p[1] - cy)*ny - s;
    for(let i = 0; i < 4; i++){ const a = P[i], b = P[(i + 1) % 4], fa = f(a), fb = f(b);
      if(fa >= 0) out.push(a);
      if((fa >= 0) !== (fb >= 0)){ const t = fa/(fa - fb); out.push([a[0] + (b[0] - a[0])*t, a[1] + (b[1] - a[1])*t]); } }
    let A = 0; for(let i = 0; i < out.length; i++){ const p = out[i], q = out[(i + 1) % out.length]; A += p[0]*q[1] - q[0]*p[1]; }
    return Math.abs(A)/2;
  }
  function levelOffset(rx, ry, rw, rh, nx, ny, fill){
    const cx = rx + rw/2, cy = ry + rh/2, want = fill*rw*rh; let lo = -(rw + rh), hi = rw + rh;
    for(let i = 0; i < 22; i++){ const m = (lo + hi)/2; if(clipArea(rx, ry, rw, rh, nx, ny, cx, cy, m) > want) lo = m; else hi = m; }
    return (lo + hi)/2;
  }
  // みずを かく（ガラスの うちがわ ix,iy,iw,ih に。r：かどの まるみ。bs：ガラスの 大きさ）
  function draw(ctx, ix, iy, iw, ih, r, fill, col, g, bs){
    if(fill <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.roundRect(ix, iy, iw, ih, r); ctx.clip();
    const ux = Math.cos(g.th), uy = Math.sin(g.th), nx = -uy, ny = ux, L = iw*1.6;
    const so = levelOffset(ix, iy, iw, ih, nx, ny, fill), cx = ix + iw/2 + nx*so, ly = iy + ih/2 + ny*so;
    const idle = fill < 1 ? bs*0.012*opt.wave/10 : 0, amp = fill < 1 ? g.amp : 0;     // じっと して いる ときの さざなみ（なみ が 0 なら なし）
    const pts = []; for(let i = 0; i <= 24; i++){ const t = -L + 2*L*i/24, w = Math.sin(t/iw*Math.PI*2.2 + g.ph)*amp*bs + Math.sin(t/iw*Math.PI*1.1 - g.ph*0.7)*idle;
      pts.push([cx + ux*t - nx*w, ly + uy*t - ny*w]); }
    const gr = ctx.createLinearGradient(cx - nx*bs*0.3, ly - ny*bs*0.3, cx + nx*bs, ly + ny*bs); gr.addColorStop(0, rgb(mixWhite(col, 0.12))); gr.addColorStop(1, rgb(darken(col, 0.12)));
    ctx.fillStyle = gr; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    const e = pts[pts.length - 1], s = pts[0]; ctx.lineTo(e[0] + nx*L*2, e[1] + ny*L*2); ctx.lineTo(s[0] + nx*L*2, s[1] + ny*L*2); ctx.closePath(); ctx.fill();
    if(fill < 1){ ctx.strokeStyle = rgba(mixWhite(col, 0.55), 0.9); ctx.lineWidth = Math.max(1, bs*0.022); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
    ctx.restore();
  }
  return { DEF, opt, load, save, pick, onChange: f => listeners.push(f), sens, start, autoStart, tick, now, mk, step, draw, clipArea, levelOffset,
           feed: (g, b) => onOrient({ gamma: g, beta: b == null ? 60 : b }),
           grav: (x, y) => onMotion({ acceleration: { x: 0, y: 0 }, accelerationIncludingGravity: { x, y, z: 0 } }) };
})();
