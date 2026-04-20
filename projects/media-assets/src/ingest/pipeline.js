'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const registry = require('../registry');
const { visualSummary, tagAsset } = require('./ollama');
const taxonomy = require('../taxonomy');

const DB_DIR = path.join(__dirname, '../../database');
const MEDIA_DIR = path.join(DB_DIR, 'media');
const INBOX_FILE = 'inbox.jsonl';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const GIF_EXTS = new Set(['.gif']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v']);
const URL_FILE_EXTS = new Set(['.url', '.txt', '.webloc']);

function detectFileType(ext) {
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (GIF_EXTS.has(ext)) return 'gif';
  if (VIDEO_EXTS.has(ext)) return 'video';
  return null;
}

function detectUrlType(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'twitter.com' || host === 'x.com') return 'post';
    if (host === 'youtube.com' || host === 'youtu.be') return 'video';
    if (host === 'instagram.com') return 'post';
    const ext = path.extname(u.pathname).toLowerCase();
    if (IMAGE_EXTS.has(ext)) return 'image';
    if (GIF_EXTS.has(ext)) return 'gif';
    if (VIDEO_EXTS.has(ext)) return 'video';
    return 'article';
  } catch {
    return 'article';
  }
}

function makeId(prefix = 'asset') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function safeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function downloadFile(url, destPath) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const buf = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buf));
}

function getTaxonomyData() {
  return {
    tier2: taxonomy.getTagsByTier('tier2'),
    tier3: taxonomy.getTagsByTier('tier3'),
  };
}

/**
 * Run visual analysis + AI tagging on an already-created record.
 * Updates the record in-place via registry.patch as stages complete.
 */
async function processAsset(id) {
  const record = registry.getById(id);
  if (!record) return;

  try {
    // ── Stage 1: visual analysis ───────────────────────────────────────────
    const mediaPath = record.source_path;
    if (mediaPath && fs.existsSync(mediaPath)) {
      const ext = path.extname(mediaPath).toLowerCase();
      if (IMAGE_EXTS.has(ext) || GIF_EXTS.has(ext)) {
        registry.patch(id, { ingest_status: 'analyzing' });
        console.log(`[ingest] analyzing image: ${id}`);

        const summary = await visualSummary(mediaPath).catch(err => {
          console.warn(`[ingest] visual summary failed (${id}):`, err.message);
          return null;
        });
        if (summary) registry.patch(id, { visual_summary: summary });
      }
    }

    // ── Stage 2: AI tagging ────────────────────────────────────────────────
    registry.patch(id, { ingest_status: 'tagging' });
    console.log(`[ingest] tagging: ${id}`);

    const current = registry.getById(id) || record;
    const txData = getTaxonomyData();
    const { tags, descriptors } = await tagAsset(current, txData).catch(err => {
      console.warn(`[ingest] tagging failed (${id}):`, err.message);
      return { tags: [], descriptors: [] };
    });

    // Merge controlled + descriptors into a single tags array (same as batch tagger)
    const allTags = [...new Set([...tags, ...descriptors])];

    registry.patch(id, {
      tags: allTags,
      human_tags: [],
      flagged_by: 'ai',
      flagged_at: new Date().toISOString(),
      ingest_status: 'done',
      ingest_error: null,
    });

    console.log(`[ingest] ✓ done: ${id}  tags=${allTags.length}`);
  } catch (err) {
    console.error(`[ingest] pipeline error (${id}):`, err.message);
    registry.patch(id, { ingest_status: 'error', ingest_error: err.message });
  }
}

// ── Public ingestion entry points ─────────────────────────────────────────────

/**
 * Ingest a local file (image, video, gif, or .url text file).
 * Returns the created record or null if skipped.
 */
async function ingestFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const filename = path.basename(filePath);
  const ext = path.extname(filename).toLowerCase();

  // ── .url / .txt / .webloc → extract URL and hand off ──────────────────
  if (URL_FILE_EXTS.has(ext)) {
    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { return null; }

    // Try plain URL (first non-empty line), or Windows .url [InternetShortcut] format
    const plain = content.split('\n').find(l => l.trim().startsWith('http'));
    const winFormat = content.match(/URL=(https?:\/\/[^\s\r\n]+)/i);
    const url = (plain || winFormat?.[1] || '').trim();
    if (url) return ingestUrl(url);
    return null;
  }

  // ── Binary media file ──────────────────────────────────────────────────
  const type = detectFileType(ext);
  if (!type) {
    console.log(`[ingest] unsupported file type, skipping: ${filename}`);
    return null;
  }

  // Deduplicate: skip if already ingested by source_file
  if (registry.findBySourceFile(filename)) {
    console.log(`[ingest] already ingested: ${filename}`);
    return null;
  }

  // Copy to media dir with a timestamped name to avoid collisions
  const mediaFilename = `${Date.now()}-${safeFilename(filename)}`;
  const mediaPath = path.join(MEDIA_DIR, mediaFilename);
  fs.copyFileSync(filePath, mediaPath);

  const id = makeId(type);
  const record = {
    id,
    type,
    created_at: new Date().toISOString(),
    name: path.basename(filename, ext).replace(/[-_]/g, ' '),
    filename: mediaFilename,
    source_file: filename,  // original drop filename for dedup
    source_path: mediaPath, // absolute path for vision model
    url: `/media/${mediaFilename}`,
    tags: [],
    human_tags: [],
    collections: [],
    linked_assets: [],
    flagged_by: null,
    flagged_at: null,
    ingest_status: 'pending',
    ingest_error: null,
    metadata: {},
  };

  registry.create(record, INBOX_FILE);
  console.log(`[ingest] created ${id} ← ${filename}`);

  // Don't await — process in background, respond immediately
  setImmediate(() => processAsset(id).catch(console.error));
  return record;
}

