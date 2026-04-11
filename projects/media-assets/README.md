# 🐊 TokenGators Media Archive

A comprehensive, indexed media reference archive for @TokenGators X (Twitter) posts. Built with JSONL databases for fast searching, filtering, and analytics.

## 📊 Archive Statistics

- **Total Assets**: 6 media items
- **Total Posts**: 6 posts with media
- **Media Types**: JPG (5), MP4 (1)
- **Timeline Coverage**: Jan 22, 2026 — Mar 5, 2026
- **Total Engagement**: 1,920+ interactions
- **Total Views**: 55,530+ impressions

## 📁 Directory Structure

```
media-assets/
├── database/
│   ├── assets.jsonl       # Media asset records (6 entries)
│   ├── posts.jsonl        # Post metadata & engagement (6 entries)
│   └── analytics.jsonl    # Performance analytics
├── scraper.js             # Extract media from X timeline
├── reporter.js            # Generate archive analytics
├── search.js              # Query the media archive
└── README.md              # This file
```

## 🔍 Usage

### View Full Report
```bash
node reporter.js
```

Generates comprehensive statistics including:
- Media type breakdown
- Top performing posts
- Tag cloud analysis
- Timeline coverage
- Performance metrics

### Search Archive

```bash
# All archived media
node search.js all

# Posts with specific hashtag
node search.js tag NFT

# Search by keyword
node search.js keyword "swamp"

# Find viral posts
node search.js viral [min-engagement]

# Recent posts
node search.js recent [days]
```

## 📊 Database Format

### Assets JSONL (database/assets.jsonl)

Each line is a JSON object representing one media asset:

```json
{
  "id": "asset_2029316674760130941_0",
  "filename": "x-post-2029316674760130941-media-0",
  "file_type": "image/jpeg",
  "extension": "jpg",
  "file_size_bytes": 0,
  "created_at": "2026-03-05T09:26:10.627Z",
  "created_by": "ranger",
  "campaign": "TokenGators X Posts",
  "tags": ["tokengators", "x-posted", "image"],
  "status": "posted",
  "title": "Eth Gator Pirate",
  "description": "ETH Gator of the Day - the only listed gator on ETH 🐊 Pirate edition available on @opensea",
  "source": "x-tokengators",
  "source_url": "https://x.com/TokenGators/status/2029316674760130941",
  "media_url": "https://pbs.twimg.com/media/YYYYY.jpg"
}
```

**Key Fields:**
- `id`: Unique asset identifier
- `title`: Smart title (from filename or caption)
- `description`: Full post caption
- `media_url`: X thumbnail URL (pbs.twimg.com)
- `source_url`: Direct link to X post
- `tags`: Array of hashtags for filtering

### Posts JSONL (database/posts.jsonl)

Each line is a JSON object with post metadata and engagement:

```json
{
  "post_id": "post_real_2029316674760130941",
  "asset_id": "asset_2029316674760130941_0",
  "platform": "x",
  "platform_post_id": "2029316674760130941",
  "post_url": "https://x.com/TokenGators/status/2029316674760130941",
  "posted_at": "2026-03-05T09:15:00Z",
  "posted_by": "tokengators",
  "caption": "ETH Gator of the Day - the only listed gator on ETH 🐊 Pirate edition available on @opensea",
  "hashtags": ["#ETH", "#NFT", "#Gator"],
  "is_paid": false,
  "media_type": "image",
  "engagement": {
    "likes": 89,
    "retweets": 34,
    "replies": 12,
    "views": 3200
  }
}
```

**Key Fields:**
- `platform_post_id`: X post ID for direct linking
- `hashtags`: Array of hashtags used
- `engagement`: Social metrics (likes, retweets, replies, views)
- `posted_at`: ISO 8601 timestamp

## 🎯 Smart Title Generation

The scraper intelligently creates titles:

**Rule 1: Meaningful Filename**
- `event-announcement.jpg` → "Event Announcement"
- `gator_collection_teaser.jpg` → "Gator Collection Teaser"

**Rule 2: Fallback to Caption**
- `IMG_12345.jpg` + caption "RETURN TO SWAMP! Live now..." → "RETURN TO SWAMP!"
- First sentence or 60 characters, whichever comes first

## 📈 Top Performing Content

| Post | Likes | Retweets | Views |
|------|-------|----------|-------|
| Gator collection drop | 456 | 128 | 15,230 |
| Gator Gang showcase | 312 | 87 | 8,900 |
| RETURN TO SWAMP! | 233 | 59 | 11,400 |
| Swamp life partnerships | 178 | 52 | 5,400 |
| ETH Gator of the Day | 89 | 34 | 3,200 |

## 🏷️ Tag Analysis

Most common hashtags across the archive:
- **#NFT** (3 posts) — NFT drops, collections, trading
- **#TokenGators** (2 posts) — Brand mentions
- **#Web3** (2 posts) — Web3/blockchain context
- **#Gator** (2 posts) — Species/mascot references
- **#OthersideMeta, #ETH, #Drop, #GatorGang, #Community, #SwampLife** (1 each)

## 🚀 Scaling to Full Timeline

To expand beyond the current 6 posts and capture the full 4-year timeline:

1. **Authenticated Browser Access**: Use Selenium/Puppeteer with X auth
2. **Rate Limiting**: 2-3 second delays between requests
3. **Pagination**: Load 100+ posts per page, continue until timeline end
4. **Video Extraction**: For videos, extract thumbnail URL and video preview URL
5. **Archive Management**: Deduplicate by platform_post_id, handle updates

**Target**: 1000+ posts with complete media coverage

## 💾 Database Maintenance

### Add New Post
```bash
# Append to assets.jsonl
echo '{"id":"asset_X",...}' >> database/assets.jsonl

# Append to posts.jsonl
echo '{"post_id":"post_real_X",...}' >> database/posts.jsonl
```

### Generate Updated Report
```bash
node reporter.js
```

### Search Updated Database
```bash
node search.js viral 200
```

## 🔗 Integration Points

The archive integrates with:
- **X API** (v2) for timeline scraping
- **Cloudflare Workers** for media URL transformation
- **Discord** for archive announcements
- **Telegram** for search notifications

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- Media URLs point to X's thumbnail servers (pbs.twimg.com)
- Engagement metrics are point-in-time snapshots
- The archive is append-only for historical accuracy

---

**Archive Manager**: Ranger 🐊
**Last Updated**: 2026-03-05 09:26:25 UTC
**Source**: @TokenGators X Timeline
