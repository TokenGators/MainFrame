const express = require('express');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const os = require('os');

const router = express.Router();
const HOLDERS_FILE   = path.join(__dirname, '../../database/holders.jsonl');
const IDENTITY_FILE  = path.join(os.homedir(), '.openclaw', 'holders-identity.jsonl');

// In-memory stores
let holders = [];
let identityMap = {}; // wallet (lowercase) → identity record
let clusterMap = {};  // wallet (lowercase) → { cluster_id, signal }

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

// Clustering: group wallets that share the same trusted Twitter/Discord/Farcaster identity
function buildClusters(holderList, idMap) {
  // Trusted sources for twitter: undefined (spreadsheet) or 'opensea' or 'farcaster_hub'
  const TRUSTED_TWITTER_SOURCES = new Set([undefined, null, 'opensea', 'farcaster_hub']);
  const groups = {}; // signal_key -> [wallet]

  for (const h of holderList) {
    const id = idMap[h.wallet?.toLowerCase()] || {};
    const sources = id._sources || {};

    if (id.twitter && TRUSTED_TWITTER_SOURCES.has(sources.twitter)) {
      const key = `tw:${id.twitter.toLowerCase()}`;
      (groups[key] = groups[key] || []).push(h.wallet);
    }
    if (id.discord) {
      const key = `dc:${id.discord.toLowerCase()}`;
      (groups[key] = groups[key] || []).push(h.wallet);
    }
    if (id.farcaster_username) {
      const key = `fc:${id.farcaster_username.toLowerCase()}`;
      (groups[key] = groups[key] || []).push(h.wallet);
    }
  }

  // Only keep multi-wallet groups
  const clusters = {}; // wallet_lower -> { cluster_id, signal }
  let clusterId = 0;
  for (const [key, wallets] of Object.entries(groups)) {
    if (wallets.length < 2) continue;
    const id = ++clusterId;
    const signal = key.startsWith('tw:') ? 'twitter' : key.startsWith('dc:') ? 'discord' : 'farcaster';
    for (const w of wallets) clusters[w.toLowerCase()] = { cluster_id: id, signal };
  }
  return clusters;
}

async function loadHolders() {
  holders = await loadFile(HOLDERS_FILE);
  clusterMap = buildClusters(holders, identityMap);
  console.log(`holders: loaded ${holders.length} records`);
}

async function loadIdentity() {
  const records = await loadFile(IDENTITY_FILE);
  identityMap = {};
  for (const r of records) {
    if (r.wallet) identityMap[r.wallet.toLowerCase()] = r;
  }
  clusterMap = buildClusters(holders, identityMap);
  console.log(`holders: loaded ${records.length} identity records`);
}

// Load both on startup
loadHolders();
loadIdentity();

// Watch holders.jsonl
fs.watch(path.dirname(HOLDERS_FILE), { persistent: false }, (event, filename) => {
  if (filename === 'holders.jsonl') {
    clearTimeout(loadHolders._debounce);
    loadHolders._debounce = setTimeout(loadHolders, 300);
  }
});

// Watch identity file (in ~/.openclaw)
if (fs.existsSync(path.dirname(IDENTITY_FILE))) {
  fs.watch(path.dirname(IDENTITY_FILE), { persistent: false }, (event, filename) => {
    if (filename === 'holders-identity.jsonl') {
      clearTimeout(loadIdentity._debounce);
      loadIdentity._debounce = setTimeout(loadIdentity, 300);
    }
  });
}

