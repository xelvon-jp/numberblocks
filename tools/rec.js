// けんばんの ちょうせい よう ろくおん（kenban.html の 🔍 →「ろくおん」で おくられた もの）を とってくる。
//   CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID が いる（sync/deploy.sh と おなじ）。
//   node tools/rec.js list            … いちらん
//   node tools/rec.js get <id> <dir>  … <dir>/<id>.wav（16kHz）と <id>.json（ひいた きろく など）に かく
//   node tools/rec.js put <json> [メモ] … get で とった ものを もどす（check に ほんとうの なかみ）
//   node tools/rec.js del <id>        … けす（つかいおわったら けす。30にち で じどうでも きえる）
const NS = 'ddc26ec455134fcc8d0e93ecc46befe5';
const API = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${NS}`;
const H = { Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN };
const fs = require('fs'), path = require('path');
(async () => {
  const [cmd, id, dir] = process.argv.slice(2);
  if(cmd === 'list'){
    const j = await (await fetch(API + '/keys?prefix=rec:', { headers: H })).json();
    for(const k of j.result) console.log(k.name, new Date(+k.name.split(':')[2]).toISOString());
  } else if(cmd === 'get'){
    const t = await (await fetch(API + '/values/' + encodeURIComponent(id), { headers: H })).text();
    const j = JSON.parse(t), out = dir || '.';
    fs.mkdirSync(out, { recursive: true });
    const base = path.join(out, id.replace(/:/g, '_'));
    fs.writeFileSync(base + '.wav', Buffer.from(j.wav, 'base64'));
    delete j.wav; fs.writeFileSync(base + '.json', JSON.stringify(j, null, 1));
    console.log(base + '.wav', base + '.json');
  } else if(cmd === 'del'){
    const j = await (await fetch(API + '/values/' + encodeURIComponent(id), { method: 'DELETE', headers: H })).json();
    console.log(j.success ? 'けした' : JSON.stringify(j.errors));
  } else if(cmd === 'put'){
    // get で とった <dir>/<id>.json（と おなじ なまえの .wav）を もどす。30にち で きえる。dir の ところに「ほんとうの なかみ」の メモを かける
    const j = JSON.parse(fs.readFileSync(id, 'utf8')); j.wav = fs.readFileSync(id.replace(/\.json$/, '.wav')).toString('base64'); if(dir) j.check = dir;
    const key = path.basename(id, '.json').replace(/^rec_/, 'rec:').replace(/_(\d+)$/, ':$1');
    const r = await (await fetch(API + '/values/' + encodeURIComponent(key) + '?expiration_ttl=' + 30*86400, { method: 'PUT', headers: H, body: JSON.stringify(j) })).json();
    console.log(r.success ? 'もどした ' + key : JSON.stringify(r.errors));
  } else console.log('node tools/rec.js list | get <id> <dir> | del <id> | put <json> [ほんとうの なかみ]');
})();
