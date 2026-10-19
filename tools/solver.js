// おだいの手数を計算する道具。ブラウザでもNodeでも動く（DOMを使わない）。
//
//   best … 機械の最短手数（追い越して引く、同じ数で割って1を作る、などの裏技も使う）
//   ref  … おてほん手数（＋ × ×2 ÷2 しかく だけで作る最短）。裏技が必須の問題は best と同じ
//
// 1手 ＝ 数を出す／コピー／×2／÷2／しかく（2じょう）／2体を合体／ピンチアウト（はんぶんこ。÷2 と おなじ 1て）。
// しょうすう（0.1 きざみ。ゲーム では 1000 まで、ここ では 100 まで で さがす）も あつかう：なかでは「0.1 が なんこ」（T）で けいさん する。
//   ゲームと おなじ きまり：× ÷ ÷2 しかく は こたえが 0.1 きざみ に おさまる とき だけ（5 ÷ 2 ＝ 2.5、5 を ÷2 → 2.5）。
// ゲームの「じょうず！」は ref＋2 手いない、が基準（index.html の REF_SLACK）。
//
// つかいかた（リポジトリの一番上で）:
//   node tools/solver.js --check   index.html の best/ref が計算と合っているか確かめる
//   node tools/solver.js --write   index.html の best/ref を計算しなおして書きかえる
//   node tools/solver.js 777 7 10  1問だけ計算する（ねらいの数 と つかえる数）

const MAX = 1000;   // ゲームで出せるいちばん大きい数
const INF = 99;
const TEN = 10, TMAX = MAX*TEN;     // T（0.1 が なんこ）
// ゲーム では しょうすう も 1000 まで つくれる が、ここ では はやさ の ため 100 まで の しょうすう で さがす
// （1000 まで に すると --check が 4びょう → 2ふん。いまの おだい の best/ref/way は どちらでも おなじ だった）。
const DEC_TMAX = 100*TEN;
const okT = T => Number.isInteger(T) && T >= 1 && T <= TMAX && (T % TEN === 0 || T <= DEC_TMAX);
const toT = v => Math.round(v*TEN), fromT = T => T/TEN;

// use だけを使って それぞれの かず を作る最短手数。plain なら ＋ × ×2 ÷2 しかく だけ。
// かえす cost は T（0.1 が なんこ）で ひく：cost[toT(v)]。
function costs(use, plain){ return search(use, plain).cost; }

// cost[T] … T を作る最短手数 / how[T] … そのときの最後の1手 [しゅるい, a, b]（a, b も T）
const _cache = new Map();
function search(use, plain){
  const key = use.join(',') + (plain ? '/p' : '/f');
  if(_cache.has(key)) return _cache.get(key);
  const cost = new Array(TMAX+1).fill(INF);
  const how  = new Array(TMAX+1).fill(null);
  const seen = new Uint8Array(TMAX+1);
  const buckets = Array.from({length: INF+1}, () => []);
  const push = (v, c, h) => {
    if(okT(v) && c < cost[v]){ cost[v] = c; how[v] = h; buckets[c].push(v); }
  };
  for(const d of use) push(toT(d), 1, ['new', toT(d)]);
  const done = [];
  // 手数の少ない順に確定させていく。足す手数は必ず1以上なので、
  // いま見ている箱より後ろの箱にしか入らない。
  for(let c = 1; c < INF; c++){
    for(const a of buckets[c]){
      if(seen[a] || cost[a] !== c) continue;
      seen[a] = 1;
      push(a*2, c+1, ['x2', a]);
      if(a !== TEN && (a*a) % TEN === 0) push(a*a/TEN, c+1, ['sq', a]);     // しかく（2じょう）。1 は 1 の まま
      if(a % 2 === 0) push(a/2, c+1, ['h2', a]);                             // ÷2（ピンチアウト も おなじ）。5 → 2.5 も
      // 同じ数を k こ ならべる：コピー(k-1)手 ＋ 合体(k-1)手
      let pw = a, mul = a;
      for(let k = 2; k < 12; k++){
        const ex = c + 2*(k-1);
        if(ex >= INF) break;
        mul += a; pw = pw*a/TEN;
        if(mul <= TMAX) push(mul, ex, ['k+', a, k]);
        if(Number.isInteger(pw) && pw <= TMAX) push(pw, ex, ['kx', a, k]); else if(mul > TMAX) break;
        if(!Number.isInteger(pw)) pw = Infinity;
      }
      if(!plain) push(TEN, c+2, ['/', a, a]);        // a ÷ a ＝ 1
      for(const b of done){
        const n = c + cost[b] + 1;
        push(a+b, n, ['+', a, b]);
        if((a*b) % TEN === 0) push(a*b/TEN, n, ['x', a, b]);
        if(!plain){
          push(Math.abs(a-b), n, ['-', Math.max(a,b), Math.min(a,b)]);
          const lg = Math.max(a,b), sm = Math.min(a,b);
          if((lg*TEN) % sm === 0) push(lg*TEN/sm, n, ['/', lg, sm]);
        }
      }
      done.push(a);
    }
  }
  const r = { cost, how };
  _cache.set(key, r);
  return r;
}

// 作るとちゅうで できる数（みちしるべ）を、できる順にならべる。
// 数字キーで出すだけの数と、さいごの答えは入れない。
function waypoints(n, use){
  n = toT(n);
  let r = search(use, true);                      // まずは ＋×÷2×2 のすなおな道
  if(r.cost[n] >= INF) r = search(use, false);    // だめなら うら技も使う道
  if(r.cost[n] >= INF) return null;
  const out = [];
  const add = v => { if(v !== n && out.indexOf(fromT(v)) < 0) out.push(fromT(v)); };
  const walk = v => {
    const h = r.how[v];
    if(!h || h[0] === 'new') return;
    if(h[0] === 'x2' || h[0] === 'h2' || h[0] === 'sq'){ walk(h[1]); add(v); return; }
    if(h[0] === 'k+' || h[0] === 'kx'){
      walk(h[1]);
      let cur = h[1];
      for(let i = 1; i < h[2]; i++){ cur = (h[0] === 'k+') ? cur + h[1] : cur * h[1] / TEN; add(cur); }
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
  const full = costs(use, false)[toT(n)];
  if(full >= INF) return { best:null, ref:null };
  const plain = costs(use, true)[toT(n)];
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
  // レベル7：しょうすう
  '7.5/10,5': [15],                           // 15の はんぶん
  '0.9/1,0.1': [],                            // 1から 0.1を ひく
  // レベル12（ひいて しょうすう）：ひく のが みち。おてほん の まわりみち は みせない
  '9.5/10,0.5': [], '4.9/5,0.1': [], '9.9/10,0.1': [], '2.9/3,0.1': [], '4.5/5,0.5': [], '1.9/2,0.1': [], '5.5/6,0.5': [], '7.9/8,0.1': [],
};
function wayFor(n, use){
  const k = n + '/' + use.join(',');
  return WAY_FIX[k] ? WAY_FIX[k].slice() : waypoints(n, use);
}

const TASK_RE = /n:([\d.]+),(\s+)use:\[([0-9., ]+)\], best:(\d+), ref:(\d+),(?: way:\[([0-9., ]*)\],)?/g;

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
      if(!okT(toT(v)) || reach[toT(v)] >= INF || v === t.n)
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

module.exports = { costs, search, waypoints, wayFor, solveTask, readTasks, checkHtml, writeHtml, MAX, toT, fromT };

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