// GET /api/holders
// Query params:
//   q         — search wallet / ens
//   status    — 'holding' | 'sold' | 'all' (default: all)
//   chain     — 'eth' | 'ape' | 'both' | 'all' (default: all)
//   minter    — '1' to show only minters
//   sort      — 'current' | 'ever_held' | 'sold' | 'first_acquired' (default: current)
//   order     — 'asc' | 'desc' (default: desc)
//   page      — default 1
//   per_page  — default 50
//   view      — 'wallets' (default) | 'persons'
router.get('/', (req, res) => {
  const {
    q, status, chain, minter,
    sort = 'current', order = 'desc',
    page = '1', per_page = '50',
    view = 'wallets',
  } = req.query;

  let results = holders;

  // Search wallet / ENS
  if (q) {
    const lq = q.toLowerCase();
    results = results.filter(h => {
      const id = identityMap[h.wallet?.toLowerCase()] || {};
      return (
        h.wallet?.toLowerCase().includes(lq) ||
        (h.ens && h.ens.toLowerCase().includes(lq)) ||
        (id.twitter && id.twitter.toLowerCase().includes(lq)) ||
        (id.farcaster_username && id.farcaster_username.toLowerCase().includes(lq)) ||
        (id.opensea_username && id.opensea_username.toLowerCase().includes(lq)) ||
        (id.discord && id.discord.toLowerCase().includes(lq)) ||
        (id.name && id.name.toLowerCase().includes(lq))
      );
    });
  }

  // Status filter
  if (status === 'holding') results = results.filter(h => h.still_holding);
  else if (status === 'sold')    results = results.filter(h => !h.still_holding);

  // Chain filter — does the wallet have any tokens on this chain right now
  if (chain === 'eth') {
    results = results.filter(h =>
      Object.values(h.current_chain_by_token || {}).some(c => c === 'eth')
    );
  } else if (chain === 'ape') {
    results = results.filter(h =>
      Object.values(h.current_chain_by_token || {}).some(c => c === 'ape')
    );
  } else if (chain === 'both') {
    results = results.filter(h => {
      const chains = new Set(Object.values(h.current_chain_by_token || {}));
      return chains.has('eth') && chains.has('ape');
    });
  }

  // Minter filter
  if (minter === '1') results = results.filter(h => h.minted_tokens?.length > 0);

  // Presale filter
  if (req.query.presale === '1') {
    results = results.filter(h => identityMap[h.wallet?.toLowerCase()]?.presale);
  }

  // ── Persons view: collapse clusters into single rows ──────────────────────
  if (view === 'persons') {
    // Build a lookup of wallet -> holder for quick access
    const holderByWallet = {};
    for (const h of results) holderByWallet[h.wallet?.toLowerCase()] = h;

    // Group results by cluster, with unclustered wallets as their own group
    const personGroups = {}; // key -> [holder]
    for (const h of results) {
      const cluster = clusterMap[h.wallet?.toLowerCase()];
      const key = cluster ? `cluster:${cluster.cluster_id}` : `solo:${h.wallet?.toLowerCase()}`;
      (personGroups[key] = personGroups[key] || []).push(h);
    }

    // Build person rows
    const personRows = Object.entries(personGroups).map(([key, group]) => {
      // Primary wallet = highest current_count; tie-break: most total_ever_held
      const primary = group.reduce((best, h) => {
        const bestCount = best.current_tokens?.length ?? 0;
        const hCount = h.current_tokens?.length ?? 0;
        if (hCount > bestCount) return h;
        if (hCount === bestCount && (h.total_ever_held ?? 0) > (best.total_ever_held ?? 0)) return h;
        return best;
      });

      const primaryId = identityMap[primary.wallet?.toLowerCase()] || {};
      const cluster = clusterMap[primary.wallet?.toLowerCase()];

      // Aggregate identity: primary wallet's identity first, fall back to any in cluster
      let twitter = primaryId.twitter || null;
      let twitterDisplayName = primaryId.twitter_display_name || null;
      let discord = primaryId.discord || null;
      let farcaster = primaryId.farcaster_username || null;
      let farcasterDisplayName = primaryId.farcaster_display_name || null;
      let opensea = primaryId.opensea_username || null;
      let ens = primary.ens || primaryId.ens || null;
      let name = primaryId.name || null;

      if (!twitter || !twitterDisplayName || !discord || !farcaster || !farcasterDisplayName || !opensea || !ens || !name) {
        for (const h of group) {
          if (h.wallet?.toLowerCase() === primary.wallet?.toLowerCase()) continue;
          const hId = identityMap[h.wallet?.toLowerCase()] || {};
          if (!twitter && hId.twitter) twitter = hId.twitter;
          if (!twitterDisplayName && hId.twitter_display_name) twitterDisplayName = hId.twitter_display_name;
          if (!discord && hId.discord) discord = hId.discord;
          if (!farcaster && hId.farcaster_username) farcaster = hId.farcaster_username;
          if (!farcasterDisplayName && hId.farcaster_display_name) farcasterDisplayName = hId.farcaster_display_name;
          if (!opensea && hId.opensea_username) opensea = hId.opensea_username;
          if (!ens && (h.ens || hId.ens)) ens = h.ens || hId.ens;
          if (!name && hId.name) name = hId.name;
        }
      }

      // Aggregate numeric fields
      const currentCount   = group.reduce((s, h) => s + (h.current_tokens?.length ?? 0), 0);
      const ethCount       = group.reduce((s, h) => s + Object.values(h.current_chain_by_token || {}).filter(c => c === 'eth').length, 0);
      const apeCount       = group.reduce((s, h) => s + Object.values(h.current_chain_by_token || {}).filter(c => c === 'ape').length, 0);
      const mintedCount    = group.reduce((s, h) => s + (h.minted_tokens?.length ?? 0), 0);
      const totalEverHeld  = group.reduce((s, h) => s + (h.total_ever_held ?? 0), 0);
      const totalSold      = group.reduce((s, h) => s + (h.total_sold ?? 0), 0);
      const stillHolding   = group.some(h => h.still_holding);

      const firstAcquiredDates = group.map(h => h.first_acquired).filter(Boolean);
      const lastActivityDates  = group.map(h => h.last_activity).filter(Boolean);
      const firstAcquired = firstAcquiredDates.length
        ? firstAcquiredDates.reduce((min, d) => d < min ? d : min)
        : null;
      const lastActivity = lastActivityDates.length
        ? lastActivityDates.reduce((max, d) => d > max ? d : max)
        : null;

      const isPresale      = group.some(h => identityMap[h.wallet?.toLowerCase()]?.presale);
      const presaleQty     = group.reduce((s, h) => s + (identityMap[h.wallet?.toLowerCase()]?.presale_quantity ?? 0), 0);

      return {
        wallet:           primary.wallet,
        all_wallets:      group.map(h => h.wallet),
        wallet_count:     group.length,
        ens,
        twitter,
        twitter_display_name: twitterDisplayName,
        discord,
        farcaster,
        farcaster_display_name: farcasterDisplayName,
        opensea,
        name,
        presale:          isPresale,
        presale_quantity: presaleQty || null,
        current_count:    currentCount,
        eth_count:        ethCount,
        ape_count:        apeCount,
        minted_count:     mintedCount,
        total_ever_held:  totalEverHeld,
        total_sold:       totalSold,
        still_holding:    stillHolding,
        first_acquired:   firstAcquired,
        last_activity:    lastActivity,
        holding_since:    (() => {
          // Cluster holding_since: earliest among currently-holding wallets
          const hsDates = group
            .filter(h => h.still_holding && h.holding_since)
            .map(h => h.holding_since);
          return hsDates.length ? hsDates.reduce((min, d) => d < min ? d : min) : null;
        })(),
        cluster_id:       cluster ? cluster.cluster_id : null,
        cluster_signal:   cluster ? cluster.signal : null,
        sources:          primaryId._sources || {},
        // expose _sort_key for consistent sorting
        _current_count:  currentCount,
        _total_ever_held: totalEverHeld,
      };
    });

    // Sort person rows
    const dir = order === 'asc' ? 1 : -1;
    personRows.sort((a, b) => {
      switch (sort) {
        case 'current':        return dir * (a.current_count - b.current_count);
        case 'ever_held':      return dir * (a.total_ever_held - b.total_ever_held);
        case 'sold':           return dir * (a.total_sold - b.total_sold);
        case 'minted':         return dir * (a.minted_count - b.minted_count);
        case 'first_acquired': return dir * (new Date(a.first_acquired || 0) - new Date(b.first_acquired || 0));
        case 'holding_since':  return dir * (new Date(a.holding_since || 0) - new Date(b.holding_since || 0));
        case 'last_activity':  return dir * (new Date(a.last_activity || 0) - new Date(b.last_activity || 0));
        default:               return dir * (a.current_count - b.current_count);
      }
    });

    // Clean up internal sort keys
    for (const row of personRows) {
      delete row._current_count;
      delete row._total_ever_held;
    }

    // Pagination
    const total = personRows.length;
    const pageNum = Math.max(1, parseInt(page));
    const perPage = Math.min(200, Math.max(1, parseInt(per_page)));
    const pages = Math.ceil(total / perPage);
    const slice = personRows.slice((pageNum - 1) * perPage, pageNum * perPage);

    return res.json({ data: slice, total, page: pageNum, per_page: perPage, pages });
  }

  // ── Wallets view (default) ─────────────────────────────────────────────────

  // Sort
  const dir = order === 'asc' ? 1 : -1;
  results = [...results].sort((a, b) => {
    switch (sort) {
      case 'current':        return dir * ((a.current_tokens?.length ?? 0) - (b.current_tokens?.length ?? 0));
      case 'ever_held':      return dir * ((a.total_ever_held ?? 0) - (b.total_ever_held ?? 0));
      case 'sold':           return dir * ((a.total_sold ?? 0) - (b.total_sold ?? 0));
      case 'minted':         return dir * ((a.minted_tokens?.length ?? 0) - (b.minted_tokens?.length ?? 0));
      case 'first_acquired': return dir * (new Date(a.first_acquired || 0) - new Date(b.first_acquired || 0));
      case 'holding_since':  return dir * (new Date(a.holding_since || 0) - new Date(b.holding_since || 0));
      case 'last_activity':  return dir * (new Date(a.last_activity || 0) - new Date(b.last_activity || 0));
      default:               return dir * ((a.current_tokens?.length ?? 0) - (b.current_tokens?.length ?? 0));
    }
  });

  // Pagination
  const total = results.length;
  const pageNum = Math.max(1, parseInt(page));
  const perPage = Math.min(200, Math.max(1, parseInt(per_page)));
  const pages = Math.ceil(total / perPage);
  const slice = results.slice((pageNum - 1) * perPage, pageNum * perPage);

  // Strip heavy arrays from list response — send counts instead
  // Join identity data (twitter, discord, name) from private identity file
  // Include cluster_id and wallet_count for cluster awareness
  const data = slice.map(h => {
    const id = identityMap[h.wallet?.toLowerCase()] || {};
    const cluster = clusterMap[h.wallet?.toLowerCase()];

    // Count co-clustered wallets and collect their addresses
    let walletCount = 1;
    let allWallets = null;
    if (cluster) {
      const peers = Object.entries(clusterMap)
        .filter(([, c]) => c.cluster_id === cluster.cluster_id)
        .map(([w]) => w);
      walletCount = peers.length;
      allWallets = peers;
    }

    return {
      wallet:           h.wallet,
      ens:              h.ens || id.ens || null,
      twitter:               id.twitter || null,
      twitter_display_name:  id.twitter_display_name || null,
      discord:               id.discord || null,
      farcaster:             id.farcaster_username || null,
      farcaster_display_name: id.farcaster_display_name || null,
      opensea:               id.opensea_username || null,
      name:                  id.name || null,
      presale:          id.presale ?? false,
      presale_quantity: id.presale_quantity || null,
      current_count:    h.current_tokens?.length ?? 0,
      eth_count:        Object.values(h.current_chain_by_token || {}).filter(c => c === 'eth').length,
      ape_count:        Object.values(h.current_chain_by_token || {}).filter(c => c === 'ape').length,
      minted_count:     h.minted_tokens?.length ?? 0,
      total_ever_held:  h.total_ever_held ?? 0,
      total_sold:       h.total_sold ?? 0,
      still_holding:    h.still_holding ?? false,
      first_acquired:   h.first_acquired || null,
      last_activity:    h.last_activity || null,
      holding_since:    h.holding_since || null,
      cluster_id:       cluster ? cluster.cluster_id : null,
      cluster_signal:   cluster ? cluster.signal : null,
      wallet_count:     walletCount,
      all_wallets:      allWallets,
      sources:          id._sources || {},
    };
  });

  res.json({ data, total, page: pageNum, per_page: perPage, pages });
});

