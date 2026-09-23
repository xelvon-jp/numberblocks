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
function costs(use, plain){ return search(use, plain).cost; }

// cost[v] … v を作る最短手数 / how[v] … そのときの最後の1手 [しゅるい, a, b]
function search(use, plain){
  const cost = new Array(MAX+1).fill(INF);
  const how  = new Array(MAX+1).fill(null);
  const seen = new Uint8Array(MAX+1);
  const buckets = Array.from({length: INF+1}, () => []);
  const push = (v, c, h) => {
    if(v >= 1 && v <= MAX && c < cost[v]){ cost[v] = c; how[v] = h; buckets[c].push(v); }
  };
  for(const d of use) push(d, 1, ['new', d]);
  const done = [];
  // 手数の少ない順に確定させていく。足す手数は必ず1以上なので、
  // いま見ている箱より後ろの箱にしか入らない。
  for(let c = 1; c < INF; c++){
    for(const a of buckets[c]){
      if(seen[a] || cost[a] !== c) continue;
      seen[a] = 1;
      push(a*2, c+1, ['x2', a]);
      if(a % 2 === 0) push(a/2, c+1, ['h2', a]);
      // 同じ数を k こ ならべる：コピー(k-1)手 ＋ 合体(k-1)手
      let pw = a, mul = a;
      for(let k = 2; k < 12; k++){
        const ex = c + 2*(k-1);
        if(ex >= INF) break;
        mul += a; pw *= a;
        if(mul <= MAX) push(mul, ex, ['k+', a, k]);
        if(pw <= MAX) push(pw, ex, ['kx', a, k]); else if(mul > MAX) break;
      }
      if(!plain) push(1, c+2, ['/', a, a]);        // a ÷ a
      for(const b of done){
        const n = c + cost[b] + 1;
        push(a+b, n, ['+', a, b]); push(a*b, n, ['x', a, b]);
        if(!plain){
          push(Math.abs(a-b), n, ['-', Math.max(a,b), Math.min(a,b)]);
          const lg = Math.max(a,b), sm = Math.min(a,b);
          if(lg % sm === 0) push(lg/sm, n, ['/', lg, sm]);
        }
      }
      done.push(a);
    }
  }
  return { cost, how };
}

// 作るとちゅうで できる数（みちしるべ）を、できる順にならべる。
// 数字キーで出すだけの数と、さいごの答えは入れない。
function waypoints(n, use){
  let r = search(use, true);                      // まずは ＋×÷2×2 のすなおな道
  if(r.cost[n] >= INF) r = search(use, false);    // だめなら うら技も使う道
  if(r.cost[n] >= INF) return null;
  const out = [];
  const add = v => { if(v !== n && out.indexOf(v) < 0) out.push(v); };
  const walk = v => {
    const h = r.how[v];
    if(!h || h[0] === 'new') return;
    if(h[0] === 'x2' || h[0] === 'h2'){ walk(h[1]); add(v); return; }
    if(h[0] === 'k+' || h[0] === 'kx'){
      walk(h[1]);
      let cur = h[1];
      for(let i = 1; i < h[2]; i++){ cur = (h[0] === 'k+') ? cur + h[1] : cur * h[1]; add(cur); }
      return;
    }
    walk(h[1]); if(h[2] !== h[1]) walk(h[2]);
    add(v);
  };
  walk(n);
  return out;
}

// 1問ぶん。作れないときは best が null。
function solveTask(n, use){
  const full = costs(use, false)[n];
  if(full >= INF) return { best:null, ref:null };
  const plain = costs(use, true)[n];
  return { best: full, ref: (plain < INF) ? plain : full, trick: plain >= INF };
}

