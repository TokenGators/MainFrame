# Gatorpedia UI — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-04-04  
**Status:** Draft  
**Depends on:** [GATORPEDIA-ASSET-REGISTRY-PRD.md](./GATORPEDIA-ASSET-REGISTRY-PRD.md)

---

## Overview

Gatorpedia UI is the front-end interface for the Gatorpedia asset registry. It provides a polished, internal-use web app for browsing, searching, filtering, and editing all TokenGators media assets — tweets, videos, images, GIFs, NFTs, and more.

This is an internal tool used frequently by the team. The UI should be fast, visually clean, and designed for real daily use — not a prototype.

---

## Goals

1. **Browse and search** the full asset registry across all types with fast filtering
2. **Edit assets** — name, description, tags, linked assets directly through the UI
3. **Tag management** — human review queue for AI-suggested tags, inline approval/rejection
4. **NFT Explorer** — dedicated view for the gator collection with trait filters
5. **Export** — download filtered asset sets as JSON for AI job input
6. **Asset linking** — view and edit connections between related assets

---

## Non-Goals

- This is not a content creation tool
- No authentication/multi-user access in v1 (internal tool, single operator)
- No file upload or media storage — assets reference external URLs
- Obsidian export is a CLI script, not triggered from the UI

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React + Vite + TypeScript | Fast builds, modern DX, strong ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Polished components, fast iteration |
| Backend | Node.js + Express | Already in place, simple REST API |
| Data | JSONL files (registry source of truth) | No DB migration, files stay canonical |
| State | React Query (TanStack Query) | Server state caching, auto-refresh |

The server loads JSONL registry files into memory at startup and watches for changes. All writes go back to JSONL files — the registry is never a derived artifact.

**Project location:** `projects/media-assets/` (inside MainFrame monorepo)  
**Dev port:** 3001 (backend), 5173 (Vite frontend dev server)  
**Prod:** Vite builds to `dist/`, Express serves static files

---

## Data Sources

The UI reads from the following registry files (all in `database/`):

| File | Contents |
|------|----------|
| `posts-migrated.jsonl` | ~3,381 tweets |
| `videos.jsonl` | 61 videos |
| `nfts.jsonl` | 4,000 TokenGator NFTs |
| `memes.jsonl` | Memes/GIFs from Supabase |
| `drive-manifest.jsonl` | Google Drive media (when available) |

All records share the unified base schema from the Registry PRD. The UI must handle all asset types gracefully, including types it doesn't know about yet.

---

## API Endpoints

The Express backend exposes a REST API consumed by the React frontend.

### Assets

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/assets` | List assets with filters (type, tags, search, page) |
| `GET` | `/api/assets/:id` | Get single asset by ID |
| `PATCH` | `/api/assets/:id` | Update asset fields (name, description, tags, linked_assets) |
| `GET` | `/api/assets/:id/linked` | Get full records for all linked_assets |

#### Query params for `GET /api/assets`
- `type` — filter by asset type (tweet, video, gator-nft, image, gif, article, audio)
- `tags` — comma-separated tag list; AND logic by default, OR with `tag_op=or`
- `q` — free text search across text, visual_summary, transcript, filename
- `flagged` — `ai` | `human` | `untagged` — filter by review status
- `page` — pagination (default 1, 50 per page)
- `sort` — `created_at` | `id` | `likes` (desc by default)

### Tags

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tags` | List all tags from TAXONOMY.md with counts |
| `POST` | `/api/assets/:id/tags` | Add tag(s) to asset |
| `DELETE` | `/api/assets/:id/tags/:tag` | Remove tag from asset |
| `POST` | `/api/assets/:id/approve-tags` | Approve all AI-suggested tags on asset |

### NFTs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/nfts` | List NFTs with trait filters |
| `GET` | `/api/nfts/:token_id` | Get single NFT with full appearances list |
| `GET` | `/api/nfts/traits` | Get all trait types and values with counts |

### Export

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/export` | Export filtered asset set as JSON download |

### System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/status` | Health check + registry stats |
| `POST` | `/api/reload` | Reload JSONL files from disk |

---

## UI Views

### 1. Asset Browser (default view)

The main view. A browsable, filterable grid/list of all assets.

**Layout:**
- Left sidebar: filter panel (type chips, tag filter, review status)
- Main area: asset cards in a responsive grid or compact list (toggle)
- Top bar: search input, sort controls, view toggle, export button

**Asset card (grid view):**
- Thumbnail/preview (video poster, image, NFT image, tweet text preview)
- Asset type chip (color-coded: tweet=blue, video=purple, nft=green, etc.)
- Tags as small pills (AI-suggested tags shown in amber until approved)
- Like/retweet stats for tweets; duration for videos
- Click → opens Asset Detail panel (slide-over, not full navigation)

**Filter sidebar:**
- Type filter: checkbox list with counts per type
- Tag filter: searchable tag list, multi-select, AND/OR toggle
- Review status: All / Needs Review (AI-tagged) / Human Approved / Untagged
- Date range picker
- Clear all filters button