// GET /api/holders/stats — summary stats for the dashboard header
router.get('/stats', (req, res) => {
  const now = Date.now();
  const day = 86400 * 1000;
  const cutoff7  = now - 7  * day;
  const cutoff30 = now - 30 * day;
  const cutoff90 = now - 90 * day;

  const currentHolders = holders.filter(h => h.still_holding);
  const stillHolding   = currentHolders.length;
  const minters        = holders.filter(h => h.minted_tokens?.length > 0).length;
  const withEns        = holders.filter(h => h.ens).length;
  const totalTokens    = holders.reduce((s, h) => s + (h.current_tokens?.length ?? 0), 0);
  const onEth          = holders.reduce((s, h) =>
    s + Object.values(h.current_chain_by_token || {}).filter(c => c === 'eth').length, 0);
  const onApe          = holders.reduce((s, h) =>
    s + Object.values(h.current_chain_by_token || {}).filter(c => c === 'ape').length, 0);

  // Presale count (only among current holders)
  const presaleCount = currentHolders.filter(h =>
    identityMap[h.wallet?.toLowerCase()]?.presale).length;

  // Identity-resolved current holders
  const identifiedCurrent = currentHolders.filter(h => {
    const id = identityMap[h.wallet?.toLowerCase()] || {};
    return !!(h.ens || id.twitter || id.discord || id.opensea_username ||
              id.farcaster_username || id.name);
  }).length;

  // ── Persons currently holding ──
  // A "person" is either a cluster (counted once) or an unclustered holding wallet.
  const holdingWalletsLc = new Set(currentHolders.map(h => h.wallet?.toLowerCase()));
  const holdingClusterIds = new Set();
  let unclusteredHolding = 0;
  for (const h of currentHolders) {
    const cl = clusterMap[h.wallet?.toLowerCase()];
    if (cl) holdingClusterIds.add(cl.cluster_id);
    else unclusteredHolding++;
  }
  const currentPersons = holdingClusterIds.size + unclusteredHolding;

  // ── New holders over 7d / 30d / 90d ──
  // New = first_acquired within window AND still currently holding.
  function countNewWallets(cutoff) {
    return currentHolders.filter(h => {
      const t = h.first_acquired ? new Date(h.first_acquired).getTime() : 0;
      return t >= cutoff;
    }).length;
  }

  function countNewPersons(cutoff) {
    const seenClusters = new Set();
    let loners = 0;
    for (const h of currentHolders) {
      const t = h.first_acquired ? new Date(h.first_acquired).getTime() : 0;
      if (t < cutoff) continue;
      const cl = clusterMap[h.wallet?.toLowerCase()];
      if (cl) seenClusters.add(cl.cluster_id);
      else loners++;
    }
    return seenClusters.size + loners;
  }

  res.json({
    stillHolding,
    currentPersons,
    minters,
    presaleCount,
    withEns,
    totalTokens,
    onEth,
    onApe,
    identifiedCurrent,
    currentHoldersTotal: stillHolding,
    newWallets7d:  countNewWallets(cutoff7),
    newWallets30d: countNewWallets(cutoff30),
    newWallets90d: countNewWallets(cutoff90),
    newPersons7d:  countNewPersons(cutoff7),
    newPersons30d: countNewPersons(cutoff30),
    newPersons90d: countNewPersons(cutoff90),
  });
});

