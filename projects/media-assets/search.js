#!/usr/bin/env node

/**
 * TokenGators Media Archive Search
 * Query the media asset database by various criteria
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function readJsonlFile(filePath) {
  const records = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        records.push(JSON.parse(line));
      } catch (e) {}
    }
  }

  return records;
}

function searchByTag(posts, tag) {
  return posts.filter(post => 
    post.hashtags.some(h => h.toLowerCase().includes(tag.toLowerCase()))
  );
}

function searchByKeyword(assets, keyword) {
  const kw = keyword.toLowerCase();
  return assets.filter(asset =>
    asset.title.toLowerCase().includes(kw) ||
    asset.description.toLowerCase().includes(kw)
  );
}

function searchByDateRange(posts, startDate, endDate) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  return posts.filter(post => {
    const postDate = new Date(post.posted_at).getTime();
    return postDate >= start && postDate <= end;
  });
}

function searchByEngagement(posts, minLikes = 0, minRetweets = 0) {
  return posts.filter(post =>
    post.engagement.likes >= minLikes &&
    post.engagement.retweets >= minRetweets
  );
}

function displayAsset(asset, post) {
  console.log(`\n📍 ${asset.title}`);
  console.log(`   ID: ${asset.id}`);
  console.log(`   Caption: ${asset.description}`);
  console.log(`   Media URL: ${asset.media_url}`);
  console.log(`   Type: ${asset.file_type}`);
  console.log(`   Posted: ${post.posted_at}`);
  if (post.engagement) {
    console.log(`   Engagement: ❤️ ${post.engagement.likes} 🔄 ${post.engagement.retweets} 💬 ${post.engagement.replies}`);
    console.log(`   Views: 👁️ ${post.engagement.views.toLocaleString()}`);
  }
  console.log(`   Tags: ${post.hashtags.join(', ')}`);
  console.log(`   Link: ${post.post_url}`);
}

async function runSearch() {
  const assetsPath = path.join(__dirname, 'database', 'assets.jsonl');
  const postsPath = path.join(__dirname, 'database', 'posts.jsonl');

  const assets = await readJsonlFile(assetsPath);
  const posts = await readJsonlFile(postsPath);

  const args = process.argv.slice(2);
  const command = args[0];

  console.log('\n🔍 TokenGators Media Archive Search\n');

  if (!command || command === 'help') {
    console.log(`Usage: node search.js <command> [options]\n`);
    console.log(`Commands:`);
    console.log(`  tag <hashtag>          - Search by hashtag (e.g., #NFT)`);
    console.log(`  keyword <text>         - Search by keyword in title/description`);
    console.log(`  viral [min-engagement] - Find viral posts (default 500+ engagement)`);
    console.log(`  recent [days]          - Recent posts (default: 7 days)`);
    console.log(`  all                    - List all archived media\n`);
    process.exit(0);
  }

  let results = [];
  let resultPosts = [];

  if (command === 'all') {
    results = assets;
    resultPosts = posts;
    console.log(`📦 All ${results.length} assets:\n`);

  } else if (command === 'tag') {
    const tag = args[1] || 'NFT';
    resultPosts = searchByTag(posts, tag);
    const postIds = new Set(resultPosts.map(p => p.platform_post_id));
    results = assets.filter(a => postIds.has(a.source_url.split('/').pop()));
    console.log(`🏷️  Posts tagged ${tag} (${resultPosts.length} found):\n`);

  } else if (command === 'keyword') {
    const keyword = args[1];
    if (!keyword) {
      console.log('❌ Please provide a keyword');
      process.exit(1);
    }
    results = searchByKeyword(assets, keyword);
    resultPosts = posts.filter(p => 
      results.some(a => p.asset_id === a.id)
    );
    console.log(`🔎 Keyword "${keyword}" (${results.length} found):\n`);

  } else if (command === 'viral') {
    const minEng = parseInt(args[1]) || 500;
    resultPosts = searchByEngagement(posts, minEng);
    const postIds = new Set(resultPosts.map(p => p.platform_post_id));
    results = assets.filter(a => postIds.has(a.source_url.split('/').pop()));
    console.log(`🔥 Viral posts (${minEng}+ engagement): ${resultPosts.length}\n`);

  } else if (command === 'recent') {
    const days = parseInt(args[1]) || 7;
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    resultPosts = searchByDateRange(posts, start, end);
    const postIds = new Set(resultPosts.map(p => p.platform_post_id));
    results = assets.filter(a => postIds.has(a.source_url.split('/').pop()));
    console.log(`📅 Last ${days} days: ${resultPosts.length} posts\n`);

  } else {
    console.log(`❌ Unknown command: ${command}`);
    process.exit(1);
  }

  // Display results
  if (results.length === 0) {
    console.log('No results found.');
  } else {
    results.forEach(asset => {
      const post = posts.find(p => p.asset_id === asset.id);
      displayAsset(asset, post);
    });
  }

  console.log(`\n✅ ${results.length} results\n`);
}

runSearch().catch(console.error);
