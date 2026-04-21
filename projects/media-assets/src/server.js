const express = require('express');
const path = require('path');
const cors = require('cors');
const { loadRegistry } = require('./registry');
const { startWatcher } = require('./ingest/watcher');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Load registry on startup, then start inbox watcher
loadRegistry().then(() => {
  startWatcher();
});

// Routes
app.use('/api/assets', require('./routes/assets'));
app.use('/api/nfts', require('./routes/nfts'));
app.use('/api/holders', require('./routes/holders'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/export', require('./routes/export'));
app.use('/api/status', require('./routes/status'));
app.use('/api/ingest', require('./routes/ingest'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/sync',     require('./routes/sync'));
app.use('/api/market',   require('./routes/market'));

// Serve ingested media files
app.use('/media', express.static(path.join(__dirname, '../database/media')));

// Serve local NFT images
app.use('/nft-images', express.static('/Users/operator/Media/nft-images/TG_Final_4K'));

// Serve frontend build (always — dist/ is always present after npm run build)
app.use(express.static(path.join(__dirname, '../ui/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../ui/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Gatorpedia running on http://localhost:${PORT}`);
  console.log(`Inbox folder: ${path.join(__dirname, '../database/inbox')}`);
});
