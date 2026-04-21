const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const os       = require('os');
const router   = express.Router();
const registry = require('../registry');

// ── Data files ───────────────────────────────────────────────────────────────

const LISTINGS_FILE     = path.join(__dirname, '../../database/listings.jsonl');
const LISTINGS_HISTORY  = path.join(__dirname, '../../database/listings-history.jsonl');
const ACTIVITY_FILE     = path.join(__dirname, '../../database/activity.jsonl');
const HOLDERS_FILE      = path.join(__dirname, '../../database/holders.jsonl');
const IDENTITY_FILE     = path.join(os.homedir(), '.openclaw', 'holders-identity.jsonl');

// Spam heuristic tunables
const RELIST_WINDOW_DAYS     = 7;    // look back this many days of history
const RELIST_SUPPRESS_COUNT  = 3;    // (same lister, same token) listed >= N times → spam
const GLOBAL_RELIST_COUNT    = 6;    // token listed/unlisted >= N times (any lister) → spam
const LISTING_FRESH_DAYS     = 14;   // "recently listed" window

// ── Caches ───────────────────────────────────────────────────────────────────

let _listings     = [];     // current active (cheapest per token)
let _history      = [];     // append log (kept trimmed in memory)
let _spamTokens   = new Set();   // string "chain:token" keys flagged as spam
let _holderByWallet = {};
let _identity     = {};

async function _readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  const out = [];
  const rl  = readline.createInterface({ input: fs.createReadStream(file) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch {}
  }
  return out;
}

function _computeSpam(history) {
  const cutoff = Date.now() - RELIST_WINDOW_DAYS * 86400 * 1000;
  const recent = history.filter(h => {
    const t = Date.parse(h.seen_at || h.listed_at || 0);
    return Number.isFinite(t) && t >= cutoff;
  });

  // Per (lister, token, chain): count distinct order_hashes
  const perLister = {};
  const perToken  = {};
  for (const r of recent) {
    const keyT = `${r.chain}:${r.token_id}`;
    const keyL = `${r.lister}|${keyT}`;
    (perLister[keyL] = perLister[keyL] || new Set()).add(r.order_hash || r.seen_at);
    (perToken[keyT]  = perToken[keyT]  || new Set()).add(r.order_hash || r.seen_at);
  }

  const spam = new Set();
  for (const [key, orders] of Object.entries(perLister)) {
    if (orders.size >= RELIST_SUPPRESS_COUNT) {
      const [, keyT] = key.split('|');
      spam.add(keyT);
    }
  }
  for (const [keyT, orders] of Object.entries(perToken)) {
    if (orders.size >= GLOBAL_RELIST_COUNT) spam.add(keyT);
  }
  return spam;
}

async function _reload() {
  _listings = await _readJsonl(LISTINGS_FILE);
  _history  = await _readJsonl(LISTINGS_HISTORY);
  // Keep only last 30 days of history in memory
  const cutoff = Date.now() - 30 * 86400 * 1000;
  _history  = _history.filter(h => {
    const t = Date.parse(h.seen_at || h.listed_at || 0);
    return Number.isFinite(t) && t >= cutoff;
  });
  _spamTokens = _computeSpam(_history);

  const holders = await _readJsonl(HOLDERS_FILE);
  _holderByWallet = {};
  for (const h of holders) if (h.wallet) _holderByWallet[h.wallet.toLowerCase()] = h;

  const idRecs = await _readJsonl(IDENTITY_FILE);
  _identity = {};
  for (const r of idRecs) if (r.wallet) _identity[r.wallet.toLowerCase()] = r;
}
_reload();

