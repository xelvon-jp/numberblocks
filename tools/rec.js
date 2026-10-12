// けんばんの ちょうせい よう ろくおん（kenban.html の 🔍 →「ろくおん」で おくられた もの）を とってくる。
//   CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID が いる（sync/deploy.sh と おなじ）。
//   node tools/rec.js list            … いちらん
//   node tools/rec.js get <id> <dir>  … <dir>/<id>.wav（16kHz）と <id>.json（ひいた きろく など）に かく
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
  } else console.log('node tools/rec.js list | get <id> <dir> | del <id>');
})();
