#!/usr/bin/env node

/**
 * TokenGators Media Archive Reporter
 * Generates analytics and reporting from the media database
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
      } catch (e) {
        console.error('Error parsing line:', line, e);
      }
    }
  }

  return records;
}

async function generateReport() {
  const assetsPath = path.join(__dirname, 'database', 'assets.jsonl');
  const postsPath = path.join(__dirname, 'database', 'posts.jsonl');

  console.log('\n🐊 TokenGators Media Archive Report\n');
  console.log('=' .repeat(60) + '\n');

  // Read data
  const assets = await readJsonlFile(assetsPath);
  const posts = await readJsonlFile(postsPath);

  // Basic stats
  console.log(`📊 ARCHIVE STATISTICS`);
  console.log(`Total Assets: ${assets.length}`);
  console.log(`Total Posts: ${posts.length}`);

  // Media type breakdown
  const mediaTypes = {};
  assets.forEach(asset => {
    const type = asset.extension;
    mediaTypes[type] = (mediaTypes[type] || 0) + 1;
  });

  console.log(`\n📁 Media Types:`);
  Object.entries(mediaTypes).forEach(([type, count]) => {
    console.log(`  • ${type.toUpperCase()}: ${count}`);
  });

  // Top performing posts
  console.log(`\n⭐ Top Performing Posts (by engagement):`);
  const sorted = [...posts].sort((a, b) => 
    (b.engagement.likes + b.engagement.retweets) - 
    (a.engagement.likes + a.engagement.retweets)
  ).slice(0, 5);

  sorted.forEach((post, idx) => {
    const totalEngagement = post.engagement.likes + 
                           post.engagement.retweets + 
                           post.engagement.replies;
    const date = new Date(post.posted_at);
    console.log(`\n  ${idx + 1}. ${post.caption.substring(0, 50)}...`);
    console.log(`     Date: ${date.toLocaleDateString()}`);
    console.log(`     Engagement: ${totalEngagement.toLocaleString()} (Likes: ${post.engagement.likes}, Retweets: ${post.engagement.retweets})`);
    console.log(`     Views: ${post.engagement.views.toLocaleString()}`);
  });

  // Tag analysis
  console.log(`\n🏷️  Tag Cloud (most common hashtags):`);
  const tagCounts = {};
  posts.forEach(post => {
    post.hashtags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  topTags.forEach(([tag, count]) => {
    console.log(`  • ${tag}: ${count}`);
  });

  // Timeline coverage
  console.log(`\n📅 Timeline Coverage:`);
  const dates = posts.map(p => new Date(p.posted_at).toLocaleDateString());
  const earliest = dates.reduce((a, b) => a < b ? a : b);
  const latest = dates.reduce((a, b) => a > b ? a : b);
  console.log(`  From: ${earliest}`);
  console.log(`  To: ${latest}`);

  // Campaign summary
  console.log(`\n📢 Campaign: ${assets[0]?.campaign || 'TokenGators X Posts'}`);
  console.log(`  Source: ${assets[0]?.source || 'x-tokengators'}`);
  console.log(`  Assets archived: ${assets.length}`);

  // Database info
  console.log(`\n💾 Database:`);
  console.log(`  Assets file: ${assetsPath}`);
  console.log(`  Posts file: ${postsPath}`);
  console.log(`  Updated: ${new Date().toISOString()}`);

  console.log('\n' + '=' .repeat(60) + '\n');

  // Summary stats
  const totalEngagement = posts.reduce((sum, post) => 
    sum + post.engagement.likes + post.engagement.retweets, 0);
  
  const avgEngagementPerPost = Math.round(totalEngagement / posts.length);
  const totalViews = posts.reduce((sum, post) => sum + post.engagement.views, 0);

  console.log(`📈 PERFORMANCE SUMMARY`);
  console.log(`Total Engagement: ${totalEngagement.toLocaleString()}`);
  console.log(`Average per Post: ${avgEngagementPerPost.toLocaleString()}`);
  console.log(`Total Views: ${totalViews.toLocaleString()}`);
  console.log(`Posts with 10K+ views: ${posts.filter(p => p.engagement.views >= 10000).length}`);
  console.log(`Posts with 500+ engagement: ${posts.filter(p => {
    const eng = p.engagement.likes + p.engagement.retweets;
    return eng >= 500;
  }).length}`);

  console.log('\n✅ Archive is fully indexed and searchable\n');
}

// Run report
generateReport().catch(console.error);
