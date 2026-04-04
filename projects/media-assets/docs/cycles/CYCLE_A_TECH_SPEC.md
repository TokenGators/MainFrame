# Cycle A — Tech Spec

**Project:** media-assets (Gatorpedia)  
**Cycle:** A  

---

## Dependencies

### Backend (`projects/media-assets/package.json`)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

No sqlite3 — the existing dependency can be removed. Registry is JSONL only.

### Frontend (`projects/media-assets/ui/package.json`)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

shadcn/ui components are NOT installed in Cycle A — that's Cycle B. Just the base stack.

---

## src/server.js

```javascript
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
```

---

## src/registry.js

```javascript
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DB_DIR = path.join(__dirname, '../database');

// Registry files to load. Order matters for write-back routing.
const REGISTRY_FILES = [
  'posts-migrated.jsonl',
  'videos.jsonl',
  'nfts.jsonl',
  'memes.jsonl',
  'drive-manifest.jsonl',
  'assets.jsonl',
];

// In-memory store
const store = new Map(); // id → record
const fileMap = new Map(); // id → filename (for write-back)

async function loadFile(filename) {
  const filePath = path.join(DB_DIR, filename);
  if (!fs.existsSync(filePath)) return 0;

  const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
  let count = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      if (record.id) {
        store.set(record.id, record);
        fileMap.set(record.id, filename);
        count++;
      }
    } catch (e) {
      console.warn(`registry: parse error in ${filename}: ${e.message}`);
    }
  }
  return count;
}

async function loadRegistry() {
  store.clear();
  fileMap.clear();
  for (const filename of REGISTRY_FILES) {
    const count = await loadFile(filename);
    if (count > 0) console.log(`registry: loaded ${count} records from ${filename}`);
  }
  console.log(`registry: total ${store.size} records`);
  watchFiles();
}

function watchFiles() {
  for (const filename of REGISTRY_FILES) {
    const filePath = path.join(DB_DIR, filename);
    if (!fs.existsSync(filePath)) continue;
    fs.watch(filePath, { persistent: false }, (event) => {
      if (event === 'change') {
        console.log(`registry: reloading ${filename}`);
        loadFile(filename);
      }
    });
  }
}

function getAll({ type, tags, tagOp = 'and', q, flagged, sort = 'created_at', page = 1, perPage = 50 } = {}) {
  let results = Array.from(store.values());

  if (type) results = results.filter(r => r.type === type);

  if (tags && tags.length > 0) {
    results = results.filter(r => {
      const rtags = r.tags || [];
      return tagOp === 'or'
        ? tags.some(t => rtags.includes(t))
        : tags.every(t => rtags.includes(t));
    });
  }

  if (q) {
    const lq = q.toLowerCase();
    results = results.filter(r =>
      [r.text, r.visual_summary, r.transcript, r.filename, r.alt_text, r.name]
        .some(field => field && field.toLowerCase().includes(lq))
    );
  }

  if (flagged === 'ai') results = results.filter(r => r.flagged_by === 'ai');
  else if (flagged === 'human') results = results.filter(r => r.flagged_by === 'human');
  else if (flagged === 'untagged') results = results.filter(r => !r.tags || r.tags.length === 0);

  // Sort
  results.sort((a, b) => {
    if (sort === 'likes') return (b.stats?.likes || 0) - (a.stats?.likes || 0);
    if (sort === 'id') return a.id.localeCompare(b.id);
    const da = a.created_at || '';
    const db = b.created_at || '';
    return db.localeCompare(da); // descending date
  });

  const total = results.length;
  const pages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const data = results.slice(start, start + perPage);

  return { data, total, page, per_page: perPage, pages };
}

function getById(id) {
  return store.get(id) || null;
}

// Write-back: update a record and persist to JSONL file
const EDITABLE_FIELDS = new Set([
  'tags', 'linked_assets', 'featured_gators', 'gator_appearances',
  'alt_text', 'visual_summary', 'flagged_by', 'flagged_at', 'collections',
]);

function patch(id, fields) {
  const record = store.get(id);
  if (!record) return null;

  // Only apply editable fields
  const safe = {};
  for (const [k, v] of Object.entries(fields)) {
    if (EDITABLE_FIELDS.has(k)) safe[k] = v;
  }

  const updated = { ...record, ...safe };
  store.set(id, updated);

  // Write back the full file atomically
  const filename = fileMap.get(id);
  if (filename) writeFile(filename);

  return updated;
}

function writeFile(filename) {
  const filePath = path.join(DB_DIR, filename);
  const tmpPath = filePath + '.tmp';

  const records = Array.from(store.values())
    .filter(r => fileMap.get(r.id) === filename);

  const content = records.map(r => JSON.stringify(r)).join('\n') + '\n';

  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function getStats() {
  const counts = {};
  for (const [id, filename] of fileMap.entries()) {
    counts[filename] = (counts[filename] || 0) + 1;
  }
  const byType = {};
  for (const record of store.values()) {
    byType[record.type] = (byType[record.type] || 0) + 1;
  }
  return { total: store.size, byFile: counts, byType };
}

module.exports = { loadRegistry, getAll, getById, patch, getStats };
```

