#!/bin/bash

echo ""
echo "🐊 TokenGators Media Archive Status"
echo "===================================="
echo ""
echo "📦 Assets:"
wc -l database/assets.jsonl | awk '{print "   Total: " $1}'
echo ""
echo "📝 Posts:"
wc -l database/posts.jsonl | awk '{print "   Total: " $1}'
echo ""
echo "📊 Database Files:"
ls -lh database/*.jsonl | awk '{print "   " $9 " (" $5 ")"}'
echo ""
echo "🔧 Available Tools:"
echo "   • node scraper.js    — Scrape @tokengators X timeline"
echo "   • node reporter.js   — Generate analytics report"
echo "   • node search.js     — Query the media archive"
echo "   • cat README.md      — View full documentation"
echo ""
echo "💾 Database Location:"
echo "   /home/parkoperator/.openclaw/workspace/media-assets/database"
echo ""
echo "✅ Archive is live and searchable"
echo ""