**Search:**
- Full-text across: tweet text, visual_summary, transcript, filename, alt_text
- Debounced as-you-type (300ms)
- Results highlight matching text

---

### 2. Asset Detail Panel (slide-over)

Opens when clicking any asset card. Full metadata view + editing.

**Read sections:**
- Header: asset ID, type badge, created date, source URL link
- Type-specific content: tweet text / video summary + tone / NFT image + traits
- Stats (tweets): likes, retweets, replies, impressions
- Platform tags (videos): displayed separately from registry tags, labeled "Platform tags (not for filtering)"
- Linked assets: horizontal scroll of linked asset mini-cards, each clickable

**Editable fields (inline edit, save on blur or Enter):**
- `name` / display name — editable text field
- `alt_text` (images/GIFs) — editable text field  
- `visual_summary` (videos/images) — editable textarea
- `tags` — tag editor (see below)
- `linked_assets` — asset linker (see below)

**Tag editor:**
- Current tags shown as removable pills
- AI-suggested tags (flagged_by: "ai") shown in amber with ✓ Approve / ✗ Remove buttons
- "+ Add tag" opens a searchable dropdown from TAXONOMY.md
- "Suggest tags" button — calls the tagging API on demand for this asset
- "Approve all AI tags" button — bulk approve all pending AI tags

**Asset linker:**
- Shows existing linked_assets as mini-cards
- "Link asset" button → opens search modal to find and link another asset
- Click × on any linked asset to unlink

---

### 3. NFT Explorer

Dedicated view for the 4,000 TokenGator NFT collection.

**Layout:**
- Top: trait filter panel (Skin, Eyes, Mouth, Outfit, Hat — each a multi-select dropdown with value counts)
- Grid: NFT cards showing Pinata CDN image, token ID, name
- Token count / filter summary ("Showing 142 of 4,000")

**NFT card:**
- Pinata CDN image (lazy loaded)
- Token ID + name
- Trait summary (e.g. "Lava · Fury · Croc · Adventurer")
- Appearances badge — "Appears in 3 assets" (if gator_appearances is populated)
- Click → NFT detail panel

**NFT detail panel:**
- Full-size image
- All traits listed
- Appearances section: cards for every asset in `gator_appearances[]`
- Edit: ability to manually add/remove appearance links

---

### 4. Review Queue

A dedicated view for human review of AI-tagged assets.

**Layout:**
- List of assets with `flagged_by: "ai"` and unapproved tags
- Each row shows: asset summary, AI-suggested tags (amber pills)
- Bulk actions: "Approve all" / "Skip" per row
- Progress counter: "47 of 312 reviewed"

**Keyboard shortcuts:**
- `A` — approve all tags on focused asset
- `S` — skip (keep as AI-tagged, move to next)
- `R` — reject all AI tags on focused asset
- `↑/↓` — navigate between assets

---

### 5. Export Modal

Triggered from the Browse view. Exports the current filtered set.

**Options:**
- Format: Full JSON (all fields) / Slim JSON (id, type, tags, text/summary only)
- Include linked assets: toggle
- Filename: auto-generated from active filters, editable

Downloads a `.json` file. Intended for feeding into AI job pipelines.

---

## Edit Behavior & Data Persistence

All edits go through the `PATCH /api/assets/:id` endpoint. The server:

1. Finds the asset record in the in-memory store
2. Applies the patch (merge, not replace)
3. Writes the full updated JSONL file to disk atomically (write to `.tmp`, rename)
4. Returns the updated record

**Fields editable through the UI:**
- `tags` (add/remove individual tags)
- `linked_assets` (add/remove asset IDs)
- `featured_gators` (add/remove NFT IDs, on videos/images)
- `gator_appearances` (add/remove asset IDs, on NFTs)
- `alt_text` (images/GIFs)
- `visual_summary` (videos/images — human can correct AI summaries)
- `flagged_by` / `flagged_at` (updated automatically when tags are approved)

