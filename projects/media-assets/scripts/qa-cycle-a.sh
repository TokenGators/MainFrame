#!/bin/bash
# QA Cycle A — Automated test runner for Gatorpedia backend
# Run from: projects/media-assets/
# Usage: bash scripts/qa-cycle-a.sh

set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

PASS=0
FAIL=0
FAILURES=""

pass() { echo "✅ $1"; ((PASS++)); }
fail() { echo "❌ $1: $2"; ((FAIL++)); FAILURES="$FAILURES\n  ❌ $1: $2"; }

# ── Start server ────────────────────────────────────────────────────────────
echo "Starting server..."
node src/server.js > /tmp/gatorpedia-qa.log 2>&1 &
SERVER_PID=$!
sleep 4

if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "FATAL: Server failed to start. Check /tmp/gatorpedia-qa.log"
  cat /tmp/gatorpedia-qa.log
  exit 1
fi

if grep -q "Gatorpedia running" /tmp/gatorpedia-qa.log; then
  pass "TC-A01: Server starts"
else
  fail "TC-A01" "Server did not log expected startup message"
fi

# ── API Tests ───────────────────────────────────────────────────────────────

# TC-A02
R=$(curl -s http://localhost:3001/api/status)
if echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['status']=='healthy' and d['registry']['total']>0" 2>/dev/null; then
  pass "TC-A02: GET /api/status"
else
  fail "TC-A02" "status not healthy or total=0. Got: $R"
fi

# TC-A03
R=$(curl -s "http://localhost:3001/api/assets")
if echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['total']>3000 and 'data' in d and d['page']==1" 2>/dev/null; then
  TOTAL=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])")
  pass "TC-A03: GET /api/assets (total=$TOTAL)"
else
  fail "TC-A03" "total not > 3000 or missing fields"
fi

# TC-A04
R=$(curl -s "http://localhost:3001/api/assets?type=video")
TOTAL=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])" 2>/dev/null || echo "0")
if [ "$TOTAL" = "61" ]; then
  pass "TC-A04: type=video filter (total=61)"
else
  fail "TC-A04" "Expected total=61, got total=$TOTAL"
fi

# TC-A05
R=$(curl -s "http://localhost:3001/api/assets?type=tweet")
TOTAL=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])" 2>/dev/null || echo "0")
if [ "$TOTAL" -gt 3000 ]; then
  pass "TC-A05: type=tweet filter (total=$TOTAL)"
else
  fail "TC-A05" "Expected total>3000, got total=$TOTAL"
fi

# TC-A06
R=$(curl -s "http://localhost:3001/api/assets?q=swamp")
TOTAL=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])" 2>/dev/null || echo "0")
if [ "$TOTAL" -gt 0 ]; then
  pass "TC-A06: search q=swamp (total=$TOTAL)"
else
  fail "TC-A06" "No results for q=swamp"
fi

# TC-A07
R=$(curl -s "http://localhost:3001/api/assets?tags=humor,playful")
if echo "$R" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
  TOTAL=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])")
  pass "TC-A07: tag filter AND (total=$TOTAL, valid JSON)"
else
  fail "TC-A07" "Invalid JSON response"
fi

# TC-A08
R=$(curl -s "http://localhost:3001/api/assets?tags=humor,lore&tag_op=or")
if echo "$R" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
  TOTAL=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])")
  pass "TC-A08: tag filter OR (total=$TOTAL, valid JSON)"
else
  fail "TC-A08" "Invalid JSON response"
fi

# TC-A09
R=$(curl -s "http://localhost:3001/api/assets?flagged=untagged")
if echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert all(len(a.get('tags',[])) == 0 for a in d['data'])" 2>/dev/null; then
  TOTAL=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])")
  pass "TC-A09: flagged=untagged (total=$TOTAL)"
else
  fail "TC-A09" "Some returned records have non-empty tags"
fi

# TC-A10
R=$(curl -s "http://localhost:3001/api/assets/tweet-2031846856746279237")
if echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['id']=='tweet-2031846856746279237'" 2>/dev/null; then
  pass "TC-A10: GET /api/assets/:id"
else
  fail "TC-A10" "ID mismatch or error. Got: $(echo $R | head -c 100)"
fi

# TC-A11
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/assets/nonexistent-id-xyz")
if [ "$HTTP_CODE" = "404" ]; then
  pass "TC-A11: 404 on unknown asset"
else
  fail "TC-A11" "Expected HTTP 404, got $HTTP_CODE"
fi

# TC-A12
curl -s -X PATCH "http://localhost:3001/api/assets/tweet-2031846856746279237" \
  -H "Content-Type: application/json" \
  -d '{"tags":["humor","community"]}' > /dev/null
R=$(curl -s "http://localhost:3001/api/assets/tweet-2031846856746279237")
if echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert set(d['tags'])=={'humor','community'}" 2>/dev/null; then
  pass "TC-A12: PATCH tags"
else
  fail "TC-A12" "Tags not updated. Got: $(echo $R | python3 -c 'import json,sys; print(json.load(sys.stdin).get(\"tags\"))')"
