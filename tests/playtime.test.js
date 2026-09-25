// あそぶ じかん：上の バー・のこり 3ぷん／1ぷんの てんめつ・0 に なったら もんだいが おわってから「きょうは ここまで」。

const MIN = 60000;
const state = p => p.evaluate(() => ({
  bar: getComputedStyle(document.getElementById('play-bar')).display,
  w: parseFloat(document.querySelector('#play-bar i').style.width),
  blink: document.getElementById('play-left').classList.contains('blink'),
  left: document.getElementById('play-left').textContent,
  pop: document.getElementById('play-pop').classList.contains('on'),
  bye: document.getElementById('play-bye').classList.contains('on'),
}));

module.exports = {
  'バーは のこり じかんで みじかく なり、せっていで じかんを かえられる（なし なら 出ない）': async t => {
    const p = await t.open();
    t.eq(await p.evaluate(() => play.limit), 12, 'はじめは 12ぷん');
    await p.evaluate(MIN => { play.setLimit(20); play._set(5*MIN); play.update(); }, MIN);
    let s = await state(p);
    t.ok(s.bar === 'block' && Math.abs(s.w - 75) < 1, 'バーが のこり 15/20 に ならない: ' + JSON.stringify(s));
    await p.evaluate(() => { setOpen = true; drawSettings(ctx); const b = setBtns.find(x => x.val === 'play' && x.v === 10); handleStart(b.x + b.w/2, b.y + b.h/2, 's'); });
    s = await state(p);
    t.ok(await p.evaluate(() => play.limit) === 10 && Math.abs(s.w - 50) < 1, '10ぷんに できない: ' + JSON.stringify(s));
    await p.evaluate(() => play.setLimit(0));
    t.eq((await state(p)).bar, 'none', 'なし で バーが きえない');
    t.eq(await p.evaluate(() => JSON.parse(localStorage.getItem('nb_play')).limit), 0, 'せっていが のこらない');
    // まえの はじめの ねだん（20）の まま のこっていても、えらんで いなければ 12 に なる
    await p.addInitScript(() => localStorage.setItem('nb_play', JSON.stringify({ limit:20, used:0, last:Date.now() })));
    await p.reload(); await p.waitForFunction(() => typeof play !== 'undefined');
    t.eq(await p.evaluate(() => play.limit), 12, 'えらんで いない 20 が 12 に ならない');
  },

  'のこり 3ぷん・1ぷんで「あと ○ぷん」を てんめつ': async t => {
    const p = await t.open();
    await p.evaluate(MIN => { play.setLimit(20); play._set(17*MIN - 500); play.update(); }, MIN);
    t.eq((await state(p)).blink, false, 'まだ てんめつ しては いけない');
    await p.waitForTimeout(2200);
    let s = await state(p);
    t.ok(s.blink && s.left === 'あと 3ぷん', '3ぷん まえに てんめつ しない: ' + JSON.stringify(s));
    await p.evaluate(MIN => { play._set(19*MIN - 500); play.update(); }, MIN);
    await p.waitForTimeout(2200);
    s = await state(p);
    t.ok(s.blink && s.left === 'あと 1ぷん', '1ぷん まえに てんめつ しない: ' + JSON.stringify(s));
  },

  '0 に なっても といている もんだいが おわるまで まつ。「もうすこし」で とじて つづけられる': async t => {
    const p = await t.open();
    await p.evaluate(MIN => { play.setLimit(20); taskOn = true; startTask(0); play._set(20*MIN + 1000); play.update(); }, MIN);
    t.eq((await state(p)).pop, false, 'とちゅうで 出てしまう');
    await p.evaluate(() => { taskDone = true; play.update(); });
    t.eq((await state(p)).pop, true, 'もんだいが おわっても 出ない');
    await p.click('#play-pop .more');
    await p.evaluate(() => play.update());
    t.eq((await state(p)).pop, false, '「もうすこし」で とじない／すぐ また 出る');
    // おしまい → またね。タップで もどれる
    await p.evaluate(() => { play.setLimit(20); play.update(); });
    t.eq((await state(p)).pop, true, 'せっていを かえたら また 出る はず');
    await p.click('#play-pop .end');
    t.eq((await state(p)).bye, true, 'おしまい で「またね」が 出ない');
    await p.click('#play-bye');
    t.eq((await state(p)).bye, false, 'タップで もどれない');
  },

  'ひっさんを といている あいだは まつ。1じかん やすんだら いっぱいに もどる': async t => {
    const p = await t.open();
    await p.evaluate(MIN => { play.setLimit(20); taskOn = true; startTask(0); taskDone = true; startHissanTask(); play._set(21*MIN); play.update(); }, MIN);
    t.eq((await state(p)).pop, false, 'ひっさんの とちゅうで 出てしまう');
    await p.evaluate(() => { onHissanMessage({ from:'hissan', type:'done', ans:51, miss:0 }); if(paradeBreak) endParadeBreak(); taskDone = true; play.update(); });
    t.eq((await state(p)).pop, true, 'ひっさんが おわっても 出ない');
    // 1じかん まえに とじた ことに して ひらきなおす
    await p.evaluate(MIN => { play._set(21*MIN, Date.now() - 61*MIN); localStorage.setItem('nb_play', JSON.stringify(play.st())); }, MIN);
    await p.reload(); await p.waitForFunction(() => typeof play !== 'undefined');
    const s = await state(p);
    t.ok(s.w > 99 && !s.pop, '1じかん やすんでも もどらない: ' + JSON.stringify(s));
  },
};
