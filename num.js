// ─── かず（ぶんすう で もつ）─────────────────────────────────────────────
// けいさん・おだい・はんぶん・tools/solver.js で つかう かず の もちかた。
// ぶんし n と ぶんぼ d（どちらも せいすう、d > 0、いつも やくぶん ずみ）で もつので、
//   0.1 ＋ 0.2 ＝ 0.3 が ぴったり（ふつうの 小数 だと 0.30000000000000004 に なる）。
//   2.5 は 5/2、0.3 は 3/10、1/3 は 1/3。
// どこまで ゆるすか（いまは 0.1 きざみ）は「ゆるす ぶんぼ」で きめる：Num.fits(q, 10) ＝ ぶんぼ が 10 の やくすう（1・2・5・10）。
//   0.01 まで なら 100、ぶんすう を いれる なら 3 や 4 も ゆるす、と ひろげるだけで もちかた は かわらない。
// ほぞん・どうき は 文字（"5/2"、せいすう は "3" ／ そのまま 3）で。まえの せいすう だけの きろく も そのまま よめる。
(function(root){
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while(b){ [a, b] = [b, a % b]; } return a || 1; };
  function make(n, d){
    if(d === undefined) d = 1;
    if(!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error('Num: せいすう で ない ' + n + '/' + d);
    if(d < 0){ n = -n; d = -d; }
    const g = gcd(n, d);
    return Object.freeze({ n: n/g, d: d/g });
  }
  // なんでも かず に：せいすう・"2.5"・"5/2"・{n,d}・かず（小数は 10けた まで みて ぶんすう に）
  function from(x){
    if(x && typeof x === 'object' && 'n' in x && 'd' in x) return make(x.n, x.d);
    if(typeof x === 'number'){
      if(Number.isInteger(x)) return make(x, 1);
      if(!isFinite(x)) throw new Error('Num: かず で ない ' + x);
      return parse(String(+x.toFixed(10)));
    }
    if(typeof x === 'string') return parse(x);
    throw new Error('Num: よめない ' + x);
  }
  function parse(s){
    s = String(s).trim();
    let m = /^(-?\d+)\/(\d+)$/.exec(s);
    if(m) return make(+m[1], +m[2]);
    m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s);
    if(m){ const f = m[3] || '', d = Math.pow(10, f.length), n = +m[2]*d + (f ? +f : 0); return make(m[1] ? -n : n, d); }
    throw new Error('Num: よめない "' + s + '"');
  }
  const add = (a, b) => make(a.n*b.d + b.n*a.d, a.d*b.d);
  const sub = (a, b) => make(a.n*b.d - b.n*a.d, a.d*b.d);
  const mul = (a, b) => make(a.n*b.n, a.d*b.d);
  const div = (a, b) => { if(b.n === 0) throw new Error('Num: 0 で わった'); return make(a.n*b.d, a.d*b.n); };
  const cmp = (a, b) => a.n*b.d - b.n*a.d;          // ＜0：a が ちいさい
  const eq = (a, b) => a.n === b.n && a.d === b.d;
  const isInt = a => a.d === 1;
  const floor = a => Math.floor(a.n/a.d);            // せいすう の ところ（2.5 → 2）
  const fracPart = a => sub(a, make(floor(a)));      // のこり（2.5 → 1/2）
  const toNumber = a => a.n/a.d;
  // ゆるす ぶんぼ か（den の やくすう なら ○。den：10 ＝ 0.1 きざみ）
  const fits = (a, den) => den % a.d === 0;
  // 小数 で かける か（ぶんぼ が 2 と 5 だけ で できて いる）と その けた
  function decimals(a){ let d = a.d, k2 = 0, k5 = 0; while(d % 2 === 0){ d /= 2; k2++; } while(d % 5 === 0){ d /= 5; k5++; } return d === 1 ? Math.max(k2, k5) : -1; }
  // 見せる 文字：かけるなら 小数（"2.5"）、かけなければ ぶんすう（"1/3"）
  function fmt(a){
    const k = decimals(a);
    if(k < 0) return a.n + '/' + a.d;
    if(k === 0) return String(a.n);
    const sgn = a.n < 0 ? '-' : '', s = String(Math.abs(a.n)*Math.pow(10, k)/a.d).padStart(k + 1, '0');
    return sgn + s.slice(0, -k) + '.' + s.slice(-k);
  }
  // しまう 文字（せいすう は かず の まま。まえの きろく と おなじ かたち）
  const save = a => a.d === 1 ? a.n : a.n + '/' + a.d;
  const Num = { make, from, parse, add, sub, mul, div, cmp, eq, isInt, floor, fracPart, toNumber, fits, decimals, fmt, save, gcd,
                ZERO: make(0), ONE: make(1) };
  root.Num = Num;
  if(typeof module !== 'undefined' && module.exports) module.exports = Num;
})(typeof window !== 'undefined' ? window : globalThis);
