const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const registry = require('../registry');

// Load the token_id → hash_stem map once at startup
const NFT_LOCAL_MAP_FILE = path.join(__dirname, '../../database/nft-local-map.json');
let _nftLocalMap = null;
function getNftLocalMap() {
  if (!_nftLocalMap) {
    try { _nftLocalMap = JSON.parse(fs.readFileSync(NFT_LOCAL_MAP_FILE, 'utf8')); }
    catch { _nftLocalMap = {}; }
  }
  return _nftLocalMap;
}

// GET /api/assets
router.get('/', (req, res) => {
  const { type, types, media_type, tags, tag_op, q, flagged, has_linked, linked_count, sort, page, per_page } = req.query;
  const result = registry.getAll({
    type,
    types: types ? types.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    media_type,
    linked_count,
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    tagOp: tag_op || 'and',
    q,
    flagged,
    hasLinked: has_linked === '1' || has_linked === 'true',
    sort,
    page: parseInt(page) || 1,
    perPage: Math.min(parseInt(per_page) || 50, 200),
  });
  res.json(result);
});

// GET /api/assets/:id/image — serves local NFT image by token_id lookup
router.get('/:id/image', (req, res) => {
  const record = registry.getById(req.params.id);
  if (!record || record.type !== 'nft') return res.status(404).json({ error: 'Not found' });

  const map = getNftLocalMap();
  const hashStem = map[String(record.token_id)];
  if (hashStem) {
    return res.redirect(`/nft-images/${hashStem}.png`);
  }
  // Fallback: redirect to gateway URL
  if (record.gateway_image_url) return res.redirect(record.gateway_image_url);
  return res.status(404).json({ error: 'No image found' });
});

// GET /api/assets/:id
router.get('/:id', (req, res) => {
  const record = registry.getById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

// PATCH /api/assets/:id
router.patch('/:id', (req, res) => {
  const id = req.params.id;
  const before = registry.getById(id);
  if (!before) return res.status(404).json({ error: 'Not found' });

  const updated = registry.patch(id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });

  // Bidirectional linked_assets sync
  if (req.body.linked_assets !== undefined) {
    const prevSet = new Set(before.linked_assets || []);
    const nextSet = new Set(updated.linked_assets || []);

    // IDs added in this patch
    for (const linkedId of nextSet) {
      if (!prevSet.has(linkedId)) {
        const other = registry.getById(linkedId);
        if (other) {
          const otherLinks = new Set(other.linked_assets || []);
          if (!otherLinks.has(id)) {
            otherLinks.add(id);
            registry.patch(linkedId, { linked_assets: [...otherLinks].sort() });
          }
        }
      }
    }

    // IDs removed in this patch
    for (const linkedId of prevSet) {
      if (!nextSet.has(linkedId)) {
        const other = registry.getById(linkedId);
        if (other) {
          const otherLinks = new Set(other.linked_assets || []);
          if (otherLinks.has(id)) {
            otherLinks.delete(id);
            registry.patch(linkedId, { linked_assets: [...otherLinks].sort() });
          }
        }
      }
    }
  }

  res.json(updated);
});

module.exports = router;
