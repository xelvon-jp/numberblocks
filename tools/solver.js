// おだいの手数を計算する道具。ブラウザでもNodeでも動く（DOMを使わない）。
//
//   best … 機械の最短手数（追い越して引く、同じ数で割って1を作る、などの裏技も使う）
//   ref  … おてほん手数（＋ × ×2 ÷2 だけで作る最短）。裏技が必須の問題は best と同じ
//
// 1手 ＝ 数を出す／コピー／×2／÷2／2体を合体。
// ゲームの「じょうず！」は ref＋2 手いない、が基準（index.html の REF_SLACK）。
//
// つかいかた（リポジトリの一番上で）:
//   node tools/solver.js --check   index.html の best/ref が計算と合っているか確かめる
//   node tools/solver.js --write   index.html の best/ref を計算しなおして書きかえる
//   node tools/solver.js 777 7 10  1問だけ計算する（ねらいの数 と つかえる数）

const MAX = 1000;   // ゲームで出せるいちばん大きい数
const INF = 99;

// use だけを使って 1〜MAX のそれぞれを作る最短手数。plain なら ＋ × ×2 ÷2 だけ。
function costs(use, plain){
  const cost = new Array(MAX+1).fill(INF);
  const seen = new Uint8Array(MAX+1);
  const buckets = Array.from({length: INF+1}, () => []);
  const push = (v, c) => {
    if(v >= 1 && v <= MAX && c < cost[v]){ cost[v] = c; buckets[c].push(v); }
  };
  for(const d of use) push(d, 1);
  const done = [];
  // 手数の少ない順に確定させていく。足す手数は必ず1以上なので、
  // いま見ている箱より後ろの箱にしか入らない。
  for(let c = 1; c < INF; c++){
    for(const a of buckets[c]){
      if(seen[a] || cost[a] !== c) continue;
      seen[a] = 1;
      push(a*2, c+1);
      if(a % 2 === 0) push(a/2, c+1);
      // 同じ数を k こ ならべる：コピー(k-1)手 ＋ 合体(k-1)手
      let pw = a, mul = a;
      for(let k = 2; k < 12; k++){
        const ex = c + 2*(k-1);
        if(ex >= INF) break;
        mul += a; pw *= a;
        if(mul <= MAX) push(mul, ex);
        if(pw <= MAX) push(pw, ex); else if(mul > MAX) break;
      }
      if(!plain) push(1, c+2);                     // a ÷ a
      for(const b of done){
        const n = c + cost[b] + 1;
        push(a+b, n); push(a*b, n);
        if(!plain){
          push(Math.abs(a-b), n);
          const lg = Math.max(a,b), sm = Math.min(a,b);
          if(lg % sm === 0) push(lg/sm, n);
        }
      }
      done.push(a);
    }
  }
  return cost;
}

// 1問ぶん。作れないときは best が null。
function solveTask(n, use){
  const full = costs(use, false)[n];
  if(full >= INF) return { best:null, ref:null };
  const plain = costs(use, true)[n];
  return { best: full, ref: (plain < INF) ? plain : full, trick: plain >= INF };
}

// ── index.html の TASKS を読む／書く ───────────────────────────────
const TASK_RE = /n:(\d+),(\s+)use:\[([0-9, ]+)\], best:(\d+), ref:(\d+),/g;

function readTasks(html){
  const st = html.indexOf('const TASKS = ['), en = html.indexOf('const TASK_KEY');
  if(st < 0 || en < 0) throw new Error('index.html に TASKS が見つからない');
  const out = [];
  for(const m of html.slice(st, en).matchAll(TASK_RE)){
    out.push({ n:+m[1], use:m[3].split(',').map(Number), best:+m[4], ref:+m[5] });
  }
  return out;
}

// 計算と食いちがうおだいを返す（空なら全部合っている）
function checkHtml(html){
  const cache = new Map(), bad = [];
  for(const t of readTasks(html)){
    const key = t.use.join(',') + '/' + t.n;
    if(!cache.has(key)) cache.set(key, solveTask(t.n, t.use));
    const r = cache.get(key);
    if(r.best !== t.best || r.ref !== t.ref) bad.push({ ...t, want:r });
  }
  return bad;
}

function writeHtml(html){
  const st = html.indexOf('const TASKS = ['), en = html.indexOf('const TASK_KEY');
  const body = html.slice(st, en).replace(TASK_RE, (all, n, sp, use) => {
    const r = solveTask(+n, use.split(',').map(Number));
    if(r.best === null) throw new Error(`${n}（${use}）は作れない`);
    return `n:${n},${sp}use:[${use}], best:${r.best}, ref:${r.ref},`;
  });
  return html.slice(0, st) + body + html.slice(en);
}

module.exports = { costs, solveTask, readTasks, checkHtml, writeHtml, MAX };

if(require.main === module){
  const fs = require('fs'), path = require('path');
  const file = path.join(__dirname, '..', 'index.html');
  const arg = process.argv.slice(2);
  if(arg[0] === '--check'){
    const bad = checkHtml(fs.readFileSync(file, 'utf8'));
    if(!bad.length){ console.log('best/ref はすべて計算と一致'); process.exit(0); }
    for(const b of bad) console.log(`${b.n}（${b.use}）: 書いてある best ${b.best}/ref ${b.ref} → 計算 best ${b.want.best}/ref ${b.want.ref}`);
    process.exit(1);
  } else if(arg[0] === '--write'){
    fs.writeFileSync(file, writeHtml(fs.readFileSync(file, 'utf8')));
    console.log('best/ref を書きかえた');
  } else if(arg.length >= 2){
    const n = +arg[0], use = arg.slice(1).map(Number);
    const r = solveTask(n, use);
    if(r.best === null) console.log(`${n} は ${use} だけでは作れない`);
    else console.log(`${n}（${use}）  さいたん ${r.best}手 / おてほん ${r.ref}手${r.trick ? '（裏技が必須）' : ''}`);
  } else {
    console.log('node tools/solver.js --check | --write | <ねらいの数> <つかえる数...>');
  }
}
