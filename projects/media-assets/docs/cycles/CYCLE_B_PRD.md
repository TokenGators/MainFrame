# Cycle B — Gatorpedia Full UI

**Project:** media-assets (Gatorpedia)  
**Cycle:** B  
**Depends on:** Cycle A (backend API + scaffold) must be complete and passing  
**Goal:** Build the full Gatorpedia UI — browse, search, filter, asset detail with editing, NFT explorer, and review queue.

---

## What Gets Built

A complete React frontend that makes the Gatorpedia registry genuinely useful:

1. **Asset Browser** — the main view. Filterable grid of all assets with type, tag, and status filters plus full-text search.
2. **Asset Detail Panel** — slide-over panel with full metadata and inline editing for tags, alt_text, visual_summary, linked assets.
3. **Tag Editor** — approve/reject AI-suggested tags, add tags from taxonomy, bulk approve.
4. **NFT Explorer** — virtual-scrolled grid of all 4,000 TokenGators with trait filters.
5. **Review Queue** — focused view for humans to work through AI-tagged assets with keyboard shortcuts.

---

## Success Criteria

- Navigating to `http://localhost:3001` shows the Asset Browser with asset cards
- Type filter (tweet / video / nft / image / gif) filters the grid correctly
- Tag filter (multi-select) filters to assets with selected tags (AND logic by default)
- Free-text search filters in real-time (debounced)
- Clicking an asset card opens the detail slide-over with full metadata
- Tags on the detail panel show AI-suggested (amber) vs human-approved (colored by tier)
- Adding a tag from the taxonomy dropdown updates the record and persists to disk
- Removing a tag updates the record and persists to disk
- Approving an AI tag sets `flagged_by: "human"` on the record
- Editing `alt_text` or `visual_summary` inline saves on blur
- NFT Explorer shows all 4,000 NFT cards with Pinata images (lazy loaded)
- Trait filters on NFT Explorer filter the grid correctly
- Clicking an NFT shows its detail with trait list and any appearances
- Review Queue shows only AI-flagged assets, with A/S/R keyboard shortcuts
- All shadcn/ui components used — no raw HTML styling
- Dark mode works via Tailwind dark: classes
- TypeScript compiles clean
- No console errors in production build

---

## Out of Scope (Future Cycles)

- Video playback (embedded player)
- Export modal (Cycle C)
- Asset linking UI (manually linking tweets to videos)
- Propose new tag UI (write to TAXONOMY-PROPOSALS.md)
- Mobile-optimized layout

---

## Views & Routes

| Path | View |
|------|------|
| `/` | Asset Browser (default) |
| `/nfts` | NFT Explorer |
| `/review` | Review Queue |

Asset detail opens as a slide-over on top of any view — no navigation.

---

## Component Breakdown

### Layout Shell (`App.tsx`)
- Top nav bar: Gatorpedia logo/name, nav links (Browse / NFTs / Review Queue), dark mode toggle
- Main content area below nav
- `<Sheet>` portal for detail panel

### Asset Browser (`components/AssetBrowser.tsx`)

**Filter Sidebar (left, ~240px):**
- Asset type: checkboxes with record counts per type, color-coded chips
- Tags: searchable list (Command component), multi-select, AND/OR toggle
- Review status: radio — All / Needs Review / Approved / Untagged
- Date range: two date inputs (optional)
- Clear all filters button + active filter count badge

**Top bar:**
- Search input (debounced 300ms, searches text/summary/filename/alt_text)
- Sort: Created (desc) / Created (asc) / Most Likes / ID
- View toggle: Grid / List
- Result count: "Showing 47 of 3,382"

**Grid view:**
- Responsive grid (2–4 cols depending on viewport)
- `<AssetCard>` per record

**List view:**
- Compact table with columns: Type | ID | Summary/Text preview | Tags | Date
- Click row → opens detail

**Pagination:**
- Previous / Next buttons + page indicator
- 50 per page

### Asset Card (`components/AssetCard.tsx`)

Different rendering per type:

**Tweet:**
- Blue `tweet` type chip
- Text preview (2 lines, truncated)
- Author handle + date
- Stats: 💙 likes · 🔁 retweets
- Tag pills (3 max, +N more)

**Video:**
- Purple `video` chip
- Filename
- Visual summary preview (2 lines)
- Duration if available
- Tag pills

**Gator NFT:**
- Green `nft` chip
- Pinata CDN image (lazy, 120×120, object-fit cover)
- Token ID + name
- Top 2 traits as small text

**Image/GIF:**
- Gray chip
- Filename
- Alt text or visual summary preview
- Format badge

All cards: amber outline if `flagged_by: "ai"` and tags not yet approved.

Click anywhere on card → opens Asset Detail slide-over.

### Asset Detail (`components/AssetDetail.tsx`)

Right-side `<Sheet>` (600px wide on desktop).

**Header:**
- Asset ID (monospace, small)
- Type badge
- Created date
- Source URL as external link (if present)
- Close button

**Type-specific content section:**
- Tweet: full text in a quote block
- Video: visual_summary in a card; tone_and_energy; brand_signals themes/values as chips; memorable_moments timeline; aesthetic_notes as key/value pairs
- NFT: Pinata image (full width); trait grid; appearances list
- Image/GIF: visual_summary

