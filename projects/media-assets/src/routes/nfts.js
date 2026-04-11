const express = require('express');
const router = express.Router();
const registry = require('../registry');

// GET /api/nfts/traits — must be before /:token_id
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
  const { page, per_page, q, ...rest } = req.query;

  // Trait filters come in as trait_Skin=Lava, trait_Eyes=Fury, etc.
  const activeTraits = {};
  for (const [k, v] of Object.entries(rest)) {
    if (k.startsWith('trait_')) activeTraits[k.slice(6)] = v;
  }

  const result = registry.getAll({
    type: 'gator-nft',
    q,
    page: parseInt(page) || 1,
    perPage: Math.min(parseInt(per_page) || 50, 200),
  });

  // Apply trait filters post-fetch (4,000 records, in-memory is fine)
  if (Object.keys(activeTraits).length > 0) {
    result.data = result.data.filter(nft =>
      Object.entries(activeTraits).every(([traitType, value]) =>
        (nft.traits || []).some(t => t.trait_type === traitType && t.value === value)
      )
    );
    result.total = result.data.length;
    result.pages = Math.ceil(result.total / (parseInt(per_page) || 50));
  }

  res.json(result);
});

// GET /api/nfts/:token_id
router.get('/:token_id', (req, res) => {
  const id = `gator-nft-${req.params.token_id}`;
  const record = registry.getById(id);
  if (!record) return res.status(404).json({ error: 'Not found' });

  // Hydrate appearances with full records
  const appearances = (record.gator_appearances || [])
    .map(aid => registry.getById(aid))
    .filter(Boolean);

  res.json({ ...record, appearances });
});

module.exports = router;
