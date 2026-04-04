const express = require('express');
const router = express.Router();
const registry = require('../registry');

router.post('/', (req, res) => {
  const { type, tags, tag_op, q, flagged, format = 'full' } = req.body;

  const result = registry.getAll({
    type,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : undefined,
    tagOp: tag_op || 'and',
    q,
    flagged,
    perPage: 10000, // export all matching
  });

  let data = result.data;
  if (format === 'slim') {
    data = data.map(({ id, type, tags, text, visual_summary, filename, name, created_at, source_url }) =>
      ({ id, type, tags, text, visual_summary, filename, name, created_at, source_url })
    );
  }

  const filename = `gatorpedia-export-${Date.now()}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.json({ exported_at: new Date().toISOString(), total: data.length, assets: data });
});

module.exports = router;
