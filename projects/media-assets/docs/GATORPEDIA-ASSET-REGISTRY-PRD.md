# Gatorpedia Asset Registry & Tagging System — PRD

**Version:** 1.3  
**Date:** 2026-04-03  
**Status:** Draft  

---

## Overview

Gatorpedia (`media-assets`) is the canonical media asset repository and UI for TokenGators. It currently houses scraped X/Twitter post data and provides a front-end to browse assets. This PRD defines the evolution of Gatorpedia into a fully-tagged, multi-asset-type registry that supports filtering, collection building, and AI-powered downstream workflows.

---

## Problem Statement

TokenGators produces content across multiple formats — tweets, videos, images, GIFs, articles, and audio. These assets currently live in disconnected systems with no unified metadata layer. As a result:

- There is no way to filter assets by topic, campaign, or content type across formats
- AI workflows have no clean, scoped input (e.g. "give me everything about wearables")
- The video analysis and tweet archive are separate outputs with no linking
- Obsidian and Gatorpedia have no shared source — knowledge is duplicated or lost
- The NFT collection metadata lives on IPFS and is not ingested into the registry — there is no way to track which gators appear in which content

---

## Goals

1. **Unified asset registry** — every asset type (tweet, video, image, GIF, article, audio, NFT) lives in one consistent schema
2. **Tag-based filtering** — assets are tagged from a controlled taxonomy; the Gatorpedia UI can filter by any tag or combination
3. **Cross-asset linking** — a tweet can reference the video it promoted; a video links to the post that announced it; content can reference which NFT gators appear in it
4. **AI-ready scoping** — any filtered asset set can be passed to an AI job as clean context
5. **Obsidian export** — the registry generates Obsidian notes automatically; Obsidian is a read layer, not the source
6. **Controlled tag growth** — a human-maintained taxonomy file prevents tag sprawl

---

## Non-Goals