// GET /api/holders/:wallet — full detail for one wallet, including identity + sources
// GET /api/holders/:wallet/profile — full collector profile (aggregates NFTs, activity, mentions)
router.get('/:wallet/profile', async (req, res) => {
  const wallet = req.params.wallet.toLowerCase();
  const holder = holders.find(h => h.wallet?.toLowerCase() === wallet);
  if (!holder) return res.status(404).json({ error: 'Not found' });

  const id      = identityMap[wallet] || {};
  const cluster = clusterMap[wallet];

  // ── Build cluster wallet list (we'll use it for both identity + NFT aggregation) ──
  const clusterWallets = new Set([wallet]);
  if (cluster) {
    Object.entries(clusterMap).forEach(([w, c]) => {
      if (c.cluster_id === cluster.cluster_id) clusterWallets.add(w);
    });
  }

  // ── Identity & sources (falls back to any cluster peer's identity) ────────
  const identity = {};
  const SOURCE_FIELDS = ['twitter', 'twitter_display_name', 'discord',
                         'farcaster_username', 'farcaster_display_name', 'farcaster_fid',
                         'opensea_username', 'ens', 'name',
                         'presale', 'presale_quantity'];
  // Try this wallet first, then every cluster peer — first non-empty value wins
  const identityCandidates = [id, ...[...clusterWallets].filter(w => w !== wallet).map(w => identityMap[w] || {})];
  for (const field of SOURCE_FIELDS) {
    if (field === 'ens') {
      // Check holder record first, then identity records in cluster
      let val = holder.ens;
      if (!val) {
        for (const cand of identityCandidates) { if (cand.ens) { val = cand.ens; break; } }
      }
      if (val) identity[field] = val;
      continue;
    }
    for (const cand of identityCandidates) {
      if (cand[field] != null && cand[field] !== false && cand[field] !== '') {
        identity[field] = cand[field];
        break;
      }
    }
  }
  const sources = id._sources || {};

  // ── Cluster peers ──────────────────────────────────────────────────────────
  let clusterInfo = null;
  if (cluster) {
    const peerWallets = Object.entries(clusterMap)
      .filter(([w, c]) => c.cluster_id === cluster.cluster_id && w !== wallet)
      .map(([w]) => w);
    const peers = peerWallets.map(w => {
      const peer = holders.find(h => h.wallet?.toLowerCase() === w);
      return peer ? {
        wallet: peer.wallet,
        current_count: (peer.current_tokens || []).length,
        ens: peer.ens || null,
      } : { wallet: w };
    });
    clusterInfo = { cluster_id: cluster.cluster_id, signal: cluster.signal, peers };
  }

  // ── NFT lookups ────────────────────────────────────────────────────────────
  // Aggregate tokens across the full cluster so collectors see their whole collection.
  const clusterHolders = holders.filter(h => clusterWallets.has(h.wallet?.toLowerCase()));

  const allCurrent   = new Set();
  const allEverHeld  = new Set();
  const allMinted    = new Set();
  const chainByToken = {}; // token_id → 'eth' | 'ape'
  for (const h of clusterHolders) {
    (h.current_tokens   || []).forEach(t => allCurrent.add(t));
    (h.ever_held_tokens || []).forEach(t => allEverHeld.add(t));
    (h.minted_tokens    || []).forEach(t => allMinted.add(t));
    const cbt = h.current_chain_by_token || {};
    for (const [tid, chain] of Object.entries(cbt)) chainByToken[tid] = chain;
  }

  const registry = require('../registry');
  function nftFor(tokenId) {
    const rec = registry.getById(`nft-${tokenId}`) || registry.getById(`gator-nft-${tokenId}`);
    if (!rec) return { token_id: tokenId, name: `TokenGator #${tokenId}` };
    return {
      token_id:          tokenId,
      name:              rec.name,
      gateway_image_url: rec.gateway_image_url,
      rarity_rank:       rec.rarity_rank,
      traits:            rec.traits || [],
      chain:             chainByToken[tokenId] || null,
    };
  }

  const currentNfts  = [...allCurrent].sort((a,b) => a - b).map(nftFor);
  const mintedNfts   = [...allMinted].sort((a,b) => a - b).map(nftFor);
  const soldTokens   = [...allEverHeld].filter(t => !allCurrent.has(t)).sort((a,b) => a - b);
  const soldNfts     = soldTokens.map(nftFor);

  // Compute summary counts (across the full cluster, if any)
  const ethCount = currentNfts.filter(n => n.chain === 'eth').length;
  const apeCount = currentNfts.filter(n => n.chain === 'ape').length;
  const counts = {
    current_count:   currentNfts.length,
    eth_count:       ethCount,
    ape_count:       apeCount,
    minted_count:    mintedNfts.length,
    total_ever_held: allEverHeld.size,
    total_sold:      soldTokens.length,
    still_holding:   currentNfts.length > 0,
  };

  // ── Activity for this cluster (read activity.jsonl snapshot in memory) ────
  // The activity module loads into its own in-memory array; just require & filter.
  let activityEvents = [];
  let activityTotal  = 0;
  try {
    const activityMod = require('./activity');
    // Not exported — so read file directly as a lightweight fallback
  } catch {}
  // Direct file read (fast; ~17K lines):
  try {
    const ACTIVITY_FILE = path.join(__dirname, '../../database/activity.jsonl');
    if (fs.existsSync(ACTIVITY_FILE)) {
      const lines = fs.readFileSync(ACTIVITY_FILE, 'utf8').split('\n');
      for (const line of lines) {
        if (!line) continue;
        try {
          const ev = JSON.parse(line);
          if (clusterWallets.has(ev.from) || clusterWallets.has(ev.to)) {
            activityTotal++;
            if (activityEvents.length < 25) activityEvents.push(ev);
          }
        } catch {}
      }
    }
  } catch (e) { console.error('profile: activity read error:', e.message); }

  // ── Tweet mentions (if holder has a twitter handle, find posts mentioning them) ──
  let mentions = { count: 0, samples: [] };
  const handle = identity.twitter;
  if (handle) {
    try {
      const POSTS_FILE = path.join(__dirname, '../../database/posts.jsonl');
      if (fs.existsSync(POSTS_FILE)) {
        const needle = handle.toLowerCase().replace(/^@/, '');
        const lines  = fs.readFileSync(POSTS_FILE, 'utf8').split('\n');
        const samples = [];
        let count = 0;
        for (const line of lines) {
          if (!line) continue;
          try {
            const p = JSON.parse(line);
            const text = (p.text || '').toLowerCase();
            const mentionsArr = (p.mentions || []).map(m =>
              typeof m === 'string' ? m.toLowerCase() : (m.username || '').toLowerCase()
            );
            if (text.includes(`@${needle}`) || mentionsArr.includes(needle)) {
              count++;
              if (samples.length < 10) samples.push({
                id:         p.id,
                text:       (p.text || '').slice(0, 280),
                created_at: p.created_at,
                post_type:  p.post_type,
              });
            }
          } catch {}
        }
        mentions = { count, samples };
      }
    } catch (e) { console.error('profile: mentions read error:', e.message); }
  }

  // Overlay identity fields onto top-level for the UI
  const topLevelIdentity = {
    twitter:                identity.twitter                || holder.twitter                || null,
    twitter_display_name:   identity.twitter_display_name   || holder.twitter_display_name   || null,
    discord:                identity.discord                || holder.discord                || null,
    farcaster:              identity.farcaster_username     || holder.farcaster              || null,
    farcaster_display_name: identity.farcaster_display_name || holder.farcaster_display_name || null,
    opensea:                identity.opensea_username       || holder.opensea                || null,
    ens:                    identity.ens                    || holder.ens                    || null,
    name:                   identity.name                   || holder.name                   || null,
    presale:                !!(identity.presale         || holder.presale),
    presale_quantity:       identity.presale_quantity   ?? holder.presale_quantity   ?? null,
  };

  res.json({
    ...holder,
    ...topLevelIdentity,
    ...counts,
    identity,
    sources,
    cluster: clusterInfo,
    nfts: {
      current:  currentNfts,
      minted:   mintedNfts,
      sold:     soldNfts,
    },
    activity: {
      total:  activityTotal,
      recent: activityEvents,
    },
    mentions,
  });
});

