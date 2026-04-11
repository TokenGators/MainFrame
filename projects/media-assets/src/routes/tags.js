const express = require('express');
const router = express.Router();
const { getAllTags, getTagsByTier } = require('../taxonomy');
const registry = require('../registry');

router.get('/', (req, res) => {
  const allTags = getAllTags();

   // Count usage across all assets
  const counts = {};
  const allAssets = registry.getAll({ perPage: 10000 }).data;
  for (const asset of allAssets) {
    for (const tag of (asset.tags || [])) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }

  const result = Object.entries(allTags).map(([tag, description]) => ({
    tag,
    description,
    count: counts[tag] || 0,
  }));

  res.json(result);
});

module.exports = router;
