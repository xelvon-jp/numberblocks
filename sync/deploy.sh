#!/usr/bin/env bash
# かぞくで どうき の Worker を Cloudflare に おく（KV を つくって、Worker を あげて、workers.dev で ひらく）。
# つかいかた：CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID を 環境変数に いれて  bash sync/deploy.sh
# トークンの 権限：Account / Workers KV Storage / Edit と Account / Workers Scripts / Edit
# 2かい めからも そのまま つかえる（KV は おなじ なまえの ものを つかいまわす）。さいごに URL を 出す。
set -euo pipefail
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN が ありません}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID が ありません}"
NAME=numberblocks-sync
KV_TITLE=numberblocks-saves
API="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID"
AUTH=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
DIR="$(cd "$(dirname "$0")" && pwd)"
js(){ node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);if(!j.success){console.error(JSON.stringify(j.errors));process.exit(1)}console.log(($1)(j.result))})"; }

# 1) KV（なければ つくる）
NS=$(curl -sS "${AUTH[@]}" "$API/storage/kv/namespaces?per_page=100" | js "r=>(r.find(n=>n.title==='$KV_TITLE')||{}).id||''")
if [ -z "$NS" ]; then
  NS=$(curl -sS "${AUTH[@]}" -H 'Content-Type: application/json' -X POST "$API/storage/kv/namespaces" --data "{\"title\":\"$KV_TITLE\"}" | js 'r=>r.id')
fi
echo "KV: $NS"

# 2) Worker を あげる（KV を SAVES と して つなぐ）
META=$(printf '{"main_module":"worker.js","compatibility_date":"2025-01-01","bindings":[{"type":"kv_namespace","name":"SAVES","namespace_id":"%s"}]}' "$NS")
curl -sS "${AUTH[@]}" -X PUT "$API/workers/scripts/$NAME" \
  -F "metadata=$META;type=application/json" \
  -F "worker.js=@$DIR/worker.js;type=application/javascript+module" | js 'r=>"worker: "+r.id'

# 3) workers.dev で ひらく
curl -sS "${AUTH[@]}" -H 'Content-Type: application/json' -X POST "$API/workers/scripts/$NAME/subdomain" --data '{"enabled":true,"previews_enabled":false}' | js 'r=>"workers.dev: on"'
SUB=$(curl -sS "${AUTH[@]}" "$API/workers/subdomain" | js 'r=>r.subdomain')
echo "URL: https://$NAME.$SUB.workers.dev/save"