**Fields NOT editable through the UI (source data, don't overwrite):**
- `id`, `type`, `created_at`, `platform_post_id`
- `text` (tweet text), `transcript`
- `stats` (likes, retweets — comes from source)
- `platform_tags` (from original video analysis)
- NFT `traits`, `token_id`, `gateway_image_url`

---

## Tag UI Rules

- Tags from TAXONOMY.md are shown with their tier color:
  - Tier 2 (topic): blue
  - Tier 3 (campaign): orange  
  - Tier 4 (tone): purple
  - AI-suggested (unapproved): amber
- When adding a tag, only TAXONOMY.md tags are offered (no freeform input)
- "Propose new tag" link opens a form that writes to `TAXONOMY-PROPOSALS.md`
- Tier 1 (format) tags are shown as read-only type badges, not in the tag editor

---

## Component Library (shadcn/ui)

Use these shadcn components:

| Component | Used for |
|-----------|----------|
| `Sheet` | Asset detail slide-over panel |
| `Dialog` | Export modal, link asset modal |
| `Command` | Tag search dropdown, asset search |
| `Badge` | Tag pills, type chips |
| `Table` | Compact list view |
| `Card` | Asset grid cards |
| `Input` / `Textarea` | Inline editing |
| `Select` | Type filter, sort dropdown |
| `Checkbox` | Multi-select filters |
| `Separator` | Panel sections |
| `Skeleton` | Loading states |
| `Toast` | Save confirmations, errors |

---

## Performance Requirements

- Initial load: all registry files loaded into memory server-side on startup
- Browse view: paginated 50 records per page, client-side filtering on cached data
- Search: debounced, runs on in-memory dataset (no DB query)
- NFT grid: virtual scrolling (react-virtual or tanstack-virtual) — 4,000 cards
- Image lazy loading for NFT grid
- Edits: optimistic UI updates, write to disk async

---

## Project Structure

```
projects/media-assets/
  src/                        ← Express backend
    server.js                 ← Entry point
    registry.js               ← JSONL loader, in-memory store, write-back
    routes/
      assets.js               ← /api/assets routes
      nfts.js                 ← /api/nfts routes
      tags.js                 ← /api/tags routes
      export.js               ← /api/export route
  ui/                         ← Vite + React frontend
    src/
      components/
        AssetBrowser.tsx      ← Main browse view
        AssetCard.tsx         ← Grid card
        AssetDetail.tsx       ← Slide-over panel
        TagEditor.tsx         ← Tag management component
        AssetLinker.tsx       ← Link assets component
        NFTExplorer.tsx       ← NFT grid + trait filters
        ReviewQueue.tsx       ← AI tag review view
        ExportModal.tsx       ← Export dialog
        FilterSidebar.tsx     ← Left filter panel
      hooks/
        useAssets.ts          ← TanStack Query asset hooks
        useNFTs.ts            ← TanStack Query NFT hooks
        useTags.ts            ← Taxonomy + tag operations
      lib/
        api.ts                ← API client
        types.ts              ← TypeScript types matching registry schema
      App.tsx
      main.tsx
    vite.config.ts
    tailwind.config.ts
  database/                   ← JSONL registry files (source of truth)
  scripts/                    ← Python ingestion/migration scripts
  docs/                       ← PRDs (this file + registry PRD)
  TAXONOMY.md
  TAXONOMY-PROPOSALS.md
  package.json
```

---

## Phased Delivery

### Phase 5a — Backend API + Data Layer
- [ ] `registry.js` — JSONL loader, in-memory store, atomic write-back
- [ ] `/api/assets` — GET with filters, GET by id, PATCH
- [ ] `/api/nfts` — GET with trait filters, GET by token_id, traits endpoint
- [ ] `/api/tags` — list from taxonomy with counts
- [ ] `/api/export` — filtered JSON download
- [ ] Vite project scaffold + TypeScript types matching registry schema

### Phase 5b — Browse + Search
- [ ] `FilterSidebar` — type chips, tag multi-select, review status
- [ ] `AssetCard` — grid card for all asset types
- [ ] `AssetBrowser` — paginated grid, search, sort, view toggle
- [ ] Loading states + empty states

### Phase 5c — Asset Detail + Editing
- [ ] `AssetDetail` slide-over panel
- [ ] Inline field editing (name, alt_text, visual_summary)
- [ ] `TagEditor` — add/remove tags, approve AI tags, suggest tags button
- [ ] `AssetLinker` — view and edit linked_assets + featured_gators
- [ ] Toast notifications for save/error

### Phase 5d — NFT Explorer + Review Queue
- [ ] `NFTExplorer` — virtual-scrolled grid, trait filters
- [ ] NFT detail panel with appearances
- [ ] `ReviewQueue` — AI tag review list with keyboard shortcuts

### Phase 5e — Polish
- [ ] Export modal
- [ ] Dark mode (Tailwind dark: classes)
- [ ] Keyboard shortcuts
- [ ] Mobile-responsive layout

---

## Resolved Decisions

1. **Port/hosting** — ✅ Run as a launchd service on the Mac Mini. Always-on, starts on boot. Include a `com.tokengators.gatorpedia.plist` launchd config in the project.

2. **AI suggest tags** — ✅ Not in the UI. AI tagging belongs in an intake/ingestion skill (CLI). The UI's job is human review and approval of tags that were already suggested, not triggering new AI runs.

3. **Taxonomy proposals** — ✅ "Propose new tag" writes directly to `TAXONOMY-PROPOSALS.md`. No UI flow needed — a human will review the file and move approved tags to `TAXONOMY.md` manually.

4. **Video playback** — ✅ Show thumbnail by default. If the asset has a `source_url` pointing to an external video (e.g. X/Twitter, YouTube), show an embedded player or link-out button. Local video files (no URL) show thumbnail + metadata only.
