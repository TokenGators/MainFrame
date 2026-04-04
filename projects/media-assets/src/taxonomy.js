const fs = require('fs');
const path = require('path');

const TAXONOMY_PATH = path.join(__dirname, '../TAXONOMY.md');

let _tags = null; // { tier2: {tag: desc}, tier3: {}, tier4: {}, all: {} }

function parseTaxonomy() {
  if (!fs.existsSync(TAXONOMY_PATH)) return { tier2: {}, tier3: {}, tier4: {}, all: {} };

  const content = fs.readFileSync(TAXONOMY_PATH, 'utf8');
  const tiers = { tier2: {}, tier3: {}, tier4: {} };
  let currentTier = null;

  for (const line of content.split('\n')) {
    if (line.includes('Tier 2')) currentTier = 'tier2';
    else if (line.includes('Tier 3')) currentTier = 'tier3';
    else if (line.includes('Tier 4')) currentTier = 'tier4';
    else if (line.includes('Tier 1')) currentTier = null;

    if (!currentTier) continue;

    const tableMatch = line.match(/\|\s*`([^`]+)`\s*\|\s*([^|]+)\|/);
    if (tableMatch) {
      const tag = tableMatch[1].trim();
      const desc = tableMatch[2].trim();
      if (tag && tag !== 'Tag') tiers[currentTier][tag] = desc;
    }
  }

  const all = { ...tiers.tier2, ...tiers.tier3, ...tiers.tier4 };
  return { ...tiers, all };
}

function getTags() {
  if (!_tags) _tags = parseTaxonomy();
  return _tags;
}

function getAllTags() { return getTags().all; }
function getTagsByTier(tier) { return getTags()[tier] || {}; }
function isValidTag(tag) { return tag in getTags().all; }

// Reload on file change
fs.watch(TAXONOMY_PATH, { persistent: false }, () => { _tags = null; });

module.exports = { getAllTags, getTagsByTier, isValidTag };
