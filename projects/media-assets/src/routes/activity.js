const express = require('express');
const fs      = require('fs');
const readline = require('readline');
const path    = require('path');
const os      = require('os');

const router = express.Router();
const ACTIVITY_FILE  = path.join(__dirname, '../../database/activity.jsonl');
const IDENTITY_FILE  = path.join(os.homedir(), '.openclaw', 'holders-identity.jsonl');

let activity = [];       // newest-first
let identityMap = {};    // wallet_lower -> identity record

async function loadFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const records = [];
  const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try { records.push(JSON.parse(line)); } catch {}
  }
  return records;
}

async function loadActivity() {
  activity = await loadFile(ACTIVITY_FILE);
  // already newest-first from build-activity.py
  console.log(`activity: loaded ${activity.length} records`);
}

async function loadIdentity() {
  const records = await loadFile(IDENTITY_FILE);
  identityMap = {};
  for (const r of records) {
    if (r.wallet) identityMap[r.wallet.toLowerCase()] = r;
  }
}

loadActivity();
loadIdentity();

// Watch for file changes
fs.watch(path.dirname(ACTIVITY_FILE), { persistent: false }, (event, filename) => {
  if (filename === 'activity.jsonl') {
    clearTimeout(loadActivity._debounce);
    loadActivity._debounce = setTimeout(loadActivity, 300);
  }
});

if (fs.existsSync(path.dirname(IDENTITY_FILE))) {
  fs.watch(path.dirname(IDENTITY_FILE), { persistent: false }, (event, filename) => {
    if (filename === 'holders-identity.jsonl') {
      clearTimeout(loadIdentity._debounce);
      loadIdentity._debounce = setTimeout(loadIdentity, 300);
    }
  });
}

// Well-known addresses
const NAMED_ADDRS = {
  '0x0000000000000000000000000000000000000000': 'Mint',
  '0x57e56ce08ae6f0aea6668fd898c52011fe853dc2': 'ETH Bridge',
  '0x75f7dbe5e4ee8e424a759f71ad725f8cdd0ff2d1': 'APE Bridge',
};

// Resolve a wallet address to a short display name
function displayName(wallet) {
  if (!wallet) return null;
  const named = NAMED_ADDRS[wallet.toLowerCase()];
  if (named) return named;
  const id = identityMap[wallet.toLowerCase()] || {};
  return id.twitter_display_name
    || (id.twitter ? `@${id.twitter}` : null)
    || (id.farcaster_username ? `@${id.farcaster_username}` : null)
    || id.ens
    || id.opensea_username
    || id.name
    || null;
}

function shortWallet(addr) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// GET /api/activity
// Query params:
//   type      — 'mint' | 'transfer' | 'bridge_out' | 'bridge_in' | 'all' (default: all)
//   chain     — 'eth' | 'ape' | 'all' (default: all)
//   wallet    — filter to a specific wallet (as from or to)
//   token_id  — filter to a specific token
//   page      — default 1
//   per_page  — default 50, max 200
router.get('/', (req, res) => {
  const { type, chain, wallet, token_id, page = '1', per_page = '50' } = req.query;

  let results = activity;

  if (type && type !== 'all') {
    results = results.filter(r => r.type === type);
  }
  if (chain && chain !== 'all') {
    results = results.filter(r => r.chain === chain);
  }
  if (wallet) {
    const wl = wallet.toLowerCase();
    results = results.filter(r => r.from === wl || r.to === wl);
  }
  if (token_id !== undefined) {
    const tid = parseInt(token_id);
    results = results.filter(r => r.token_id === tid);
  }

  const total   = results.length;
  const pageNum = Math.max(1, parseInt(page));
  const perPage = Math.min(200, Math.max(1, parseInt(per_page)));
  const pages   = Math.ceil(total / perPage);
  const slice   = results.slice((pageNum - 1) * perPage, pageNum * perPage);

  // Attach display names
  const data = slice.map(r => ({
    ...r,
    from_name: displayName(r.from) || shortWallet(r.from),
    to_name:   displayName(r.to)   || shortWallet(r.to),
  }));

  res.json({ data, total, page: pageNum, per_page: perPage, pages });
});

// GET /api/activity/stats — quick summary counts
router.get('/stats', (req, res) => {
  const mints     = activity.filter(r => r.type === 'mint').length;
  const transfers = activity.filter(r => r.type === 'transfer').length;
  const bridgeOut = activity.filter(r => r.type === 'bridge_out').length;
  const bridgeIn  = activity.filter(r => r.type === 'bridge_in').length;
  const latest    = activity[0]?.timestamp || null;

  res.json({ total: activity.length, mints, transfers, bridgeOut, bridgeIn, latest });
});

module.exports = router;