// ── index.html の TASKS を読む／書く ───────────────────────────────
// way（みちしるべ）の自動の道すじが、ヒントの考え方より不自然になるものは手で決める。
// キーは「ねらいの数/つかえる数」。
const WAY_FIX = {
  // レベル1
  '5/1':      [2, 3, 4],                      // 1を5こ
  '9/3':      [6],                            // 3を3こ
  '10/4':     [8, 2],                         // 4+4 のあと、4÷2
  '16/1':     [2, 4, 8],                      // ×2を4かい
  // レベル2
  '32/1':     [2, 4, 8, 16],                  // ×2を5かい
  '64/2':     [4, 8, 16, 32],                 // ×2を5かい
  // レベル3
  '30/4,7':   [28, 2],                        // 7×4 のあと、4÷2
  '50/3,7':   [10, 20, 30, 40],               // 10を5こ
  '60/8,2':   [10, 30],                       // 8+2 から、10を3こ で ×2
  '80/6,4':   [10, 20, 40],                   // 10を×2で3かい
  '70/9,1':   [10, 30, 60],                   // 9+1 から
  // レベル4
  '100/5':    [25, 50],                       // 5×5 から ×2
  '120/3':    [6, 12, 24, 48, 96],            // 24をならべる
  '128/1':    [2, 4, 8, 16, 32, 64],          // ×2を7かい
  '144/6':    [36, 72],                       // 36を×2で2かい
  '150/5':    [10, 50, 100],                  // 50を3こ
  '250/5':    [10, 100, 500],                 // 500のはんぶん
  // レベル5
  '512/1':    [2, 4, 8, 16, 32, 64, 128, 256],
  '513/1':    [2, 4, 8, 16, 32, 64, 128, 256, 512],
  '777/7,10': [70, 77, 770],                  // 7 → 77 → 777 と のばす
  '888/8,10': [80, 88, 880],
  '999/10,9': [90, 99, 990],
  // レベル6
  '3/9':      [1, 2],                         // 1をつくってから
  '13/4':     [12, 1],                        // 12とすこし
};
function wayFor(n, use){
  const k = n + '/' + use.join(',');
  return WAY_FIX[k] ? WAY_FIX[k].slice() : waypoints(n, use);
}

const TASK_RE = /n:(\d+),(\s+)use:\[([0-9, ]+)\], best:(\d+), ref:(\d+),(?: way:\[([0-9, ]*)\],)?/g;

function readTasks(html){
  const st = html.indexOf('const TASKS = ['), en = html.indexOf('const TASK_KEY');
  if(st < 0 || en < 0) throw new Error('index.html に TASKS が見つからない');
  const out = [];
  for(const m of html.slice(st, en).matchAll(TASK_RE)){
    out.push({ n:+m[1], use:m[3].split(',').map(Number), best:+m[4], ref:+m[5],
               way: m[6] === undefined ? null : (m[6].trim() ? m[6].split(',').map(Number) : []) });
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
    const way = wayFor(t.n, t.use);
    if(r.best !== t.best || r.ref !== t.ref || JSON.stringify(way) !== JSON.stringify(t.way))
      bad.push({ ...t, want:{ ...r, way } });
    // みちしるべの数は、その おだいの数字だけで作れて、答えより先に来ること
    const reach = search(t.use, false).cost;
    for(const v of way){
      if(!(v >= 1 && v <= MAX) || reach[v] >= INF || v === t.n)
        bad.push({ ...t, want:{ ...r, way }, why:`みちしるべ ${v} が作れない／答えと同じ` });
    }
  }
  return bad;
}

function writeHtml(html){
  const st = html.indexOf('const TASKS = ['), en = html.indexOf('const TASK_KEY');
  const body = html.slice(st, en).replace(TASK_RE, (all, n, sp, use) => {
    const u = use.split(',').map(Number);
    const r = solveTask(+n, u);
    if(r.best === null) throw new Error(`${n}（${use}）は作れない`);
    return `n:${n},${sp}use:[${use}], best:${r.best}, ref:${r.ref}, way:[${wayFor(+n, u).join(',')}],`;
  });
  return html.slice(0, st) + body + html.slice(en);
}

module.exports = { costs, search, waypoints, wayFor, solveTask, readTasks, checkHtml, writeHtml, MAX };

if(require.main === module){
  const fs = require('fs'), path = require('path');
  const file = path.join(__dirname, '..', 'index.html');
  const arg = process.argv.slice(2);
  if(arg[0] === '--check'){
    const bad = checkHtml(fs.readFileSync(file, 'utf8'));
    if(!bad.length){ console.log('best/ref/way はすべて計算と一致'); process.exit(0); }
    for(const b of bad) console.log(b.why ? `${b.n}（${b.use}）: ${b.why}` : `${b.n}（${b.use}）: 書いてある best ${b.best}/ref ${b.ref}/way [${b.way}]`
                                    + ` → 計算 best ${b.want.best}/ref ${b.want.ref}/way [${b.want.way}]`);
    process.exit(1);
  } else if(arg[0] === '--write'){
    fs.writeFileSync(file, writeHtml(fs.readFileSync(file, 'utf8')));
    console.log('best/ref/way を書きかえた');
  } else if(arg.length >= 2){
    const n = +arg[0], use = arg.slice(1).map(Number);
    const r = solveTask(n, use);
    if(r.best === null) console.log(`${n} は ${use} だけでは作れない`);
    else console.log(`${n}（${use}）  さいたん ${r.best}手 / おてほん ${r.ref}手${r.trick ? '（裏技が必須）' : ''}`
                     + `  みちしるべ ${wayFor(n, use).join(' → ') || '（なし）'}`);
  } else {
    console.log('node tools/solver.js --check | --write | <ねらいの数> <つかえる数...>');
  }
}