---

## src/taxonomy.js

```javascript
const fs = require('fs');
const path = require('path');

const TAXONOMY_PATH = path.join(__dirname, '../TAXONOMY.md');

let _tags = null; // { tier2: {tag: desc}, tier3: {}, tier4: {}, all: {} }

function parseTaxonomy() {
  if (!fs.existsSync(TAXONOMY_PATH)) return { tier2: {}, tier3: {}, tier4: {}, all: {} };

  const content = fs.readFileSync(TAXONOMY_PATH, 'utf8');
  const tiers = { tier2: {}, tier3: {}, tier4: {} };
  let currentTier = null;

  for (const line of content.split('\n')) {
    if (line.includes('Tier 2')) currentTier = 'tier2';
    else if (line.includes('Tier 3')) currentTier = 'tier3';
    else if (line.includes('Tier 4')) currentTier = 'tier4';
    else if (line.includes('Tier 1')) currentTier = null;

    if (!currentTier) continue;

    const tableMatch = line.match(/\|\s*`([^`]+)`\s*\|\s*([^|]+)\|/);
    if (tableMatch) {
      const tag = tableMatch[1].trim();
      const desc = tableMatch[2].trim();
      if (tag && tag !== 'Tag') tiers[currentTier][tag] = desc;
    }
  }

  const all = { ...tiers.tier2, ...tiers.tier3, ...tiers.tier4 };
  return { ...tiers, all };
}

function getTags() {
  if (!_tags) _tags = parseTaxonomy();
  return _tags;
}

function getAllTags() { return getTags().all; }
function getTagsByTier(tier) { return getTags()[tier] || {}; }
function isValidTag(tag) { return tag in getTags().all; }

// Reload on file change
fs.watch(TAXONOMY_PATH, { persistent: false }, () => { _tags = null; });

module.exports = { getAllTags, getTagsByTier, isValidTag };
```

---

## src/routes/assets.js

```javascript
const express = require('express');
const router = express.Router();
const registry = require('../registry');

// GET /api/assets
router.get('/', (req, res) => {
  const { type, tags, tag_op, q, flagged, sort, page, per_page } = req.query;
  const result = registry.getAll({
    type,
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    tagOp: tag_op || 'and',
    q,
    flagged,
    sort,
    page: parseInt(page) || 1,
    perPage: Math.min(parseInt(per_page) || 50, 200),
  });
  res.json(result);
});

