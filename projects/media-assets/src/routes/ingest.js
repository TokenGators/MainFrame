'use strict';

const express = require('express');
const router = express.Router();
const registry = require('../registry');
const { ingestUrl } = require('../ingest/pipeline');

/**
 * POST /api/ingest
 * Body: { url: "https://..." }
 *
 * Creates an asset record immediately (returns it), then processes
 * visual analysis + tagging in the background.
 */
router.post('/', async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  try {
    const record = await ingestUrl(url.trim());
    if (!record) {
      // Duplicate
      const existing = registry.findBySourceUrl(url.trim());
      return res.status(200).json({ duplicate: true, asset: existing });
    }
    res.status(201).json({ asset: record });
  } catch (err) {
    console.error('[POST /api/ingest]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ingest/pending
 * Returns all assets currently being processed (ingest_status !== 'done').
 */
router.get('/pending', (req, res) => {
  const all = registry.getAll({ per_page: 10000 }).data;
  const pending = all.filter(
    r => r.ingest_status && r.ingest_status !== 'done'
  );
  res.json({ items: pending, count: pending.length });
});

module.exports = router;
