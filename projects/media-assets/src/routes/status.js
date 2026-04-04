const express = require('express');
const router = express.Router();
const registry = require('../registry');

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    project: 'Gatorpedia',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    registry: registry.getStats(),
  });
});

module.exports = router;
