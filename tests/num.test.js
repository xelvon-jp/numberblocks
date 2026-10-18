// num.js（かず を ぶんすう で もつ）：ブラウザ を つかわず、けいさん の きまり だけ を みる。
const Num = require('../num.js');
const N = x => Num.from(x), S = q => Num.fmt(q);

module.exports = {
  'ぶんすう：いつも やくぶん、0.1 ＋ 0.2 ＝ 0.3 が ぴったり、1/3 も もてる': async t => {
    t.eq([N('5/2'), N(2.5), N('2.50'), N({ n: 10, d: 4 })].map(S), ['2.5', '2.5', '2.5', '2.5'], '2.5 の かきかた');
    t.eq(S(Num.add(N(0.1), N(0.2))), '0.3', '0.1 ＋ 0.2');
    t.ok(Num.eq(Num.add(N(0.1), N(0.2)), N(0.3)), '0.1 ＋ 0.2 ＝ 0.3 で ない');
    let s = Num.ZERO; for(let i = 0; i < 10; i++) s = Num.add(s, N(0.1));
    t.ok(Num.eq(s, Num.ONE), '0.1 を 10こ で 1 に ならない');
    t.eq(S(Num.div(N(1), N(3))), '1/3', '1 ÷ 3');
    t.eq(S(Num.mul(Num.div(N(1), N(3)), N(3))), '1', '1/3 × 3');
    t.eq([S(Num.sub(N(5), N(2.5))), S(Num.mul(N(0.5), N(4))), S(Num.div(N(5), N(2))), S(Num.mul(N(0.5), N(0.5)))], ['2.5', '2', '2.5', '0.25'], 'けいさん');
    t.eq([S(N(-1.5)), S(Num.sub(N(1), N(2.5)))], ['-1.5', '-1.5'], 'マイナス');
  },

  'ゆるす ぶんぼ（いまは 10 ＝ 0.1 きざみ）・せいすう の ところ と のこり・しまう かたち': async t => {
    const ok10 = x => Num.fits(N(x), 10);
    t.eq([ok10(3), ok10(2.5), ok10(0.3), ok10(0.2), ok10('1/3'), ok10(0.25), ok10(0.05)], [true, true, true, true, false, false, false], '0.1 きざみ');
    t.eq([Num.fits(N(0.25), 100), Num.fits(N('1/3'), 3)], [true, true], 'ひろげる');
    t.eq([Num.floor(N(2.5)), S(Num.fracPart(N(2.5))), Num.floor(N(0.3)), S(Num.fracPart(N(7)))], [2, '0.5', 0, '0'], 'せいすう と のこり');
    t.eq([Num.save(N(3)), Num.save(N(2.5)), Num.save(N('1/3'))], [3, '5/2', '1/3'], 'しまう');
    t.eq([N(3), N('5/2'), N('1/3')].map(q => S(N(Num.save(q)))), ['3', '2.5', '1/3'], 'しまって よむ');
    t.eq([Num.decimals(N(2.5)), Num.decimals(N(0.25)), Num.decimals(N(4)), Num.decimals(N('1/3'))], [1, 2, 0, -1], '小数の けた');
    let bad = 0; for(const x of ['abc', '1/0', NaN]) try{ N(x); }catch(e){ bad++; }
    t.eq(bad, 3, 'へんな かずを うけた');
  },

  'けいさん の キャラ は かず を ぶんすう で もつ（num は いままで どおり ふつうの かず）': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => { const b = new NumberBlock(7, 100, 100), c = new NumberBlock(1500, 0, 0), d = new NumberBlock(0, 0, 0);
      b.num = 12; return [b.q, b.num, c.num, d.num, typeof Num]; });
    t.eq(r, [{ n: 12, d: 1 }, 12, 1000, 1, 'object'], 'ぶんすう で ない');
  },
};
