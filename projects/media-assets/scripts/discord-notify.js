#!/usr/bin/env node
/**
 * discord-notify.js — watch activity.jsonl + listings.jsonl and post new
 * sales / listings to Discord webhook(s).
 *
 * Keeps a cursor file at database/.discord-cursor.json tracking the last
 * seen tx_hash (sales) and order_hash (listings) so restarts don't
 * double-post.
 *
 * Webhooks (env vars):
 *   DISCORD_SALES_WEBHOOK      — if unset, sales posts are skipped
 *   DISCORD_LISTINGS_WEBHOOK   — if unset, listings posts are skipped
 *   (fallback) DISCORD_WEBHOOK — used for both if the specific ones absent
 *
 * Tunables:
 *   MIN_SALE_ETH       — ignore sub-dust ETH sales (default 0)
 *   MIN_SALE_APE       — ignore sub-dust APE sales (default 0)
 *   LISTING_COOLDOWN   — suppress re-listings from same lister within N ms
 *                        (default 6h — blunt instrument against listing spam
 *                         in addition to the route-layer filter)
 *
 * Runs forever; kept alive by launchd. Uses fs.watch with a debounced
 * re-read of the tail — simpler than a tailing lib, plenty fast at the
 * scale we're at.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Config ───────────────────────────────────────────────────────────────────

const ROOT          = path.resolve(__dirname, '..');
const ACTIVITY_FILE = path.join(ROOT, 'database', 'activity.jsonl');
const LISTINGS_FILE = path.join(ROOT, 'database', 'listings.jsonl');
const CURSOR_FILE   = path.join(ROOT, 'database', '.discord-cursor.json');

const WEBHOOK_SALES    = process.env.DISCORD_SALES_WEBHOOK    || process.env.DISCORD_WEBHOOK || '';
const WEBHOOK_LISTINGS = process.env.DISCORD_LISTINGS_WEBHOOK || process.env.DISCORD_WEBHOOK || '';

const MIN_SALE_ETH     = parseFloat(process.env.MIN_SALE_ETH || '0');
const MIN_SALE_APE     = parseFloat(process.env.MIN_SALE_APE || '0');
const LISTING_COOLDOWN = parseInt(process.env.LISTING_COOLDOWN || String(6 * 60 * 60 * 1000), 10);

const OPENSEA_URL_BASE = {
  eth: 'https://opensea.io/assets/ethereum',
  ape: 'https://opensea.io/assets/ape_chain',
};

const CONTRACT = {
  eth: '0x4fb7363cf6d0a546cc0ed8cc0a6c99069170a623',
  ape: '0xd33edec311f8769c71f132a77f0c0796c22af1c5',
};

// ── Cursor ───────────────────────────────────────────────────────────────────

function loadCursor() {
  try {
    return JSON.parse(fs.readFileSync(CURSOR_FILE, 'utf8'));
  } catch {
    return {
      seen_tx_hashes:    {},   // tx_hash → true (sales already posted)
      seen_order_hashes: {},   // order_hash → ts (listings already posted)
      listers_recent:    {},   // `${chain}:${lister}` → last_listed_ms
      started_at:        new Date().toISOString(),
    };
  }
}

function saveCursor(c) {
  // Trim seen maps so they don't grow forever. Keep only last 2000 of each.
  const trimMap = (obj, max) => {
    const keys = Object.keys(obj);
    if (keys.length <= max) return obj;
    const out = {};
    for (const k of keys.slice(-max)) out[k] = obj[k];
    return out;
  };
  c.seen_tx_hashes    = trimMap(c.seen_tx_hashes,    2000);
  c.seen_order_hashes = trimMap(c.seen_order_hashes, 2000);

  const tmp = CURSOR_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(c, null, 2));
  fs.renameSync(tmp, CURSOR_FILE);
}

// ── JSONL reader (full-file; fine at this scale) ─────────────────────────────

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch {}
  }
  return out;
}

// ── Discord posting ──────────────────────────────────────────────────────────

function postWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve(false);
    const body = Buffer.from(JSON.stringify(payload));
    const u    = new URL(url);
    const req  = https.request({
      method:   'POST',
      hostname: u.hostname,
      path:     u.pathname + u.search,
      headers:  { 'Content-Type': 'application/json', 'Content-Length': body.length },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end',  () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(true);
        else reject(new Error(`Discord ${res.statusCode}: ${Buffer.concat(chunks).toString()}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function priceStr(n, cur) {
  if (n == null) return '—';
  if (cur === 'APE') return `${Math.round(n).toLocaleString()} APE`;
  return `${n.toFixed(3)} Ξ`;
}

function saleEmbed(ev) {
  const chainEmoji = ev.chain === 'ape' ? '🟣' : '🔵';
  const link       = `${OPENSEA_URL_BASE[ev.chain]}/${CONTRACT[ev.chain]}/${ev.token_id}`;
  return {
    username:   'Gator Sales',
    embeds: [{
      title:       `${chainEmoji} #${ev.token_id} sold — ${priceStr(ev.price_native, ev.price_currency)}`,
      url:         link,
      color:       ev.chain === 'ape' ? 0x9b59ff : 0x33aaff,
      fields: [
        { name: 'Buyer',  value: ev.to_name   || (ev.to   ? `\`${ev.to.slice(0,6)}…${ev.to.slice(-4)}\``   : '—'), inline: true },
        { name: 'Seller', value: ev.from_name || (ev.from ? `\`${ev.from.slice(0,6)}…${ev.from.slice(-4)}\`` : '—'), inline: true },
        { name: 'Market', value: ev.marketplace || 'on-chain', inline: true },
      ],
      timestamp: ev.timestamp,
    }],
  };
}

function listingEmbed(lst) {
  const chainEmoji = lst.chain === 'ape' ? '🟣' : '🔵';
  const link       = `${OPENSEA_URL_BASE[lst.chain]}/${CONTRACT[lst.chain]}/${lst.token_id}`;
  return {
    username:   'Gator Listings',
    embeds: [{
      title:       `${chainEmoji} #${lst.token_id} listed — ${priceStr(lst.price_native, lst.price_currency)}`,
      url:         link,
      color:       0x33ff33,
      fields: [
        { name: 'Lister', value: lst.lister_name || (lst.lister ? `\`${lst.lister.slice(0,6)}…${lst.lister.slice(-4)}\`` : '—'), inline: true },
        { name: 'Market', value: lst.marketplace || 'OpenSea', inline: true },
      ],
      timestamp: lst.listed_at || new Date().toISOString(),
    }],
  };
}

// ── Identity lookup (light; avoids pulling a server dependency) ──────────────

let _identity = {};
let _identityLoadedAt = 0;
function loadIdentity() {
  const p = path.join(require('os').homedir(), '.openclaw', 'holders-identity.jsonl');
  if (!fs.existsSync(p)) { _identity = {}; return; }
  // Refresh at most every 60s
  if (Date.now() - _identityLoadedAt < 60_000) return;
  _identity = {};
  for (const rec of readJsonl(p)) {
    if (rec.wallet) _identity[rec.wallet.toLowerCase()] = rec;
  }
  _identityLoadedAt = Date.now();
}

function displayName(wallet) {
  if (!wallet) return null;
  const id = _identity[wallet.toLowerCase()] || {};
  return id.twitter_display_name
    || (id.twitter ? `@${id.twitter}` : null)
    || (id.farcaster_username ? `@${id.farcaster_username}` : null)
    || id.ens
    || id.opensea_username
    || id.name
    || null;
}

// ── Dispatch new events ──────────────────────────────────────────────────────

async function processSales(cursor) {
  if (!WEBHOOK_SALES) return 0;
  const events = readJsonl(ACTIVITY_FILE).filter(e => e.type === 'sale');
  let posted = 0;
  for (const ev of events) {
    if (!ev.tx_hash || cursor.seen_tx_hashes[ev.tx_hash]) continue;
    if (ev.price_currency === 'ETH' && (ev.price_native || 0) < MIN_SALE_ETH) {
      cursor.seen_tx_hashes[ev.tx_hash] = true;
      continue;
    }
    if (ev.price_currency === 'APE' && (ev.price_native || 0) < MIN_SALE_APE) {
      cursor.seen_tx_hashes[ev.tx_hash] = true;
      continue;
    }
    // Enrich names from identity store
    ev.to_name   = ev.to_name   || displayName(ev.to);
    ev.from_name = ev.from_name || displayName(ev.from);
    try {
      await postWebhook(WEBHOOK_SALES, saleEmbed(ev));
      cursor.seen_tx_hashes[ev.tx_hash] = true;
      posted++;
    } catch (err) {
      console.error('sale post failed:', err.message);
      break;  // stop the loop on webhook error; retry next tick
    }
  }
  return posted;
}

async function processListings(cursor) {
  if (!WEBHOOK_LISTINGS) return 0;
  const listings = readJsonl(LISTINGS_FILE);
  const now = Date.now();
  let posted = 0;
  for (const lst of listings) {
    const hash = lst.order_hash;
    if (!hash || cursor.seen_order_hashes[hash]) continue;

    // Per-lister cooldown to mute relisting bots even if route filter missed
    const listerKey = `${lst.chain}:${(lst.lister || '').toLowerCase()}`;
    const lastFromLister = cursor.listers_recent[listerKey] || 0;
    if (now - lastFromLister < LISTING_COOLDOWN) {
      cursor.seen_order_hashes[hash] = now;
      continue;
    }

    lst.lister_name = displayName(lst.lister);
    try {
      await postWebhook(WEBHOOK_LISTINGS, listingEmbed(lst));
      cursor.seen_order_hashes[hash]  = now;
      cursor.listers_recent[listerKey] = now;
      posted++;
    } catch (err) {
      console.error('listing post failed:', err.message);
      break;
    }
  }
  return posted;
}

// ── Main loop: debounced react to file changes ──────────────────────────────

let _pending = false;
let _timer   = null;

async function tick() {
  if (_pending) { _timer = setTimeout(tick, 500); return; }
  _pending = true;
  try {
    loadIdentity();
    const cursor = loadCursor();
    const s = await processSales(cursor);
    const l = await processListings(cursor);
    if (s + l > 0) {
      console.log(`[${new Date().toISOString()}] posted sales=${s} listings=${l}`);
      saveCursor(cursor);
    } else {
      // Still persist to trim the seen-maps occasionally
      saveCursor(cursor);
    }
  } catch (err) {
    console.error('tick error:', err);
  } finally {
    _pending = false;
  }
}

function schedule() {
  clearTimeout(_timer);
  _timer = setTimeout(tick, 750);
}

function main() {
  if (!WEBHOOK_SALES && !WEBHOOK_LISTINGS) {
    console.error('No DISCORD_*_WEBHOOK env var set. Exiting.');
    process.exit(0);
  }
  console.log(`discord-notify watching`);
  console.log(`  sales:    ${WEBHOOK_SALES    ? 'on' : 'off'}`);
  console.log(`  listings: ${WEBHOOK_LISTINGS ? 'on' : 'off'}`);
  console.log(`  activity: ${ACTIVITY_FILE}`);
  console.log(`  listings: ${LISTINGS_FILE}`);

  // Initial pass
  tick();

  // React to changes on the database directory (covers both files)
  const dir = path.dirname(ACTIVITY_FILE);
  fs.watch(dir, { persistent: true }, (_e, fn) => {
    if (fn === 'activity.jsonl' || fn === 'listings.jsonl') schedule();
  });

  // Safety net: poll every 90s even if no fs event fires
  setInterval(tick, 90_000);
}

main();
