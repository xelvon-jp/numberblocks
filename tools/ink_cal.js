// よみとりの 正解率を はかる：お手本を ゆがめた 字（回転・拡大・せん断・ぶれ、書き順ばらばら）・らくがき・かがみもじ。
// つかいかた：node tools/ink_cal.js（数分 かかる）。じっさいの 子どもの 字では ないので めやす。
const fs=require('fs'); const vm=require('vm');
const ctx={Math, console, JSON}; ctx.globalThis=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '..', 'ink.js'),'utf8'), ctx);
const Ink = ctx.Ink;
let seed=1; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
function densify(stroke){ const out=[]; for(let i=0;i<stroke.length-1;i++){ const [a,b]=[stroke[i],stroke[i+1]]; const k=6; for(let j=0;j<k;j++) out.push([a[0]+(b[0]-a[0])*j/k, a[1]+(b[1]-a[1])*j/k]); } out.push(stroke[stroke.length-1]); return out; }
function distort(strokes, amt){
  const rot=(rnd()-0.5)*0.35*amt, sx=0.75+rnd()*0.5, sy=0.85+rnd()*0.3, sh=(rnd()-0.5)*0.3*amt;
  return strokes.map(s => densify(s).map(([x,y]) => { x-=0.5; y-=0.5; let X=x*sx+y*sh, Y=y*sy; const c=Math.cos(rot), s2=Math.sin(rot);
    return { x:(X*c - Y*s2)*120 + 200 + (rnd()-0.5)*6*amt, y:(X*s2 + Y*c)*160 + 200 + (rnd()-0.5)*6*amt }; }));
}
for(const [amt, shuf] of [[1,0],[1.6,0],[1,1],[1.6,1]]){
  let ok=0, tot=0, rej=0, inC=0; const conf={}; const scores=[];
  for(const d in Ink.BASE){ for(const v of Ink.BASE[d]){ for(let k=0;k<40;k++){
    let dd = distort(v, amt); if(shuf){ dd = dd.map(st => rnd() < 0.4 ? st.slice().reverse() : st); if(rnd() < 0.5) dd.reverse(); } const r = Ink.recognize(dd); tot++;
    if(!r || !r.sure){ rej++; if(r){ ask=(typeof ask==='undefined'?0:ask); } if(r && r.cands.includes(+d)) inC++; continue; } scores.push(r.score);
    if(r.digit==+d && !r.mirrored) ok++; else { const key=d+'→'+r.digit+(r.mirrored?'m':''); conf[key]=(conf[key]||0)+1; }
  }}}
  scores.sort((a,b)=>a-b);
  console.log('amt',amt,'shuf',shuf,'acc',(ok/tot).toFixed(3),'unsure',rej,'answerInCands',inC,'p50',scores[scores.length>>1].toFixed(2),'p95',scores[Math.floor(scores.length*0.95)].toFixed(2), JSON.stringify(conf));
}
// らくがき
let acc=0, scAsk=0; const sc=[];
for(let k=0;k<200;k++){ const n=3+Math.floor(rnd()*6); const s=[]; for(let i=0;i<n;i++) s.push({x:rnd()*200,y:rnd()*200}); const r=Ink.recognize([s]); if(r && r.sure){acc++; sc.push(r.score);} if(r && !r.sure) scAsk=(scAsk||0)+1; }
console.log('scribble sure', acc, 'ask', scAsk, '/200');
// かがみもじ
let mir=0,mt=0; for(const d of [2,3,4,5,6,7,9]) for(const v of Ink.BASE[d]) for(let k=0;k<20;k++){ const s=distort(v,1).map(st=>st.map(p=>({x:400-p.x,y:p.y}))); const r=Ink.recognize(s); mt++; if(r&&r.digit===d&&r.mirrored) mir++; }
console.log('mirror detect', mir,'/',mt);
