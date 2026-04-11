# Media Asset Schema

## asset_record
```json
{
  "id": "asset_YYYYMMDD_NNNN",
  "filename": "gator-meme-001.jpg",
  "original_name": "IMG_3847.jpg",
  "file_type": "image/jpeg",
  "extension": "jpg",
  "file_size_bytes": 2847104,
  "dimensions": "1920x1080",
  "aspect_ratio": "16:9",
  "color_space": "sRGB",
  "duration_seconds": null,
  "frame_rate": null,
  "codec": null,
  "bit_rate": null,
  "created_at": "2026-03-01T14:30:00Z",
  "created_by": "mark",
  "modified_at": "2026-03-01T15:45:00Z",
  "campaign": "March Meme Drop",
  "tags": ["gator", "meme", "community", "march"],
  "status": "approved",
  "description": "Happy gator waving at camera",
  "source_file": "assets/raw/gator-meme-001.psd",
  "variations": [
    "assets/images/gator-meme-001-thumb.jpg",
    "assets/images/gator-meme-001-square.jpg"
  ],
  "checksum_md5": "a3f5c2...",
  "notes": "Approved by marketing team"
}
```

## post_record
```json
{
  "post_id": "post_YYYYMMDD_NNNN",
  "asset_id": "asset_20260301_0001",
  "platform": "x",
  "platform_post_id": "1234567890",
  "post_url": "https://x.com/tokengators/status/1234567890",
  "posted_at": "2026-03-02T09:00:00Z",
  "posted_by": "ranger",
  "caption": "GM from the swamp! 🐊",
  "hashtags": ["#TokenGators", "#GatorGang", "#NFT"],
  "is_paid": false,
  "budget_usd": null,
  "target_audience": "community"
}
```

## analytics_record
```json
{
  "asset_id": "asset_20260301_0001",
  "post_id": "post_20260302_0001",
  "platform": "x",
  "collected_at": "2026-03-02T18:00:00Z",
  "impressions": 15420,
  "reach": 8200,
  "engagements": 843,
  "likes": 542,
  "reposts": 89,
  "quotes": 12,
  "replies": 45,
  "bookmarks": 155,
  "clicks": 67,
  "ctr_percent": 0.43,
  "engagement_rate_percent": 5.46
}
```

## platform_enum
- `x` - X (Twitter)
- `instagram` - Instagram
- `instagram_reels` - Instagram Reels
- `instagram_stories` - Instagram Stories
- `tiktok` - TikTok
- `youtube` - YouTube
- `youtube_shorts` - YouTube Shorts
- `discord` - Discord
- `telegram` - Telegram
- `opensea` - OpenSea
- `magiceden` - Magic Eden
- `mintify` - Mintify
- `other` - Other platforms

## status_enum
- `draft` - In creation
- `review` - Pending approval
- `approved` - Approved, ready to post
- `scheduled` - Scheduled for posting
- `posted` - Live on platform(s)
- `archived` - No longer active
- `rejected` - Not approved

## file_type_enum
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `video/mp4`
- `video/quicktime` (mov)
- `video/webm`
- `audio/mpeg` (mp3)
- `audio/wav`
- `audio/aac`
- `application/photoshop` (psd)
- `application/x-after-effects` (aep)