fi

# TC-A13
ORIG_PID=$(curl -s "http://localhost:3001/api/assets/tweet-2031846856746279237" | python3 -c "import json,sys; print(json.load(sys.stdin).get('platform_post_id',''))")
curl -s -X PATCH "http://localhost:3001/api/assets/tweet-2031846856746279237" \
  -H "Content-Type: application/json" \
  -d '{"platform_post_id":"HACKED","created_at":"1900-01-01","tags":["humor"]}' > /dev/null
R=$(curl -s "http://localhost:3001/api/assets/tweet-2031846856746279237")
NEW_PID=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin).get('platform_post_id',''))")
if [ "$NEW_PID" = "$ORIG_PID" ]; then
  pass "TC-A13: PATCH ignores non-editable fields"
else
  fail "TC-A13" "platform_post_id was changed to '$NEW_PID' (was '$ORIG_PID')"
fi

# TC-A14
R=$(curl -s "http://localhost:3001/api/nfts")
TOTAL=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])" 2>/dev/null || echo "0")
if [ "$TOTAL" = "4000" ]; then
  pass "TC-A14: GET /api/nfts (total=4000)"
else
  fail "TC-A14" "Expected total=4000, got total=$TOTAL"
fi

# TC-A15
R=$(curl -s "http://localhost:3001/api/nfts?trait_Skin=Lava")
if echo "$R" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for nft in d['data']:
    assert any(t['trait_type']=='Skin' and t['value']=='Lava' for t in nft.get('traits',[]))
" 2>/dev/null; then
  TOTAL=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])")
  pass "TC-A15: NFT trait filter Skin=Lava (total=$TOTAL)"
else
  fail "TC-A15" "Some NFTs don't have Skin=Lava trait"
fi

# TC-A16
R=$(curl -s "http://localhost:3001/api/nfts/traits")
if echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert all(k in d for k in ['Skin','Eyes','Mouth','Outfit','Hat'])" 2>/dev/null; then
  pass "TC-A16: GET /api/nfts/traits (all 5 trait types present)"
else
  fail "TC-A16" "Missing expected trait type keys. Got: $(echo $R | python3 -c 'import json,sys; print(list(json.load(sys.stdin).keys()))')"
fi

# TC-A17
R=$(curl -s "http://localhost:3001/api/nfts/0")
if echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['token_id']==0 and d['name']=='TokenGator #0'" 2>/dev/null; then
  pass "TC-A17: GET /api/nfts/0"
else
  fail "TC-A17" "Unexpected response. Got: $(echo $R | head -c 100)"
fi

# TC-A18
R=$(curl -s "http://localhost:3001/api/tags")
COUNT=$(echo "$R" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
if [ "$COUNT" -ge 40 ]; then
  pass "TC-A18: GET /api/tags (count=$COUNT)"
else
  fail "TC-A18" "Expected >= 40 tags, got $COUNT"
fi

# TC-A19
R=$(curl -s -X POST "http://localhost:3001/api/export" \
  -H "Content-Type: application/json" \
  -d '{"type":"video","format":"full"}')
if echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['total']==61 and all(a['type']=='video' for a in d['assets'])" 2>/dev/null; then
  pass "TC-A19: POST /api/export video full"
else
  TOTAL=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin).get('total'))" 2>/dev/null || echo "error")
  fail "TC-A19" "Expected total=61, got total=$TOTAL"
fi

# TC-A20
R=$(curl -s -X POST "http://localhost:3001/api/export" \
  -H "Content-Type: application/json" \
  -d '{"type":"tweet","format":"slim"}')
if echo "$R" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for a in d['assets'][:5]:
    assert 'stats' not in a and 'mentions' not in a, f'Non-slim field found in {a}'
" 2>/dev/null; then
  pass "TC-A20: POST /api/export tweet slim (no stats/mentions)"
else
  fail "TC-A20" "Slim export contains non-slim fields"
fi

# TC-A21
if [ -f "ui/index.html" ] && [ -f "ui/src/App.tsx" ]; then
  pass "TC-A21: Frontend scaffold files exist"
else
  fail "TC-A21" "Missing ui/index.html or ui/src/App.tsx"
fi

# TC-A22
if cd ui && npx tsc --noEmit 2>&1 | grep -q "error TS" ; then
  ERRORS=$(cd ui && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l)
  fail "TC-A22" "TypeScript has $ERRORS errors"
  cd "$DIR"
else
  pass "TC-A22: TypeScript compiles clean"
  cd "$DIR"
fi

# TC-A23
if plutil -lint launchd/com.tokengators.gatorpedia.plist 2>&1 | grep -q "OK"; then
  pass "TC-A23: launchd plist valid XML"
else
  fail "TC-A23" "plutil reported errors: $(plutil -lint launchd/com.tokengators.gatorpedia.plist 2>&1)"
fi

# ── Cleanup & Report ────────────────────────────────────────────────────────
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "══════════════════════════════════════"
echo "QA REPORT — media-assets Cycle A"
echo "══════════════════════════════════════"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$FAILURES"
fi
echo "══════════════════════════════════════"
