// けいさん画面の ドロップ先は 5つ（おうち・÷2・×2・しかく・ミラー）。
// ×10／÷10 は はんぶん（hanbun.html）の ゾーンにだけ ある（2026-11-02 に 本体からは 外した）。
module.exports = {
  '本体の ドロップ先は 5つで、×10／÷10 は ない': async t => {
    const p = await t.open();
    const r = await p.evaluate(() => {
      setMode('+');
      return { list: DROP_TARGETS.slice(), fit: DROP_TARGETS.map(id => getTargetRect(id)).every(q => q.x >= 0 && q.x + q.w <= sw) };
    });
    t.eq(r.list, ['home', 'half', 'double', 'square', 'mirror']);
    t.ok(r.fit, '5つの おきばが 画面に おさまっていない');
  },
};
