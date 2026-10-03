// かぞくで どうき（Cloudflare Worker）。KV（バインドの なまえ SAVES）に セーブデータを 1つ おく。
//
//   GET  /save          → { ver, data, at }（まだ なければ { ver:0, data:null }）
//   PUT  /save          ← { base, data }。いま の ver が base と おなじ ときだけ かいて ver+1。
//                         ちがえば 409 と いまの { ver, data, at }（スマホが あわせて もういちど おくる）
//   どちらも ヘッダー X-Family に かぞくの あいことば（16もじ いじょう）。あいことばの ハッシュを KV の キーに する。
//
// データの あわせかたは スマホの がわ（merge.js）。ここは しまって かえす だけ。
const MAX_BYTES = 512 * 1024;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Family',
  'Access-Control-Max-Age': '86400',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function keyOf(code){
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('numberblocks:' + code));
  return 'fam:' + [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(req, env){
    if(req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if(url.pathname !== '/save') return json({ error: 'not found' }, 404);
    const code = req.headers.get('X-Family') || '';
    if(code.length < 16) return json({ error: 'bad family code' }, 403);
    const key = await keyOf(code);
    const cur = (await env.SAVES.get(key, 'json')) || { ver: 0, data: null, at: 0 };
    if(req.method === 'GET') return json(cur);
    if(req.method === 'PUT'){
      const text = await req.text();
      if(text.length > MAX_BYTES) return json({ error: 'too large' }, 413);
      let body; try{ body = JSON.parse(text); }catch(e){ return json({ error: 'bad json' }, 400); }
      if((body.base | 0) !== cur.ver) return json(cur, 409);
      const next = { ver: cur.ver + 1, data: body.data, at: Date.now() };
      await env.SAVES.put(key, JSON.stringify(next));
      return json({ ver: next.ver, at: next.at });
    }
    return json({ error: 'method' }, 405);
  },
};
