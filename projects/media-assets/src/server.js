const express = require('express');
const path = require('path');
const cors = require('cors');
const { loadRegistry } = require('./registry');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Load registry on startup
loadRegistry();

// Routes
app.use('/api/assets', require('./routes/assets'));
app.use('/api/nfts', require('./routes/nfts'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/export', require('./routes/export'));
app.use('/api/status', require('./routes/status'));

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../ui/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../ui/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Gatorpedia running on http://localhost:${PORT}`);
});
