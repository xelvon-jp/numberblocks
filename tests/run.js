// ブラウザでゲームを実際に動かして確かめるテスト。
//
//   cd tests && npm install      （はじめの1回だけ）
//   node run.js                  ぜんぶ流す
//   node run.js おだい            名前に「おだい」を含むものだけ流す
//
// 1つでも失敗したら終了コード1で終わる。
// Chromium は CHROME_PATH → /opt/pw-browsers の中 → Playwright まかせ、の順にさがす。

const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
                '.css':'text/css', '.json':'application/json', '.png':'image/png' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function serve(){
  return new Promise(res => {
    const srv = http.createServer((req, resp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(ROOT, u === '/' ? 'index.html' : u);
      if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){
        resp.writeHead(404); resp.end(); return;
      }
      resp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

function findChrome(){
  if(process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try{
    const dirs = fs.readdirSync(base).filter(n => /^chromium-\d+$/.test(n)).sort().reverse();
    for(const d of dirs){
      const exe = path.join(base, d, 'chrome-linux', 'chrome');
      if(fs.existsSync(exe)) return exe;
    }
  }catch(e){}
  return undefined;
}

class Failure extends Error {}

// 1ケースぶんの道具箱
function makeT(browser, baseUrl){
  const contexts = [], errors = [];
  const t = {
    sleep,
    ok(cond, msg){ if(!cond) throw new Failure(msg); },
    eq(a, b, msg){
      const sa = JSON.stringify(a), sb = JSON.stringify(b);
      if(sa !== sb) throw new Failure(`${msg}\n      期待: ${sb}\n      実際: ${sa}`);
    },
    // ゲームを開く。storage を渡すとその中身で始める（null なら まっさら）。
    // keepPicker が true でなければ「だれが あそぶ？」は閉じ、who で指定した子にする。
    async open(o = {}){
      const ctx = await browser.newContext({
        viewport: { width:o.width||393, height:o.height||780 },
        deviceScaleFactor:1, isMobile:true, hasTouch:true });
      contexts.push(ctx);
      const page = await ctx.newPage();
      page.on('pageerror', e => errors.push(String(e && e.message || e)));
      await page.goto(baseUrl + '/index.html');
      await page.waitForFunction(() => typeof drawFrame === 'function');
      await page.evaluate(s => {
        localStorage.clear();
        if(s) for(const k in s) localStorage.setItem(k, s[k]);
      }, o.storage || null);
      await page.reload();
      await page.waitForFunction(() => typeof drawFrame === 'function');
      await sleep(250);
      if(!o.keepPicker){
        await page.evaluate(who => {
          if(whoOpen){ whoOpen = false; setWhoOverlay(false); }
          const i = PROFILES.findIndex(p => p.id === who);
          if(i >= 0) setProfile(i);
          setQuizOn(false);
        }, o.who || 'hinata');
        await sleep(80);
      }
      return page;
    },
    errors,
    async close(){ for(const c of contexts) await c.close(); }
  };
  return t;
}

(async () => {
  const filter = process.argv[2] || '';
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
  const srv = await serve();
  const baseUrl = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({ executablePath: findChrome() });

  let pass = 0, fail = 0;
  const failed = [];
  for(const file of files){
    const cases = require(path.join(__dirname, file));
    const names = Object.keys(cases).filter(n => !filter || n.includes(filter) || file.includes(filter));
    if(!names.length) continue;
    console.log(`\n■ ${file}`);
    for(const name of names){
      const t = makeT(browser, baseUrl);
      const t0 = Date.now();
      try{
        await cases[name](t);
        if(t.errors.length) throw new Failure('ページでエラー: ' + t.errors.join(' / '));
        pass++;
        console.log(`  ✓ ${name}  (${((Date.now()-t0)/1000).toFixed(1)}s)`);
      }catch(e){
        fail++; failed.push(`${file} › ${name}`);
        console.log(`  ✗ ${name}\n      ${e instanceof Failure ? e.message : (e.stack || e)}`);
      }finally{
        await t.close();
      }
    }
  }
  await browser.close(); srv.close();
  console.log(`\n${pass} 成功 / ${fail} 失敗`);
  if(fail){ for(const f of failed) console.log('  ✗ ' + f); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