router.get('/:wallet', (req, res) => {
  const wallet = req.params.wallet.toLowerCase();
  const holder = holders.find(h => h.wallet?.toLowerCase() === wallet);
  if (!holder) return res.status(404).json({ error: 'Not found' });

  const id      = identityMap[wallet] || {};
  const cluster = clusterMap[wallet];

  // Build a clean identity summary with source attribution
  const identity = {};
  const SOURCE_FIELDS = ['twitter', 'discord', 'farcaster_username', 'opensea_username',
                         'ens', 'name', 'presale', 'presale_quantity', 'farcaster_fid',
                         'farcaster_display_name', 'farcaster_url'];
  for (const field of SOURCE_FIELDS) {
    const val = field === 'ens' ? (holder.ens || id.ens) : id[field];
    if (val != null && val !== false) {
      identity[field] = val;
    }
  }

  const sources = id._sources || {};

  // If in a cluster, list co-clustered wallets
  let clusterInfo = null;
  if (cluster) {
    const peers = Object.entries(clusterMap)
      .filter(([w, c]) => c.cluster_id === cluster.cluster_id && w !== wallet)
      .map(([w]) => w);
    clusterInfo = { cluster_id: cluster.cluster_id, signal: cluster.signal, peers };
  }

  res.json({ ...holder, identity, sources, cluster: clusterInfo });
});