// GET /api/assets/:id
router.get('/:id', (req, res) => {
  const record = registry.getById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

// PATCH /api/assets/:id
router.patch('/:id', (req, res) => {
  const updated = registry.patch(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

module.exports = router;
```

---

## src/routes/nfts.js

```javascript
const express = require('express');
const router = express.Router();
const registry = require('../registry');

// GET /api/nfts/traits — must be before /:id
router.get('/traits', (req, res) => {
  const all = registry.getAll({ type: 'gator-nft', perPage: 5000 }).data;
  const traits = {};
  for (const nft of all) {
    for (const t of (nft.traits || [])) {
      if (!traits[t.trait_type]) traits[t.trait_type] = {};
      traits[t.trait_type][t.value] = (traits[t.trait_type][t.value] || 0) + 1;
    }
  }
  res.json(traits);
});

// GET /api/nfts
router.get('/', (req, res) => {
  const { page, per_page, q, ...traitFilters } = req.query;
  // Trait filters come in as trait_Skin=Lava, trait_Eyes=Fury, etc.
  const activeTraits = {};
  for (const [k, v] of Object.entries(traitFilters)) {
    if (k.startsWith('trait_')) activeTraits[k.slice(6)] = v;
  }

  let result = registry.getAll({
    type: 'gator-nft',
    q,
    page: parseInt(page) || 1,
    perPage: Math.min(parseInt(per_page) || 50, 200),
  });

  // Apply trait filters post-fetch (small dataset, in-memory is fine)
  if (Object.keys(activeTraits).length > 0) {
    result.data = result.data.filter(nft =>
      Object.entries(activeTraits).every(([traitType, value]) =>
        (nft.traits || []).some(t => t.trait_type === traitType && t.value === value)
      )
    );
    result.total = result.data.length;
  }

  res.json(result);
});

// GET /api/nfts/:token_id
router.get('/:token_id', (req, res) => {
  const id = `gator-nft-${req.params.token_id}`;
  const record = registry.getById(id);
  if (!record) return res.status(404).json({ error: 'Not found' });

  // Hydrate appearances
  const appearances = (record.gator_appearances || [])
    .map(aid => registry.getById(aid))
    .filter(Boolean);

  res.json({ ...record, appearances });
});

module.exports = router;
```

---

## src/routes/tags.js

```javascript
const express = require('express');
const router = express.Router();
const { getAllTags, getTagsByTier } = require('../taxonomy');
const registry = require('../registry');

router.get('/', (req, res) => {
  const allTags = getAllTags();

  // Count usage across all assets
  const counts = {};
  const allAssets = registry.getAll({ perPage: 10000 }).data;
  for (const asset of allAssets) {
    for (const tag of (asset.tags || [])) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }

  const result = Object.entries(allTags).map(([tag, description]) => ({
    tag,
    description,
    count: counts[tag] || 0,
  }));

  res.json(result);
});

module.exports = router;
```

---

## src/routes/export.js

```javascript
const express = require('express');
const router = express.Router();
const registry = require('../registry');

router.post('/', (req, res) => {
  const { type, tags, tag_op, q, flagged, format = 'full' } = req.body;

  const result = registry.getAll({
    type, tags, tagOp: tag_op, q, flagged,
    perPage: 10000, // export all matching
  });

  let data = result.data;
  if (format === 'slim') {
    data = data.map(({ id, type, tags, text, visual_summary, filename, name, created_at, source_url }) =>
      ({ id, type, tags, text, visual_summary, filename, name, created_at, source_url })
    );
  }

  const filename = `gatorpedia-export-${Date.now()}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.json({ exported_at: new Date().toISOString(), total: data.length, assets: data });
});

module.exports = router;
```

---

## src/routes/status.js

```javascript
const express = require('express');
const router = express.Router();
const registry = require('../registry');

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    project: 'Gatorpedia',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    registry: registry.getStats(),
  });
});

module.exports = router;
```

---

## ui/vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
```

---

## ui/src/App.tsx (Cycle A placeholder)

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const queryClient = new QueryClient();

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">🐊 Gatorpedia</h1>
      <p className="text-gray-500 mt-2">Registry backend is live. UI coming in Cycle B.</p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

---

## launchd/com.tokengators.gatorpedia.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.tokengators.gatorpedia</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>src/server.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/operator/repos/MainFrame/projects/media-assets</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key>
    <string>production</string>
    <key>PORT</key>
    <string>3001</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/operator/Library/Logs/gatorpedia.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/operator/Library/Logs/gatorpedia.error.log</string>
</dict>
</plist>
```

Install instructions to include in README:
```bash
cp launchd/com.tokengators.gatorpedia.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.tokengators.gatorpedia.plist
# Check: launchctl list | grep gatorpedia
# Logs: tail -f ~/Library/Logs/gatorpedia.log
```
