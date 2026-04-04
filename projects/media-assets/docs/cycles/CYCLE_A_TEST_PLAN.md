# Cycle A — Test Plan

**Project:** media-assets (Gatorpedia)  
**Cycle:** A  

Assumes the server is running on `http://localhost:3001` and registry JSONL files are present in `projects/media-assets/database/`.

---

## TC-A01 — Server starts and loads registry

**Steps:**
1. Run `npm start` from `projects/media-assets/`

**Expected:**
- Server logs: `Gatorpedia running on http://localhost:3001`
- Server logs: `registry: loaded X records from posts-migrated.jsonl`
- Server logs: `registry: loaded X records from videos.jsonl`
- Server logs: `registry: loaded X records from nfts.jsonl`
- Server logs: `registry: total XXXX records`

---

## TC-A02 — Status endpoint

**Steps:**
1. `GET http://localhost:3001/api/status`

**Expected:**
- HTTP 200
- JSON body contains: `status: "healthy"`, `registry.total > 0`, `registry.byType` with counts per asset type

---

## TC-A03 — List all assets (paginated)

**Steps:**
1. `GET http://localhost:3001/api/assets`

**Expected:**
- HTTP 200
- Response has: `data[]`, `total`, `page: 1`, `per_page: 50`, `pages`
- `data.length === 50` (or less if fewer total records)
- `total > 3000`

---

## TC-A04 — Filter by type

**Steps:**
1. `GET http://localhost:3001/api/assets?type=video`

**Expected:**
- HTTP 200
- All records in `data[]` have `type: "video"`
- `total === 61`

---

## TC-A05 — Filter by type: tweet

**Steps:**
1. `GET http://localhost:3001/api/assets?type=tweet`

**Expected:**
- HTTP 200
- All records have `type: "tweet"`
- `total > 3000`

---

## TC-A06 — Full-text search

**Steps:**
1. `GET http://localhost:3001/api/assets?q=swamp`

**Expected:**
- HTTP 200
- All returned records contain "swamp" (case-insensitive) in at least one of: `text`, `visual_summary`, `transcript`, `filename`, `alt_text`, `name`
- At least 1 result returned

---

## TC-A07 — Tag filter (AND logic)

**Steps:**
1. First, identify two tags that appear together in some records
2. `GET http://localhost:3001/api/assets?tags=humor,playful`

**Expected:**
- HTTP 200
- All records in `data[]` have BOTH `humor` AND `playful` in their `tags[]`

---

## TC-A08 — Tag filter (OR logic)

**Steps:**
1. `GET http://localhost:3001/api/assets?tags=humor,lore&tag_op=or`

**Expected:**
- HTTP 200
- All records have at least one of `humor` or `lore` in their `tags[]`
- Total should be higher than either tag alone

---

## TC-A09 — Filter untagged

**Steps:**
1. `GET http://localhost:3001/api/assets?flagged=untagged`

**Expected:**
- HTTP 200
- All records have empty `tags[]`

---

## TC-A10 — Get asset by ID

**Steps:**
1. From TC-A03, pick any record's `id` value
2. `GET http://localhost:3001/api/assets/{id}`

**Expected:**
- HTTP 200
- Returned record `id` matches requested ID
- Full record returned (not paginated)

---

## TC-A11 — Get asset by ID — not found

**Steps:**
1. `GET http://localhost:3001/api/assets/nonexistent-id-xyz`

**Expected:**
- HTTP 404
- `{ "error": "Not found" }`

---

## TC-A12 — Patch asset tags

**Steps:**
1. Pick a tweet record ID from TC-A03 (note its current tags)
2. `PATCH http://localhost:3001/api/assets/{id}` with body `{"tags": ["humor", "community"]}`
3. `GET http://localhost:3001/api/assets/{id}`

**Expected:**
- PATCH returns HTTP 200 with updated record
- GET returns record with `tags: ["humor", "community"]`
- JSONL file on disk reflects the change (check with `grep {id} database/posts-migrated.jsonl`)

---

## TC-A13 — Patch ignores non-editable fields

**Steps:**
1. Pick a tweet record ID
2. Note its current `platform_post_id` and `created_at` values
3. `PATCH http://localhost:3001/api/assets/{id}` with body `{"platform_post_id": "HACKED", "created_at": "1900-01-01", "tags": ["humor"]}`

**Expected:**
- HTTP 200 returned
- Returned record `platform_post_id` and `created_at` are UNCHANGED
- `tags` is updated to `["humor"]`

---

## TC-A14 — List NFTs

**Steps:**
1. `GET http://localhost:3001/api/nfts`

**Expected:**
- HTTP 200
- All records have `type: "gator-nft"`
- `total === 4000`

---

## TC-A15 — Filter NFTs by trait

**Steps:**
1. `GET http://localhost:3001/api/nfts?trait_Skin=Lava`

**Expected:**
- HTTP 200
- All returned records have a trait `{trait_type: "Skin", value: "Lava"}`

---

## TC-A16 — Get NFT traits summary

**Steps:**
1. `GET http://localhost:3001/api/nfts/traits`

**Expected:**
- HTTP 200
- Response is an object with keys: `Skin`, `Eyes`, `Mouth`, `Outfit`, `Hat`
- Each key maps to an object of `{value: count}` pairs
- Total counts across all values for `Skin` ≈ 4000

---

## TC-A17 — Get single NFT

**Steps:**
1. `GET http://localhost:3001/api/nfts/0`

**Expected:**
- HTTP 200
- Record has `token_id: 0`, `name: "TokenGator #0"`
- Record includes `appearances` array (may be empty)

---

## TC-A18 — List tags with counts

**Steps:**
1. `GET http://localhost:3001/api/tags`

**Expected:**
- HTTP 200
- Response is an array of `{tag, description, count}` objects
- At least 40 tags listed
- All tags are present in TAXONOMY.md

---

## TC-A19 — Export filtered set

**Steps:**
1. `POST http://localhost:3001/api/export` with body `{"type": "video", "format": "full"}`

**Expected:**
- HTTP 200
- Response header: `Content-Disposition: attachment; filename="gatorpedia-export-*.json"`
- Response body is JSON with `{exported_at, total: 61, assets: [...]}`
- All assets have `type: "video"`

---

## TC-A20 — Export slim format

**Steps:**
1. `POST http://localhost:3001/api/export` with body `{"type": "tweet", "format": "slim"}`

**Expected:**
- HTTP 200
- Each asset in `assets[]` only has fields: `id, type, tags, text, visual_summary, filename, name, created_at, source_url`
- No `stats`, `mentions`, `hashtags`, etc.

---

## TC-A21 — Frontend scaffold loads

**Steps:**
1. Run `npm run dev` in `projects/media-assets/ui/`
2. Open `http://localhost:5173`

**Expected:**
- Page loads without error
- Shows "🐊 Gatorpedia" heading and "Registry backend is live" message
- No TypeScript errors in console
- No 404 errors for assets

---

## TC-A22 — Frontend API proxy works

**Steps:**
1. With both servers running (backend on 3001, frontend dev on 5173)
2. Open browser devtools → Network tab
3. Navigate to `http://localhost:5173`

**Expected:**
- Any `/api/*` calls in the Network tab return 200 from localhost:3001 (proxied)

---

## TC-A23 — launchd plist exists and is valid XML

**Steps:**
1. Check `projects/media-assets/launchd/com.tokengators.gatorpedia.plist` exists
2. Run `plutil -lint launchd/com.tokengators.gatorpedia.plist`

**Expected:**
- File exists
- `plutil` reports: `launchd/com.tokengators.gatorpedia.plist: OK`