// Debounced watchers
const _debounce = (fn, ms = 400) => {
  let t;
  return () => { clearTimeout(t); t = setTimeout(fn, ms); };
};
const _debouncedReload = _debounce(_reload);
if (fs.existsSync(path.dirname(LISTINGS_FILE))) {
  fs.watch(path.dirname(LISTINGS_FILE), { persistent: false }, (_e, fn) => {
    if (fn === 'listings.jsonl' || fn === 'listings-history.jsonl' || fn === 'activity.jsonl' ||
        fn === 'holders.jsonl') _debouncedReload();
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const NAMED_ADDRS = {
  '0x0000000000000000000000000000000000000000': 'Mint',
  '0x57e56ce08ae6f0aea6668fd898c52011fe853dc2': 'ETH Bridge',
  '0x75f7dbe5e4ee8e424a759f71ad725f8cdd0ff2d1': 'APE Bridge',
};

function _displayName(wallet) {
  if (!wallet) return null;
  const named = NAMED_ADDRS[wallet.toLowerCase()];
  if (named) return named;
  const id = _identity[wallet.toLowerCase()] || {};
  const h  = _holderByWallet[wallet.toLowerCase()] || {};
  return id.twitter_display_name
    || (id.twitter ? `@${id.twitter}` : null)
    || (id.farcaster_username ? `@${id.farcaster_username}` : null)
    || id.ens || h.ens || id.opensea_username || id.name || null;
}

function _enrichNft(tokenId) {
  const r = registry.getById(`nft-${tokenId}`) || registry.getById(`gator-nft-${tokenId}`);
  if (!r) return null;
  return {
    token_id:          tokenId,
    name:              r.name,
    gateway_image_url: r.gateway_image_url || null,
    rarity_rank:       r.rarity_rank ?? null,
  };
}

function _holderSummary(wallet) {
  if (!wallet) return null;
  return {
    wallet,
    name: _displayName(wallet),
  };
}

// ── GET /api/market — recent listings + recent sales ─────────────────────────
router.get('/', async (_req, res) => {
  const now = Date.now();
  const listingCutoff = now - LISTING_FRESH_DAYS * 86400 * 1000;

  // Recent listings: active + not spammy, sorted by listed_at desc, filtered to fresh window
  const listings = _listings
    .filter(l => !_spamTokens.has(`${l.chain}:${l.token_id}`))
    .filter(l => {
      const t = Date.parse(l.listed_at || l.seen_at || 0);
      return Number.isFinite(t) && t >= listingCutoff;
    })
    .sort((a, b) => Date.parse(b.listed_at || b.seen_at) - Date.parse(a.listed_at || a.seen_at))
    .slice(0, 120)
    .map(l => ({
      ...l,
      nft:    _enrichNft(l.token_id),
      lister_summary: _holderSummary(l.lister),
      spam:   false,
    }))
    .filter(l => l.nft);

  // All-active cheapest listings (not spam-filtered, for dashboard totals)
  const activeCount = _listings.length;
  const cleanActiveCount = _listings.filter(l => !_spamTokens.has(`${l.chain}:${l.token_id}`)).length;
  const ethListed = _listings.filter(l => l.chain === 'eth' && !_spamTokens.has(`eth:${l.token_id}`)).length;
  const apeListed = _listings.filter(l => l.chain === 'ape' && !_spamTokens.has(`ape:${l.token_id}`)).length;

  // Recent sales: stream activity.jsonl from tail (keep it simple)
  const recentSales = [];
  if (fs.existsSync(ACTIVITY_FILE)) {
    const raw = fs.readFileSync(ACTIVITY_FILE, 'utf8').split('\n');
    for (let i = raw.length - 1; i >= 0 && recentSales.length < 60; i--) {
      const line = raw[i];
      if (!line) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.type !== 'sale') continue;
        const nft = _enrichNft(ev.token_id);
        if (!nft) continue;
        recentSales.push({
          token_id:       ev.token_id,
          chain:          ev.chain,
          price_native:   ev.price_native,
          price_currency: ev.price_currency,
          marketplace:    ev.marketplace,
          timestamp:      ev.timestamp,
          tx_hash:        ev.tx_hash,
          explorer_url:   ev.explorer_url,
          from:           ev.from,
          to:             ev.to,
          from_name:      _displayName(ev.from),
          to_name:        _displayName(ev.to),
          nft,
        });
      } catch {}
    }
  }

  // Cheapest-listed summary per chain
  const cheapestEth = listings.filter(l => l.chain === 'eth')
    .reduce((m, l) => (m === null || l.price_native < m.price_native ? l : m), null);
  const cheapestApe = listings.filter(l => l.chain === 'ape')
    .reduce((m, l) => (m === null || l.price_native < m.price_native ? l : m), null);

  res.json({
    summary: {
      active_total:           activeCount,
      active_after_filter:    cleanActiveCount,
      eth_listed:             ethListed,
      ape_listed:             apeListed,
      spam_suppressed_tokens: _spamTokens.size,
      floor_eth:              cheapestEth ? cheapestEth.price_native : null,
      floor_ape:              cheapestApe ? cheapestApe.price_native : null,
    },
    listings,
    sales: recentSales,
  });
});

module.exports = router;
