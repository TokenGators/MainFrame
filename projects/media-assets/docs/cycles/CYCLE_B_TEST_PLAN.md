# Cycle B — Test Plan

**Project:** media-assets (Gatorpedia)  
**Cycle:** B  

Assumes the server is running on `http://localhost:3001` and `http://localhost:5173` (or production build served from 3001).

---

## TC-B01 — App loads without errors

**Steps:**
1. Open `http://localhost:5173` (dev) or `http://localhost:3001` (prod)

**Expected:**
- Page loads with NavBar showing 🐊 Gatorpedia, Browse, NFTs, Review Queue
- No console errors
- No blank white screen

---

## TC-B02 — Asset Browser shows records

**Steps:**
1. Navigate to `/`

**Expected:**
- Asset cards visible in the grid
- At least 50 cards shown
- Result count shown (e.g. "Showing 50 of 7,382")

---

## TC-B03 — Type filter works

**Steps:**
1. Click "video" checkbox in the filter sidebar

**Expected:**
- Grid updates to show only video cards
- All cards have purple "video" chip
- Count updates to ~61

---

## TC-B04 — Type filter clears

**Steps:**
1. With video filter active, click "video" checkbox again

**Expected:**
- All asset types shown again
- Count returns to full total

---

## TC-B05 — Text search filters results

**Steps:**
1. Type "swamp" in the search input
2. Wait 300ms (debounce)

**Expected:**
- Results show only assets containing "swamp" in text, summary, filename, or alt_text
- At least 1 result (should be many)

---

## TC-B06 — Search clears

**Steps:**
1. Clear the search input

**Expected:**
- All assets shown again

---

## TC-B07 — Tag filter (single tag)

**Steps:**
1. Search for "humor" in the tag filter
2. Check "humor"

**Expected:**
- Only assets with "humor" in their tags[] shown
- Count updates

---

## TC-B08 — Tag filter (multiple tags, AND logic)

**Steps:**
1. Select "humor" tag
2. Also select "playful" tag

**Expected:**
- Only assets with BOTH "humor" AND "playful" shown
- Fewer results than either tag alone

---

## TC-B09 — Review status filter

**Steps:**
1. Select "Needs Review" radio

**Expected:**
- Only assets with `flagged_by: "ai"` shown
- Cards have amber outline

---

## TC-B10 — Asset card click opens detail panel

**Steps:**
1. Click any asset card

**Expected:**
- Right-side Sheet panel opens
- Panel shows asset ID, type badge, created date
- Content matches the card that was clicked

---

## TC-B11 — Tweet detail shows full text

**Steps:**
1. Click a tweet card

**Expected:**
- Full tweet text shown in quote block
- Author handle shown
- Stats (likes, retweets) shown if > 0
- Source URL shown as external link

---

## TC-B12 — Video detail shows summary and brand signals

**Steps:**
1. Click a video card

**Expected:**
- visual_summary shown
- tone_and_energy shown
- brand_signals themes/values shown as chips
- memorable_moments shown if present
- Platform tags shown (read-only, clearly labeled)

---

## TC-B13 — NFT detail shows image and traits

**Steps:**
1. Click a gator-nft card

**Expected:**
- Pinata CDN image loads
- Token ID and name shown
- All traits listed (Skin, Eyes, Mouth, Outfit, Hat)

---

## TC-B14 — Tag editor shows current tags

**Steps:**
1. Click an asset that has tags

**Expected:**
- Tags shown as colored pills
- AI-suggested tags (flagged_by: ai) shown in amber with dashed border
- Approved tags colored by tier (blue/orange/purple)

---

## TC-B15 — Add tag from taxonomy

**Steps:**
1. Open an asset with no "humor" tag
2. Click "+ Add tag"
3. Type "humor" in the search
4. Select "humor"

**Expected:**
- "humor" tag appears on the asset immediately (optimistic update)
- Tag persists after refreshing the page
- Check `database/videos.jsonl` or `posts-migrated.jsonl` — record has "humor" in tags[]

---

## TC-B16 — Remove tag

**Steps:**
1. Open an asset that has tags
2. Click × on one of the tags

**Expected:**
- Tag removed immediately
- Persists after refresh
- JSONL file updated on disk

---

## TC-B17 — Approve all AI tags

**Steps:**
1. Open an asset with `flagged_by: "ai"` and amber tags
2. Click "Approve all"

**Expected:**
- Tag pills change from amber to their tier colors
- Record `flagged_by` changes to `"human"` in file
- "needs review" badge removed from card

---

## TC-B18 — Edit alt_text inline

**Steps:**
1. Open an image or GIF asset
2. Click on the alt_text field
3. Type new text
4. Press Enter or click outside

**Expected:**
- Field saves
- Toast notification shown
- Change persists after refresh

---

## TC-B19 — Edit visual_summary inline

**Steps:**
1. Open a video asset
2. Click on the visual_summary text
3. Edit it
4. Blur the field

**Expected:**
- Field saves
- Toast notification shown
- Change persists in JSONL file

---

## TC-B20 — Detail panel closes

**Steps:**
1. Open any asset detail
2. Click the X button or press Escape

**Expected:**
- Sheet closes
- Main browse view is visible and unchanged

---

## TC-B21 — NFT Explorer loads

**Steps:**
1. Click "NFTs" in the nav

**Expected:**
- NFT grid loads with gator cards
- Pinata images load (may be slow on first load)
- Token IDs visible on cards
- Result count shows ~4,000

---

## TC-B22 — NFT trait filter

**Steps:**
1. In NFT Explorer, open the "Skin" dropdown
2. Select "Lava"

**Expected:**
- Grid updates to show only NFTs with Skin=Lava
- All visible cards are Lava skin gators
- Count reflects filtered total

---

## TC-B23 — NFT trait filter stacks

**Steps:**
1. Filter Skin=Lava
2. Also filter Eyes=Fury

**Expected:**
- Only NFTs with both Skin=Lava AND Eyes=Fury shown
- Fewer results than either filter alone

---

## TC-B24 — NFT detail panel

**Steps:**
1. Click any NFT card

**Expected:**
- Sheet opens with full-size Pinata image
- All 5 trait types shown
- Appearances section shown (may be empty)

---

## TC-B25 — Review Queue loads

**Steps:**
1. Click "Review Queue" in nav

**Expected:**
- List of AI-flagged assets shown
- Each row shows type, summary preview, amber tag pills
- Progress counter visible (e.g. "0 of 61 reviewed")
- Keyboard shortcut legend shown

---

## TC-B26 — Review Queue keyboard shortcuts

**Steps:**
1. In Review Queue, focus first row
2. Press A

**Expected:**
- Asset tags approved (turn from amber to tier colors in the list)
- Automatically advances to next row

3. Press S

**Expected:**
- Skips without changes, advances to next

4. Press R

**Expected:**
- All tags cleared from asset, advances to next

---

## TC-B27 — Dark mode toggle

**Steps:**
1. Click moon/sun icon in nav bar

**Expected:**
- UI switches between dark and light mode
- Preference persists after page refresh

---

## TC-B28 — Pagination

**Steps:**
1. On Browse view with no filters
2. Click "Next" button

**Expected:**
- Page 2 of results loads
- Different asset cards shown
- Page indicator shows "Page 2"

---

## TC-B29 — TypeScript compiles clean

**Steps:**
1. `cd ui && npx tsc --noEmit`

**Expected:**
- No TypeScript errors output

---

## TC-B30 — Production build succeeds

**Steps:**
1. `cd ui && npm run build`

**Expected:**
- Build completes without errors
- `dist/` folder created with index.html and assets