**Editable fields:**
All editable fields use click-to-edit pattern: display as text normally, click to activate input/textarea, save on blur or Enter, cancel on Escape.

| Field | Shown for | Input type |
|-------|-----------|------------|
| `alt_text` | image, gif | text input |
| `visual_summary` | video, image, gif | textarea |
| `linked_assets` | all | asset linker (see below) |
| `featured_gators` | video, image, gif | NFT token ID linker |

**Platform tags section (videos only):**
Displayed as read-only gray chips, clearly labeled "Platform tags (YouTube/Giphy — not registry tags)".

**Linked assets:**
Horizontal scroll of mini asset cards. Each has an × to unlink. "+ Link asset" button opens a search dialog to find and link another asset.

### Tag Editor (`components/TagEditor.tsx`)

Embedded in Asset Detail.

**Display:**
- Approved tags as colored pills by tier (blue=topic, orange=campaign, purple=tone)
- AI-suggested tags (flagged_by=ai) as amber pills with ✓ and ✗ buttons
- "+ Add tag" button

**Add tag flow:**
- Opens a `<Command>` popover with taxonomy tag list
- Searchable, shows tag + description
- Select → calls PATCH /api/assets/:id with updated tags array

**Approve/reject AI tags:**
- ✓ on individual tag: updates `flagged_by: "human"`, `flagged_at: now` on the record
- ✗ on individual tag: removes tag from array
- "Approve all" button: approves all AI-suggested tags at once

### NFT Explorer (`components/NFTExplorer.tsx`)

**Trait filter bar (top):**
- One dropdown per trait type: Skin / Eyes / Mouth / Outfit / Hat
- Each dropdown lists all unique values with counts
- Multiple trait filters = AND logic
- Active filters shown as dismissable chips
- "Clear all" button
- Result count badge

**Grid:**
- Virtual scrolling (TanStack Virtual) — critical for 4,000 items
- Cards: 140×180px with Pinata image (lazy), token ID, name
- Click → opens NFT detail slide-over

**NFT Detail (reuses AssetDetail sheet):**
- Full-size image
- All traits as key/value grid
- Appearances section: cards linking to each asset in `gator_appearances[]`
- Editable: `gator_appearances` — add/remove asset IDs

### Review Queue (`components/ReviewQueue.tsx`)

**Purpose:** Work through AI-tagged assets efficiently.

**Layout:**
- Full-width list, one asset per row
- Each row: type chip | ID/summary | AI-suggested tags (amber) | Approve all / Skip / Reject all buttons
- Progress bar + counter: "47 of 312 reviewed"
- Keyboard shortcut legend at top

**Keyboard shortcuts (when a row is focused):**
- `A` — approve all AI tags on this asset, advance to next
- `S` — skip (mark reviewed without changing tags), advance to next
- `R` — reject all AI tags (clear tags array), advance to next
- `↑/↓` or `J/K` — navigate between rows

**Filters:**
- Default: shows only `flagged_by: "ai"` assets
- Toggle to show all untagged assets too

---

## Styling & Theme

- shadcn/ui default theme, `slate` base color
- Dark mode: `class` strategy via Tailwind, toggle in nav bar persisted to `localStorage`
- Type chip colors:
  - tweet: `blue`
  - video: `violet`
  - gator-nft: `green`
  - image: `slate`
  - gif: `pink`
  - article: `amber`
  - audio: `cyan`
- Tag tier colors:
  - Tier 2 (topic): `blue`
  - Tier 3 (campaign): `orange`
  - Tier 4 (tone): `purple`
  - AI-suggested (unapproved): `amber` with dashed border

---

## Data Fetching (TanStack Query)

All server state via React Query. Key queries:

```typescript
// hooks/useAssets.ts
useAssets(filters)         // paginated asset list
useAsset(id)               // single asset
useMutateAsset(id)         // PATCH with optimistic update

// hooks/useNFTs.ts
useNFTs(traitFilters)      // paginated NFT list with virtual scroll
useNFT(tokenId)            // single NFT with appearances
useNFTTraits()             // trait summary for filter dropdowns

// hooks/useTags.ts
useTaxonomyTags()          // all taxonomy tags with counts
```

Optimistic updates: when patching tags, update the local cache immediately and revert on error. Show a toast on success/error.

---

## shadcn/ui Components to Install

```bash
npx shadcn-ui@latest add sheet dialog command badge table card input textarea select checkbox separator skeleton toast button scroll-area popover
```

Also install:
```bash
npm install @tanstack/react-virtual lucide-react
```

---

## File Layout

```
ui/src/
  components/
    layout/
      NavBar.tsx
      Layout.tsx
    AssetBrowser.tsx
    AssetCard.tsx
    AssetDetail.tsx
    TagEditor.tsx
    AssetLinker.tsx
    FilterSidebar.tsx
    NFTExplorer.tsx
    NFTCard.tsx
    ReviewQueue.tsx
    EmptyState.tsx
    LoadingSkeleton.tsx
  hooks/
    useAssets.ts
    useNFTs.ts
    useTags.ts
  lib/
    api.ts           (already exists from Cycle A)
    types.ts         (already exists from Cycle A)
    utils.ts         (cn helper, type colors, tier colors)
  pages/
    BrowsePage.tsx
    NFTPage.tsx
    ReviewPage.tsx
  App.tsx            (update routes from placeholder)
  main.tsx
```
