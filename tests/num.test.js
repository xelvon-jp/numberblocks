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

  'けいさん で しょうすう：0.1・0.5 の キー、÷2 で 5 → 2.5、0.3 ＋ 0.7 ＝ 1、7 ÷ 2 ＝ 3.5。0.1 きざみ に ならない ものは うけない。もどす で もどる': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      setQuizOn(false); if(typeof setTaskOn === 'function') setTaskOn(false); setMode('+'); blocks = []; clearUndo();
      const keys = getNumpadLayout().map(b => b.label);
      const f = () => blocks.map(b => Num.fmt(b.q)).sort();
      spawnBlock(5); scaleBlock(blocks[0], 'half');
      const half = f();
      spawnBlock(0.3); spawnBlock(0.7);
      const a = blocks.find(b => Num.fmt(b.q) === '0.3'), c = blocks.find(b => Num.fmt(b.q) === '0.7');
      fuseBlocks(a, c);
      const sum = f();
      doUndo();
      const undone = f();
      blocks = []; setMode('div'); spawnBlock(7); spawnBlock(2);
      const d7 = canCalc(blocks[0], blocks[1], 'div');
      blocks = []; spawnBlock(0.5); spawnBlock(0.5);
      const rej = [canCalc(blocks[0], blocks[1], 'x'), canCalc(blocks[0], blocks[1], '+'), canScale('half', blocks[0].q), canScale('square', Num.from(1.5)), canScale('square', Num.from(3))];
      blocks = []; spawnBlock(253); spawnBlock(0.1);
      const big = [canCalc(blocks[0], blocks[1], '+'), qOk(Num.from(999.9)), qOk(Num.from(1000.1))];
      return { keys: keys.slice(0, 2), half, sum, undone, d7, rej, big };
    });
    t.eq(r.keys, ['0.1', '0.5'], '0.1・0.5 の キーが ない');
    t.eq(r.half, ['2.5'], '5 を ÷2 で 2.5 に ならない');
    t.eq(r.sum, ['1', '2.5'], '0.3 ＋ 0.7 が 1 に ならない');
    t.eq(r.undone, ['0.3', '0.7', '2.5'], 'もどす で もどらない');
    t.eq(r.d7, true, '7 ÷ 2 ＝ 3.5 が できない');
    t.eq(r.big, [true, true, false], '253 ＋ 0.1（100 より おおきい しょうすう）が できない／1000 を こえた');
    t.eq(r.rej, [false, true, false, false, true], '0.1 きざみ に ならない もの（0.5×0.5・0.5÷2・1.5 の しかく）を うけた');
  },

  'けいさん で ピンチアウト（はなす まで ゆびさき に 2ひき、はなすと わかれる・1て）。ちいさい キャラ は ゆびが そと でも つまめる。ダブルタップ では なにも しない': async t => {
    const p = await t.open();
    await p.evaluate(() => { setQuizOn(false); if(typeof setTaskOn === 'function') setTaskOn(false); setMode('+'); blocks = []; clearUndo(); spawnBlock(4); });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const b = blocks[0], cx = b.cx, cy = b.cy;
      handleStart(cx - 4, cy, 1); handleStart(cx + 4, cy, 2);
      for(let k = 1; k <= 6; k++){ handleMove(cx - 4 - k*12, cy, 1); handleMove(cx + 4 + k*12, cy, 2); }
      const during = [blocks.length, !!(calcPinch && calcPinch.pv), calcPinch && calcPinch.pv ? Num.fmt(calcPinch.pv.a.q) : null];
      handleEnd(cx - 76, cy, 1); handleEnd(cx + 76, cy, 2);
      const after = blocks.map(x => Num.fmt(x.q)).sort();
      doUndo();
      const undone = blocks.map(x => Num.fmt(x.q));
      blocks = []; spawnBlock(1);
      return { during, after, undone };
    });
    t.eq(r.during, [1, true, '2'], 'ひろげて いる あいだ に わかれた／ゆびに ついて こない');
    t.eq(r.after, ['2', '2'], 'はなしても わかれない');
    t.eq(r.undone, ['4'], 'もどす で もどらない');
    await p.waitForTimeout(800);
    const d = await p.evaluate(() => { const b = blocks[0], x = b.cx, y = b.cy;
      for(let k = 0; k < 2; k++){ handleStart(x, y, 3); handleEnd(x, y, 3); }
      const tap = blocks.map(c => Num.fmt(c.q));
      // 1 の そと（ひだり と みぎ）に ゆびを おいて ひろげる
      const L = b.x - 30, R = b.x + b.width + 30;
      handleStart(L, y, 4); handleStart(R, y, 5);
      for(let k = 1; k <= 6; k++){ handleMove(L - k*12, y, 4); handleMove(R + k*12, y, 5); }
      handleEnd(L - 72, y, 4); handleEnd(R + 72, y, 5);
      return { tap, small: blocks.map(c => Num.fmt(c.q)).sort() }; });
    t.eq(d.tap, ['1'], 'ダブルタップ で かわった');
    t.eq(d.small, ['0.5', '0.5'], 'ちいさい キャラ を そと から つまめない');
  },

  'しょうすう の おだい（レベル7・8）：5 を はんぶんこ で 2.5 が できる・まぜまぜ では とばす': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      setQuizOn(false); setTaskOn(true); whoOpen = false;
      const i = TASKS.findIndex(x => x.lv === 6 && x.n === 2.5 && x.use.join() === '5');
      startTask(i); whoOpen = false;
      const keys = getNumpadLayout().map(b => b.label);
      spawnBlock(5); scaleBlock(blocks.find(b => b.num === 5), 'half');
      checkTask();
      const done = taskDone, steps = taskLog.length;
      const last = TASKS.length - 1;
      const lastIsDec = isDecTask(TASKS[last]), firstDec = TASKS.findIndex(isDecTask);
      // まぜまぜ：しょうすう の ひとつ まえ から つぎへ → はじめ（0）に もどる
      taskIdx = firstDec - 1; const nMix = (setMix(true), nextCalcIdx()); setMix(false); const nPlain = nextCalcIdx();
      return { keys, done: !!done, steps, lastIsDec, nMix, nPlain, firstDec };
    });
    t.eq(r.keys, ['5', 'CLR'], 'つかえる キーが ちがう');
    t.eq([r.done, r.steps], [true, 2], '5 を ÷2 で 2.5 が クリア に ならない（2て）');
    t.eq([r.lastIsDec, r.nMix, r.nPlain === r.firstDec], [true, 0, true], 'まぜまぜ で しょうすう を とばさない');
  },
};
