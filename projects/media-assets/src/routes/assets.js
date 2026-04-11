const express = require('express');
const router = express.Router();
const registry = require('../registry');

// GET /api/assets
router.get('/', (req, res) => {
  const { type, tags, tag_op, q, flagged, sort, page, per_page } = req.query;
  const result = registry.getAll({
    type,
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    tagOp: tag_op || 'and',
    q,
    flagged,
    sort,
    page: parseInt(page) || 1,
    perPage: Math.min(parseInt(per_page) || 50, 200),
  });
  res.json(result);
});

// GET /api/assets/:id
router.get('/:id', (req, res) => {
  const record = registry.getById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

// PATCH /api/assets/:id
router.patch('/:id', (req, res) => {
  const updated = registry.patch(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

module.exports = router;
