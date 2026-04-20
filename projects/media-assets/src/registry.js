const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DB_DIR = path.join(__dirname, '../database');

// Registry files to load. Order matters for write-back routing.
// NOTE: assets.jsonl intentionally excluded — it contains raw tweet media
// extractions (one record per tweet attachment). These are not standalone
// browsable assets; they exist only for the match-nfts.py visual pipeline.
// Matching results are propagated to the parent tweet and NFT records instead.
const REGISTRY_FILES = [
  'posts-migrated.jsonl',
  'videos.jsonl',
  'nfts.jsonl',
  'memes.jsonl',
  'drive-manifest.jsonl',
  'inbox.jsonl',        // auto-ingested assets
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
  // Watch the DB directory rather than individual files — this catches atomic
  // renames (os.replace / rename) that the tagger uses for safe writes.
  // A direct fs.watch on the file only tracks the original inode and misses
  // the new file after a rename.
  const debounce = {};
  fs.watch(DB_DIR, { persistent: false }, (event, changedFile) => {
    if (!changedFile) return;
    const filename = REGISTRY_FILES.find(f => f === changedFile);
    if (!filename) return;
    // Debounce rapid successive events (rename fires twice on some OS)
    clearTimeout(debounce[filename]);
    debounce[filename] = setTimeout(() => {
      console.log(`registry: reloading ${filename} (${event})`);
      loadFile(filename);
    }, 200);
  });
}

function getAll({ type, types, media_type, linked_count, tags, tagOp = 'and', q, flagged, hasLinked, sort = 'created_at', page = 1, perPage = 50 } = {}) {
  let results = Array.from(store.values());

  if (type) results = results.filter(r => r.type === type);
  if (types && types.length) results = results.filter(r => types.includes(r.type));
  if (media_type) {
    const TWEET_TYPES = new Set(['post', 'retweet', 'quote-tweet']);
    results = results.filter(r => {
      if (!TWEET_TYPES.has(r.type)) return false;
      const media = r.media || [];
      if (media_type === 'none') return media.length === 0;
      return media.some(m => m.type === media_type || (media_type === 'image' && m.type === 'photo'));
    });
  }

  if (hasLinked) results = results.filter(r => Array.isArray(r.linked_assets) && r.linked_assets.length > 0);
  if (linked_count === 'none')     results = results.filter(r => !r.linked_assets || r.linked_assets.length === 0);
  if (linked_count === 'one')      results = results.filter(r => Array.isArray(r.linked_assets) && r.linked_assets.length === 1);
  if (linked_count === 'multiple') results = results.filter(r => Array.isArray(r.linked_assets) && r.linked_assets.length > 1);

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
  'tags', 'human_tags', 'linked_assets', 'external_links', 'featured_gators', 'gator_appearances',
  'alt_text', 'visual_summary', 'text', 'name', 'flagged_by', 'flagged_at', 'collections',
  // ingestion pipeline fields
  'ingest_status', 'ingest_error', 'source_path', 'source_file', 'filename', 'url',
  'platform_post_id', 'author_handle', 'descriptors',
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

/**
 * Create a brand-new record and append it to the given file.
 * Adds directly to the in-memory store so it's immediately queryable.
 */
function create(record, filename) {
  if (!record.id) throw new Error('record.id is required');
  store.set(record.id, record);
  fileMap.set(record.id, filename);
  // Write the full file atomically (same pattern as patch)
  writeFile(filename);
  return record;
}

/**
 * Find the first record whose source_file field matches filename.
 * Used for deduplication in the ingestion pipeline.
 */
function findBySourceFile(filename) {
  for (const record of store.values()) {
    if (record.source_file === filename) return record;
  }
  return null;
}

/**
 * Find the first record whose source_url field matches url.
 * Used for deduplication in the ingestion pipeline.
 */
function findBySourceUrl(url) {
  for (const record of store.values()) {
    if (record.source_url === url) return record;
  }
  return null;
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

module.exports = { loadRegistry, getAll, getById, patch, create, findBySourceFile, findBySourceUrl, getStats };
