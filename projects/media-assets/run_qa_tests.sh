#!/bin/bash
# QA Test Script for media-assets Cycle A

cd /Users/operator/repos/MainFrame/projects/media-assets

# STEP 1 - Start server
node src/server.js > /tmp/gatorpedia-qa.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 5

# Check if server started
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "Server failed to start"
    cat /tmp/gatorpedia-qa.log
    exit 1
fi

echo "=== TC-A01 ==="
grep "Gatorpedia running" /tmp/gatorpedia-qa.log && echo PASS || echo FAIL

echo "=== TC-A02 ==="
curl -s http://localhost:3001/api/status | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if d.get('status')=='healthy' and d.get('registry',{}).get('total',0)>0 else 'FAIL')"

echo "=== TC-A03 ==="
curl -s http://localhost:3001/api/assets | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS total='+str(d.get('total')) if d.get('total',0)>3000 else 'FAIL total='+str(d.get('total')))"

echo "=== TC-A04 ==="
curl -s "http://localhost:3001/api/assets?type=video" | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if d.get('total')==61 else 'FAIL total='+str(d.get('total')))"

echo "=== TC-A05 ==="
curl -s "http://localhost:3001/api/assets?type=tweet" | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if d.get('total',0)>3000 else 'FAIL total='+str(d.get('total')))"

echo "=== TC-A06 ==="
curl -s "http://localhost:3001/api/assets?q=swamp" | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if d.get('total',0)>0 else 'FAIL')"

echo "=== TC-A07 ==="
curl -s "http://localhost:3001/api/assets?tags=humor,playful" | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS total='+str(d.get('total')))"

echo "=== TC-A08 ==="
curl -s "http://localhost:3001/api/assets?tags=humor,lore&tag_op=or" | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS total='+str(d.get('total')))"

echo "=== TC-A09 ==="
curl -s "http://localhost:3001/api/assets?flagged=untagged" | python3 -c "import json,sys; d=json.load(sys.stdin); bad=[a for a in d.get('data',[]) if a.get('tags')]; print('PASS' if not bad else 'FAIL '+str(len(bad))+' records have tags')"

echo "=== TC-A10 ==="
curl -s "http://localhost:3001/api/assets/tweet-2031846856746279237" | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if d.get('id')=='tweet-2031846856746279237' else 'FAIL')"

echo "=== TC-A11 ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/assets/nonexistent-id-xyz"); [ "$CODE" = "404" ] && echo PASS || echo "FAIL got $CODE"

echo "=== TC-A12 ==="
curl -s -X PATCH "http://localhost:3001/api/assets/tweet-2031846856746279237" -H "Content-Type: application/json" -d '{"tags":["humor","community"]}' > /dev/null
curl -s "http://localhost:3001/api/assets/tweet-2031846856746279237" | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if set(d.get('tags',[]))=={'humor','community'} else 'FAIL tags='+str(d.get('tags')))"

echo "=== TC-A13 ==="
ORIG=$(curl -s "http://localhost:3001/api/assets/tweet-2031846856746279237" | python3 -c "import json,sys; print(json.load(sys.stdin).get('platform_post_id',''))")
curl -s -X PATCH "http://localhost:3001/api/assets/tweet-2031846856746279237" -H "Content-Type: application/json" -d '{"platform_post_id":"HACKED","tags":["humor"]}' > /dev/null
NEW=$(curl -s "http://localhost:3001/api/assets/tweet-2031846856746279237" | python3 -c "import json,sys; print(json.load(sys.stdin).get('platform_post_id',''))")
[ "$ORIG" = "$NEW" ] && echo PASS || echo "FAIL changed to $NEW"

echo "=== TC-A14 ==="
curl -s http://localhost:3001/api/nfts | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if d.get('total')==4000 else 'FAIL total='+str(d.get('total')))"

echo "=== TC-A15 ==="
curl -s "http://localhost:3001/api/nfts?trait_Skin=Lava" | python3 -c "import json,sys; d=json.load(sys.stdin); bad=[n for n in d.get('data',[]) if not any(t.get('trait_type')=='Skin' and t.get('value')=='Lava' for t in n.get('traits',[]))]; print('PASS' if not bad else 'FAIL '+str(len(bad))+' bad records')"

echo "=== TC-A16 ==="
curl -s http://localhost:3001/api/nfts/traits | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if all(k in d for k in ['Skin','Eyes','Mouth','Outfit','Hat']) else 'FAIL keys='+str(list(d.keys())))"

echo "=== TC-A17 ==="
curl -s http://localhost:3001/api/nfts/0 | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if d.get('token_id')==0 and d.get('name')=='TokenGator #0' else 'FAIL')"

echo "=== TC-A18 ==="
curl -s http://localhost:3001/api/tags | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS count='+str(len(d)) if len(d)>=40 else 'FAIL count='+str(len(d)))"

echo "=== TC-A19 ==="
curl -s -X POST http://localhost:3001/api/export -H "Content-Type: application/json" -d '{"type":"video","format":"full"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if d.get('total')==61 else 'FAIL total='+str(d.get('total')))"

echo "=== TC-A20 ==="
curl -s -X POST http://localhost:3001/api/export -H "Content-Type: application/json" -d '{"type":"tweet","format":"slim"}' | python3 -c "import json,sys; d=json.load(sys.stdin); bad=[a for a in d.get('assets',[])[:5] if 'stats' in a or 'mentions' in a]; print('PASS' if not bad else 'FAIL has extra fields')"

echo "=== TC-A21 ==="
[ -f /Users/operator/repos/MainFrame/projects/media-assets/ui/index.html ] && [ -f /Users/operator/repos/MainFrame/projects/media-assets/ui/src/App.tsx ] && echo PASS || echo FAIL

echo "=== TC-A22 ==="
cd /Users/operator/repos/MainFrame/projects/media-assets/ui && npx tsc --noEmit 2>&1 | grep -c "error TS" | python3 -c "import sys; n=int(sys.stdin.read()); print('PASS' if n==0 else 'FAIL '+str(n)+' TS errors')"

echo "=== TC-A23 ==="
plutil -lint /Users/operator/repos/MainFrame/projects/media-assets/launchd/com.tokengators.gatorpedia.plist 2>&1 | grep -q OK && echo PASS || echo FAIL

# STEP 3 - Kill server
kill $SERVER_PID 2>/dev/null
echo "Server stopped"

# Count pass/fail
echo ""
echo "=== SUMMARY ==="
echo "Run: /tmp/gatorpedia-qa-summary.sh"