/**
 * Ingest a URL (image URL, tweet URL, article URL, etc.).
 * Returns the created record or null if skipped/duplicate.
 */
async function ingestUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl.trim()).toString(); } catch {
    console.warn(`[ingest] invalid URL: ${rawUrl}`);
    return null;
  }

  // Deduplicate
  if (registry.findBySourceUrl(url)) {
    console.log(`[ingest] URL already ingested: ${url}`);
    return null;
  }

  const type = detectUrlType(url);
  const urlObj = new URL(url);
  const urlExt = path.extname(urlObj.pathname).toLowerCase();
  const isDirectMedia =
    IMAGE_EXTS.has(urlExt) || GIF_EXTS.has(urlExt) || VIDEO_EXTS.has(urlExt);

  // ── Direct media URL → download then process ──────────────────────────
  if (isDirectMedia) {
    const mediaFilename = `${Date.now()}${urlExt}`;
    const mediaPath = path.join(MEDIA_DIR, mediaFilename);
    const fileType = detectFileType(urlExt) || type;
    const id = makeId(fileType);

    const record = {
      id,
      type: fileType,
      created_at: new Date().toISOString(),
      source_url: url,
      filename: mediaFilename,
      source_path: mediaPath,
      url: `/media/${mediaFilename}`,
      tags: [],
      human_tags: [],
      collections: [],
      linked_assets: [],
      flagged_by: null,
      flagged_at: null,
      ingest_status: 'downloading',
      ingest_error: null,
      metadata: {},
    };

    registry.create(record, INBOX_FILE);
    console.log(`[ingest] downloading: ${url}`);

    setImmediate(async () => {
      try {
        await downloadFile(url, mediaPath);
        registry.patch(id, { ingest_status: 'pending' });
      } catch (err) {
        console.warn(`[ingest] download failed (${id}): ${err.message}`);
        registry.patch(id, { ingest_status: 'error', ingest_error: err.message });
        return;
      }
      await processAsset(id).catch(console.error);
    });

    return record;
  }

  // ── Tweet/X URL ────────────────────────────────────────────────────────
  if (type === 'post') {
    const tweetMatch = url.match(/\/status\/(\d+)/);
    const authorMatch = url.match(/(?:twitter|x)\.com\/([^/?#]+)/);
    const tweetId = tweetMatch?.[1];
    const id = tweetId ? `tweet-${tweetId}` : makeId('post');

    // Already in registry under tweet-XXXX?
    if (tweetId && registry.getById(id)) {
      console.log(`[ingest] tweet already ingested: ${id}`);
      return null;
    }

    const record = {
      id,
      type: 'post',
      created_at: new Date().toISOString(),
      source_url: url,
      platform_post_id: tweetId || null,
      author_handle: authorMatch?.[1] || null,
      text: null, // no API access — user can fill in
      tags: [],
      human_tags: [],
      collections: [],
      linked_assets: [],
      flagged_by: null,
      flagged_at: null,
      ingest_status: 'pending',
      ingest_error: null,
      metadata: {},
    };

    registry.create(record, INBOX_FILE);
    console.log(`[ingest] created ${id} ← tweet URL`);
    setImmediate(() => processAsset(id).catch(console.error));
    return record;
  }

  // ── Generic article / video stub ──────────────────────────────────────
  const id = makeId(type);
  const record = {
    id,
    type,
    created_at: new Date().toISOString(),
    source_url: url,
    name: urlObj.hostname + urlObj.pathname.replace(/\/$/, '').split('/').pop(),
    tags: [],
    human_tags: [],
    collections: [],
    linked_assets: [],
    flagged_by: null,
    flagged_at: null,
    ingest_status: 'pending',
    ingest_error: null,
    metadata: {},
  };

  registry.create(record, INBOX_FILE);
  console.log(`[ingest] created ${id} ← ${url}`);
  setImmediate(() => processAsset(id).catch(console.error));
  return record;
}

module.exports = { ingestFile, ingestUrl };
