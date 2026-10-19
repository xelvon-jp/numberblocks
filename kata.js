// ─── かたち（ずけい）の かたち と ひろさ ───────────────────────────────────
// ゲーム（katachi.js）と こうさくしつ（lab-menseki.html）で おなじ もの を つかう。
// かたち は マス の ざひょう（ひだりうえ が 0,0、した へ y が ふえる）。ぜんぶ 0 いじょう に おさまる。
//   sq・rect  よこ w × たて h
//   rtri      ちょっかく さんかく（ていへん w・たかさ h、ちょっかく は ひだりした）
//   tri・otri さんかく（ていへん 0〜w が した、てっぺん は よこ o の ところ。o が 0〜w の そと なら どんかく）
//   rhom      ひしがた（たいかくせん w と h）
//   para      へいこうしへんけい（ていへん w・たかさ h、うえ は o ずれる）
//   trap      だいけい（じょうてい a は うえ の o〜o+a、かてい w は した の 0〜w、たかさ h）
//   comp      ふくざつ な かたち：parts（うえ の かたち に x・y を つけた もの）を あわせた もの
(function(root){
  function partPts(p){
    const { w, h, o = 0, a = 0, x = 0, y = 0 } = p;
    let P;
    switch(p.kind){
      case 'para': P = [[o,0],[w+o,0],[w,h],[0,h]]; break;
      case 'rtri': P = [[0,0],[0,h],[w,h]]; break;
      case 'tri': case 'otri': P = [[o,0],[w,h],[0,h]]; break;
      case 'rhom': P = [[w/2,0],[w,h/2],[w/2,h],[0,h/2]]; break;
      case 'trap': P = [[o,0],[o+a,0],[w,h],[0,h]]; break;
      default: P = [[0,0],[w,0],[w,h],[0,h]];                 // sq・rect
    }
    return P.map(([u, v]) => [u + x, v + y]);
  }
  const parts = s => s.kind === 'comp' ? s.parts.map(partPts) : [partPts(s)];
  const polyArea = P => { let a = 0; for(let i = 0; i < P.length; i++){ const [x0,y0] = P[i], [x1,y1] = P[(i+1)%P.length]; a += x0*y1 - x1*y0; } return Math.abs(a)/2; };
  const area = s => parts(s).reduce((t, P) => t + polyArea(P), 0);
  const isTri = k => k === 'rtri' || k === 'tri' || k === 'otri';
  const fmt = v => String(Math.round(v*100)/100);
  // ひとつ の かたち の しき（＝ の まえ）
  function term(p){
    if(p.kind === 'sq' || p.kind === 'rect') return p.w + ' × ' + p.h;
    if(isTri(p.kind) || p.kind === 'rhom') return p.w + ' × ' + p.h + ' ÷ 2';
    if(p.kind === 'para') return p.w + ' × ' + p.h;
    if(p.kind === 'trap') return '（' + p.a + ' ＋ ' + p.w + '）× ' + p.h + ' ÷ 2';
    return '';
  }
  // ことば つき の しき（ぴったり の とき に だす）
  function formula(s){
    const A = fmt(area(s));
    switch(s.kind){
      case 'sq': return 'いっぺん ' + s.w + ' × いっぺん ' + s.h + ' ＝ ' + A;
      case 'rect': return 'よこ ' + s.w + ' × たて ' + s.h + ' ＝ ' + A;
      case 'para': return 'ていへん ' + s.w + ' × たかさ ' + s.h + ' ＝ ' + A;
      case 'rhom': return 'たいかくせん ' + s.w + ' × ' + s.h + ' ÷ 2 ＝ ' + A;
      case 'trap': return '（じょうてい ' + s.a + ' ＋ かてい ' + s.w + '）× たかさ ' + s.h + ' ÷ 2 ＝ ' + A;
      case 'comp': return s.parts.map(term).join(' ＋ ') + ' ＝ ' + A;
      default: return 'ていへん ' + s.w + ' × たかさ ' + s.h + ' ÷ 2 ＝ ' + A;
    }
  }
  const Kata = { partPts, parts, polyArea, area, isTri, formula, fmt };
  root.Kata = Kata;
  if(typeof module !== 'undefined' && module.exports) module.exports = Kata;
})(typeof window !== 'undefined' ? window : globalThis);
