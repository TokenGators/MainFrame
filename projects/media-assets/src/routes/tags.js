const express = require('express');
const router = express.Router();
const { getTagsByTier } = require('../taxonomy');
const registry = require('../registry');

router.get('/', (req, res) => {
  const tier2 = getTagsByTier('tier2');
  const tier3 = getTagsByTier('tier3');
  const tier4 = getTagsByTier('tier4');

  // Count usage across all assets
  const counts = {};
  const allAssets = registry.getAll({ perPage: 10000 }).data;
  for (const asset of allAssets) {
    for (const tag of (asset.tags || [])) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }

  const result = [
    ...Object.entries(tier2).map(([tag, desc]) => ({ tag, description: desc, tier: 'tier2', count: counts[tag] || 0 })),
    ...Object.entries(tier3).map(([tag, desc]) => ({ tag, description: desc, tier: 'tier3', count: counts[tag] || 0 })),
    ...Object.entries(tier4).map(([tag, desc]) => ({ tag, description: desc, tier: 'tier4', count: counts[tag] || 0 })),
  ];

  res.json(result);
});

module.exports = router;
