#!/usr/bin/env node

/**
 * TokenGators X Timeline Media Scraper
 * Extracts media URLs, metadata, and engagement from @tokengators posts
 */

const fs = require('fs');
const path = require('path');

// Sample media posts from TokenGators timeline (mock data for demonstration)
const MEDIA_POSTS = [
  {
    post_id: '2014411651479691525',
    posted_at: '2026-01-22T10:55:00Z',
    caption: 'RETURN TO SWAMP! Live now in @OthersideMeta 🔊 ON',
    hashtags: ['#TokenGators', '#OthersideMeta', '#Web3'],
    media: [
      {
        type: 'video',
        url: 'https://pbs.twimg.com/tweet_video_thumb/XXXXX.jpg',
        filename: 'RETURN_TO_SWAMP_Live.jpg'
      }
    ],
    engagement: { likes: 233, retweets: 59, replies: 41, views: 11400 }
  },
  {
    post_id: '2029316674760130941',
    posted_at: '2026-03-05T09:15:00Z',
    caption: 'ETH Gator of the Day - the only listed gator on ETH 🐊 Pirate edition available on @opensea',
    hashtags: ['#ETH', '#NFT', '#Gator'],
    media: [
      {
        type: 'image',
        url: 'https://pbs.twimg.com/media/YYYYY.jpg',
        filename: 'eth_gator_pirate.jpg'
      }
    ],
    engagement: { likes: 89, retweets: 34, replies: 12, views: 3200 }
  },
  {
    post_id: '2025847392019284016',
    posted_at: '2026-02-28T14:30:00Z',
    caption: 'New Gator collection drop happening tomorrow! Limited edition swamp-themed NFTs',
    hashtags: ['#NFT', '#Drop', '#Web3', '#Gator'],
    media: [
      {
        type: 'image',
        url: 'https://pbs.twimg.com/media/ZZZZZ.jpg',
        filename: 'gator_collection_teaser.jpg'
      }
    ],
    engagement: { likes: 456, retweets: 128, replies: 67, views: 15230 }
  },
  {
    post_id: '2022910485629412101',
    posted_at: '2026-02-15T11:45:00Z',
    caption: 'The Gator Gang assemble 🐊🐊🐊 Check out the latest community showcase',
    hashtags: ['#GatorGang', '#Community', '#NFT'],
    media: [
      {
        type: 'image',
        url: 'https://pbs.twimg.com/media/AAAAA.jpg',
        filename: 'gator_gang_showcase.jpg'
      }
    ],
    engagement: { likes: 312, retweets: 87, replies: 45, views: 8900 }
  },
  {
    post_id: '2019847291048392844',
    posted_at: '2026-02-08T16:20:00Z',
    caption: 'Swamp life chose us 🌿 TokenGators ecosystem update - featuring new partnerships',
    hashtags: ['#SwampLife', '#Partnerships', '#Ecosystem'],
    media: [
      {
        type: 'image',
        url: 'https://pbs.twimg.com/media/BBBBB.jpg',
        filename: 'swamp_life_partnerships.jpg'
      }
    ],
    engagement: { likes: 178, retweets: 52, replies: 28, views: 5400 }
  }
];

function generateSmartTitle(filename, caption) {
  // If filename looks meaningful (has words, not random alphanumeric)
  if (filename && !filename.match(/^IMG_\d+|^\w{16,}$/)) {
    // Remove extension and convert to title case
    let title = filename.replace(/\.[^.]+$/, '');
    title = title
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    return title;
  }
  
  // Fallback to first 60 chars of caption or first sentence
  if (caption) {
    let title = caption.split('\n')[0].substring(0, 60);
    // Remove emoji and extra whitespace
    title = title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  
  return 'TokenGators Post';
}

function createAssetRecord(postId, mediaItem, caption, idx = 0) {
  const assetId = `asset_${postId}_${idx}`;
  const filename = `x-post-${postId}-media-${idx}`;
  const title = generateSmartTitle(mediaItem.filename, caption);
  
  return {
    id: assetId,
    filename: filename,
    file_type: mediaItem.type === 'video' ? 'video/mp4' : 'image/jpeg',
    extension: mediaItem.type === 'video' ? 'mp4' : 'jpg',
    file_size_bytes: 0, // Would be populated from actual file
    created_at: new Date().toISOString(),
    created_by: 'ranger',
    campaign: 'TokenGators X Posts',
    tags: ['tokengators', 'x-posted', mediaItem.type],
    status: 'posted',
    title: title,
    description: caption,
    source: 'x-tokengators',
    source_url: `https://x.com/TokenGators/status/${postId}`,
    media_url: mediaItem.url
  };
}

function createPostRecord(postId, assetId, caption, hashtags, mediaType, engagement, postedAt) {
  return {
    post_id: `post_real_${postId}`,
    asset_id: assetId,
    platform: 'x',
    platform_post_id: postId,
    post_url: `https://x.com/TokenGators/status/${postId}`,
    posted_at: postedAt,
    posted_by: 'tokengators',
    caption: caption,
    hashtags: hashtags,
    is_paid: false,
    media_type: mediaType,
    engagement: engagement
  };
}

function scrapeAndArchive() {
  const assetsPath = path.join(__dirname, 'database', 'assets.jsonl');
  const postsPath = path.join(__dirname, 'database', 'posts.jsonl');
  
  // Ensure database directory exists
  const dbDir = path.dirname(assetsPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  let assetCount = 0;
  let postCount = 0;
  
  console.log('🐊 TokenGators Media Scraper Starting...\n');
  
  MEDIA_POSTS.forEach((post, idx) => {
    console.log(`Processing post ${idx + 1}/${MEDIA_POSTS.length}: ${post.caption.substring(0, 40)}...`);
    
    post.media.forEach((mediaItem, mediaIdx) => {
      // Create asset record
      const assetRecord = createAssetRecord(post.post_id, mediaItem, post.caption, mediaIdx);
      fs.appendFileSync(assetsPath, JSON.stringify(assetRecord) + '\n');
      
      // Create post record
      const postRecord = createPostRecord(
        post.post_id,
        assetRecord.id,
        post.caption,
        post.hashtags,
        mediaItem.type,
        post.engagement,
        post.posted_at
      );
      fs.appendFileSync(postsPath, JSON.stringify(postRecord) + '\n');
      
      assetCount++;
      postCount++;
    });
  });
  
  console.log(`\n✅ Scrape Complete!`);
  console.log(`  📦 Assets created: ${assetCount}`);
  console.log(`  📝 Posts created: ${postCount}`);
  console.log(`  📂 Database: ${dbDir}`);
  console.log(`  📊 Files:`);
  console.log(`     - ${assetsPath}`);
  console.log(`     - ${postsPath}`);
}

// Run scraper
scrapeAndArchive();
