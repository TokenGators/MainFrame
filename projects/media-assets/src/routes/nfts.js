const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const os       = require('os');
const router   = express.Router();
const registry = require('../registry');

// ── In-memory caches for profile lookups ─────────────────────────────────────

const HOLDERS_FILE   = path.join(__dirname, '../../database/holders.jsonl');
const ACTIVITY_FILE  = path.join(__dirname, '../../database/activity.jsonl');
const IDENTITY_FILE  = path.join(os.homedir(), '.openclaw', 'holders-identity.jsonl');

let _holders = [];
let _identity = {};

async function _loadJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const out = [];
  const rl  = readline.createInterface({ input: fs.createReadStream(filePath) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch {}
  }
  return out;
}

async function _reloadHolders() { _holders = await _loadJsonl(HOLDERS_FILE); }
async function _reloadIdentity() {
  const recs = await _loadJsonl(IDENTITY_FILE);
  _identity = {};
  for (const r of recs) if (r.wallet) _identity[r.wallet.toLowerCase()] = r;
}
_reloadHolders();
_reloadIdentity();

fs.watch(path.dirname(HOLDERS_FILE), { persistent: false }, (_e, fn) => {
  if (fn === 'holders.jsonl')  { clearTimeout(_reloadHolders._d); _reloadHolders._d = setTimeout(_reloadHolders, 300); }
});
if (fs.existsSync(path.dirname(IDENTITY_FILE))) {
  fs.watch(path.dirname(IDENTITY_FILE), { persistent: false }, (_e, fn) => {
    if (fn === 'holders-identity.jsonl') { clearTimeout(_reloadIdentity._d); _reloadIdentity._d = setTimeout(_reloadIdentity, 300); }
  });
}

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
  return id.twitter_display_name
    || (id.twitter ? `@${id.twitter}` : null)
    || (id.farcaster_username ? `@${id.farcaster_username}` : null)
    || id.ens || id.opensea_username || id.name || null;
}
function _short(a) { return a ? `${a.slice(0,6)}…${a.slice(-4)}` : '—'; }

// GET /api/nfts/traits — must be before /:id
router.get('/traits', (req, res) => {
  const all = registry.getAll({ type: 'nft', perPage: 5000 }).data;
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
    type: 'nft',
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
  // Support both old "gator-nft-N" IDs and new "nft-N" style lookups
  const record = registry.getById(`nft-${req.params.token_id}`)
    || registry.getById(`gator-nft-${req.params.token_id}`);
  if (!record) return res.status(404).json({ error: 'Not found' });

   // Hydrate appearances
  const appearances = (record.gator_appearances || [])
     .map(aid => registry.getById(aid))
     .filter(Boolean);

  res.json({ ...record, appearances });
});

// GET /api/nfts/:token_id/profile — detailed NFT profile with owner history
router.get('/:token_id/profile', (req, res) => {
  const tokenId = parseInt(req.params.token_id);
  if (!Number.isFinite(tokenId)) return res.status(400).json({ error: 'Invalid token_id' });

  const record = registry.getById(`nft-${tokenId}`) || registry.getById(`gator-nft-${tokenId}`);
  if (!record) return res.status(404).json({ error: 'Not found' });

  // Current holder: any wallet that has this token in current_tokens
  const currentOwners = _holders.filter(h => (h.current_tokens || []).includes(tokenId));
  const currentOwner  = currentOwners[0] || null;

  // Chain that this token is currently on
  let currentChain = null;
  if (currentOwner) {
    const cbt = currentOwner.current_chain_by_token || {};
    currentChain = cbt[tokenId] ?? cbt[String(tokenId)] ?? null;
  }

  // Past holders: anyone who had it in ever_held but not currently
  const pastOwners = _holders.filter(h =>
    (h.ever_held_tokens || []).includes(tokenId) &&
    !(h.current_tokens || []).includes(tokenId)
  );

  // Minter: who minted this token (from minted_tokens)
  const minter = _holders.find(h => (h.minted_tokens || []).includes(tokenId)) || null;

  // Full activity history for this token
  const history = [];
  if (fs.existsSync(ACTIVITY_FILE)) {
    const lines = fs.readFileSync(ACTIVITY_FILE, 'utf8').split('\n');
    for (const line of lines) {
      if (!line) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.token_id === tokenId) {
          history.push({
            ...ev,
            from_name: _displayName(ev.from) || _short(ev.from),
            to_name:   _displayName(ev.to)   || _short(ev.to),
          });
        }
      } catch {}
    }
  }

  // Sales summary: total paid across all sales for this token
  const sales = history.filter(h => h.type === 'sale');
  const salesSummary = {
    count:         sales.length,
    eth_total:     sales.filter(s => s.price_currency === 'ETH').reduce((a, s) => a + (s.price_native || 0), 0),
    ape_total:     sales.filter(s => s.price_currency === 'APE').reduce((a, s) => a + (s.price_native || 0), 0),
    highest_eth:   Math.max(0, ...sales.filter(s => s.price_currency === 'ETH').map(s => s.price_native || 0)),
    highest_ape:   Math.max(0, ...sales.filter(s => s.price_currency === 'APE').map(s => s.price_native || 0)),
  };

  function holderSummary(h) {
    if (!h) return null;
    const id = _identity[h.wallet.toLowerCase()] || {};
    return {
      wallet:               h.wallet,
      ens:                  h.ens || id.ens || null,
      twitter:              id.twitter || null,
      twitter_display_name: id.twitter_display_name || null,
      farcaster:            id.farcaster_username || null,
      current_count:        (h.current_tokens || []).length,
    };
  }

  res.json({
    ...record,
    appearances:     (record.gator_appearances || [])
                       .map(aid => registry.getById(aid))
                       .filter(Boolean),
    current_owner:   holderSummary(currentOwner),
    current_chain:   currentChain,
    minter:          holderSummary(minter),
    past_owners:     pastOwners.map(holderSummary),
    history,
    sales_summary:   salesSummary,
  });
});

module.exports = router;