// PATCH /api/holders/:wallet/identity — manually update identity fields
router.patch('/:wallet/identity', express.json(), (req, res) => {
  const wallet = req.params.wallet.toLowerCase();

  const EDITABLE = ['twitter', 'twitter_display_name', 'discord',
                    'farcaster_username', 'opensea_username', 'name'];

  const updates = {};
  for (const field of EDITABLE) {
    if (field in req.body) {
      const val = req.body[field];
      updates[field] = (typeof val === 'string') ? val.trim() : val;
    }
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  // Merge-write: re-read file, overlay changes, write atomically
  const lines = fs.existsSync(IDENTITY_FILE)
    ? fs.readFileSync(IDENTITY_FILE, 'utf8').split('\n').filter(Boolean)
    : [];

  const onDisk = {};
  for (const line of lines) {
    try {
      const r = JSON.parse(line);
      if (r.wallet) onDisk[r.wallet.toLowerCase()] = r;
    } catch {}
  }

  const rec = onDisk[wallet] || { wallet };
  rec._sources = rec._sources || {};

  for (const [field, val] of Object.entries(updates)) {
    if (val === '' || val === null) {
      delete rec[field];
      delete rec._sources[field];
    } else {
      rec[field] = val;
      rec._sources[field] = 'manual';
    }
  }
  rec.updated_at = new Date().toISOString();
  onDisk[wallet] = rec;

  const tmp = IDENTITY_FILE + '.tmp';
  fs.writeFileSync(tmp, Object.values(onDisk).map(r => JSON.stringify(r)).join('\n') + '\n');
  fs.renameSync(tmp, IDENTITY_FILE);

  // Reload identity into memory immediately
  identityMap[wallet] = rec;
  clusterMap = buildClusters(holders, identityMap);

  res.json({ ok: true, wallet, updated: Object.keys(updates) });
});

module.exports = router;