- This is not a replacement for the Gatorpedia UI front-end (that's a separate project)
- This is not a content management system for creating new assets
- Obsidian is not the source of truth — it is downstream of the registry

---

## Asset Data Model

Every asset in the registry shares a common base schema, extended by type-specific fields.

### Base Schema (all asset types)

```json
{
  "id": "string (unique, slug format: type-platform_post_id or type-filename)",
  "type": "tweet | video | image | gif | article | audio | gator-nft",
  "created_at": "ISO 8601 datetime",
  "source_url": "string (original URL)",
  "tags": ["string"],
  "collections": [],
  "flagged_by": "human | ai",
  "flagged_at": "ISO 8601 datetime",
  "linked_assets": ["asset_id"],
  "metadata": {}
}
```

### Type-Specific Extensions

**Tweet**
```json
{
  "text": "string",
  "platform_post_id": "string",
  "author_handle": "string",
  "stats": {
    "likes": 0,
    "retweets": 0,
    "replies": 0,
    "impressions": 0
  },
  "hashtags": [],
  "mentions": [],
  "media_urls": [],
  "post_type": "original | retweet | reply"
}
```

**Video**
```json
{
  "filename": "string",
  "duration_seconds": 0,
  "resolution": "string",
  "tools_used": [],
  "transcript": "string",
  "visual_summary": "string",
  "tone_and_energy": "string",
  "brand_signals": {
    "values": [],
    "themes": [],
    "language_patterns": []
  },
  "memorable_moments": [
    { "timestamp": "string", "description": "string" }
  ],
  "aesthetic_notes": {
    "color_palette": "string",
    "editing_style": "string",
    "production_quality": "string",
    "music_or_sound": "string"
  },
  "platform_tags": ["string"],
  "featured_gators": ["gator_id (e.g. gator-nft-42)"]
}
```

> **`platform_tags`**: Descriptive language preserved from the AI video analysis (e.g. `brand_lore_tags` from `brand_lore_ready.json`). These are platform-style tags suitable for YouTube, Giphy, or Tenor uploads. They are **not** drawn from TAXONOMY.md and are **never** used in the registry `tags[]` field. They live alongside the record for export/reference only.
```

**Image**
```json
{
  "filename": "string",
  "dimensions": "string",
  "format": "jpg | png | gif | webp",
  "alt_text": "string",
  "visual_summary": "string",
  "featured_gators": ["gator_id (e.g. gator-nft-42)"]
}
```

**Article**
```json
{
  "title": "string",
  "author": "string",
  "publication": "string",
  "summary": "string",
  "full_text": "string"
}
```

**Gator NFT**
```json
{
  "token_id": "integer",
  "name": "string (e.g. TokenGator #42)",
  "ipfs_metadata_uri": "string (ipfs://...)",
  "ipfs_image_uri": "string (ipfs://...)",
  "gateway_image_url": "string (https://... cached CDN URL)",
  "traits": [
    { "trait_type": "string", "value": "string" }
  ],
  "rarity_rank": "integer | null",
  "gator_appearances": ["asset_id"]
}
```

> **`featured_gators`** (on Video/Image/GIF): array of `gator-nft-{token_id}` asset IDs — the NFT gators visually present in this piece of content.  
> **`gator_appearances`** (on Gator NFT): reverse index — array of asset IDs where this gator has been spotted. These two fields form a bidirectional lookup.

---

## Tag Taxonomy v1.0

Tags are flat, lowercase, hyphenated. Assets can have multiple tags. All AI tagging must draw from this list. New tags require human approval before use.

The taxonomy file lives at: `projects/media-assets/TAXONOMY.md`

### Tier 1 — Content Format
*(Usually set automatically by asset type, not manually)*
- `tweet`
- `video`
- `image`
- `gif`
- `article`
- `audio`

### Tier 2 — Product / Topic
*What is this asset about?*

| Tag | Description |
|-----|-------------|
| `wearables` | Clothing, fashion drops, merch |
| `lore` | Narrative, world-building, story content |
| `canon` | Canon story content |
| `characters` | Specific gator characters, personality content |
| `community` | GM/GN posts, fan engagement, community moments |
| `partnerships` | Collabs with other brands or projects |
| `announcements` | Drops, launches, product reveals |
| `nft` | NFT-specific content |
| `token` | $TG token, crypto/DeFi content |
| `otherside` | Otherside/metaverse content |
| `SuperTripLand` | SuperTripLand content |
| `Geez` | Geez content |
| `collab` | Collaboration content |
| `humor` | Memes, jokes, comedy content |
| `meme` | Memes or content based on memes |
| `foam-hat` | Content featuring foam gator hats |
| `satire` | Parody, mock-ads (FOAM-O, Kal-Buck, etc.) |
| `brand-campaigns` | Named campaign content |
| `foam-o` | FOAM-O product universe |
| `gator-blaster` | Gator Blaster 67 product universe |
| `pixel-pals` | Pixel Pals / Swap Shrinkers content |
| `delegators` | DeleGators / Spotlight voting content |
| `gtv` | GTV channel content |
| `art` | Digital art, NFT artwork showcases |
| `nft-collection` | Content about the NFT collection itself |
| `gator-character` | Content featuring a specific named/numbered gator |
| `music` | Death Roll band, music content |
| `gaming` | Game-related content, Super Trip, etc. |
| `education` | Informational, how-to content |
| `behind-the-scenes` | Production content, making-of |

### Tier 3 — Campaign / Season
*Time-bounded campaigns and drops*

| Tag | Description |
|-----|-------------|
| `spring-2026` | Spring 2026 season |
| `halloween-2024` | Halloween 2024 campaign |
| `return-to-swamp` | Return to Swamp launch |
| `launch` | NFT Collection launch |
| `humor` | Memes, jokes, comedy content |
| `spotlight-s2` | Spotlight Season 2 |
| `fourth-of-july` | Independence Day content |
| `mothers-day` | Mother's Day content |
| `christmas` | Christmas / holiday content |

### Tier 4 — Tone / Classification
*How the content communicates — also used by the brand analysis classifier*

| Tag | Description |
|-----|-------------|
| `lore-storytelling` | High narrative/character value |
| `product-gameday` | Product or event promotion |
| `allowlists` | Promos, allowlists, generic drops (low signal) |
| `cinematic` | High production value visual content |
| `playful` | Light, fun, casual |
| `confident` | Bold, declarative, power content |
| `authentic` | Raw, unfiltered, community-feel |
| `viral-potential` | High engagement, shareable |

---

## NFT Collection Ingestion

The TokenGators NFT collection metadata lives on IPFS. Ingesting it populates the `gator-nft` asset type and enables the `featured_gators` / `gator_appearances` bidirectional lookup.

### Collection Metadata Structure (IPFS)

Each token has a metadata JSON at a known IPFS CID path:
```
ipfs://<collection-cid>/<token_id>.json
```
Which resolves to something like:
```json
{
  "name": "TokenGator #42",
  "image": "ipfs://<image-cid>/42.png",
  "attributes": [
    { "trait_type": "Background", "value": "Swamp Green" },
    { "trait_type": "Eyes", "value": "Laser" }
  ]
}
```

### Ingestion Script (`ingest-nft-collection.py`)

1. Fetch collection size / total supply from contract or known count
2. For each token ID, fetch `ipfs://<collection-cid>/<id>.json` via IPFS gateway (e.g. `https://ipfs.io/ipfs/...` or Pinata)
3. Parse `name`, `image`, `attributes` → map to `gator-nft` schema
4. Write each token as an entry in the registry (`database/nfts.jsonl`)
5. Cache gateway image URLs to avoid repeated IPFS fetches

**Prerequisites needed:**
- Collection base CID (needs to be provided)
- Total supply count
- Preferred IPFS gateway

### Linking Gators to Content (Manual First Pass)

With only 61 videos, a human-in-the-loop first pass is practical:
1. Run ingestion to populate `nfts.jsonl`
2. For each video with a visual summary, prompt AI: "Which numbered gators from the NFT collection appear in this content?"
3. AI suggests `token_id`s → human audits and confirms
4. Write confirmed IDs to `featured_gators[]` on the asset and `gator_appearances[]` on the NFT record

---

## Linking Model

Assets reference each other via `linked_assets` — an array of asset IDs.

**Example:**
```json
{
  "id": "tweet-2014411651479691525",
  "type": "tweet",
  "text": "RETURN TO SWAMP! Live now in @OthersideMeta",
  "tags": ["gameday", "otherside", "announcements", "return-to-swamp"],
  "linked_assets": ["video-ReturnToSwamp4K"]
}
```

```json
{
  "id": "video-ReturnToSwamp4K",
  "type": "video",
  "filename": "ReturnToSwamp4K.mp4",
  "tags": ["gameday", "otherside", "cinematic", "lore-storytelling", "return-to-swamp"],
  "linked_assets": ["tweet-2014411651479691525"]
}
```

---

## AI Tagging Workflow

### Backfill pass (one-time)
1. Load `TAXONOMY.md` as context
2. For each asset, assign 2–5 tags from Tier 2–4 only
3. For videos: use `transcript`, `visual_summary`, `tone_and_energy`, and `brand_signals` as context for tag selection — but map to TAXONOMY.md terms, not `platform_tags`
4. Assign as many tags as apply — no upper limit; quality and relevance over a fixed cap
5. Tone/voice tags (Tier 4) are applied but treated as provisional — patterns will emerge after first full pass and taxonomy can be refined based on results
6. Output: updated records with `tags[]` populated
7. Flag as `flagged_by: "ai"`

> **Note on video `platform_tags`:** The `brand_lore_tags` field from the original video analysis contains rich descriptive language (tones, moods, aesthetics). These are preserved as `platform_tags` on the video record and are intentionally excluded from the registry tag system. They serve a different purpose — platform uploads (YouTube, Giphy, Tenor) — and should not be used for registry filtering.

### New asset ingestion (ongoing)
1. Asset enters the registry
2. AI tagging job runs automatically, suggests tags from taxonomy
3. Tags are saved with `flagged_by: "ai"`
4. Human can review/approve in the Gatorpedia UI

### New tag proposal process
1. AI or human identifies a gap in the taxonomy
2. Proposed tag is added to a `TAXONOMY-PROPOSALS.md` file with justification
3. Human approves → moves to `TAXONOMY.md`
4. Approved tag becomes available for future tagging jobs

---

## Obsidian Export

A script (`export-to-obsidian.py`) generates Obsidian-compatible markdown notes from the registry:

- One note per asset
- Organized into folders by type: `Vault/Assets/Tweets/`, `Vault/Assets/Videos/`, etc.
- Tags rendered as Obsidian `#tags`
- Linked assets rendered as `[[wikilinks]]`
- Script is run on-demand or via cron — Obsidian is always downstream, never the source

---

## Gatorpedia UI Requirements

The front-end should support:

- **Browse all assets** with type filter (tweet / video / image / etc.)
- **Tag filter** — single or multi-tag, AND/OR logic
- **Free text search** across captions, transcripts, summaries
- **Asset detail view** — full metadata, linked assets, tag editor
- **Tag editor** — human can add/remove tags on any asset
- **AI suggest tags** button — runs the tagger on a single asset on demand
- **Export filtered set** — download as JSON for AI job input

---

## Phased Rollout

### Phase 1 — Registry Foundation
- [ ] Finalize unified schema (including `gator-nft` type) ✅ done in this PRD
- [ ] Write `TAXONOMY.md` with v1.0 tag list
- [ ] Run `ingest-nft-collection.py` → populate `database/nfts.jsonl` (script ready, local JSON files at `/Users/operator/Media/Ethereum/`)
- [ ] Write `migrate-videos.py` → read individual analysis JSONs from `/Users/operator/Media/media-processor/analysis/`, output `database/videos.jsonl`
- [ ] Write `migrate-posts.py` → migrate `posts.jsonl` to unified base schema
- [ ] Write `ingest-memes.py` → pull Supabase public bucket manifest → `database/memes.jsonl`
- [ ] Rename `media-assets` → `gatorpedia` (path audit + update all references)

### Phase 2 — AI Tagging Backfill
- [ ] Tag all videos: use per-video analysis JSON as context, assign TAXONOMY.md tags, preserve `brand_lore_tags` as `platform_tags`
- [ ] Tag all tweets: backfill `tags[]` from taxonomy using post text, hashtags, and media context
- [ ] Review Tier 4 (tone/voice) tag patterns after first full pass — refine taxonomy based on what emerges
- [ ] Link tweets to videos: auto first pass by date proximity + shared hashtags, human audit
- [ ] Flag all AI-tagged assets for human review queue
- [ ] AI-assisted `featured_gators` pass on 61 videos → human audit
- [ ] Build reverse index: populate `gator_appearances[]` on each NFT record

### Phase 3 — Google Drive Integration
- [ ] Install Google Drive Desktop on Mac Mini
- [ ] Scope sync to specific TokenGators media folders only
- [ ] `chmod -R a-w` on all read-only folders
- [ ] Write `build-drive-manifest.py` → walk mounted Drive folders, output `database/drive-manifest.jsonl`
- [ ] Plan tweet-to-image/GIF linking once Drive manifest exists

### Phase 4 — Obsidian Pipeline
- [ ] Write `export-to-obsidian.py` — one MD note per asset, organized by type
- [ ] Vault consolidation: Obsidian folder = read-only MD export; registry = canonical source
- [ ] Set up on-demand or scheduled export

### Phase 5 — UI Enhancements
- [ ] Add tag filter to Gatorpedia front-end
- [ ] Add tag editor on asset detail view
- [ ] Add export filtered set feature (JSON download for AI job input)

### Phase 6 — AI Job Integration
- [ ] Define interface for AI jobs to receive filtered asset sets
- [ ] First job: generate catalog PDF from tagged collection
- [ ] Second job: brand voice report from filtered tweets

---

## Open Questions

1. **Rename `media-assets` to `gatorpedia`?** — ✅ Agreed, needs path audit first before executing
2. **Vault consolidation** — ✅ Resolved: registry is canonical source; Obsidian folder = downstream read-only MD export
3. **Tweet-to-video linking** — ✅ Auto first pass (date proximity + shared hashtags) on 61 videos, human audit after; images/GIFs on Google Drive TBD (need access/ingestion plan)
4. **Tag approval workflow** — ✅ PR to `TAXONOMY.md` is sufficient for now; no UI needed
5. **Image tagging** — ✅ Resolved: temp images were deleted; no vision pass needed
6. **NFT collection base CID** — ✅ Not needed; local JSON files at `/Users/operator/Media/Ethereum/` are the source; Pinata CDN URLs embedded in each file
7. **Google Drive media ingestion** — ⏳ Images and GIFs live in a Google Drive folder; need an access/export plan before tweet-to-image linking is possible

---

## Registry Layout & Ingestion Map

A reference map of all data sources, ingestion scripts, and where processed data lands.

```
INGEST SOURCE                    SCRIPT                           REGISTRY LOCATION
─────────────────────────────────────────────────────────────────────────────────

X/Twitter archive          (already ingested)               database/posts.jsonl
  └─ 3,381 tweets                                           Raw tweet schema —
     with media URLs,       scripts/migrate-posts.py        needs migration to
     stats, hashtags        (not yet written)               unified base schema

NFT collection             scripts/ingest-nft-              database/nfts.jsonl
  └─ /Users/operator/      collection.py ✅ ready           gator-nft schema,
     Media/Ethereum/                                        4,000 records,
     {id}.json                                             Pinata image URLs

Video analysis             scripts/migrate-videos.py        database/videos.jsonl
  └─ Individual JSON files  (not yet written)               Unified video schema
     per video (61 total)                                  brand_lore_tags →
     /Users/operator/Media/                                platform_tags field
     media-processor/                                      taxonomy tags via AI
     analysis/{name}.json

Memes / GIFs               scripts/ingest-memes.py          database/memes.jsonl
  └─ Supabase public        (not yet written)               image/gif schema,
     storage bucket                                         Supabase CDN URLs
     (public, no auth)                                     (xohizqpolnhemdvjvgro
                                                            .supabase.co/...)

Google Drive media         TBD — mount via                  database/drive-
  └─ images, videos,       Google Drive Desktop             manifest.jsonl
     docs (~200GB)          chmod -R a-w for safety         Metadata + URLs only
                            scripts/build-drive-            No local file copies
                            manifest.py (TBD)
```

**Project directory structure:**
```
projects/media-assets/
  database/
    posts.jsonl          ← tweets (exists, needs schema migration)
    nfts.jsonl           ← NFT collection (ready to generate)
    videos.jsonl         ← video analysis (needs migration)
    memes.jsonl          ← memes/GIFs (needs ingest script)
    assets.jsonl         ← other media (exists, purpose TBD)
  scripts/
    ingest-nft-collection.py    ✅ written
    ingest-memes.py             ⬜ not yet written
    migrate-posts.py            ⬜ not yet written
    migrate-videos.py           ⬜ not yet written
    build-drive-manifest.py     ⬜ not yet written
  docs/
    GATORPEDIA-ASSET-REGISTRY-PRD.md   ✅ this file
  TAXONOMY.md                          ⬜ needs writing

Downstream (read-only export):
  /Users/operator/Vault/   ← Obsidian export only, never source of truth
```

---

## Appendix: Current File Locations

| Asset | Location |
|-------|----------|
| Tweet data | `projects/media-assets/database/posts.jsonl` |
| Media assets | `projects/media-assets/database/assets.jsonl` |
| Video analysis | `/Users/operator/Media/media-processor/brand_lore_ready.json` |
| NFT collection | `projects/media-assets/database/nfts.jsonl` (to be created via ingestion) |
| Video files | `/Users/operator/Media/media-processor/*.mp4` |
| Obsidian vault | `/Users/operator/Vault` |
| Vault skill | `~/.openclaw/workspace/skills/vault/` |
| Vault project | `projects/the-vault/` |
