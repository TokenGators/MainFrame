'use strict';

const fs = require('fs');
const path = require('path');

const { ingestFile } = require('./pipeline');

const INBOX_DIR = path.join(__dirname, '../../database/inbox');
const SUPPORTED_EXTS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.avif',
  '.gif',
  '.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v',
  '.url', '.txt', '.webloc',
]);

function isSupportedFile(filename) {
  if (filename.startsWith('.')) return false; // hidden files
  if (filename.endsWith('.tmp')) return false;
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTS.has(ext);
}

/**
 * Process a file in the inbox, with a small delay to let the write finish.
 */
function scheduleFile(filePath) {
  setTimeout(async () => {
    if (!fs.existsSync(filePath)) return; // disappeared before we could read it
    try {
      await ingestFile(filePath);
    } catch (err) {
      console.error(`[watcher] error ingesting ${path.basename(filePath)}:`, err.message);
    }
  }, 500);
}

/**
 * On startup: scan inbox for any existing files not yet ingested.
 * This handles files dropped while the server was offline.
 */
async function scanExisting() {
  if (!fs.existsSync(INBOX_DIR)) return;
  let files;
  try { files = fs.readdirSync(INBOX_DIR); } catch { return; }

  const pending = files.filter(isSupportedFile);
  if (pending.length === 0) return;

  console.log(`[watcher] scanning inbox: ${pending.length} file(s) found`);
  for (const filename of pending) {
    await ingestFile(path.join(INBOX_DIR, filename)).catch(err =>
      console.error(`[watcher] startup scan error (${filename}):`, err.message)
    );
  }
}

/**
 * Start watching the inbox folder for new drops.
 * Returns a cleanup function.
 */
function startWatcher() {
  fs.mkdirSync(INBOX_DIR, { recursive: true });

  console.log(`[watcher] watching inbox: ${INBOX_DIR}`);

  // Debounce map to avoid double-firing on the same file
  const pending = new Map();

  const watcher = fs.watch(INBOX_DIR, (event, filename) => {
    if (!filename || !isSupportedFile(filename)) return;

    // Cancel any existing timer for this file
    if (pending.has(filename)) clearTimeout(pending.get(filename));

    const timer = setTimeout(() => {
      pending.delete(filename);
      const filePath = path.join(INBOX_DIR, filename);
      if (fs.existsSync(filePath)) {
        console.log(`[watcher] new file detected: ${filename}`);
        scheduleFile(filePath);
      }
    }, 300);

    pending.set(filename, timer);
  });

  watcher.on('error', err => console.error('[watcher] fs.watch error:', err.message));

  // Scan after a short delay (give registry time to fully load)
  setTimeout(scanExisting, 2000);

  return () => watcher.close();
}

module.exports = { startWatcher };
