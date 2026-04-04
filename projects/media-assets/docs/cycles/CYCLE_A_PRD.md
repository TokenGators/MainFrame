# Cycle A — Gatorpedia Backend API & Project Scaffold

**Project:** media-assets (Gatorpedia)  
**Cycle:** A  
**Goal:** Build the Express backend API and Vite/React project scaffold so the registry data is queryable and the frontend has a working foundation to build on.

---

## What Gets Built

A Node.js/Express backend that:
- Loads all JSONL registry files into memory at startup
- Exposes a REST API for querying, filtering, and editing assets
- Writes edits back to JSONL files atomically
- Watches for file changes and reloads automatically
- Serves the (future) frontend static build

A Vite + React + TypeScript frontend scaffold that:
- Has the project structure, routing, and component folders in place
- Has TypeScript types matching the full registry schema
- Has an API client wired up to the backend
- Renders a minimal placeholder homepage (not the full UI — that's Cycle B)

A launchd service plist so the server runs on boot.

---

## Success Criteria

- `npm start` from `projects/media-assets/` starts the server on port 3001
- `GET /api/assets` returns paginated records from `database/posts-migrated.jsonl` and `database/videos.jsonl`
- `GET /api/assets?type=video` filters to only video records
- `GET /api/assets?q=swamp` returns records matching "swamp" in text/summary/filename
- `GET /api/assets?tags=humor,lore` returns records with both tags (AND logic)
- `GET /api/assets/:id` returns a single record by ID
- `PATCH /api/assets/:id` updates tags/alt_text/visual_summary and writes back to the correct JSONL file
- `GET /api/nfts` returns paginated NFT records from `database/nfts.jsonl`
- `GET /api/nfts?trait_Skin=Lava` filters NFTs by trait value
- `GET /api/nfts/traits` returns all trait types with unique values and counts
- `GET /api/tags` returns all taxonomy tags from `TAXONOMY.md` with usage counts
- `POST /api/export` accepts filter params and returns a downloadable JSON file
- `GET /api/status` returns server health + counts per registry file
- Frontend dev server (`npm run dev` in `ui/`) starts on port 5173 and proxies API to 3001
- TypeScript compiles without errors
- `com.tokengators.gatorpedia.plist` is present and documented

---

## Out of Scope (Cycle B)

- Full UI components (browse grid, asset detail, NFT explorer, review queue)
- Any UI beyond a placeholder homepage
- Video thumbnail generation

---

## File Layout

```
projects/media-assets/
  src/                          ← Express backend
    server.js                   ← Entry point, mounts routes, serves static
    registry.js                 ← JSONL loader, in-memory store, write-back
    taxonomy.js                 ← TAXONOMY.md parser
    routes/
      assets.js                 ← GET /api/assets, GET /api/assets/:id, PATCH
      nfts.js                   ← GET /api/nfts, GET /api/nfts/:id, GET /api/nfts/traits
      tags.js                   ← GET /api/tags
      export.js                 ← POST /api/export
      status.js                 ← GET /api/status
  ui/                           ← Vite + React + TypeScript frontend
    src/
      components/               ← Empty, ready for Cycle B
      hooks/                    ← Empty, ready for Cycle B
      lib/
        api.ts                  ← Typed API client (fetch wrapper)
        types.ts                ← TypeScript types for all registry schemas
      App.tsx                   ← Router + layout shell + placeholder home
      main.tsx
    index.html
    vite.config.ts              ← Proxy /api → localhost:3001
    tailwind.config.ts
    tsconfig.json
    package.json
  launchd/
    com.tokengators.gatorpedia.plist   ← launchd service config
  package.json                  ← Backend deps
  .gitignore                    ← node_modules, dist, .venv
```

---

## Key Implementation Notes

### registry.js

- On startup: read all JSONL files in `database/` into a `Map<id, record>` keyed by asset ID
- Track which file each record came from (for write-back)
- Watch JSONL files with `fs.watch` — reload on change
- Write-back: write to `.tmp` file first, then `fs.rename` for atomicity
- Expose: `getAll()`, `getById(id)`, `patch(id, fields)`, `getByType(type)`, `search(q)`, `filterByTags(tags, op)`

### Query params for GET /api/assets

| Param | Behavior |
|-------|----------|
| `type` | Exact match on `record.type` |
| `tags` | Comma-separated; AND by default; `tag_op=or` for OR |
| `q` | Case-insensitive substring match across: `text`, `visual_summary`, `transcript`, `filename`, `alt_text`, `name` |
| `flagged` | `ai` = flagged_by=ai, `human` = flagged_by=human, `untagged` = tags is empty |
| `page` | 1-indexed, 50 records per page |
| `per_page` | Override page size (max 200) |
| `sort` | `created_at` (default desc), `id`, `likes` |

### PATCH /api/assets/:id

Accepts a JSON body with any subset of editable fields:
```json
{
  "tags": ["humor", "lore"],
  "alt_text": "A gator wearing a foam hat",
  "visual_summary": "Updated summary...",
  "linked_assets": ["tweet-123", "video-abc"],
  "featured_gators": ["gator-nft-42"],
  "flagged_by": "human",
  "flagged_at": "2026-04-04T00:00:00Z"
}
```

Non-editable fields in the body must be ignored silently (do not error, do not write).

### taxonomy.js

- Parse `TAXONOMY.md` → extract all tags by tier
- Expose: `getAllTags()`, `getTagsByTier(tier)`, `isValidTag(tag)`
- Used by the tags route and for tag validation on PATCH

### launchd plist

```xml
<!-- com.tokengators.gatorpedia.plist -->
<!-- Install: cp launchd/com.tokengators.gatorpedia.plist ~/Library/LaunchAgents/ -->
<!-- Load: launchctl load ~/Library/LaunchAgents/com.tokengators.gatorpedia.plist -->
```

- `WorkingDirectory`: absolute path to `projects/media-assets/`
- `ProgramArguments`: `node src/server.js`
- `EnvironmentVariables`: `NODE_ENV=production`, `PORT=3001`
- `RunAtLoad`: true
- `KeepAlive`: true
- `StandardOutPath` / `StandardErrorPath`: `~/Library/Logs/gatorpedia.log`

### TypeScript types (ui/src/lib/types.ts)

Must exactly match the registry schema from the PRD. Key interfaces:

```typescript
interface BaseAsset {
  id: string;
  type: AssetType;
  created_at: string;
  source_url: string;
  tags: string[];
  collections: string[];
  flagged_by: 'human' | 'ai' | null;
  flagged_at: string | null;
  linked_assets: string[];
  metadata: Record<string, unknown>;
}

type AssetType = 'tweet' | 'video' | 'image' | 'gif' | 'article' | 'audio' | 'gator-nft';

interface TweetAsset extends BaseAsset { type: 'tweet'; text: string; platform_post_id: string; author_handle: string; stats: TweetStats; hashtags: string[]; mentions: string[]; media_urls: string[]; post_type: 'original' | 'retweet' | 'reply'; }

interface VideoAsset extends BaseAsset { type: 'video'; filename: string; duration_seconds: number; resolution: string; transcript: string; visual_summary: string; tone_and_energy: string; brand_signals: BrandSignals; memorable_moments: Moment[]; aesthetic_notes: AestheticNotes; platform_tags: string[]; featured_gators: string[]; }

interface GatorNFT extends BaseAsset { type: 'gator-nft'; token_id: number; name: string; ipfs_metadata_uri: string; ipfs_image_uri: string; gateway_image_url: string; traits: Trait[]; rarity_rank: number | null; gator_appearances: string[]; }

// ... ImageAsset, GifAsset, ArticleAsset, AudioAsset
```

Also define response envelope types:
```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
```
