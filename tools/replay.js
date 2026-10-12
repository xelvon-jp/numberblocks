// ろくおん（tools/rec.js get で とった .wav と .json）を kenban.html に マイクの かわりに ながして、どう きこえるか を みる。
//   cd tests && node ../tools/replay.js <...>.json   （tests の playwright-core を つかう）
// ろくおん した ときの もうど・きょくで ひらき、🔍 の きろく（ひいた ○／はじいた × と わけ）を 出す。
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require(path.join(__dirname, '../tests/node_modules/playwright-core'));
const ROOT = path.join(__dirname, '..');
const jf = process.argv[2], meta = JSON.parse(fs.readFileSync(jf, 'utf8')), wav = fs.readFileSync(jf.replace(/\.json$/, '.wav')).toString('base64');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if(e){ r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' }); r.end(d); }); });
srv.listen(0, async () => {
  const exe = ['/opt/pw-browsers/chromium'].find(fs.existsSync);
  const b = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:' + srv.address().port + '/kenban.html');
  await p.evaluate(([mode, song]) => { localStorage.setItem('nb_kenban_game', JSON.stringify({ mode: mode || 'play', play: 's0' })); }, [meta.mode]);
  await p.reload(); await p.waitForTimeout(500);
  // きょくを ろくおんの ときと おなじ に（おぼえた きょく でも notes から）
  if(meta.notes) await p.evaluate(([name, notes]) => { const i = kenban.allSongs().findIndex(s => s.name === name);
    if(i < 0){ localStorage.setItem('nb_kenban_songs', JSON.stringify([{ name, notes }])); } kenban.gs().play = 's' + (i < 0 ? kenban.songs.length : i); kenban.game().reset(); }, [meta.song, meta.notes]);
  await p.evaluate(b64 => { navigator.mediaDevices.getUserMedia = async () => {
    const ac = new AudioContext(), dst = ac.createMediaStreamDestination();
    const bin = atob(b64), u8 = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const buf = await ac.decodeAudioData(u8.buffer); window.__dur = buf.duration;
    const s = ac.createBufferSource(); s.buffer = buf; s.connect(dst); s.start(ac.currentTime + 0.3); return dst.stream; }; }, wav);
  await p.evaluate(() => { window.__t0 = performance.now(); document.getElementById('start').click(); });
  await p.waitForFunction(() => window.__dur, null, { timeout: 10000 });
  const dur = await p.evaluate(() => window.__dur);
  await p.waitForTimeout(dur*1000 + 1500);
  const r = await p.evaluate(() => ({ idx: kenban.game().idx, log: kenban.dbgLog().map(e => Object.assign({}, e, { rt: Math.round(e.t - window.__t0 - 300) })) }));
  console.log('ろくおん:', meta.memo, '/', meta.song, '/', dur.toFixed(1) + 'びょう');
  console.log('ろくおん した とき：ok', (meta.log || []).filter(e => e.ok).length, '／ さいせい：すすんだ', r.idx, 'ok', r.log.filter(e => e.ok).length);
  const nm = k => k == null ? '-' : String(k);
  for(const e of r.log) console.log((e.rt/1000).toFixed(2).padStart(6), e.ok ? '○' : '×', e.src, 'k' + nm(e.k), e.ok ? '' : '（つぎ k' + nm(e.exp) + '）', e.why || '', e.corr != null ? 'corr ' + e.corr : '', e.c != null ? e.c + 'セント' : '', e.he != null ? 'he ' + e.he + ' low ' + e.low + ' ref ' + e.ref + ' hm ' + e.hm : '');
  await b.close(); srv.close();
});
